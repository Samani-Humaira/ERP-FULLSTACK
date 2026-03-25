from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from app.models.user import UserRole


class SignupRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    role: UserRole = UserRole.RESEARCHER
    institution: str | None = Field(default=None, max_length=200)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: UserRole
    institution: str | None
    is_verified: bool
    is_active: bool

    class Config:
        from_attributes = True

class UpdateProfileRequest(BaseModel):
    full_name: str | None = None
    institution: str | None = None