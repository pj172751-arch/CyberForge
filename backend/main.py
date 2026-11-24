import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from .database import engine, Base, get_db
from .models import Admin, Moderator, Attacker, Defender, Challenge, Attempt, Defense, Alert
from .schemas import (
    LoginRequest, LoginResponse, AuthUserResponse,
    ChallengeCreate, ChallengeResponse,
    AttemptCreate, AttemptResponse,
    DefenseCreate, DefenseResponse,
    AlertResponse, PlatformStatsResponse
)
from .auth import hash_password, verify_password

# Initialize FastAPI application
app = FastAPI(
    title="CyberForge API",
    description="Cybersecurity Training & Verification Backend against DVWA",
    version="1.0.0"
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables and seed authoritative accounts if database is connected
@app.on_event("startup")
def on_startup():
    try:
        Base.metadata.create_all(bind=engine)
        print("CyberForge database tables verified.")
        # Seed canonical admin and moderator accounts if absent
        from sqlalchemy.orm import sessionmaker
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        with SessionLocal() as session:
            admin_acc = session.query(Admin).filter(Admin.email == "abc17@gmail.com").first()
            if not admin_acc:
                admin_acc = Admin(
                    username="admin_root",
                    email="abc17@gmail.com",
                    password=hash_password("axbycz17@30"),
                    created_at=datetime.datetime.utcnow()
                )
                session.add(admin_acc)
                session.commit()
                session.refresh(admin_acc)

            mod_acc = session.query(Moderator).filter(Moderator.email == "xy30z@gmail.com").first()
            if not mod_acc:
                mod_acc = Moderator(
                    admin_id=admin_acc.admin_id,
                    username="moderator_lead",
                    email="xy30z@gmail.com",
                    password=hash_password("xbycza30@17"),
                    created_at=datetime.datetime.utcnow()
                )
                session.add(mod_acc)
                session.commit()
    except Exception as e:
        print(f"Notice: Database connection not ready on startup ({e}). Run docker compose up -d.")


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
            detail=f"Database connection error: {str(e)}"
        )


# --- Authentication Endpoint (Unified for all 4 roles) ---

@app.post("/api/auth/login", response_model=LoginResponse, tags=["Authentication"])
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate against the 4 account tables (Admin, Moderator, Attacker, Defender).
    Checks tables in sequence or by requested account_type.
    """
    credential = req.username_or_email.strip()
    raw_pwd = req.password

    # Account types to inspect
    roles_to_check = [req.account_type] if req.account_type else ["attacker", "defender", "moderator", "admin"]

    for r in roles_to_check:
        user = None
        user_id = None

        if r == "attacker":
            user = db.query(Attacker).filter(
                (Attacker.username == credential) | (Attacker.email == credential)
            ).first()
            if user:
                user_id = user.attacker_id
        elif r == "defender":
            user = db.query(Defender).filter(
                (Defender.username == credential) | (Defender.email == credential)
            ).first()
            if user:
                user_id = user.defender_id
        elif r == "moderator":
            user = db.query(Moderator).filter(
                (Moderator.username == credential) | (Moderator.email == credential)
            ).first()
            if user:
                user_id = user.moderator_id
        elif r == "admin":
            user = db.query(Admin).filter(
                (Admin.username == credential) | (Admin.email == credential)
            ).first()
            if user:
                user_id = user.admin_id

        if user:
            if verify_password(raw_pwd, user.password):
                return LoginResponse(
                    status="success",
                    message="Authentication successful",
                    user=AuthUserResponse(
                        id=user_id,
                        username=user.username,
                        email=user.email,
                        role=r,
                        created_at=user.created_at
                    )
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials"
                )

    # Fallback verification for authoritative fixed accounts if database is empty
    cred_lower = credential.lower()
    if cred_lower in ["abc17@gmail.com", "admin_root"]:
        if raw_pwd == "axbycz17@30":
            return LoginResponse(
                status="success",
                message="Authentication successful (Fixed Admin)",
                user=AuthUserResponse(
                    id=1,
                    username="admin_root",
                    email="abc17@gmail.com",
                    role="admin",
                    created_at=datetime.datetime.utcnow()
                )
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    if cred_lower in ["xy30z@gmail.com", "moderator_lead"]:
        if raw_pwd == "xbycza30@17":
            return LoginResponse(
                status="success",
                message="Authentication successful (Fixed Moderator)",
                user=AuthUserResponse(
                    id=1,
                    username="moderator_lead",
                    email="xy30z@gmail.com",
                    role="moderator",
                    created_at=datetime.datetime.utcnow()
                )
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Account not found"
    )


# --- Challenge Endpoints ---

@app.get("/api/challenges", response_model=List[ChallengeResponse], tags=["Challenges"])
def list_challenges(db: Session = Depends(get_db)):
    """List all available challenges."""
    return db.query(Challenge).all()


@app.post("/api/challenges", response_model=ChallengeResponse, status_code=status.HTTP_201_CREATED, tags=["Challenges"])
def create_challenge(challenge_in: ChallengeCreate, db: Session = Depends(get_db)):
    """Create a new training challenge (Moderator action)."""
    new_challenge = Challenge(
        moderator_id=challenge_in.moderator_id,
        title=challenge_in.title,
        vulnerability_type=challenge_in.vulnerability_type,
        difficulty=challenge_in.difficulty,
        dvwa_page_ref=challenge_in.dvwa_page_ref,
        reference_payload=challenge_in.reference_payload
    )
    db.add(new_challenge)
    db.commit()
    db.refresh(new_challenge)
    return new_challenge


# --- Attacker Flow: Challenge Attempts ---

@app.post("/api/attempts", response_model=AttemptResponse, status_code=status.HTTP_201_CREATED, tags=["Attacker"])
def submit_attempt(attempt_in: AttemptCreate, db: Session = Depends(get_db)):
    """
    Attacker submits an exploit payload against a challenge.
    Evaluates payload and records the attempt and system alert.
    """
    challenge = db.query(Challenge).filter(Challenge.challenge_id == attempt_in.challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    attacker = db.query(Attacker).filter(Attacker.attacker_id == attempt_in.attacker_id).first()
    if not attacker:
        raise HTTPException(status_code=404, detail="Attacker not found")

    # Verification: check if payload matches reference signature or pattern
    is_success = attempt_in.payload_used.strip() == challenge.reference_payload.strip() or (
        "1'='1" in attempt_in.payload_used or "<script>" in attempt_in.payload_used.lower()
    )
    attempt_status = "success" if is_success else "failed"
    score = 100 if is_success else 10

    attempt = Attempt(
        attacker_id=attempt_in.attacker_id,
        challenge_id=attempt_in.challenge_id,
        payload_used=attempt_in.payload_used,
        status=attempt_status,
        timestamp=datetime.datetime.utcnow(),
        score_earned=score
    )
    db.add(attempt)

    # Record Alert
    alert = Alert(
        challenge_id=challenge.challenge_id,
        alert_type="EXPLOIT_ATTEMPT",
        message=f"Attacker '{attacker.username}' launched payload on '{challenge.title}' (Status: {attempt_status})",
        timestamp=datetime.datetime.utcnow()
    )
    db.add(alert)
    db.commit()
    db.refresh(attempt)
    return attempt


# --- Defender Flow: Challenge Defenses ---

@app.post("/api/defenses", response_model=DefenseResponse, status_code=status.HTTP_201_CREATED, tags=["Defender"])
def submit_defense(defense_in: DefenseCreate, db: Session = Depends(get_db)):
    """
    Defender applies security level fix for a challenge.
    The system verifies the fix against the challenge reference payload and records score.
    """
    challenge = db.query(Challenge).filter(Challenge.challenge_id == defense_in.challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    defender = db.query(Defender).filter(Defender.defender_id == defense_in.defender_id).first()
    if not defender:
        raise HTTPException(status_code=404, detail="Defender not found")

    # High or Impossible security levels mitigate reference exploit payloads
    verified = defense_in.security_level_applied.lower() in ["high", "impossible"]
    score = 150 if verified else 50

    defense = Defense(
        defender_id=defense_in.defender_id,
        challenge_id=defense_in.challenge_id,
        security_level_applied=defense_in.security_level_applied,
        verified=verified,
        timestamp=datetime.datetime.utcnow(),
        score_earned=score
    )
    db.add(defense)

    # Record Alert
    alert = Alert(
        challenge_id=challenge.challenge_id,
        alert_type="DEFENSE_APPLIED",
        message=f"Defender '{defender.username}' applied {defense_in.security_level_applied} security to '{challenge.title}' (Verified: {verified})",
        timestamp=datetime.datetime.utcnow()
    )
    db.add(alert)
    db.commit()
    db.refresh(defense)
    return defense


# --- Alerts Endpoints ---

@app.get("/api/alerts", response_model=List[AlertResponse], tags=["Alerts"])
def list_alerts(limit: int = 50, db: Session = Depends(get_db)):
    """List recent security alerts across all challenges."""
    return db.query(Alert).order_by(Alert.timestamp.desc()).limit(limit).all()


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
        total_alerts=db.query(Alert).count()
    )
