import csv
import datetime
import hmac
import io
import logging
import os
import re
import secrets
import uuid
from contextlib import asynccontextmanager
from typing import List, Optional, Tuple, Type
from urllib.parse import urlparse

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from .auth import dummy_verify_password, hash_password, verify_password
from .database import Base, SessionLocal, engine, get_db
from .dvwa import (
    acquire_dvwa_slot,
    check_dvwa_health,
    fetch_all_dvwa_sources,
    fetch_dvwa_source,
    resolve_dvwa_module,
    verify_attack,
    verify_defense,
)
from .lab_guides import LEARNING_TRACKS, get_public_guide, grade_patch_choice
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
    ChallengeSourceResponse,
    ChallengeUpdate,
    DefenderCreate,
    DefenderResponse,
    DefenderUpdate,
    DefenseCreate,
    DefenseResponse,
    DvwaHealthResponse,
    LoginRequest,
    LoginResponse,
    ModeratorCreate,
    ModeratorResponse,
    ModeratorUpdate,
    PasswordChangeRequest,
    PlatformStatsResponse,
    RegisterRequest,
    SessionResponse,
)
from .security import (
    COOKIE_SECURE,
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
    REFRESH_COOKIE_NAME,
    REFRESH_TOKEN_TTL,
    ROLE_MODELS,
    AuthenticatedUser,
    check_ip_jail,
    check_rate_limit,
    clear_session_cookies,
    decode_jwt,
    extract_access_token,
    get_client_ip,
    get_current_user,
    issue_session_tokens,
    record_security_strike,
    require_roles,
    revoke_family,
    revoke_jti,
    rotate_refresh_token,
    sanitize_csv_cell,
    set_session_cookies,
    validate_strong_password,
)

logger = logging.getLogger("cyberforge.api")

CANONICAL_DVWA_CHALLENGES = [
    ("Broken Login", "SQLi", "Medium", "vulnerabilities/sqli/", "' OR '1'='1"),
    ("Reflected XSS", "XSS", "Easy", "vulnerabilities/xss_r/", "<script>alert(1)</script>"),
    ("Stored XSS", "Stored XSS", "Medium", "vulnerabilities/xss_s/", "<script>alert(1)</script>"),
    ("DOM XSS", "DOM XSS", "Medium", "vulnerabilities/xss_d/", "<script>alert(1)</script>"),
    ("File Disclosure", "LFI", "Medium", "vulnerabilities/fi/?page=", "../../../../../etc/passwd"),
    ("Command Injection", "RCE", "Hard", "vulnerabilities/exec/", "127.0.0.1; id"),
    ("Blind SQL Injection", "SQLi (Blind)", "Hard", "vulnerabilities/sqli_blind/", "1' AND '1'='1"),
    ("Web Shell Upload", "File Upload", "Hard", "vulnerabilities/upload/", "cf_probe.php"),
    ("Weak Session IDs", "Weak Session", "Medium", "vulnerabilities/weak_id/", "Cookie: dvwaSession=1"),
    ("CSRF Password Forge", "CSRF", "Medium", "vulnerabilities/csrf/", "password_new=password&password_conf=password&Change=Change"),
    ("Brute Force Login", "Brute Force", "Easy", "vulnerabilities/brute/", "admin:password"),
    ("CSP Bypass", "CSP Bypass", "Hard", "vulnerabilities/csp/", "https://pastebin.com/raw/R570EE00"),
    ("CAPTCHA Workflow Bypass", "Broken Workflow", "Medium", "vulnerabilities/captcha/", "step=2&password_new=password&password_conf=password&Change=Change"),
    ("Client-Side JS Token Forge", "Client-Side Trust", "Medium", "vulnerabilities/javascript/", "phrase=success&token=38581812b435834ebf84ebcc2c6424d6"),
]

LEGACY_CHALLENGE_REMAP = {
    "vulnerabilities/unserialize/": ("Stored XSS", "Stored XSS", "Medium", "vulnerabilities/xss_s/", "<script>alert(1)</script>"),
    "vulnerabilities/api/v1/": ("DOM XSS", "DOM XSS", "Medium", "vulnerabilities/xss_d/", "<script>alert(1)</script>"),
    "vulnerabilities/idor/?id=": ("CSRF Password Forge", "CSRF", "Medium", "vulnerabilities/csrf/", "password_new=password&password_conf=password&Change=Change"),
    "vulnerabilities/ssrf/": ("Brute Force Login", "Brute Force", "Easy", "vulnerabilities/brute/", "admin:password"),
    "vulnerabilities/audit/": ("CSP Bypass", "CSP Bypass", "Hard", "vulnerabilities/csp/", "https://pastebin.com/raw/R570EE00"),
}

DIFFICULTY_POINTS = {
    "easy": 50,
    "medium": 100,
    "hard": 250,
}

TIER_SCORE_MULTIPLIER = {
    "low": 1.0,
    "medium": 1.5,
    "high": 2.0,
}

_TIER_PREFIX_RE = re.compile(r"^\[tier:(low|medium|high)\]\s*", re.IGNORECASE)

VULN_PAYLOAD_HINTS: dict[str, tuple[str, ...]] = {
    "sqli": ("' or '1'='1", "1'='1", "or 1=1", "union select", "'--"),
    "sqli (blind)": ("1' and '1'='1", "' and ", "union select", "sleep(", "1=1"),
    "authz": ("union select", "@@version", "1=1", "' or "),
    "xss": ("<script>", "onerror=", "onload=", "javascript:", "alert("),
    "stored xss": ("<script>", "onerror=", "onload=", "<svg", "alert("),
    "dom xss": ("<script>", "onerror=", "onload=", "<svg", "javascript:"),
    "lfi": ("../", "etc/passwd", "boot.ini"),
    "rce": ("; id", "| id", "&& id", "$(id)", "whoami", "uname"),
    "file upload": (".php", "cf_probe", "polyglot", "mime"),
    "weak session": ("dvwasession=", "session", "weak_id"),
    "csrf": ("password_new=", "password_conf=", "change=change", "csrf"),
    "brute force": ("admin:password", "username=", "password="),
    "csp bypass": ("pastebin.com", "nonce=", "unsafe-inline"),
    "broken workflow": ("step=2", "passed_captcha", "hidd3n_valu3", "captcha"),
    "client-side trust": ("phrase=success", "token=", "38581812b435834ebf84ebcc2c6424d6", "xxsseccusxx"),
}


def _encode_tier_payload(payload: str, target_level: str) -> str:
    lvl = (target_level or "low").strip().lower()
    if lvl in {"medium", "high"}:
        return f"[tier:{lvl}] {payload}"
    return payload


def _decode_tier_payload(stored_payload: str) -> Tuple[str, str]:
    match = _TIER_PREFIX_RE.match(stored_payload or "")
    if match:
        tier = match.group(1).lower()
        clean = stored_payload[match.end() :]
        return tier, clean
    return "low", stored_payload


def _compute_vulnerable_lines(source_code: Optional[str], sink_pattern: Optional[str]) -> list[int]:
    if not source_code:
        return []
    needle = (sink_pattern or "").strip().lower()
    hits: list[int] = []
    for idx, line in enumerate(source_code.splitlines(), start=1):
        low_line = line.lower()
        if needle and needle in low_line:
            hits.append(idx)
    if hits:
        return hits[:8]
    fallback_markers = ("$_get", "$_post", "$_request", "$_cookie", "mysqli_query", "shell_exec", "include", "eval(")
    for idx, line in enumerate(source_code.splitlines(), start=1):
        low_line = line.lower()
        if any(m in low_line for m in fallback_markers):
            hits.append(idx)
    return hits[:6]


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


def _align_legacy_challenge_refs() -> None:
    """Update legacy rows/payloads in place and seed any missing canonical DVWA challenges."""
    with SessionLocal() as session:
        challenges = session.query(Challenge).all()
        changed = False
        existing_refs = set()
        for ch in challenges:
            ref = (ch.dvwa_page_ref or "").strip()
            if ref in LEGACY_CHALLENGE_REMAP:
                title, vuln_type, difficulty, new_ref, new_payload = LEGACY_CHALLENGE_REMAP[ref]
                ch.title = title
                ch.vulnerability_type = vuln_type
                ch.difficulty = difficulty
                ch.dvwa_page_ref = new_ref
                ch.reference_payload = new_payload
                existing_refs.add(new_ref)
                changed = True
                continue
            existing_refs.add(ref)
            if ref == "vulnerabilities/fi/?page=" and ch.reference_payload.strip() == "../../../../etc/passwd":
                ch.reference_payload = "../../../../../etc/passwd"
                changed = True
            elif ref == "vulnerabilities/sqli_blind/" and ch.reference_payload.strip() == "1 UNION SELECT 1, @@version":
                ch.title = "Blind SQL Injection"
                ch.vulnerability_type = "SQLi (Blind)"
                ch.reference_payload = "1' AND '1'='1"
                changed = True
            elif ref == "vulnerabilities/upload/" and "polyglot" in ch.reference_payload:
                ch.reference_payload = "cf_probe.php"
                changed = True
            elif ref == "vulnerabilities/weak_id/" and ch.reference_payload.strip() == "Cookie: dvwaSession=admin_token":
                ch.title = "Weak Session IDs"
                ch.reference_payload = "Cookie: dvwaSession=1"
                changed = True

        first_mod = session.query(Moderator).order_by(Moderator.moderator_id.asc()).first()
        mod_id = first_mod.moderator_id if first_mod else None
        for title, vuln_type, difficulty, page_ref, ref_payload in CANONICAL_DVWA_CHALLENGES:
            if page_ref not in existing_refs:
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
                existing_refs.add(page_ref)
                changed = True

        if changed:
            session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize schema and optionally seed configured accounts and challenges on startup."""
    try:
        Base.metadata.create_all(bind=engine)
        print("CyberForge database tables verified.")
        _seed_initial_accounts()
        _seed_initial_challenges()
        _align_legacy_challenge_refs()
    except Exception as e:
        print(f"Notice: Database connection not ready on startup ({e}). Run docker compose up -d.")
    yield


debug_openapi = os.getenv("DEBUG_OPENAPI", "false").strip().lower() == "true"

app = FastAPI(
    title="CyberForge API",
    description="Cybersecurity Training & Verification Backend against DVWA",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if debug_openapi else None,
    redoc_url="/redoc" if debug_openapi else None,
    openapi_url="/openapi.json" if debug_openapi else None,
)

cors_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip() and origin.strip() != "*"
]

CANARY_EXACT_PATHS = frozenset(
    {
        "/.env",
        "/.git",
        "/.git/config",
        "/wp-admin",
        "/wp-login.php",
        "/phpinfo.php",
        "/actuator",
        "/graphql",
        "/api/debug",
        "/admin.php",
        "/server-status",
    }
)
_METHOD_OVERRIDE_HEADERS = ("x-http-method-override", "x-method-override", "x-original-method")


def _apply_security_headers(response: Response, path: str) -> Response:
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Resource-Policy"] = "same-site"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'"
    )
    if (
        path.startswith("/api/auth/")
        or path == "/api/auth"
        or path.startswith("/api/reports/")
        or path == "/api/reports"
    ):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    raw_path = request.url.path or "/"
    norm_path = raw_path.lower()
    trimmed_path = norm_path.rstrip("/") or "/"
    ip = get_client_ip(request)

    if any(header in request.headers for header in _METHOD_OVERRIDE_HEADERS):
        return _apply_security_headers(
            JSONResponse(
                {"detail": "HTTP method override headers are not permitted"},
                status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
            ),
            raw_path,
        )

    is_canary = (
        trimmed_path in CANARY_EXACT_PATHS
        or norm_path.startswith("/.git/")
        or norm_path.startswith("/.env.")
        or norm_path.startswith("/wp-admin/")
        or norm_path.startswith("/actuator/")
    )
    if is_canary:
        record_security_strike(ip, weight=4, reason=f"canary:{raw_path}")
        try:
            with SessionLocal() as db:
                db.add(
                    Alert(
                        challenge_id=None,
                        alert_type="RECON_BLOCKED",
                        message=f"Blocked recon probe {raw_path} from {ip}",
                        timestamp=datetime.datetime.utcnow(),
                    )
                )
                db.commit()
        except Exception:
            pass
        return _apply_security_headers(
            JSONResponse({"detail": "Not found"}, status_code=status.HTTP_404_NOT_FOUND),
            raw_path,
        )

    try:
        check_ip_jail(ip)
    except HTTPException as exc:
        return _apply_security_headers(
            JSONResponse({"detail": exc.detail}, status_code=exc.status_code, headers=exc.headers),
            raw_path,
        )

    if request.method.upper() in {"POST", "PUT", "DELETE", "PATCH"}:
        _, has_bearer = extract_access_token(request)
        is_bearer_only = has_bearer and trimmed_path != "/api/auth/refresh"
        if not is_bearer_only:
            sec_fetch_site = (request.headers.get("sec-fetch-site") or "").strip().lower()
            if sec_fetch_site == "cross-site":
                record_security_strike(ip, weight=2, reason="csrf_cross_site")
                return _apply_security_headers(
                    JSONResponse({"detail": "Cross-site requests are forbidden"}, status_code=status.HTTP_403_FORBIDDEN),
                    raw_path,
                )

            origin = (request.headers.get("origin") or "").strip().rstrip("/")
            referer = (request.headers.get("referer") or "").strip()
            if origin:
                if origin not in cors_origins:
                    record_security_strike(ip, weight=2, reason="csrf_bad_origin")
                    return _apply_security_headers(
                        JSONResponse({"detail": "Origin not allowed"}, status_code=status.HTTP_403_FORBIDDEN),
                        raw_path,
                    )
            elif referer:
                parsed_ref = urlparse(referer)
                ref_origin = f"{parsed_ref.scheme}://{parsed_ref.netloc}" if parsed_ref.scheme and parsed_ref.netloc else ""
                if ref_origin not in cors_origins:
                    record_security_strike(ip, weight=2, reason="csrf_bad_referer")
                    return _apply_security_headers(
                        JSONResponse({"detail": "Referer origin not allowed"}, status_code=status.HTTP_403_FORBIDDEN),
                        raw_path,
                    )

            if trimmed_path not in {"/api/auth/login", "/api/auth/register"}:
                csrf_header = (request.headers.get(CSRF_HEADER_NAME) or "").strip()
                csrf_cookie = (request.cookies.get(CSRF_COOKIE_NAME) or "").strip()
                if not csrf_header or not csrf_cookie or not hmac.compare_digest(csrf_header, csrf_cookie):
                    record_security_strike(ip, weight=2, reason="csrf_token_mismatch")
                    return _apply_security_headers(
                        JSONResponse({"detail": "CSRF validation failed"}, status_code=status.HTTP_403_FORBIDDEN),
                        raw_path,
                    )

    try:
        response = await call_next(request)
    except Exception:
        err_id = uuid.uuid4().hex[:12]
        logger.exception("Unhandled error [%s] on %s %s", err_id, request.method, raw_path)
        return _apply_security_headers(
            JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Internal server error", "error_id": err_id},
            ),
            raw_path,
        )
    return _apply_security_headers(response, raw_path)


app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-CyberForge-CSRF"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    if any(err.get("type") == "extra_forbidden" for err in errors):
        record_security_strike(get_client_ip(request), weight=2, reason="mass_assignment_probe")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": jsonable_encoder(errors)},
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": str(exc)},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    err_id = uuid.uuid4().hex[:12]
    logger.exception("Unhandled error [%s] on %s %s", err_id, request.method, request.url.path)
    return _apply_security_headers(
        JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error", "error_id": err_id},
        ),
        request.url.path or "/",
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
    except Exception:
        logger.exception("Database health probe failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection error",
        )


@app.get("/health/dvwa", response_model=DvwaHealthResponse, tags=["Health"])
def health_dvwa_check():
    """Live DVWA container reachability and initialization probe."""
    return check_dvwa_health()


# --- Authentication & Account Endpoints ---

@app.post("/api/auth/login", response_model=LoginResponse, tags=["Authentication"])
def login(req: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    """Authenticate against the 4 account tables (Admin, Moderator, Attacker, Defender)."""
    ip = get_client_ip(request)
    credential = req.username_or_email.strip()
    cred_lower = credential.lower()

    check_rate_limit("login_ip", ip, limit=10, window_seconds=300)
    check_rate_limit("login_cred", cred_lower or "empty", limit=6, window_seconds=300)

    roles_to_check = [req.account_type] if req.account_type in ROLE_MODELS else ["attacker", "defender", "moderator", "admin"]

    matched_user = None
    matched_role = None
    matched_id_attr = None
    for r in roles_to_check:
        model, id_attr = ROLE_MODELS[r]
        candidate = db.query(model).filter(
            (model.username == credential) | (func.lower(model.email) == cred_lower)
        ).first()
        if candidate is not None:
            matched_user = candidate
            matched_role = r
            matched_id_attr = id_attr
            break

    if matched_user is None:
        dummy_verify_password(req.password)
        record_security_strike(ip, weight=1, reason="login_failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password",
        )

    if not verify_password(req.password, matched_user.password):
        record_security_strike(ip, weight=1, reason="login_failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password",
        )

    user_id = getattr(matched_user, matched_id_attr)
    tokens = issue_session_tokens(user_id, matched_role, matched_user.password)
    set_session_cookies(response, tokens)
    return LoginResponse(
        status="success",
        message="Authentication successful",
        user=AuthUserResponse(
            id=user_id,
            username=matched_user.username,
            email=matched_user.email,
            role=matched_role,
            created_at=matched_user.created_at,
        ),
        csrf_token=tokens["csrf_token"],
        access_token=tokens["access_token"],
    )


@app.post("/api/auth/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED, tags=["Authentication"])
def register(req: RegisterRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    """Register a new Attacker or Defender account in PostgreSQL with bcrypt password hashing."""
    ip = get_client_ip(request)
    check_rate_limit("register_ip", ip, limit=5, window_seconds=600)

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

    user_id = getattr(new_user, id_attr)
    tokens = issue_session_tokens(user_id, req.role, new_user.password)
    set_session_cookies(response, tokens)
    return LoginResponse(
        status="success",
        message="Registration successful",
        user=AuthUserResponse(
            id=user_id,
            username=new_user.username,
            email=new_user.email,
            role=req.role,
            created_at=new_user.created_at,
        ),
        csrf_token=tokens["csrf_token"],
        access_token=tokens["access_token"],
    )


@app.get("/api/auth/me", response_model=SessionResponse, tags=["Authentication"])
def get_me(
    request: Request,
    response: Response,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Return the authenticated user's current session and ensure CSRF cookie availability."""
    csrf_token = (request.cookies.get(CSRF_COOKIE_NAME) or "").strip()
    if not csrf_token:
        csrf_token = secrets.token_urlsafe(32)
        response.set_cookie(
            key=CSRF_COOKIE_NAME,
            value=csrf_token,
            httponly=False,
            samesite="lax",
            secure=COOKIE_SECURE,
            path="/",
            max_age=REFRESH_TOKEN_TTL,
        )
    return SessionResponse(
        user=AuthUserResponse(
            id=current_user.id,
            username=current_user.username,
            email=current_user.email,
            role=current_user.role,
            created_at=current_user.created_at,
        ),
        csrf_token=csrf_token,
    )


@app.post("/api/auth/refresh", response_model=SessionResponse, tags=["Authentication"])
def refresh_session(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Rotate refresh token cookie, detect reuse, and issue fresh session cookies."""
    ip = get_client_ip(request)
    refresh_token = (request.cookies.get(REFRESH_COOKIE_NAME) or "").strip()
    if not refresh_token:
        record_security_strike(ip, weight=1, reason="missing_refresh_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )
    try:
        auth_user, tokens = rotate_refresh_token(refresh_token, db)
    except HTTPException:
        record_security_strike(ip, weight=2, reason="invalid_or_reused_refresh")
        raise

    set_session_cookies(response, tokens)
    return SessionResponse(
        user=AuthUserResponse(
            id=auth_user.id,
            username=auth_user.username,
            email=auth_user.email,
            role=auth_user.role,
            created_at=auth_user.created_at,
        ),
        csrf_token=tokens["csrf_token"],
    )


@app.post("/api/auth/logout", tags=["Authentication"])
def logout(request: Request, response: Response):
    """Revoke active access/refresh tokens if present and clear session cookies."""
    access_token, _ = extract_access_token(request)
    if access_token:
        try:
            payload = decode_jwt(access_token, expected_type="access")
            revoke_jti(payload["jti"], float(payload["exp"]))
            fam = payload.get("fam")
            if isinstance(fam, str) and fam:
                revoke_family(fam)
        except HTTPException:
            pass

    refresh_token = (request.cookies.get(REFRESH_COOKIE_NAME) or "").strip()
    if refresh_token:
        try:
            payload = decode_jwt(refresh_token, expected_type="refresh")
            revoke_jti(payload["jti"], float(payload["exp"]))
            fam = payload.get("fam")
            if isinstance(fam, str) and fam:
                revoke_family(fam)
        except HTTPException:
            pass

    clear_session_cookies(response)
    return {"status": "ok"}


@app.put("/api/auth/password", tags=["Authentication"])
def change_password(
    req: PasswordChangeRequest,
    request: Request,
    response: Response,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify current password, update bcrypt hash, and rotate session tokens."""
    if (req.role is not None and req.role != current_user.role) or (
        req.user_id is not None and req.user_id != current_user.id
    ):
        record_security_strike(get_client_ip(request), weight=2, reason="password_change_idor")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify another account's password",
        )

    model, id_attr = ROLE_MODELS[current_user.role]
    user = db.query(model).filter(getattr(model, id_attr) == current_user.id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    if not verify_password(req.current_password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")

    validate_strong_password(req.new_password, username=user.username, email=user.email)
    user.password = hash_password(req.new_password)
    db.commit()
    db.refresh(user)

    if current_user.jti:
        revoke_jti(current_user.jti, current_user.exp)
    if current_user.family_id:
        revoke_family(current_user.family_id)

    tokens = issue_session_tokens(current_user.id, current_user.role, user.password)
    set_session_cookies(response, tokens)
    return {
        "status": "success",
        "message": "Password updated successfully",
        "csrf_token": tokens["csrf_token"],
    }


@app.delete("/api/auth/account", tags=["Authentication"])
def delete_own_account(
    req: AccountDeleteRequest,
    request: Request,
    response: Response,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify password, clean dependent rows, revoke session tokens, and delete own account."""
    if (req.role is not None and req.role != current_user.role) or (
        req.user_id is not None and req.user_id != current_user.id
    ):
        record_security_strike(get_client_ip(request), weight=2, reason="account_delete_idor")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete another account",
        )

    model, id_attr = ROLE_MODELS[current_user.role]
    user = db.query(model).filter(getattr(model, id_attr) == current_user.id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    if not verify_password(req.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")

    if current_user.role == "admin":
        if db.query(Admin).count() <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last remaining admin account",
            )
        db.query(Moderator).filter(Moderator.admin_id == current_user.id).update(
            {Moderator.admin_id: None}, synchronize_session=False
        )
    elif current_user.role == "moderator":
        db.query(Attacker).filter(Attacker.moderator_id == current_user.id).update(
            {Attacker.moderator_id: None}, synchronize_session=False
        )
        db.query(Defender).filter(Defender.moderator_id == current_user.id).update(
            {Defender.moderator_id: None}, synchronize_session=False
        )
        db.query(Challenge).filter(Challenge.moderator_id == current_user.id).update(
            {Challenge.moderator_id: None}, synchronize_session=False
        )
    elif current_user.role == "attacker":
        db.query(Attempt).filter(Attempt.attacker_id == current_user.id).delete(synchronize_session=False)
    elif current_user.role == "defender":
        db.query(Defense).filter(Defense.defender_id == current_user.id).delete(synchronize_session=False)

    db.delete(user)
    db.commit()

    if current_user.jti:
        revoke_jti(current_user.jti, current_user.exp)
    if current_user.family_id:
        revoke_family(current_user.family_id)
    clear_session_cookies(response)
    return {"status": "deleted", "role": current_user.role, "user_id": current_user.id}


# --- Admin Moderator CRUD ---

@app.get("/api/moderators", response_model=List[ModeratorResponse], tags=["Admin"])
def list_moderators(
    current_user: AuthenticatedUser = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
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
def create_moderator(
    mod_in: ModeratorCreate,
    current_user: AuthenticatedUser = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Create a new moderator account with cross-table uniqueness enforcement."""
    username = mod_in.username.strip()
    email = mod_in.email.strip().lower()
    _ensure_unique_credentials(db, username=username, email=email)
    admin_id = mod_in.admin_id if mod_in.admin_id is not None else current_user.id
    _validate_fk_exists(db, Admin, "admin_id", admin_id, "Admin")

    new_mod = Moderator(
        admin_id=admin_id,
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
def update_moderator(
    moderator_id: int,
    mod_in: ModeratorUpdate,
    current_user: AuthenticatedUser = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
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
def delete_moderator(
    moderator_id: int,
    current_user: AuthenticatedUser = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
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
def list_attackers(
    current_user: AuthenticatedUser = Depends(require_roles("moderator", "admin")),
    db: Session = Depends(get_db),
):
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
def create_attacker(
    attacker_in: AttackerCreate,
    current_user: AuthenticatedUser = Depends(require_roles("moderator", "admin")),
    db: Session = Depends(get_db),
):
    """Create a new attacker account."""
    username = attacker_in.username.strip()
    email = attacker_in.email.strip().lower()
    _ensure_unique_credentials(db, username=username, email=email)
    mod_id = attacker_in.moderator_id
    if mod_id is None and current_user.role == "moderator":
        mod_id = current_user.id
    _validate_fk_exists(db, Moderator, "moderator_id", mod_id, "Moderator")

    new_attacker = Attacker(
        moderator_id=mod_id,
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
def update_attacker(
    attacker_id: int,
    attacker_in: AttackerUpdate,
    current_user: AuthenticatedUser = Depends(require_roles("moderator", "admin")),
    db: Session = Depends(get_db),
):
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
def delete_attacker(
    attacker_id: int,
    current_user: AuthenticatedUser = Depends(require_roles("moderator", "admin")),
    db: Session = Depends(get_db),
):
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
def list_defenders(
    current_user: AuthenticatedUser = Depends(require_roles("moderator", "admin")),
    db: Session = Depends(get_db),
):
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
def create_defender(
    defender_in: DefenderCreate,
    current_user: AuthenticatedUser = Depends(require_roles("moderator", "admin")),
    db: Session = Depends(get_db),
):
    """Create a new defender account."""
    username = defender_in.username.strip()
    email = defender_in.email.strip().lower()
    _ensure_unique_credentials(db, username=username, email=email)
    mod_id = defender_in.moderator_id
    if mod_id is None and current_user.role == "moderator":
        mod_id = current_user.id
    _validate_fk_exists(db, Moderator, "moderator_id", mod_id, "Moderator")

    new_defender = Defender(
        moderator_id=mod_id,
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
def update_defender(
    defender_id: int,
    defender_in: DefenderUpdate,
    current_user: AuthenticatedUser = Depends(require_roles("moderator", "admin")),
    db: Session = Depends(get_db),
):
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
def delete_defender(
    defender_id: int,
    current_user: AuthenticatedUser = Depends(require_roles("moderator", "admin")),
    db: Session = Depends(get_db),
):
    """Delete dependent Defense rows and remove the defender account."""
    defender = db.query(Defender).filter(Defender.defender_id == defender_id).first()
    if not defender:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Defender not found")

    db.query(Defense).filter(Defense.defender_id == defender_id).delete(synchronize_session=False)
    db.delete(defender)
    db.commit()
    return {"status": "deleted", "defender_id": defender_id}


# --- Challenge Endpoints ---

@app.get("/api/tracks", tags=["Challenges"])
def list_learning_tracks(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the 4 structured OWASP learning tracks with matched DVWA challenges."""
    challenges = db.query(Challenge).order_by(Challenge.challenge_id.asc()).all()
    by_module: dict[str, ChallengeResponse] = {}
    for ch in challenges:
        mod = resolve_dvwa_module(ch.dvwa_page_ref)
        if mod and mod not in by_module:
            ch_resp = ChallengeResponse.model_validate(ch)
            if current_user.role == "attacker":
                ch_resp.reference_payload = None
            by_module[mod] = ch_resp
    result = []
    for tr in LEARNING_TRACKS:
        items = [by_module[m] for m in tr["modules"] if m in by_module]
        result.append(
            {
                "track_id": tr["track_id"],
                "track_order": tr["track_order"],
                "title": tr["title"],
                "subtitle": tr["subtitle"],
                "modules": tr["modules"],
                "challenges": items,
            }
        )
    return result


@app.get("/api/challenges", response_model=List[ChallengeResponse], tags=["Challenges"])
def list_challenges(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all available challenges ordered by ID, redacting reference payloads for attackers."""
    challenges = db.query(Challenge).order_by(Challenge.challenge_id.asc()).all()
    results = []
    for ch in challenges:
        ch_resp = ChallengeResponse.model_validate(ch)
        if current_user.role == "attacker":
            ch_resp.reference_payload = None
        results.append(ch_resp)
    return results


@app.get("/api/challenges/{challenge_id}/source", response_model=ChallengeSourceResponse, tags=["Challenges"])
def get_challenge_source(
    challenge_id: int,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return live DVWA PHP handler source across all 4 tiers, progressive hints, debrief, and unspoiled patch quiz."""
    challenge = db.query(Challenge).filter(Challenge.challenge_id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found")

    module_key = resolve_dvwa_module(challenge.dvwa_page_ref)
    sources_by_tier = fetch_all_dvwa_sources(module_key) if module_key else {}
    vulnerable_code = sources_by_tier.get("low")
    hardened_code = sources_by_tier.get("impossible")
    source_available = bool(module_key and sources_by_tier)
    guide = get_public_guide(module_key)
    vulnerable_lines = _compute_vulnerable_lines(vulnerable_code, guide.get("sink_pattern"))

    return ChallengeSourceResponse(
        challenge_id=challenge.challenge_id,
        module_key=module_key,
        source_available=source_available,
        vulnerable_code=vulnerable_code,
        hardened_code=hardened_code,
        sources_by_tier=sources_by_tier,
        sink_pattern=guide.get("sink_pattern"),
        vulnerable_lines=vulnerable_lines,
        track_id=guide.get("track_id", ""),
        track_title=guide.get("track_title", ""),
        track_order=int(guide.get("track_order") or 0),
        stage_guides=guide.get("stage_guides", {}),
        owasp_category=guide["owasp_category"],
        hints=guide["hints"],
        debrief=guide["debrief"],
        patch_quiz=guide["patch_quiz"],
    )


@app.post("/api/challenges", response_model=ChallengeResponse, status_code=status.HTTP_201_CREATED, tags=["Challenges"])
def create_challenge(
    challenge_in: ChallengeCreate,
    current_user: AuthenticatedUser = Depends(require_roles("moderator", "admin")),
    db: Session = Depends(get_db),
):
    """Create a new training challenge (Moderator/Admin action)."""
    mod_id = challenge_in.moderator_id
    if mod_id is None and current_user.role == "moderator":
        mod_id = current_user.id
    _validate_fk_exists(db, Moderator, "moderator_id", mod_id, "Moderator")
    new_challenge = Challenge(
        moderator_id=mod_id,
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
def update_challenge(
    challenge_id: int,
    challenge_in: ChallengeUpdate,
    current_user: AuthenticatedUser = Depends(require_roles("moderator", "admin")),
    db: Session = Depends(get_db),
):
    """Update an existing challenge (Moderator/Admin action)."""
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
def delete_challenge(
    challenge_id: int,
    current_user: AuthenticatedUser = Depends(require_roles("moderator", "admin")),
    db: Session = Depends(get_db),
):
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
def list_attempts(
    request: Request,
    attacker_id: Optional[int] = None,
    current_user: AuthenticatedUser = Depends(require_roles("attacker", "moderator", "admin")),
    db: Session = Depends(get_db),
):
    """List exploit attempts newest-first, enforcing strict attacker ownership."""
    effective_attacker_id = attacker_id
    if current_user.role == "attacker":
        if attacker_id is not None and attacker_id != current_user.id:
            record_security_strike(get_client_ip(request), weight=2, reason="attempts_idor")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot view another attacker's attempts",
            )
        effective_attacker_id = current_user.id

    q = db.query(Attempt, Challenge.title).join(Challenge, Attempt.challenge_id == Challenge.challenge_id)
    if effective_attacker_id is not None:
        q = q.filter(Attempt.attacker_id == effective_attacker_id)
    rows = q.order_by(Attempt.timestamp.desc(), Attempt.attempt_id.desc()).all()
    results = []
    for attempt, ch_title in rows:
        target_level, clean_payload = _decode_tier_payload(attempt.payload_used)
        results.append(
            AttemptResponse(
                attempt_id=attempt.attempt_id,
                attacker_id=attempt.attacker_id,
                challenge_id=attempt.challenge_id,
                challenge_title=ch_title,
                payload_used=clean_payload,
                status=attempt.status,
                timestamp=attempt.timestamp,
                score_earned=attempt.score_earned,
                target_security_level=target_level,
                dvwa_security_level=target_level,
            )
        )
    return results


@app.post("/api/attempts", response_model=AttemptResponse, status_code=status.HTTP_201_CREATED, tags=["Attacker"])
def submit_attempt(
    attempt_in: AttemptCreate,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_roles("attacker")),
    db: Session = Depends(get_db),
):
    """Evaluate an exploit payload against live DVWA, prevent score farming, and log an Alert."""
    if attempt_in.attacker_id is not None and attempt_in.attacker_id != current_user.id:
        record_security_strike(get_client_ip(request), weight=2, reason="submit_attempt_idor")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot submit attempts for another attacker",
        )

    check_rate_limit("attempts_user", f"attacker:{current_user.id}", limit=30, window_seconds=60)

    challenge = db.query(Challenge).filter(Challenge.challenge_id == attempt_in.challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    attacker = db.query(Attacker).filter(Attacker.attacker_id == current_user.id).first()
    if not attacker:
        raise HTTPException(status_code=404, detail="Attacker not found")

    req_level = (attempt_in.target_security_level or "low").strip().lower()
    if req_level not in {"low", "medium", "high"}:
        req_level = "low"

    # End read transaction before waiting on DVWA HTTP execution.
    db.rollback()
    with acquire_dvwa_slot(f"attacker:{current_user.id}"):
        dvwa_result = verify_attack(challenge, attempt_in.payload_used, target_security_level=req_level)

    wire_trace = None
    if dvwa_result is not None:
        is_success = dvwa_result.matched
        verification_mode = dvwa_result.verification_mode
        dvwa_http_status = dvwa_result.http_status
        dvwa_security_level = dvwa_result.security_level
        evidence = dvwa_result.evidence
        wire_trace = dvwa_result.wire_trace
    else:
        is_success = _evaluate_attempt_payload(challenge, attempt_in.payload_used)
        verification_mode = "heuristic_fallback"
        dvwa_http_status = None
        dvwa_security_level = req_level
        evidence = (
            f"Heuristic fallback evaluation against reference vector "
            f"({'matched' if is_success else 'not matched'})."
        )

    attempt_status = "success" if is_success else "failed"

    # Serialize concurrent submissions per attacker to prevent duplicate-solve score farming.
    attacker = (
        db.query(Attacker)
        .filter(Attacker.attacker_id == current_user.id)
        .with_for_update()
        .first()
    )
    if not attacker:
        raise HTTPException(status_code=404, detail="Attacker not found")

    challenge = db.query(Challenge).filter(Challenge.challenge_id == attempt_in.challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    base_points = DIFFICULTY_POINTS.get(challenge.difficulty.strip().lower(), 100)
    multiplier = TIER_SCORE_MULTIPLIER.get(req_level, 1.0)

    already_solved_tier = False
    if is_success:
        prior_successes = (
            db.query(Attempt.payload_used)
            .filter(
                Attempt.attacker_id == current_user.id,
                Attempt.challenge_id == challenge.challenge_id,
                Attempt.status == "success",
            )
            .all()
        )
        for (prev_payload,) in prior_successes:
            prev_tier, _ = _decode_tier_payload(prev_payload)
            if prev_tier == req_level:
                already_solved_tier = True
                break

    score = 0 if (not is_success or already_solved_tier) else int(round(base_points * multiplier))

    now = datetime.datetime.utcnow()
    stored_payload = _encode_tier_payload(attempt_in.payload_used, req_level)
    attempt = Attempt(
        attacker_id=current_user.id,
        challenge_id=attempt_in.challenge_id,
        payload_used=stored_payload,
        status=attempt_status,
        timestamp=now,
        score_earned=score,
    )
    db.add(attempt)

    alert = Alert(
        challenge_id=challenge.challenge_id,
        alert_type="EXPLOIT_ATTEMPT",
        message=f"Attacker '{attacker.username}' launched {req_level} payload on '{challenge.title}' (Status: {attempt_status})",
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
        payload_used=attempt_in.payload_used,
        status=attempt.status,
        timestamp=attempt.timestamp,
        score_earned=attempt.score_earned,
        target_security_level=req_level,
        verification_mode=verification_mode,
        dvwa_http_status=dvwa_http_status,
        dvwa_security_level=dvwa_security_level,
        evidence=evidence,
        wire_trace=wire_trace,
    )


# --- Defender Flow: Challenge Defenses ---

@app.get("/api/defenses", response_model=List[DefenseResponse], tags=["Defender"])
def list_defenses(
    request: Request,
    defender_id: Optional[int] = None,
    current_user: AuthenticatedUser = Depends(require_roles("defender", "moderator", "admin")),
    db: Session = Depends(get_db),
):
    """List defense submissions newest-first, enforcing strict defender ownership."""
    effective_defender_id = defender_id
    if current_user.role == "defender":
        if defender_id is not None and defender_id != current_user.id:
            record_security_strike(get_client_ip(request), weight=2, reason="defenses_idor")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot view another defender's defenses",
            )
        effective_defender_id = current_user.id

    q = db.query(Defense, Challenge.title).join(Challenge, Defense.challenge_id == Challenge.challenge_id)
    if effective_defender_id is not None:
        q = q.filter(Defense.defender_id == effective_defender_id)
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
def submit_defense(
    defense_in: DefenseCreate,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_roles("defender")),
    db: Session = Depends(get_db),
):
    """Apply a security level remediation, verify via live before/after DVWA replay, grade patch choice, and log an Alert."""
    if defense_in.defender_id is not None and defense_in.defender_id != current_user.id:
        record_security_strike(get_client_ip(request), weight=2, reason="submit_defense_idor")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot submit defenses for another defender",
        )

    check_rate_limit("defenses_user", f"defender:{current_user.id}", limit=30, window_seconds=60)

    challenge = db.query(Challenge).filter(Challenge.challenge_id == defense_in.challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    defender = db.query(Defender).filter(Defender.defender_id == current_user.id).first()
    if not defender:
        raise HTTPException(status_code=404, detail="Defender not found")

    module_key = resolve_dvwa_module(challenge.dvwa_page_ref)
    # End read transaction before waiting on DVWA HTTP execution.
    db.rollback()
    with acquire_dvwa_slot(f"defender:{current_user.id}"):
        after_res, baseline_before = verify_defense(challenge, defense_in.security_level_applied)

    wire_trace = None
    if after_res is not None:
        replay_blocked = not after_res.matched
        verification_mode = after_res.verification_mode
        dvwa_http_status = after_res.http_status
        dvwa_security_level = after_res.security_level
        evidence = after_res.evidence
        wire_trace = after_res.wire_trace
    else:
        replay_blocked = defense_in.security_level_applied in {"high", "impossible"}
        verification_mode = "heuristic_fallback"
        dvwa_http_status = None
        dvwa_security_level = defense_in.security_level_applied
        evidence = (
            f"Heuristic fallback: security tier '{defense_in.security_level_applied}' "
            f"{'blocks' if replay_blocked else 'does not block'} the reference vector."
        )
        baseline_before = {
            "exploited": True,
            "http_status": None,
            "evidence": "Heuristic baseline: reference vector succeeds at 'low' security.",
        }

    patch_correct: Optional[bool] = None
    patch_feedback: Optional[str] = None
    if defense_in.patch_option_id:
        patch_correct, patch_feedback = grade_patch_choice(module_key, defense_in.patch_option_id)

    verified = replay_blocked and (patch_correct is not False)

    # Serialize concurrent submissions per defender to prevent duplicate-solve score farming.
    defender = (
        db.query(Defender)
        .filter(Defender.defender_id == current_user.id)
        .with_for_update()
        .first()
    )
    if not defender:
        raise HTTPException(status_code=404, detail="Defender not found")

    challenge = db.query(Challenge).filter(Challenge.challenge_id == defense_in.challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    prior_verified = (
        db.query(Defense.defense_id)
        .filter(
            Defense.defender_id == current_user.id,
            Defense.challenge_id == challenge.challenge_id,
            Defense.verified.is_(True),
        )
        .first()
    )
    prior_any = (
        db.query(Defense.defense_id)
        .filter(
            Defense.defender_id == current_user.id,
            Defense.challenge_id == challenge.challenge_id,
        )
        .first()
    )
    if verified:
        score = 0 if prior_verified else 150
    else:
        score = 0 if prior_any else 25

    now = datetime.datetime.utcnow()
    defense = Defense(
        defender_id=current_user.id,
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
        verification_mode=verification_mode,
        dvwa_http_status=dvwa_http_status,
        dvwa_security_level=dvwa_security_level,
        evidence=evidence,
        baseline_before=baseline_before,
        patch_correct=patch_correct,
        patch_feedback=patch_feedback,
        wire_trace=wire_trace,
    )


# --- Alerts, Activity & CSV Export ---

@app.get("/api/alerts", response_model=List[AlertResponse], tags=["Alerts"])
def list_alerts(
    limit: int = Query(default=50, ge=1, le=1000),
    current_user: AuthenticatedUser = Depends(require_roles("defender", "moderator", "admin")),
    db: Session = Depends(get_db),
):
    """List recent security alerts across all challenges."""
    return db.query(Alert).order_by(Alert.timestamp.desc(), Alert.alert_id.desc()).limit(limit).all()


@app.get("/api/activity", response_model=List[ActivityItemResponse], tags=["Moderator"])
def list_activity(
    event_type: Optional[str] = Query(default="all"),
    challenge_id: Optional[int] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
    current_user: AuthenticatedUser = Depends(require_roles("moderator", "admin")),
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
    current_user: AuthenticatedUser = Depends(require_roles("moderator", "admin")),
    db: Session = Depends(get_db),
):
    """Export unified activity log as a DDE-sanitized downloadable CSV attachment."""
    items = _query_activity_items(db, event_type=event_type, challenge_id=challenge_id, search=search, limit=limit)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["id", "kind", "title", "subtitle", "challenge_id", "challenge_title", "actor", "status", "timestamp"])
    for item in items:
        writer.writerow([
            sanitize_csv_cell(item.id),
            sanitize_csv_cell(item.kind),
            sanitize_csv_cell(item.title),
            sanitize_csv_cell(item.subtitle),
            sanitize_csv_cell(item.challenge_id if item.challenge_id is not None else ""),
            sanitize_csv_cell(item.challenge_title or ""),
            sanitize_csv_cell(item.actor),
            sanitize_csv_cell(item.status),
            sanitize_csv_cell(item.timestamp.isoformat()),
        ])
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="cyberforge-activity.csv"'},
    )


# --- Admin Platform Totals ---

@app.get("/api/admin/stats", response_model=PlatformStatsResponse, tags=["Admin"])
def get_platform_stats(
    current_user: AuthenticatedUser = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
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
