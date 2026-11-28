import datetime
import re
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from .security import validate_strong_password


RoleType = Literal["admin", "moderator", "attacker", "defender"]

_DVWA_PAGE_REF_RE = re.compile(
    r"vulnerabilities/[a-z0-9_]+/(?:\?[a-z0-9_=&%-]*)?",
    re.IGNORECASE,
)


def validate_optional_strong_password(
    v: Optional[str],
    username: Optional[str] = None,
    email: Optional[str] = None,
) -> Optional[str]:
    """Validate optional update password only when non-empty."""
    if v is None or v == "":
        return None
    return validate_strong_password(v, username=username, email=email)


def validate_dvwa_page_ref(value: str) -> str:
    """Enforce SSRF-safe canonical relative DVWA vulnerability paths."""
    if not isinstance(value, str):
        raise ValueError("dvwa_page_ref must be a string")
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("dvwa_page_ref cannot be empty")
    if any(ord(ch) < 32 or ord(ch) == 127 or ch.isspace() for ch in cleaned):
        raise ValueError("dvwa_page_ref must not contain whitespace or control characters")
    lowered = cleaned.lower()
    if "://" in lowered or lowered.startswith(("http:", "https:", "//")) or ".." in cleaned or "@" in cleaned:
        raise ValueError("dvwa_page_ref must be a relative vulnerabilities/<module>/ path")
    if not _DVWA_PAGE_REF_RE.fullmatch(cleaned):
        raise ValueError("dvwa_page_ref must match vulnerabilities/<module>/[?query]")
    return cleaned


# --- Auth & Account Schemas ---
class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username_or_email: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=256)
    account_type: Optional[str] = Field(default=None, max_length=20)  # 'admin', 'moderator', 'attacker', 'defender'


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str = Field(min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(min_length=10, max_length=72)
    role: Literal["attacker", "defender"]

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validate_strong_password(v)

    @model_validator(mode="after")
    def check_password_against_identity(self):
        validate_strong_password(self.password, username=self.username, email=str(self.email))
        return self


class AuthUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    id: int
    username: str
    email: str
    role: str
    created_at: datetime.datetime


class LoginResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str
    message: str
    user: AuthUserResponse
    csrf_token: Optional[str] = None
    access_token: Optional[str] = None


class SessionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    user: AuthUserResponse
    csrf_token: str


class PasswordChangeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Optional[RoleType] = None
    user_id: Optional[int] = None
    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=10, max_length=72)

    @field_validator("new_password")
    @classmethod
    def check_new_password_strength(cls, v: str) -> str:
        return validate_strong_password(v)


class AccountDeleteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Optional[RoleType] = None
    user_id: Optional[int] = None
    password: str = Field(min_length=1, max_length=256)


# --- Account Creation / Management Schemas ---
class AccountCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str = Field(min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(min_length=10, max_length=72)
    admin_id: Optional[int] = None
    moderator_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validate_strong_password(v)

    @model_validator(mode="after")
    def check_password_against_identity(self):
        validate_strong_password(self.password, username=self.username, email=str(self.email))
        return self


class ModeratorCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str = Field(min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(min_length=10, max_length=72)
    admin_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validate_strong_password(v)

    @model_validator(mode="after")
    def check_password_against_identity(self):
        validate_strong_password(self.password, username=self.username, email=str(self.email))
        return self


class ModeratorUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: Optional[str] = Field(default=None, min_length=2, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    admin_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def check_optional_password(cls, v: Optional[str]) -> Optional[str]:
        return validate_optional_strong_password(v)

    @model_validator(mode="after")
    def check_password_against_identity(self):
        if self.password:
            validate_strong_password(
                self.password,
                username=self.username,
                email=str(self.email) if self.email is not None else None,
            )
        return self


class ModeratorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    moderator_id: int
    admin_id: Optional[int] = None
    username: str
    email: str
    created_at: datetime.datetime
    challenges_count: int = 0
    accounts_managed: int = 0


class AttackerCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str = Field(min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(min_length=10, max_length=72)
    moderator_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validate_strong_password(v)

    @model_validator(mode="after")
    def check_password_against_identity(self):
        validate_strong_password(self.password, username=self.username, email=str(self.email))
        return self


class AttackerUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: Optional[str] = Field(default=None, min_length=2, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    moderator_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def check_optional_password(cls, v: Optional[str]) -> Optional[str]:
        return validate_optional_strong_password(v)

    @model_validator(mode="after")
    def check_password_against_identity(self):
        if self.password:
            validate_strong_password(
                self.password,
                username=self.username,
                email=str(self.email) if self.email is not None else None,
            )
        return self


class AttackerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    attacker_id: int
    moderator_id: Optional[int] = None
    username: str
    email: str
    created_at: datetime.datetime
    attempts_count: int = 0
    total_score: int = 0


class DefenderCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str = Field(min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(min_length=10, max_length=72)
    moderator_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validate_strong_password(v)

    @model_validator(mode="after")
    def check_password_against_identity(self):
        validate_strong_password(self.password, username=self.username, email=str(self.email))
        return self


class DefenderUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: Optional[str] = Field(default=None, min_length=2, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    moderator_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def check_optional_password(cls, v: Optional[str]) -> Optional[str]:
        return validate_optional_strong_password(v)

    @model_validator(mode="after")
    def check_password_against_identity(self):
        if self.password:
            validate_strong_password(
                self.password,
                username=self.username,
                email=str(self.email) if self.email is not None else None,
            )
        return self


class DefenderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    defender_id: int
    moderator_id: Optional[int] = None
    username: str
    email: str
    created_at: datetime.datetime
    defenses_count: int = 0
    total_score: int = 0


# --- Challenge Schemas ---
class ChallengeBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=100)
    vulnerability_type: str = Field(min_length=1, max_length=50)
    difficulty: str = Field(default="Medium", min_length=1, max_length=20)
    dvwa_page_ref: str = Field(min_length=1, max_length=100)
    reference_payload: str = Field(min_length=1)

    @field_validator("dvwa_page_ref")
    @classmethod
    def check_dvwa_page_ref(cls, v: str) -> str:
        return validate_dvwa_page_ref(v)


class ChallengeCreate(ChallengeBase):
    moderator_id: Optional[int] = None


class ChallengeUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Optional[str] = Field(default=None, min_length=1, max_length=100)
    vulnerability_type: Optional[str] = Field(default=None, min_length=1, max_length=50)
    difficulty: Optional[str] = Field(default=None, min_length=1, max_length=20)
    dvwa_page_ref: Optional[str] = Field(default=None, min_length=1, max_length=100)
    reference_payload: Optional[str] = Field(default=None, min_length=1)
    moderator_id: Optional[int] = None

    @field_validator("dvwa_page_ref")
    @classmethod
    def check_optional_dvwa_page_ref(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return validate_dvwa_page_ref(v)


class ChallengeResponse(ChallengeBase):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    challenge_id: int
    moderator_id: Optional[int] = None
    reference_payload: Optional[str] = None


class ChallengeSourceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    challenge_id: int
    module_key: Optional[str] = None
    source_available: bool
    vulnerable_code: Optional[str] = None
    hardened_code: Optional[str] = None
    sources_by_tier: dict[str, str] = {}
    sink_pattern: Optional[str] = None
    vulnerable_lines: list[int] = []
    track_id: str = ""
    track_title: str = ""
    track_order: int = 0
    stage_guides: dict[str, dict] = {}
    owasp_category: str
    hints: list[dict]
    debrief: dict
    patch_quiz: dict


class DvwaHealthResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: Literal["ok", "setup_required", "offline"]
    reachable: bool
    initialized: bool
    base_url: str


# --- Attempt Schemas (Attacker) ---
class AttemptCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    attacker_id: Optional[int] = None
    challenge_id: int
    payload_used: str = Field(min_length=1, max_length=4000)
    target_security_level: Optional[str] = "low"

    @field_validator("payload_used")
    @classmethod
    def sanitize_payload_used(cls, v: str) -> str:
        cleaned = v.replace("\x00", "")
        if not cleaned:
            raise ValueError("payload_used cannot be empty")
        if len(cleaned) > 4000:
            raise ValueError("payload_used must be at most 4000 characters")
        return cleaned


class AttemptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    attempt_id: int
    attacker_id: int
    challenge_id: int
    challenge_title: Optional[str] = None
    payload_used: str
    status: str
    timestamp: datetime.datetime
    score_earned: int
    target_security_level: str = "low"
    verification_mode: Optional[Literal["dvwa_live", "heuristic_fallback"]] = None
    dvwa_http_status: Optional[int] = None
    dvwa_security_level: Optional[str] = None
    evidence: Optional[str] = None
    wire_trace: Optional[dict] = None


# --- Defense Schemas (Defender) ---
class DefenseCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    defender_id: Optional[int] = None
    challenge_id: int
    security_level_applied: str
    patch_option_id: Optional[str] = Field(default=None, max_length=64)

    @field_validator("security_level_applied")
    @classmethod
    def check_security_level(cls, v: str) -> str:
        normalized = v.strip().lower()
        if normalized not in {"low", "medium", "high", "impossible"}:
            raise ValueError("security_level_applied must be one of: low, medium, high, impossible")
        return normalized


class DefenseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    defense_id: int
    defender_id: int
    challenge_id: int
    challenge_title: Optional[str] = None
    security_level_applied: str
    verified: bool
    timestamp: datetime.datetime
    score_earned: int
    verification_mode: Optional[Literal["dvwa_live", "heuristic_fallback"]] = None
    dvwa_http_status: Optional[int] = None
    dvwa_security_level: Optional[str] = None
    evidence: Optional[str] = None
    baseline_before: Optional[dict] = None
    patch_correct: Optional[bool] = None
    patch_feedback: Optional[str] = None
    wire_trace: Optional[dict] = None


# --- Alert & Activity Schemas ---
class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    alert_id: int
    challenge_id: Optional[int] = None
    alert_type: str
    message: str
    timestamp: datetime.datetime


class ActivityItemResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

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
    model_config = ConfigDict(extra="ignore")

    admins_count: int
    moderators_count: int
    attackers_count: int
    defenders_count: int
    challenges_count: int
    total_attempts: int
    total_defenses: int
    total_alerts: int
