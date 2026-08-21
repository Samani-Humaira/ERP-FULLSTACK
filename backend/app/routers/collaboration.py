import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.schemas import ProjectMember, MemberRole, CommentCreate, CommentResponse, DocumentVersionResponse, InviteResponse, NotificationResponse, NotificationAction
from app.models.collaboration import ProjectMember as PMModel, Comment as CommentModel, DocumentVersion as VersionModel, Invite as InviteModel, Notification as NotificationModel
from sqlalchemy import func
from app.routers.collaboration_ws import manager as ws_manager
from app.models.user import User
import uuid
from datetime import datetime
from pathlib import Path
from app.services.emailer import send_email
from app.auth.jwt_handler import create_invite_token, decode_invite_token
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/projects/{project_id}/members", response_model=ProjectMember)
async def add_project_member(project_id: str, payload: ProjectMember, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # Only allow project owner or admins to add members in a fuller implementation
    try:
        member = PMModel(
            project_id=project_id,
            user_id=payload.user_id,
            role=payload.role,
        )
        db.add(member)
        db.commit()
        db.refresh(member)

        created = ProjectMember(
            user_id=str(member.user_id),
            email=payload.email,
            full_name=payload.full_name,
            role=member.role,
        )
        # broadcast to other realtime clients
        try:
            await ws_manager.broadcast(project_id, {"type": "member_added", "payload": created.dict()})
        except Exception:
            pass
        return created
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to add member: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_id}/members", response_model=list[ProjectMember])
async def list_project_members(project_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    members = db.query(PMModel).filter(PMModel.project_id == project_id).all()
    return [ProjectMember(user_id=str(m.user_id), email=None, full_name=None, role=m.role) for m in members]


@router.post("/projects/{project_id}/comments", response_model=CommentResponse)
async def create_comment(project_id: str, payload: CommentCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    try:
        comment = CommentModel(
            project_id=project_id,
            user_id=current_user.id,
            section=payload.section,
            parent_id=payload.parent_id,
            content=payload.content,
        )
        db.add(comment)
        db.commit()
        db.refresh(comment)

        created = CommentResponse(
            id=str(comment.id),
            project_id=str(comment.project_id),
            user_id=str(comment.user_id),
            section=comment.section,
            parent_id=str(comment.parent_id) if comment.parent_id else None,
            content=comment.content,
            created_at=comment.created_at,
            resolved=comment.resolved,
        )
        try:
            await ws_manager.broadcast(project_id, {"type": "comment_created", "payload": created.dict()})
        except Exception:
            pass
        return created
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_id}/comments", response_model=list[CommentResponse])
async def list_comments(project_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    comments = db.query(CommentModel).filter(CommentModel.project_id == project_id).order_by(CommentModel.created_at.asc()).all()
    return [
        CommentResponse(
            id=str(c.id),
            project_id=str(c.project_id),
            user_id=str(c.user_id),
            section=c.section,
            parent_id=str(c.parent_id) if c.parent_id else None,
            content=c.content,
            created_at=c.created_at,
            resolved=c.resolved,
        )
        for c in comments
    ]


@router.post("/projects/{project_id}/versions", response_model=DocumentVersionResponse)
async def create_version(project_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    try:
        # determine next version number
        last = db.query(VersionModel).filter(VersionModel.project_id == project_id).order_by(VersionModel.version_number.desc()).first()
        next_version = 1 if not last else last.version_number + 1

        # retrieve project content from projects table
        from app.models.project import Project
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        ver = VersionModel(
            project_id=project_id,
            user_id=current_user.id,
            version_number=next_version,
            content=project.content,
        )
        db.add(ver)
        db.commit()
        db.refresh(ver)

        return DocumentVersionResponse(
            id=str(ver.id),
            project_id=str(ver.project_id),
            user_id=str(ver.user_id),
            version_number=ver.version_number,
            content=ver.content,
            created_at=ver.created_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create version: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_id}/versions", response_model=list[DocumentVersionResponse])
async def list_versions(project_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    vers = db.query(VersionModel).filter(VersionModel.project_id == project_id).order_by(VersionModel.version_number.asc()).all()
    return [
        DocumentVersionResponse(
            id=str(v.id),
            project_id=str(v.project_id),
            user_id=str(v.user_id),
            version_number=v.version_number,
            content=v.content,
            created_at=v.created_at,
        )
        for v in vers
    ]



@router.post("/projects/{project_id}/invite")
async def invite_collaborators(project_id: str, payload: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Send invite emails to provided addresses. Payload: { "emails": [str], "role": "editor" }
    Requires the caller to be an authenticated user. In production this should enforce owner/admin only."""
    emails = payload.get('emails') or []
    role = payload.get('role', 'editor')
    if not emails:
        raise HTTPException(status_code=400, detail="No emails provided")

    # permission: only project owner or project admin can send invites
    from app.models.project import Project
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # check if current_user is owner
    allowed = False
    if str(project.user_id) == str(current_user.id):
        allowed = True
    else:
        # check project member role
        pm = db.query(PMModel).filter(PMModel.project_id == project_id, PMModel.user_id == current_user.id).first()
        if pm and pm.role in (MemberRole.OWNER, MemberRole.ADMIN):
            allowed = True

    if not allowed:
        raise HTTPException(status_code=403, detail="Only project owner or admins may send invites")

    sent = []
    for em in emails:
        token = create_invite_token({"project_id": project_id, "email": em, "role": role})
        link = f"{settings.FRONTEND_URL}/projects/{project_id}?invite_token={token}"
        subject = f"You're invited to collaborate on project {project.title or project_id}"
        html = f"<p>You've been invited to collaborate on <strong>{project.title or project_id}</strong>. Click <a href=\"{link}\">here</a> to open the project and accept the invite.</p>"
        ok = send_email(em, subject, html, text_body=f"Open the link to accept: {link}", invite_link=link)

        # Always append the invite link to a local file so developers can copy it if email delivery fails
        try:
            links_path = Path(__file__).resolve().parents[2] / 'invite_links.txt'
            links_path.parent.mkdir(parents=True, exist_ok=True)
            with open(links_path, 'a', encoding='utf-8') as lf:
                lf.write(f"{datetime.utcnow().isoformat()} | {em} | {project_id} | {link}\n")
        except Exception:
            logger.exception("Failed to write invite link to invite_links.txt")

        # persist invite record
        try:
            inv = InviteModel(project_id=project_id, email=em, role=role, token=token, created_by=current_user.id)
            db.add(inv)
            db.commit()
            db.refresh(inv)
            sent.append({"email": em, "sent": ok, "invite_id": str(inv.id), "link": link})
            # If a user account exists with this email, create an in-app notification for them
            try:
                # case-insensitive match
                u = db.query(User).filter(func.lower(User.email) == em.lower()).first()
                if u:
                    note = NotificationModel(user_id=u.id, type='invite', payload={"invite_id": str(inv.id), "project_id": str(project_id), "link": link, "role": role})
                    db.add(note)
                    db.commit()
            except Exception:
                db.rollback()
                logger.exception("Failed to create notification for invite")
        except Exception:
            db.rollback()
            # still return the invite link for development/testing even if persisting failed
            sent.append({"email": em, "sent": ok, "invite_id": None, "link": link})

    return {"sent": sent}


@router.post("/projects/{project_id}/invite/accept")
async def accept_invite(project_id: str, payload: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Accept an invite. Payload: { "token": "..." }
    User must be authenticated and their email must match the invite email."""
    token = payload.get('token')
    if not token:
        raise HTTPException(status_code=400, detail="Missing token")
    inv = decode_invite_token(token)
    if not inv:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    if str(inv.get('project_id')) != str(project_id):
        raise HTTPException(status_code=400, detail="Invite token does not match project")
    invite_email = inv.get('email')
    role = inv.get('role', 'editor')

    # require the accepting user to have the same email
    if not hasattr(current_user, 'email') or current_user.email.lower() != invite_email.lower():
        raise HTTPException(status_code=403, detail="Authenticated user's email does not match invite email")

    # find invite record
    inv_rec = db.query(InviteModel).filter(InviteModel.project_id == project_id, InviteModel.token == token).first()
    if not inv_rec:
        raise HTTPException(status_code=404, detail="Invite not found or already used")

    # create project member entry
    try:
        member = PMModel(project_id=project_id, user_id=current_user.id, role=role)
        db.add(member)
        inv_rec.accepted = True
        inv_rec.accepted_at = datetime.utcnow()
        db.commit()
        db.refresh(member)
        db.refresh(inv_rec)
        created = ProjectMember(user_id=str(member.user_id), email=current_user.email, full_name=current_user.full_name or '', role=member.role)
        try:
            await ws_manager.broadcast(project_id, {"type": "member_added", "payload": created.dict()})
        except Exception:
            pass
        return {"added": True, "member": created}
    except Exception as e:
        db.rollback()
        logger.exception("Failed to accept invite")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_id}/invites", response_model=list[InviteResponse])
async def list_invites(project_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # only owner/admin may view invites
    from app.models.project import Project
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    allowed = False
    if str(project.user_id) == str(current_user.id):
        allowed = True
    else:
        pm = db.query(PMModel).filter(PMModel.project_id == project_id, PMModel.user_id == current_user.id).first()
        if pm and pm.role in (MemberRole.OWNER, MemberRole.ADMIN):
            allowed = True
    if not allowed:
        raise HTTPException(status_code=403, detail="Forbidden")

    invs = db.query(InviteModel).filter(InviteModel.project_id == project_id).order_by(InviteModel.created_at.desc()).all()
    out = []
    for i in invs:
        link = f"{settings.FRONTEND_URL}/projects/{project_id}?invite_token={i.token}"
        out.append(InviteResponse(id=str(i.id), project_id=str(i.project_id), email=i.email, role=i.role, token=i.token, created_by=str(i.created_by), created_at=i.created_at, accepted=i.accepted, accepted_at=i.accepted_at, link=link))
    return out


@router.delete("/projects/{project_id}/invites/{invite_id}")
async def revoke_invite(project_id: str, invite_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # only owner/admin may revoke
    from app.models.project import Project
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    allowed = False
    if str(project.user_id) == str(current_user.id):
        allowed = True
    else:
        pm = db.query(PMModel).filter(PMModel.project_id == project_id, PMModel.user_id == current_user.id).first()
        if pm and pm.role in (MemberRole.OWNER, MemberRole.ADMIN):
            allowed = True
    if not allowed:
        raise HTTPException(status_code=403, detail="Forbidden")

    inv = db.query(InviteModel).filter(InviteModel.id == invite_id, InviteModel.project_id == project_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invite not found")
    try:
        db.delete(inv)
        db.commit()
        return {"revoked": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users/me/notifications", response_model=list[NotificationResponse])
async def list_my_notifications(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    notes = db.query(NotificationModel).filter(NotificationModel.user_id == current_user.id).order_by(NotificationModel.created_at.desc()).all()
    out = []
    for n in notes:
        out.append(NotificationResponse(id=str(n.id), user_id=str(n.user_id), type=n.type, payload=n.payload, read=n.read, created_at=n.created_at))
    return out


@router.post("/projects/{project_id}/invites/{invite_id}/respond")
async def respond_invite(project_id: str, invite_id: str, payload: NotificationAction, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # Find invite
    inv = db.query(InviteModel).filter(InviteModel.id == invite_id, InviteModel.project_id == project_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invite not found")

    # Must match email
    if not hasattr(current_user, 'email') or current_user.email.lower() != inv.email.lower():
        raise HTTPException(status_code=403, detail="Authenticated user's email does not match invite email")

    action = (payload.action or '').lower()
    if action not in ('accept', 'reject'):
        raise HTTPException(status_code=400, detail="Invalid action")

    # mark notification(s) read
    try:
        notes = db.query(NotificationModel).filter(NotificationModel.user_id == current_user.id, NotificationModel.payload['invite_id'].astext == str(invite_id)).all()
        for n in notes:
            n.read = True
        db.commit()
    except Exception:
        db.rollback()

    if action == 'reject':
        try:
            inv.accepted = False
            inv.accepted_at = datetime.utcnow()
            db.commit()
            return {"accepted": False}
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))

    # accept
    try:
        member = PMModel(project_id=project_id, user_id=current_user.id, role=inv.role)
        db.add(member)
        inv.accepted = True
        inv.accepted_at = datetime.utcnow()
        db.commit()
        db.refresh(member)
        created = ProjectMember(user_id=str(member.user_id), email=current_user.email, full_name=current_user.full_name or '', role=member.role)
        try:
            await ws_manager.broadcast(project_id, {"type": "member_added", "payload": created.dict()})
        except Exception:
            pass
        return {"added": True, "member": created}
    except Exception as e:
        db.rollback()
        logger.exception("Failed to accept invite via notification")
        raise HTTPException(status_code=500, detail=str(e))
