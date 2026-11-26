import csv
import datetime
import io
import os
from contextlib import asynccontextmanager
from typing import List, Optional, Tuple, Type

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from .auth import hash_password, verify_password
from .database import Base, SessionLocal, engine, get_db
from .models import Admin, Alert, Attempt, Attacker, Challenge, Defense, Defender, Moderator
from .schemas import (
    AccountDeleteRequest,
    ActivityItemResponse,
    AlertResponse,
    AttemptCreate,
    AttemptResponse,
    AttackerCreate,
    AttackerResponse,
    AttackerUpdate,
    AuthUserResponse,
    ChallengeCreate,
    ChallengeResponse,
    ChallengeUpdate,
    DefenderCreate,
    DefenderResponse,
    DefenderUpdate,
    DefenseCreate,
    DefenseResponse,
    LoginRequest,
    LoginResponse,
    ModeratorCreate,
    ModeratorResponse,
    ModeratorUpdate,
    PasswordChangeRequest,
    PlatformStatsResponse,
    RegisterRequest,
)


ROLE_MODELS: dict[str, Tuple[Type, str]] = {
    "attacker": (Attacker, "attacker_id"),
    "defender": (Defender, "defender_id"),
    "moderator": (Moderator, "moderator_id"),
    "admin": (Admin, "admin_id"),
}

CANONICAL_DVWA_CHALLENGES = [
    ("Broken Login", "SQLi", "Medium", "vulnerabilities/sqli/", "' OR '1'='1"),
    ("Reflected XSS", "XSS", "Easy", "vulnerabilities/xss_r/", "<script>alert(1)</script>"),
    ("File Disclosure", "LFI", "Medium", "vulnerabilities/fi/?page=", "../../../../etc/passwd"),
    ("Command Injection", "RCE", "Hard", "vulnerabilities/exec/", "127.0.0.1; id"),
    ("Privilege Escalation", "AuthZ", "Hard", "vulnerabilities/sqli_blind/", "1 UNION SELECT 1, @@version"),
    (
        "Insecure Deserialization",
        "Deserialization",
        "Medium",
        "vulnerabilities/unserialize/",
        'O:8:"Exploit":1:{s:4:"code";s:10:"phpinfo();";}',
    ),
    (
        "Web Shell Upload",
        "File Upload",
        "Hard",
        "vulnerabilities/upload/",
        "polyglot-upload.php.jpg (MIME bypass sample)",
    ),
    ("API Exploitation", "API", "Medium", "vulnerabilities/api/v1/", "GET /api/v1/users/export"),
    ("IDOR", "IDOR", "Medium", "vulnerabilities/idor/?id=", "?id=0 OR 1=1"),
    ("SSRF Explorer", "SSRF", "Hard", "vulnerabilities/ssrf/", "http://169.254.169.254/latest/meta-data/"),
    ("Broken Access Control", "Weak Session", "Medium", "vulnerabilities/weak_id/", "Cookie: dvwaSession=admin_token"),
    ("Final Breach", "Chaining", "Hard", "vulnerabilities/audit/", "Chain: SQLi -> Upload -> RCE"),
]

DIFFICULTY_POINTS = {
    "easy": 50,
    "medium": 100,
    "hard": 250,
}

VULN_PAYLOAD_HINTS: dict[str, tuple[str, ...]] = {
    "sqli": ("' or '1'='1", "1'='1", "or 1=1", "union select", "'--"),
    "authz": ("union select", "@@version", "1=1", "' or "),
    "xss": ("<script>", "onerror=", "onload=", "javascript:", "alert("),
    "lfi": ("../", "etc/passwd", "boot.ini"),
    "rce": ("; id", "| id", "&& id", "$(id)", "whoami", "uname"),
    "deserialization": ("o:8:", "phpinfo()", "__wakeup", "__destruct"),
    "file upload": (".php.", "polyglot", "mime"),
    "api": ("/api/v1/users/export", "users/export"),
    "idor": ("?id=0", "or 1=1", "id=1"),
    "ssrf": ("169.254.169.254", "meta-data", "http://127.0.0.1", "localhost"),
    "weak session": ("dvwasession=", "admin_token", "session="),
    "chaining": ("sqli", "upload", "rce"),
}


def _seed_initial_accounts() -> None:
    """Seed optional Admin and Moderator accounts solely from environment variables."""
    admin_email = os.getenv("SEED_ADMIN_EMAIL", "").strip().lower()
    admin_password = os.getenv("SEED_ADMIN_PASSWORD", "")
    admin_username = os.getenv("SEED_ADMIN_USERNAME", "admin_root").strip() or "admin_root"

    mod_email = os.getenv("SEED_MOD_EMAIL", "").strip().lower()
    mod_password = os.getenv("SEED_MOD_PASSWORD", "")
    mod_username = os.getenv("SEED_MOD_USERNAME", "moderator_lead").strip() or "moderator_lead"

    with SessionLocal() as session:
        admin_acc = None
        if admin_email and admin_password:
            admin_acc = session.query(Admin).filter(func.lower(Admin.email) == admin_email).first()
            if not admin_acc:
                admin_acc = Admin(
                    username=admin_username,
                    email=admin_email,
                    password=hash_password(admin_password),
                    created_at=datetime.datetime.utcnow(),
                )
                session.add(admin_acc)
                session.commit()
                session.refresh(admin_acc)
        else:
            print("Notice: SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD not set; skipping Admin seed.")

        if mod_email and mod_password:
            mod_acc = session.query(Moderator).filter(func.lower(Moderator.email) == mod_email).first()
            if not mod_acc:
                if not admin_acc:
                    admin_acc = session.query(Admin).first()
                mod_acc = Moderator(
                    admin_id=admin_acc.admin_id if admin_acc else None,
                    username=mod_username,
                    email=mod_email,
                    password=hash_password(mod_password),
                    created_at=datetime.datetime.utcnow(),
                )
                session.add(mod_acc)
                session.commit()
        else:
            print("Notice: SEED_MOD_EMAIL/SEED_MOD_PASSWORD not set; skipping Moderator seed.")


def _seed_initial_challenges() -> None:
    """Seed the 12 canonical DVWA challenges if the challenges table is empty."""
    with SessionLocal() as session:
        if session.query(Challenge).count() > 0:
            return
        first_mod = session.query(Moderator).order_by(Moderator.moderator_id.asc()).first()
        mod_id = first_mod.moderator_id if first_mod else None
        for title, vuln_type, difficulty, page_ref, ref_payload in CANONICAL_DVWA_CHALLENGES:
            session.add(
                Challenge(
                    moderator_id=mod_id,
                    title=title,
                    vulnerability_type=vuln_type,
                    difficulty=difficulty,
                    dvwa_page_ref=page_ref,
                    reference_payload=ref_payload,
                )
            )
        session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize schema and optionally seed configured accounts and challenges on startup."""
    try:
        Base.metadata.create_all(bind=engine)
        print("CyberForge database tables verified.")
        _seed_initial_accounts()
        _seed_initial_challenges()
    except Exception as e:
        print(f"Notice: Database connection not ready on startup ({e}). Run docker compose up -d.")
    yield


app = FastAPI(
    title="CyberForge API",
    description="Cybersecurity Training & Verification Backend against DVWA",
    version="1.0.0",
    lifespan=lifespan,
)

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip() and origin.strip() != "*"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# --- Shared Helpers ---

def _ensure_unique_credentials(
    db: Session,
    username: Optional[str],
    email: Optional[str],
    exclude_model: Optional[Type] = None,
    exclude_pk_attr: Optional[str] = None,
    exclude_id: Optional[int] = None,
) -> None:
    """Reject duplicate username or email across all 4 account tables with HTTP 409."""
    clean_username = username.strip() if username is not None else None
    clean_email = email.strip().lower() if email is not None else None

    if clean_username is not None and len(clean_username) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Username must be at least 2 characters",
        )

    for model in (Admin, Moderator, Attacker, Defender):
        query = db.query(model)
        if exclude_model is model and exclude_pk_attr and exclude_id is not None:
            query = query.filter(getattr(model, exclude_pk_attr) != exclude_id)

        if clean_username is not None and clean_email is not None:
            conflict = query.filter(
                (model.username == clean_username) | (func.lower(model.email) == clean_email)
            ).first()
        elif clean_username is not None:
            conflict = query.filter(model.username == clean_username).first()
        elif clean_email is not None:
            conflict = query.filter(func.lower(model.email) == clean_email).first()
        else:
            conflict = None

        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email or username already exists",
            )


def _apply_account_updates(
    db: Session,
    record,
    model: Type,
    pk_attr: str,
    record_id: int,
    payload,
) -> None:
    """Validate uniqueness and apply username/email/optional password updates."""
    new_username = payload.username.strip() if payload.username is not None else None
    new_email = payload.email.strip().lower() if payload.email is not None else None

    _ensure_unique_credentials(
        db,
        username=new_username,
        email=new_email,
        exclude_model=model,
        exclude_pk_attr=pk_attr,
        exclude_id=record_id,
    )

    if new_username is not None:
        record.username = new_username
    if new_email is not None:
        record.email = new_email
    if payload.password:
        record.password = hash_password(payload.password)


def _validate_fk_exists(db: Session, model: Type, pk_attr: str, fk_id: Optional[int], label: str) -> None:
    """Ensure an optional foreign key target exists before writing."""
    if fk_id is None:
        return
    if not db.query(model).filter(getattr(model, pk_attr) == fk_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{label} not found")


def _evaluate_attempt_payload(challenge: Challenge, payload_used: str) -> bool:
    """Evaluate submitted exploit payload against the challenge reference vector."""
    submitted = payload_used.strip()
    if not submitted:
        return False
    ref = challenge.reference_payload.strip()
    submitted_lower = submitted.lower()
    ref_lower = ref.lower()
    if submitted == ref or ref_lower in submitted_lower:
        return True

    vuln_key = challenge.vulnerability_type.strip().lower()
    hints = VULN_PAYLOAD_HINTS.get(vuln_key, ())
    if any(hint in submitted_lower for hint in hints):
        return True

    return "1'='1" in submitted or "<script>" in submitted_lower


def _build_moderator_response(
    mod: Moderator,
    challenge_counts: dict[int, int],
    attacker_counts: dict[int, int],
    defender_counts: dict[int, int],
) -> ModeratorResponse:
    return ModeratorResponse(
        moderator_id=mod.moderator_id,
        admin_id=mod.admin_id,
        username=mod.username,
        email=mod.email,
        created_at=mod.created_at,
        challenges_count=challenge_counts.get(mod.moderator_id, 0),
        accounts_managed=(
            attacker_counts.get(mod.moderator_id, 0) + defender_counts.get(mod.moderator_id, 0)
        ),
    )


def _query_activity_items(
    db: Session,
    event_type: Optional[str],
    challenge_id: Optional[int],
    search: Optional[str],
    limit: int,
) -> List[ActivityItemResponse]:
    """Aggregate Alerts, Attempts, and Defenses into a reverse-chronological timeline."""
    normalized_type = (event_type or "all").strip().lower()
    if normalized_type not in {"all", "alert", "attempt", "defense"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="event_type must be one of: all, alert, attempt, defense",
        )

    items: List[ActivityItemResponse] = []

    if normalized_type in {"all", "alert"}:
        q = db.query(Alert, Challenge.title).outerjoin(Challenge, Alert.challenge_id == Challenge.challenge_id)
        if challenge_id is not None:
            q = q.filter(Alert.challenge_id == challenge_id)
        for alert, ch_title in q.order_by(Alert.timestamp.desc(), Alert.alert_id.desc()).all():
            items.append(
                ActivityItemResponse(
                    id=f"alert-{alert.alert_id}",
                    kind="alert",
                    title=alert.alert_type,
                    subtitle=alert.message,
                    challenge_id=alert.challenge_id,
                    challenge_title=ch_title,
                    actor="system",
                    status=alert.alert_type,
                    timestamp=alert.timestamp,
                )
            )

    if normalized_type in {"all", "attempt"}:
        q = (
            db.query(Attempt, Attacker.username, Challenge.title)
            .join(Attacker, Attempt.attacker_id == Attacker.attacker_id)
            .join(Challenge, Attempt.challenge_id == Challenge.challenge_id)
        )
        if challenge_id is not None:
            q = q.filter(Attempt.challenge_id == challenge_id)
        for attempt, username, ch_title in q.order_by(Attempt.timestamp.desc(), Attempt.attempt_id.desc()).all():
            items.append(
                ActivityItemResponse(
                    id=f"attempt-{attempt.attempt_id}",
                    kind="attempt",
                    title=f"{ch_title} Exploit Attempt",
                    subtitle=attempt.payload_used,
                    challenge_id=attempt.challenge_id,
                    challenge_title=ch_title,
                    actor=username,
                    status=attempt.status,
                    timestamp=attempt.timestamp,
                )
            )

    if normalized_type in {"all", "defense"}:
        q = (
            db.query(Defense, Defender.username, Challenge.title)
            .join(Defender, Defense.defender_id == Defender.defender_id)
            .join(Challenge, Defense.challenge_id == Challenge.challenge_id)
        )
        if challenge_id is not None:
            q = q.filter(Defense.challenge_id == challenge_id)
        for defense, username, ch_title in q.order_by(Defense.timestamp.desc(), Defense.defense_id.desc()).all():
            defense_status = "verified" if defense.verified else "unverified"
            items.append(
                ActivityItemResponse(
                    id=f"defense-{defense.defense_id}",
                    kind="defense",
                    title=f"{ch_title} Defense ({defense.security_level_applied})",
                    subtitle=f"Security level set to {defense.security_level_applied} ({defense_status})",
                    challenge_id=defense.challenge_id,
                    challenge_title=ch_title,
                    actor=username,
                    status=defense_status,
                    timestamp=defense.timestamp,
                )
            )

    term = search.strip().lower() if search else ""
    if term:
        items = [
            item
            for item in items
            if term in item.title.lower()
            or term in item.subtitle.lower()
            or term in (item.challenge_title or "").lower()
            or term in item.actor.lower()
            or term in item.status.lower()
            or term in item.kind.lower()
        ]

    items.sort(key=lambda item: item.timestamp, reverse=True)
    return items[:limit]


# --- Health Endpoints ---

@app.get("/health", tags=["Health"])
def health_check():
    """Simple service liveness probe."""
    return {"status": "ok"}


@app.get("/health/db", tags=["Health"])
def health_db_check(db: Session = Depends(get_db)):
    """Database connectivity probe running SELECT 1."""
    try:
        result = db.execute(text("SELECT 1")).scalar()
        if result == 1:
            return {"status": "ok", "database": "connected"}
        return {"status": "error", "database": "unexpected response"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection error: {str(e)}",
        )


# --- Authentication & Account Endpoints ---

@app.post("/api/auth/login", response_model=LoginResponse, tags=["Authentication"])
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate against the 4 account tables (Admin, Moderator, Attacker, Defender)."""
    credential = req.username_or_email.strip()
    cred_lower = credential.lower()
    raw_pwd = req.password

    roles_to_check = [req.account_type] if req.account_type in ROLE_MODELS else ["attacker", "defender", "moderator", "admin"]

    for r in roles_to_check:
        model, id_attr = ROLE_MODELS[r]
        user = db.query(model).filter(
            (model.username == credential) | (func.lower(model.email) == cred_lower)
        ).first()

        if user:
            if verify_password(raw_pwd, user.password):
                return LoginResponse(
                    status="success",
                    message="Authentication successful",
                    user=AuthUserResponse(
                        id=getattr(user, id_attr),
                        username=user.username,
                        email=user.email,
                        role=r,
                        created_at=user.created_at,
                    ),
                )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
    )


@app.post("/api/auth/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED, tags=["Authentication"])
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new Attacker or Defender account in PostgreSQL with bcrypt password hashing."""
    username = req.username.strip()
    email = req.email.lower()
    _ensure_unique_credentials(db, username=username, email=email)

    model, id_attr = ROLE_MODELS[req.role]
    new_user = model(
        username=username,
        email=email,
        password=hash_password(req.password),
        created_at=datetime.datetime.utcnow(),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return LoginResponse(
        status="success",
        message="Registration successful",
        user=AuthUserResponse(
            id=getattr(new_user, id_attr),
            username=new_user.username,
            email=new_user.email,
            role=req.role,
            created_at=new_user.created_at,
        ),
    )


@app.put("/api/auth/password", tags=["Authentication"])
def change_password(req: PasswordChangeRequest, db: Session = Depends(get_db)):
    """Verify current password and update bcrypt hash for any account role."""
    model, id_attr = ROLE_MODELS[req.role]
    user = db.query(model).filter(getattr(model, id_attr) == req.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    if not verify_password(req.current_password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")

    user.password = hash_password(req.new_password)
    db.commit()
    return {"status": "success", "message": "Password updated successfully"}


@app.delete("/api/auth/account", tags=["Authentication"])
def delete_own_account(req: AccountDeleteRequest, db: Session = Depends(get_db)):
    """Verify password, clean dependent rows, and delete the specified account."""
    model, id_attr = ROLE_MODELS[req.role]
    user = db.query(model).filter(getattr(model, id_attr) == req.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    if not verify_password(req.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")

    if req.role == "admin":
        if db.query(Admin).count() <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last remaining admin account",
            )
        db.query(Moderator).filter(Moderator.admin_id == req.user_id).update(
            {Moderator.admin_id: None}, synchronize_session=False
        )
    elif req.role == "moderator":
        db.query(Attacker).filter(Attacker.moderator_id == req.user_id).update(
            {Attacker.moderator_id: None}, synchronize_session=False
        )
        db.query(Defender).filter(Defender.moderator_id == req.user_id).update(
            {Defender.moderator_id: None}, synchronize_session=False
        )
        db.query(Challenge).filter(Challenge.moderator_id == req.user_id).update(
            {Challenge.moderator_id: None}, synchronize_session=False
        )
    elif req.role == "attacker":
        db.query(Attempt).filter(Attempt.attacker_id == req.user_id).delete(synchronize_session=False)
    elif req.role == "defender":
        db.query(Defense).filter(Defense.defender_id == req.user_id).delete(synchronize_session=False)

    db.delete(user)
    db.commit()
    return {"status": "deleted", "role": req.role, "user_id": req.user_id}


# --- Admin Moderator CRUD ---

@app.get("/api/moderators", response_model=List[ModeratorResponse], tags=["Admin"])
def list_moderators(db: Session = Depends(get_db)):
    """List all moderators with computed challenge and managed-account counts."""
    mods = db.query(Moderator).order_by(Moderator.moderator_id.asc()).all()
    challenge_counts = dict(
        db.query(Challenge.moderator_id, func.count(Challenge.challenge_id))
        .filter(Challenge.moderator_id.isnot(None))
        .group_by(Challenge.moderator_id)
        .all()
    )
    attacker_counts = dict(
        db.query(Attacker.moderator_id, func.count(Attacker.attacker_id))
        .filter(Attacker.moderator_id.isnot(None))
        .group_by(Attacker.moderator_id)
        .all()
    )
    defender_counts = dict(
        db.query(Defender.moderator_id, func.count(Defender.defender_id))
        .filter(Defender.moderator_id.isnot(None))
        .group_by(Defender.moderator_id)
        .all()
    )
    return [_build_moderator_response(m, challenge_counts, attacker_counts, defender_counts) for m in mods]


@app.post("/api/moderators", response_model=ModeratorResponse, status_code=status.HTTP_201_CREATED, tags=["Admin"])
def create_moderator(mod_in: ModeratorCreate, db: Session = Depends(get_db)):
    """Create a new moderator account with cross-table uniqueness enforcement."""
    username = mod_in.username.strip()
    email = mod_in.email.strip().lower()
    _ensure_unique_credentials(db, username=username, email=email)
    _validate_fk_exists(db, Admin, "admin_id", mod_in.admin_id, "Admin")

    new_mod = Moderator(
        admin_id=mod_in.admin_id,
        username=username,
        email=email,
        password=hash_password(mod_in.password),
        created_at=datetime.datetime.utcnow(),
    )
    db.add(new_mod)
    db.commit()
    db.refresh(new_mod)
    return _build_moderator_response(new_mod, {}, {}, {})


@app.put("/api/moderators/{moderator_id}", response_model=ModeratorResponse, tags=["Admin"])
def update_moderator(moderator_id: int, mod_in: ModeratorUpdate, db: Session = Depends(get_db)):
    """Update a moderator's username, email, optional password, or admin_id."""
    mod = db.query(Moderator).filter(Moderator.moderator_id == moderator_id).first()
    if not mod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Moderator not found")

    if mod_in.admin_id is not None:
        _validate_fk_exists(db, Admin, "admin_id", mod_in.admin_id, "Admin")
        mod.admin_id = mod_in.admin_id

    _apply_account_updates(db, mod, Moderator, "moderator_id", moderator_id, mod_in)
    db.commit()
    db.refresh(mod)

    challenges_count = db.query(Challenge).filter(Challenge.moderator_id == moderator_id).count()
    accounts_managed = (
        db.query(Attacker).filter(Attacker.moderator_id == moderator_id).count()
        + db.query(Defender).filter(Defender.moderator_id == moderator_id).count()
    )
    return ModeratorResponse(
        moderator_id=mod.moderator_id,
        admin_id=mod.admin_id,
        username=mod.username,
        email=mod.email,
        created_at=mod.created_at,
        challenges_count=challenges_count,
        accounts_managed=accounts_managed,
    )


@app.delete("/api/moderators/{moderator_id}", tags=["Admin"])
def delete_moderator(moderator_id: int, db: Session = Depends(get_db)):
    """Unlink dependent Attacker, Defender, and Challenge rows, then delete moderator."""
    mod = db.query(Moderator).filter(Moderator.moderator_id == moderator_id).first()
    if not mod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Moderator not found")

    db.query(Attacker).filter(Attacker.moderator_id == moderator_id).update(
        {Attacker.moderator_id: None}, synchronize_session=False
    )
    db.query(Defender).filter(Defender.moderator_id == moderator_id).update(
        {Defender.moderator_id: None}, synchronize_session=False
    )
    db.query(Challenge).filter(Challenge.moderator_id == moderator_id).update(
        {Challenge.moderator_id: None}, synchronize_session=False
    )
    db.delete(mod)
    db.commit()
    return {"status": "deleted", "moderator_id": moderator_id}


# --- Moderator Attacker CRUD ---

@app.get("/api/attackers", response_model=List[AttackerResponse], tags=["Moderator"])
def list_attackers(db: Session = Depends(get_db)):
    """List all attacker accounts with attempt counts and total score."""
    attackers = db.query(Attacker).order_by(Attacker.attacker_id.asc()).all()
    stats = {
        row[0]: (int(row[1]), int(row[2] or 0))
        for row in db.query(
            Attempt.attacker_id,
            func.count(Attempt.attempt_id),
            func.coalesce(func.sum(Attempt.score_earned), 0),
        )
        .group_by(Attempt.attacker_id)
        .all()
    }
    return [
        AttackerResponse(
            attacker_id=a.attacker_id,
            moderator_id=a.moderator_id,
            username=a.username,
            email=a.email,
            created_at=a.created_at,
            attempts_count=stats.get(a.attacker_id, (0, 0))[0],
            total_score=stats.get(a.attacker_id, (0, 0))[1],
        )
        for a in attackers
    ]


@app.post("/api/attackers", response_model=AttackerResponse, status_code=status.HTTP_201_CREATED, tags=["Moderator"])
def create_attacker(attacker_in: AttackerCreate, db: Session = Depends(get_db)):
    """Create a new attacker account."""
    username = attacker_in.username.strip()
    email = attacker_in.email.strip().lower()
    _ensure_unique_credentials(db, username=username, email=email)
    _validate_fk_exists(db, Moderator, "moderator_id", attacker_in.moderator_id, "Moderator")

    new_attacker = Attacker(
        moderator_id=attacker_in.moderator_id,
        username=username,
        email=email,
        password=hash_password(attacker_in.password),
        created_at=datetime.datetime.utcnow(),
    )
    db.add(new_attacker)
    db.commit()
    db.refresh(new_attacker)
    return AttackerResponse(
        attacker_id=new_attacker.attacker_id,
        moderator_id=new_attacker.moderator_id,
        username=new_attacker.username,
        email=new_attacker.email,
        created_at=new_attacker.created_at,
        attempts_count=0,
        total_score=0,
    )


@app.put("/api/attackers/{attacker_id}", response_model=AttackerResponse, tags=["Moderator"])
def update_attacker(attacker_id: int, attacker_in: AttackerUpdate, db: Session = Depends(get_db)):
    """Update an attacker's username, email, optional password, or moderator_id."""
    attacker = db.query(Attacker).filter(Attacker.attacker_id == attacker_id).first()
    if not attacker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attacker not found")

    if attacker_in.moderator_id is not None:
        _validate_fk_exists(db, Moderator, "moderator_id", attacker_in.moderator_id, "Moderator")
        attacker.moderator_id = attacker_in.moderator_id

    _apply_account_updates(db, attacker, Attacker, "attacker_id", attacker_id, attacker_in)
    db.commit()
    db.refresh(attacker)

    row = (
        db.query(
            func.count(Attempt.attempt_id),
            func.coalesce(func.sum(Attempt.score_earned), 0),
        )
        .filter(Attempt.attacker_id == attacker_id)
        .first()
    )
    return AttackerResponse(
        attacker_id=attacker.attacker_id,
        moderator_id=attacker.moderator_id,
        username=attacker.username,
        email=attacker.email,
        created_at=attacker.created_at,
        attempts_count=int(row[0] or 0),
        total_score=int(row[1] or 0),
    )


@app.delete("/api/attackers/{attacker_id}", tags=["Moderator"])
def delete_attacker(attacker_id: int, db: Session = Depends(get_db)):
    """Delete dependent Attempt rows and remove the attacker account."""
    attacker = db.query(Attacker).filter(Attacker.attacker_id == attacker_id).first()
    if not attacker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attacker not found")

    db.query(Attempt).filter(Attempt.attacker_id == attacker_id).delete(synchronize_session=False)
    db.delete(attacker)
    db.commit()
    return {"status": "deleted", "attacker_id": attacker_id}


# --- Moderator Defender CRUD ---

@app.get("/api/defenders", response_model=List[DefenderResponse], tags=["Moderator"])
def list_defenders(db: Session = Depends(get_db)):
    """List all defender accounts with defense counts and total score."""
    defenders = db.query(Defender).order_by(Defender.defender_id.asc()).all()
    stats = {
        row[0]: (int(row[1]), int(row[2] or 0))
        for row in db.query(
            Defense.defender_id,
            func.count(Defense.defense_id),
            func.coalesce(func.sum(Defense.score_earned), 0),
        )
        .group_by(Defense.defender_id)
        .all()
    }
    return [
        DefenderResponse(
            defender_id=d.defender_id,
            moderator_id=d.moderator_id,
            username=d.username,
            email=d.email,
            created_at=d.created_at,
            defenses_count=stats.get(d.defender_id, (0, 0))[0],
            total_score=stats.get(d.defender_id, (0, 0))[1],
        )
        for d in defenders
    ]


@app.post("/api/defenders", response_model=DefenderResponse, status_code=status.HTTP_201_CREATED, tags=["Moderator"])
def create_defender(defender_in: DefenderCreate, db: Session = Depends(get_db)):
    """Create a new defender account."""
    username = defender_in.username.strip()
    email = defender_in.email.strip().lower()
    _ensure_unique_credentials(db, username=username, email=email)
    _validate_fk_exists(db, Moderator, "moderator_id", defender_in.moderator_id, "Moderator")

    new_defender = Defender(
        moderator_id=defender_in.moderator_id,
        username=username,
        email=email,
        password=hash_password(defender_in.password),
        created_at=datetime.datetime.utcnow(),
    )
    db.add(new_defender)
    db.commit()
    db.refresh(new_defender)
    return DefenderResponse(
        defender_id=new_defender.defender_id,
        moderator_id=new_defender.moderator_id,
        username=new_defender.username,
        email=new_defender.email,
        created_at=new_defender.created_at,
        defenses_count=0,
        total_score=0,
    )


@app.put("/api/defenders/{defender_id}", response_model=DefenderResponse, tags=["Moderator"])
def update_defender(defender_id: int, defender_in: DefenderUpdate, db: Session = Depends(get_db)):
    """Update a defender's username, email, optional password, or moderator_id."""
    defender = db.query(Defender).filter(Defender.defender_id == defender_id).first()
    if not defender:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Defender not found")

    if defender_in.moderator_id is not None:
        _validate_fk_exists(db, Moderator, "moderator_id", defender_in.moderator_id, "Moderator")
        defender.moderator_id = defender_in.moderator_id

    _apply_account_updates(db, defender, Defender, "defender_id", defender_id, defender_in)
    db.commit()
    db.refresh(defender)

    row = (
        db.query(
            func.count(Defense.defense_id),
            func.coalesce(func.sum(Defense.score_earned), 0),
        )
        .filter(Defense.defender_id == defender_id)
        .first()
    )
    return DefenderResponse(
        defender_id=defender.defender_id,
        moderator_id=defender.moderator_id,
        username=defender.username,
        email=defender.email,
        created_at=defender.created_at,
        defenses_count=int(row[0] or 0),
        total_score=int(row[1] or 0),
    )


@app.delete("/api/defenders/{defender_id}", tags=["Moderator"])
def delete_defender(defender_id: int, db: Session = Depends(get_db)):
    """Delete dependent Defense rows and remove the defender account."""
    defender = db.query(Defender).filter(Defender.defender_id == defender_id).first()
    if not defender:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Defender not found")

    db.query(Defense).filter(Defense.defender_id == defender_id).delete(synchronize_session=False)
    db.delete(defender)
    db.commit()
    return {"status": "deleted", "defender_id": defender_id}


# --- Challenge Endpoints ---

@app.get("/api/challenges", response_model=List[ChallengeResponse], tags=["Challenges"])
def list_challenges(db: Session = Depends(get_db)):
    """List all available challenges ordered by ID."""
    return db.query(Challenge).order_by(Challenge.challenge_id.asc()).all()


@app.post("/api/challenges", response_model=ChallengeResponse, status_code=status.HTTP_201_CREATED, tags=["Challenges"])
def create_challenge(challenge_in: ChallengeCreate, db: Session = Depends(get_db)):
    """Create a new training challenge (Moderator action)."""
    _validate_fk_exists(db, Moderator, "moderator_id", challenge_in.moderator_id, "Moderator")
    new_challenge = Challenge(
        moderator_id=challenge_in.moderator_id,
        title=challenge_in.title.strip(),
        vulnerability_type=challenge_in.vulnerability_type.strip(),
        difficulty=challenge_in.difficulty.strip(),
        dvwa_page_ref=challenge_in.dvwa_page_ref.strip(),
        reference_payload=challenge_in.reference_payload,
    )
    db.add(new_challenge)
    db.commit()
    db.refresh(new_challenge)
    return new_challenge


@app.put("/api/challenges/{challenge_id}", response_model=ChallengeResponse, tags=["Challenges"])
def update_challenge(challenge_id: int, challenge_in: ChallengeUpdate, db: Session = Depends(get_db)):
    """Update an existing challenge (Moderator action)."""
    challenge = db.query(Challenge).filter(Challenge.challenge_id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found")

    if challenge_in.moderator_id is not None:
        _validate_fk_exists(db, Moderator, "moderator_id", challenge_in.moderator_id, "Moderator")
        challenge.moderator_id = challenge_in.moderator_id
    if challenge_in.title is not None:
        challenge.title = challenge_in.title.strip()
    if challenge_in.vulnerability_type is not None:
        challenge.vulnerability_type = challenge_in.vulnerability_type.strip()
    if challenge_in.difficulty is not None:
        challenge.difficulty = challenge_in.difficulty.strip()
    if challenge_in.dvwa_page_ref is not None:
        challenge.dvwa_page_ref = challenge_in.dvwa_page_ref.strip()
    if challenge_in.reference_payload is not None:
        challenge.reference_payload = challenge_in.reference_payload

    db.commit()
    db.refresh(challenge)
    return challenge


@app.delete("/api/challenges/{challenge_id}", tags=["Challenges"])
def delete_challenge(challenge_id: int, db: Session = Depends(get_db)):
    """Delete dependent Attempt, Defense, and Alert rows, then remove the challenge."""
    challenge = db.query(Challenge).filter(Challenge.challenge_id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found")

    db.query(Attempt).filter(Attempt.challenge_id == challenge_id).delete(synchronize_session=False)
    db.query(Defense).filter(Defense.challenge_id == challenge_id).delete(synchronize_session=False)
    db.query(Alert).filter(Alert.challenge_id == challenge_id).delete(synchronize_session=False)
    db.delete(challenge)
    db.commit()
    return {"status": "deleted", "challenge_id": challenge_id}


# --- Attacker Flow: Challenge Attempts ---

@app.get("/api/attempts", response_model=List[AttemptResponse], tags=["Attacker"])
def list_attempts(attacker_id: Optional[int] = None, db: Session = Depends(get_db)):
    """List exploit attempts newest-first, optionally filtered by attacker_id."""
    q = db.query(Attempt, Challenge.title).join(Challenge, Attempt.challenge_id == Challenge.challenge_id)
    if attacker_id is not None:
        q = q.filter(Attempt.attacker_id == attacker_id)
    rows = q.order_by(Attempt.timestamp.desc(), Attempt.attempt_id.desc()).all()
    return [
        AttemptResponse(
            attempt_id=attempt.attempt_id,
            attacker_id=attempt.attacker_id,
            challenge_id=attempt.challenge_id,
            challenge_title=ch_title,
            payload_used=attempt.payload_used,
            status=attempt.status,
            timestamp=attempt.timestamp,
            score_earned=attempt.score_earned,
        )
        for attempt, ch_title in rows
    ]


@app.post("/api/attempts", response_model=AttemptResponse, status_code=status.HTTP_201_CREATED, tags=["Attacker"])
def submit_attempt(attempt_in: AttemptCreate, db: Session = Depends(get_db)):
    """Evaluate an exploit payload, score by challenge difficulty, and log an Alert."""
    challenge = db.query(Challenge).filter(Challenge.challenge_id == attempt_in.challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    attacker = db.query(Attacker).filter(Attacker.attacker_id == attempt_in.attacker_id).first()
    if not attacker:
        raise HTTPException(status_code=404, detail="Attacker not found")

    is_success = _evaluate_attempt_payload(challenge, attempt_in.payload_used)
    attempt_status = "success" if is_success else "failed"
    score = DIFFICULTY_POINTS.get(challenge.difficulty.strip().lower(), 100) if is_success else 0

    now = datetime.datetime.utcnow()
    attempt = Attempt(
        attacker_id=attempt_in.attacker_id,
        challenge_id=attempt_in.challenge_id,
        payload_used=attempt_in.payload_used,
        status=attempt_status,
        timestamp=now,
        score_earned=score,
    )
    db.add(attempt)

    alert = Alert(
        challenge_id=challenge.challenge_id,
        alert_type="EXPLOIT_ATTEMPT",
        message=f"Attacker '{attacker.username}' launched payload on '{challenge.title}' (Status: {attempt_status})",
        timestamp=now,
    )
    db.add(alert)
    db.commit()
    db.refresh(attempt)

    return AttemptResponse(
        attempt_id=attempt.attempt_id,
        attacker_id=attempt.attacker_id,
        challenge_id=attempt.challenge_id,
        challenge_title=challenge.title,
        payload_used=attempt.payload_used,
        status=attempt.status,
        timestamp=attempt.timestamp,
        score_earned=attempt.score_earned,
    )


# --- Defender Flow: Challenge Defenses ---

@app.get("/api/defenses", response_model=List[DefenseResponse], tags=["Defender"])
def list_defenses(defender_id: Optional[int] = None, db: Session = Depends(get_db)):
    """List defense submissions newest-first, optionally filtered by defender_id."""
    q = db.query(Defense, Challenge.title).join(Challenge, Defense.challenge_id == Challenge.challenge_id)
    if defender_id is not None:
        q = q.filter(Defense.defender_id == defender_id)
    rows = q.order_by(Defense.timestamp.desc(), Defense.defense_id.desc()).all()
    return [
        DefenseResponse(
            defense_id=defense.defense_id,
            defender_id=defense.defender_id,
            challenge_id=defense.challenge_id,
            challenge_title=ch_title,
            security_level_applied=defense.security_level_applied,
            verified=defense.verified,
            timestamp=defense.timestamp,
            score_earned=defense.score_earned,
        )
        for defense, ch_title in rows
    ]


@app.post("/api/defenses", response_model=DefenseResponse, status_code=status.HTTP_201_CREATED, tags=["Defender"])
def submit_defense(defense_in: DefenseCreate, db: Session = Depends(get_db)):
    """Apply a security level remediation, verify against the reference vector, and log an Alert."""
    challenge = db.query(Challenge).filter(Challenge.challenge_id == defense_in.challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    defender = db.query(Defender).filter(Defender.defender_id == defense_in.defender_id).first()
    if not defender:
        raise HTTPException(status_code=404, detail="Defender not found")

    verified = defense_in.security_level_applied in {"high", "impossible"}
    score = 150 if verified else 25

    now = datetime.datetime.utcnow()
    defense = Defense(
        defender_id=defense_in.defender_id,
        challenge_id=defense_in.challenge_id,
        security_level_applied=defense_in.security_level_applied,
        verified=verified,
        timestamp=now,
        score_earned=score,
    )
    db.add(defense)

    alert = Alert(
        challenge_id=challenge.challenge_id,
        alert_type="DEFENSE_APPLIED",
        message=(
            f"Defender '{defender.username}' applied {defense_in.security_level_applied} "
            f"security to '{challenge.title}' (Verified: {verified})"
        ),
        timestamp=now,
    )
    db.add(alert)
    db.commit()
    db.refresh(defense)

    return DefenseResponse(
        defense_id=defense.defense_id,
        defender_id=defense.defender_id,
        challenge_id=defense.challenge_id,
        challenge_title=challenge.title,
        security_level_applied=defense.security_level_applied,
        verified=defense.verified,
        timestamp=defense.timestamp,
        score_earned=defense.score_earned,
    )


# --- Alerts, Activity & CSV Export ---

@app.get("/api/alerts", response_model=List[AlertResponse], tags=["Alerts"])
def list_alerts(limit: int = Query(default=50, ge=1, le=1000), db: Session = Depends(get_db)):
    """List recent security alerts across all challenges."""
    return db.query(Alert).order_by(Alert.timestamp.desc(), Alert.alert_id.desc()).limit(limit).all()


@app.get("/api/activity", response_model=List[ActivityItemResponse], tags=["Moderator"])
def list_activity(
    event_type: Optional[str] = Query(default="all"),
    challenge_id: Optional[int] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """Return unified reverse-chronological activity across alerts, attempts, and defenses."""
    return _query_activity_items(db, event_type=event_type, challenge_id=challenge_id, search=search, limit=limit)


@app.get("/api/reports/export", tags=["Moderator"])
def export_activity_csv(
    event_type: Optional[str] = Query(default="all"),
    challenge_id: Optional[int] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=1000, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Export unified activity log as a downloadable CSV attachment."""
    items = _query_activity_items(db, event_type=event_type, challenge_id=challenge_id, search=search, limit=limit)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["id", "kind", "title", "subtitle", "challenge_id", "challenge_title", "actor", "status", "timestamp"])
    for item in items:
        writer.writerow([
            item.id,
            item.kind,
            item.title,
            item.subtitle,
            item.challenge_id if item.challenge_id is not None else "",
            item.challenge_title or "",
            item.actor,
            item.status,
            item.timestamp.isoformat(),
        ])
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="cyberforge-activity.csv"'},
    )


# --- Admin Platform Totals ---

@app.get("/api/admin/stats", response_model=PlatformStatsResponse, tags=["Admin"])
def get_platform_stats(db: Session = Depends(get_db)):
    """Platform-wide totals and metrics for Admin dashboard."""
    return PlatformStatsResponse(
        admins_count=db.query(Admin).count(),
        moderators_count=db.query(Moderator).count(),
        attackers_count=db.query(Attacker).count(),
        defenders_count=db.query(Defender).count(),
        challenges_count=db.query(Challenge).count(),
        total_attempts=db.query(Attempt).count(),
        total_defenses=db.query(Defense).count(),
        total_alerts=db.query(Alert).count(),
    )
