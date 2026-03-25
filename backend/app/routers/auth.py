import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.auth.hashing import hash_password, verify_password
from app.auth.jwt_handler import create_access_token
from app.auth.dependencies import get_current_user
from app.auth.auth_schemas import (
    SignupRequest, LoginRequest,
    TokenResponse, UserResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/signup",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new researcher or student account",
)
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    # Check if email already exists
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        full_name=request.full_name,
        role=request.role,
        institution=request.institution,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

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