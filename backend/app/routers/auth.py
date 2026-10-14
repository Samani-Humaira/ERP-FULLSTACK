import logging
import hashlib
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import PasswordResetToken, User
from app.models.collaboration import Invite as InviteModel, Notification as NotificationModel
from app.auth.hashing import hash_password, verify_password
from app.auth.jwt_handler import create_access_token
from app.auth.dependencies import get_current_user
from app.auth.auth_schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    PasswordResetMessage,
    ResetPasswordRequest,
    SignupRequest,
    TokenResponse,
    UserResponse,
)
from app.config import settings
from app.services.emailer import send_email

logger = logging.getLogger(__name__)
router = APIRouter()

RESET_TOKEN_LIFETIME = timedelta(minutes=30)
RESET_REQUEST_COOLDOWN = timedelta(minutes=1)


@router.post(
    "/password/forgot",
    response_model=PasswordResetMessage,
    summary="Request a password reset email",
)
def request_password_reset(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> PasswordResetMessage:
    # Always return the same response to avoid disclosing whether an account exists.
    generic_message = (
        "If an account exists for that email, a password reset link will be sent shortly."
    )
    now = datetime.utcnow()
    email = str(request.email).strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if not user or not user.is_active:
        return PasswordResetMessage(message=generic_message)

    recently_requested = (
        db.query(PasswordResetToken.id)
        .filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.created_at >= now - RESET_REQUEST_COOLDOWN,
        )
        .first()
    )
    if recently_requested:
        return PasswordResetMessage(message=generic_message)

    raw_token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    reset_record = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        created_at=now,
        expires_at=now + RESET_TOKEN_LIFETIME,
    )
    try:
        db.add(reset_record)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Could not persist password reset token")
        return PasswordResetMessage(message=generic_message)

    reset_url = (
        f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={raw_token}"
    )
    delivered = send_email(
        user.email,
        "Reset your ERP Research password",
        (
            "<p>We received a request to reset your password.</p>"
            f'<p><a href="{reset_url}">Reset your password</a></p>'
            "<p>This link expires in 30 minutes and can only be used once. "
            "If you did not request this, you can ignore this email.</p>"
        ),
        text_body=(
            f"Reset your password using this link: {reset_url}\n\n"
            "This link expires in 30 minutes and can only be used once."
        ),
        save_copy=False,
    )
    if not delivered:
        logger.warning("Password reset email could not be sent")
        try:
            db.delete(reset_record)
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("Could not remove undelivered password reset token")

    return PasswordResetMessage(message=generic_message)


@router.post(
    "/password/reset",
    response_model=PasswordResetMessage,
    summary="Complete a password reset",
)
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> PasswordResetMessage:
    now = datetime.utcnow()
    token_hash = hashlib.sha256(request.token.encode("utf-8")).hexdigest()
    reset_record = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
        .first()
    )
    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link is invalid or expired. Request a new one.",
        )

    user = db.query(User).filter(User.id == reset_record.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link is invalid or expired. Request a new one.",
        )

    try:
        consumed = (
            db.query(PasswordResetToken)
            .filter(
                PasswordResetToken.id == reset_record.id,
                PasswordResetToken.used_at.is_(None),
                PasswordResetToken.expires_at > now,
            )
            .update(
                {PasswordResetToken.used_at: now},
                synchronize_session=False,
            )
        )
        if consumed != 1:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This password reset link is invalid or expired. Request a new one.",
            )

        user.password_hash = hash_password(request.new_password)
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.id != reset_record.id,
        ).update({PasswordResetToken.used_at: now}, synchronize_session=False)
        db.commit()
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("Could not complete password reset")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not reset password. Please try again.",
        ) from exc

    return PasswordResetMessage(message="Your password has been reset. You can now log in.")


@router.post(
    "/signup",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new researcher or student account",
)
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    normalized_email = str(request.email).strip().lower()
    # Check if email already exists
    existing = db.query(User).filter(User.email.ilike(normalized_email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    user = User(
        email=normalized_email,
        password_hash=hash_password(request.password),
        full_name=request.full_name,
        role=request.role,
        institution=request.institution,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Invitations sent before this account existed become dashboard notifications now.
    try:
        pending_invites = (
            db.query(InviteModel)
            .filter(
                InviteModel.email.ilike(normalized_email),
                InviteModel.accepted.is_(False),
            )
            .all()
        )
        existing_notifications = (
            db.query(NotificationModel)
            .filter(
                NotificationModel.user_id == user.id,
                NotificationModel.type == "invite",
            )
            .all()
        )
        notified_invite_ids = {
            str(note.payload.get("invite_id"))
            for note in existing_notifications
            if note.payload and note.payload.get("invite_id")
        }

        for invite in pending_invites:
            invite_id = str(invite.id)
            if invite_id in notified_invite_ids:
                continue
            link = (
                f"{settings.FRONTEND_URL}/projects/{invite.project_id}"
                f"?invite_token={invite.token}"
            )
            db.add(
                NotificationModel(
                    user_id=user.id,
                    type="invite",
                    payload={
                        "invite_id": invite_id,
                        "project_id": str(invite.project_id),
                        "link": link,
                        "role": invite.role.value,
                    },
                )
            )
        if pending_invites:
            db.commit()
    except Exception:
        db.rollback()
        logger.exception("Could not backfill pending invitation notifications")

    logger.info(f"New user registered: {user.email} ({user.role})")
    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and receive a JWT access token",
)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated. Contact support.",
        )

    token = create_access_token(data={
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
    })

    logger.info(f"User logged in: {user.email}")
    return TokenResponse(access_token=token)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current logged-in user details",
)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

from app.auth.auth_schemas import UpdateProfileRequest

@router.patch(
    "/me/update",
    response_model=UserResponse,
    summary="Update current user profile",
)
def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if request.full_name:
        current_user.full_name = request.full_name
    if request.institution is not None:
        current_user.institution = request.institution
    db.commit()
    db.refresh(current_user)
    return current_user