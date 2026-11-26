import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


RoleType = Literal["admin", "moderator", "attacker", "defender"]


def validate_bcrypt_password(v: str) -> str:
    """Enforce 8-character minimum and bcrypt's 72-byte UTF-8 maximum."""
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters")
    if len(v.encode("utf-8")) > 72:
        raise ValueError("Password must be at most 72 UTF-8 bytes")
    return v


def validate_optional_bcrypt_password(v: Optional[str]) -> Optional[str]:
    """Validate optional update password only when non-empty."""
    if v is None or v == "":
        return None
    return validate_bcrypt_password(v)


# --- Auth & Account Schemas ---
class LoginRequest(BaseModel):
    username_or_email: str
    password: str
    account_type: Optional[str] = None  # 'admin', 'moderator', 'attacker', 'defender'


class RegisterRequest(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role: Literal["attacker", "defender"]

    @field_validator("password")
    @classmethod
    def check_bcrypt_byte_limit(cls, v: str) -> str:
        return validate_bcrypt_password(v)


class AuthUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    role: str
    created_at: datetime.datetime


class LoginResponse(BaseModel):
    status: str
    message: str
    user: AuthUserResponse


class PasswordChangeRequest(BaseModel):
    role: RoleType
    user_id: int
    current_password: str
    new_password: str = Field(min_length=8, max_length=72)

    @field_validator("new_password")
    @classmethod
    def check_new_password_limit(cls, v: str) -> str:
        return validate_bcrypt_password(v)


class AccountDeleteRequest(BaseModel):
    role: RoleType
    user_id: int
    password: str


# --- Account Creation / Management Schemas ---
class AccountCreate(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    admin_id: Optional[int] = None
    moderator_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def check_password_limit(cls, v: str) -> str:
        return validate_bcrypt_password(v)


class ModeratorCreate(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    admin_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def check_password_limit(cls, v: str) -> str:
        return validate_bcrypt_password(v)


class ModeratorUpdate(BaseModel):
    username: Optional[str] = Field(default=None, min_length=2, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    admin_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def check_optional_password(cls, v: Optional[str]) -> Optional[str]:
        return validate_optional_bcrypt_password(v)


class ModeratorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    moderator_id: int
    admin_id: Optional[int] = None
    username: str
    email: str
    created_at: datetime.datetime
    challenges_count: int = 0
    accounts_managed: int = 0


class AttackerCreate(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    moderator_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def check_password_limit(cls, v: str) -> str:
        return validate_bcrypt_password(v)


class AttackerUpdate(BaseModel):
    username: Optional[str] = Field(default=None, min_length=2, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    moderator_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def check_optional_password(cls, v: Optional[str]) -> Optional[str]:
        return validate_optional_bcrypt_password(v)


class AttackerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    attacker_id: int
    moderator_id: Optional[int] = None
    username: str
    email: str
    created_at: datetime.datetime
    attempts_count: int = 0
    total_score: int = 0


class DefenderCreate(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    moderator_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def check_password_limit(cls, v: str) -> str:
        return validate_bcrypt_password(v)


class DefenderUpdate(BaseModel):
    username: Optional[str] = Field(default=None, min_length=2, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    moderator_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def check_optional_password(cls, v: Optional[str]) -> Optional[str]:
        return validate_optional_bcrypt_password(v)


class DefenderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    defender_id: int
    moderator_id: Optional[int] = None
    username: str
    email: str
    created_at: datetime.datetime
    defenses_count: int = 0
    total_score: int = 0


# --- Challenge Schemas ---
class ChallengeBase(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    vulnerability_type: str = Field(min_length=1, max_length=50)
    difficulty: str = Field(default="Medium", min_length=1, max_length=20)
    dvwa_page_ref: str = Field(min_length=1, max_length=100)
    reference_payload: str = Field(min_length=1)


class ChallengeCreate(ChallengeBase):
    moderator_id: Optional[int] = None


class ChallengeUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=100)
    vulnerability_type: Optional[str] = Field(default=None, min_length=1, max_length=50)
    difficulty: Optional[str] = Field(default=None, min_length=1, max_length=20)
    dvwa_page_ref: Optional[str] = Field(default=None, min_length=1, max_length=100)
    reference_payload: Optional[str] = Field(default=None, min_length=1)
    moderator_id: Optional[int] = None


class ChallengeResponse(ChallengeBase):
    model_config = ConfigDict(from_attributes=True)

    challenge_id: int
    moderator_id: Optional[int] = None


# --- Attempt Schemas (Attacker) ---
class AttemptCreate(BaseModel):
    attacker_id: int
    challenge_id: int
    payload_used: str = Field(min_length=1)


class AttemptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    attempt_id: int
    attacker_id: int
    challenge_id: int
    challenge_title: Optional[str] = None
    payload_used: str
    status: str
    timestamp: datetime.datetime
    score_earned: int


# --- Defense Schemas (Defender) ---
class DefenseCreate(BaseModel):
    defender_id: int
    challenge_id: int
    security_level_applied: str

    @field_validator("security_level_applied")
    @classmethod
    def check_security_level(cls, v: str) -> str:
        normalized = v.strip().lower()
        if normalized not in {"low", "medium", "high", "impossible"}:
            raise ValueError("security_level_applied must be one of: low, medium, high, impossible")
        return normalized


class DefenseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    defense_id: int
    defender_id: int
    challenge_id: int
    challenge_title: Optional[str] = None
    security_level_applied: str
    verified: bool
    timestamp: datetime.datetime
    score_earned: int


# --- Alert & Activity Schemas ---
class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    alert_id: int
    challenge_id: Optional[int] = None
    alert_type: str
    message: str
    timestamp: datetime.datetime


class ActivityItemResponse(BaseModel):
    id: str
    kind: Literal["alert", "attempt", "defense"]
    title: str
    subtitle: str
    challenge_id: Optional[int] = None
    challenge_title: Optional[str] = None
    actor: str
    status: str
    timestamp: datetime.datetime


# --- Platform Stats (Admin) ---
class PlatformStatsResponse(BaseModel):
    admins_count: int
    moderators_count: int
    attackers_count: int
    defenders_count: int
    challenges_count: int
    total_attempts: int
    total_defenses: int
    total_alerts: int
