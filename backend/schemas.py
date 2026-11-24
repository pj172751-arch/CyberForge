import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr

# --- Auth Schemas ---
class LoginRequest(BaseModel):
    username_or_email: str
    password: str
    account_type: Optional[str] = None  # 'admin', 'moderator', 'attacker', 'defender' (auto-detected if omitted)

class AuthUserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    status: str
    message: str
    user: AuthUserResponse

# --- Account Creation Schemas ---
class AccountCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    admin_id: Optional[int] = None
    moderator_id: Optional[int] = None

# --- Challenge Schemas ---
class ChallengeBase(BaseModel):
    title: str
    vulnerability_type: str
    difficulty: str = "Medium"
    dvwa_page_ref: str
    reference_payload: str

class ChallengeCreate(ChallengeBase):
    moderator_id: Optional[int] = None

class ChallengeResponse(ChallengeBase):
    challenge_id: int
    moderator_id: Optional[int] = None

    class Config:
        from_attributes = True

# --- Attempt Schemas (Attacker) ---
class AttemptCreate(BaseModel):
    attacker_id: int
    challenge_id: int
    payload_used: str

class AttemptResponse(BaseModel):
    attempt_id: int
    attacker_id: int
    challenge_id: int
    payload_used: str
    status: str
    timestamp: datetime.datetime
    score_earned: int

    class Config:
        from_attributes = True

# --- Defense Schemas (Defender) ---
class DefenseCreate(BaseModel):
    defender_id: int
    challenge_id: int
    security_level_applied: str  # 'low', 'medium', 'high', 'impossible'

class DefenseResponse(BaseModel):
    defense_id: int
    defender_id: int
    challenge_id: int
    security_level_applied: str
    verified: bool
    timestamp: datetime.datetime
    score_earned: int

    class Config:
        from_attributes = True

# --- Alert Schemas ---
class AlertResponse(BaseModel):
    alert_id: int
    challenge_id: Optional[int] = None
    alert_type: str
    message: str
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

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
