import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import ProjectSaveRequest, ProjectResponse, ProjectDetailResponse
from app.models.project import Project
from app.auth.dependencies import get_current_user
from datetime import datetime
import uuid
from app.models.collaboration import ProjectMember as PMModel, MemberRole
from sqlalchemy import or_

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/save",
    response_model=ProjectResponse,
    summary="Save a research paper or proposal project",
)
async def save_project(
    request: ProjectSaveRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
) -> ProjectResponse:
    """Save a generated paper or proposal to the user's projects."""
    try:
        logger.info(f"User {current_user.email} saving project: {request.title}")

        project = Project(
            user_id=current_user.id,
            title=request.title,
            description=request.description,
            project_type=request.project_type,
            query=request.query,
            content=request.content,
            papers_data=[p.dict() for p in request.papers_data] if request.papers_data else None,
            gaps_data=request.gaps_data,
        )

        db.add(project)
        db.commit()
        db.refresh(project)

        return ProjectResponse(
            id=str(project.id),
            title=project.title,
            description=project.description,
            project_type=project.project_type,
            query=project.query,
            created_at=project.created_at.isoformat(),
            updated_at=project.updated_at.isoformat(),
            is_public=project.is_public,
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save project: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save project: {str(e)}")


@router.get(
    "/projects",
    response_model=list[ProjectResponse],
    summary="Get user's saved projects",
)
async def list_projects(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
) -> list[ProjectResponse]:
    """Retrieve all saved projects for the current user."""
    try:
        # Return projects where the user is the owner OR is a project member
        owner_q = db.query(Project).filter(Project.user_id == current_user.id)
        member_q = db.query(Project).join(PMModel, Project.id == PMModel.project_id).filter(PMModel.user_id == current_user.id)
        # Use UNION ALL to avoid requiring equality operators on JSON columns
        projects = owner_q.union_all(member_q).order_by(Project.created_at.desc()).all()

        return [
            ProjectResponse(
                id=str(p.id),
                title=p.title,
                description=p.description,
                project_type=p.project_type,
                query=p.query,
                created_at=p.created_at.isoformat(),
                updated_at=p.updated_at.isoformat(),
                is_public=p.is_public,
            )
            for p in projects
        ]

    except Exception as e:
        logger.error(f"Failed to retrieve projects: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve projects: {str(e)}")


@router.get(
    "/projects/{project_id}",
    response_model=ProjectDetailResponse,
    summary="Get a specific project with full content",
)
async def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
) -> ProjectDetailResponse:
    """Retrieve a specific project with full content and metadata."""
    try:
        # allow access if owner or member
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        is_owner = str(project.user_id) == str(current_user.id)
        if not is_owner:
            # check membership
            pm = db.query(PMModel).filter(PMModel.project_id == project_id, PMModel.user_id == current_user.id).first()
            if not pm:
                raise HTTPException(status_code=404, detail="Project not found")

        return ProjectDetailResponse(
            id=str(project.id),
            title=project.title,
            description=project.description,
            project_type=project.project_type,
            query=project.query,
            content=project.content,
            papers_data=[p for p in project.papers_data] if project.papers_data else None,
            gaps_data=project.gaps_data,
            created_at=project.created_at.isoformat(),
            updated_at=project.updated_at.isoformat(),
            is_public=project.is_public,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve project: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve project: {str(e)}")


@router.delete(
    "/projects/{project_id}",
    summary="Delete a saved project",
)
async def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Delete a saved project."""
    try:
        project = db.query(Project).filter(
            Project.id == project_id,
            Project.user_id == current_user.id
        ).first()

        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        db.delete(project)
        db.commit()

        return {"message": "Project deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete project: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {str(e)}")



@router.patch(
    "/projects/{project_id}",
    summary="Update project content",
)
async def update_project_content(
    project_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Update the project content JSON for the current user."""
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # allow update if owner or member with sufficient role
        if str(project.user_id) != str(current_user.id):
            pm = db.query(PMModel).filter(PMModel.project_id == project_id, PMModel.user_id == current_user.id).first()
            if not pm or pm.role not in (MemberRole.OWNER, MemberRole.ADMIN, MemberRole.EDITOR):
                raise HTTPException(status_code=403, detail="Forbidden")

        project.content = payload
        db.add(project)
        db.commit()
        db.refresh(project)

        return {"message": "Updated"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update project: {e}")
        raise HTTPException(status_code=500, detail=str(e))
