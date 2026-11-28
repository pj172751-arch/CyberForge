import base64
import collections
import datetime
import hashlib
import hmac
import json
import math
import os
import re
import secrets
import threading
import time
from dataclasses import dataclass
from typing import Dict, Optional, Tuple, Type

from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from .database import get_db
from .models import Admin, Attacker, Defender, Moderator

ACCESS_COOKIE_NAME = "cyberforge_session"
REFRESH_COOKIE_NAME = "cyberforge_refresh"
CSRF_COOKIE_NAME = "cyberforge_csrf"
CSRF_HEADER_NAME = "X-CyberForge-CSRF"

JWT_ISSUER = "cyberforge"
JWT_AUDIENCE = "cyberforge-ui"

ACCESS_TOKEN_TTL = int(os.getenv("ACCESS_TOKEN_TTL", "900"))
REFRESH_TOKEN_TTL = int(os.getenv("REFRESH_TOKEN_TTL", "604800"))
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").strip().lower() == "true"
TRUST_PROXY_HEADERS = os.getenv("TRUST_PROXY_HEADERS", "false").strip().lower() == "true"

_raw_jwt_secret = os.getenv("JWT_SECRET", "").strip()
if len(_raw_jwt_secret) < 32:
    JWT_SECRET = secrets.token_urlsafe(48)
    print(
        "[CyberForge Security Warning] JWT_SECRET env var missing or shorter than 32 chars; "
        "using ephemeral random JWT_SECRET for this process (sessions will invalidate on restart)."
    )
else:
    JWT_SECRET = _raw_jwt_secret

ROLE_MODELS: Dict[str, Tuple[Type, str]] = {
    "attacker": (Attacker, "attacker_id"),
    "defender": (Defender, "defender_id"),
    "moderator": (Moderator, "moderator_id"),
    "admin": (Admin, "admin_id"),
}

_B64URL_RE = re.compile(r"^[A-Za-z0-9_-]+$")

_COMMON_BREACHED_PASSWORDS = frozenset(
    {
        "password123",
        "password1234",
        "password123!",
        "1234567890",
        "12345678901",
        "123456789012",
        "admin12345",
        "admin123456",
        "adminadmin1",
        "qwerty1234",
        "qwerty12345",
        "cyberforge1",
        "cyberforge123",
        "letmein1234",
        "welcome123",
        "welcome1234",
        "changeme123",
        "iloveyou123",
        "passw0rd123",
        "p@ssword123",
    }
)

_revocation_lock = threading.Lock()
_revoked_jtis: Dict[str, float] = {}
_refresh_families: Dict[str, dict] = {}

_rate_limit_lock = threading.Lock()
_rate_buckets: Dict[Tuple[str, str], collections.deque] = {}

_jail_lock = threading.Lock()
_ip_strikes: Dict[str, collections.deque] = {}
_jailed_ips: Dict[str, float] = {}

_STRIKE_WINDOW_SECONDS = 600.0


@dataclass
class AuthenticatedUser:
    id: int
    role: str
    username: str
    email: str
    created_at: datetime.datetime
    jti: str
    exp: float
    family_id: Optional[str] = None


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(segment: str) -> bytes:
    if not isinstance(segment, str) or not segment or not _B64URL_RE.fullmatch(segment):
        raise ValueError("Invalid base64url segment")
    padded = segment + ("=" * (-len(segment) % 4))
    return base64.urlsafe_b64decode(padded.encode("ascii"))


def compute_password_fingerprint(password_hash: str) -> str:
    """Compute a short HMAC fingerprint of the stored password hash."""
    return hmac.new(
        JWT_SECRET.encode("utf-8"),
        (password_hash or "").encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()[:16]


def encode_jwt(payload: dict) -> str:
    """Encode and HS256-sign a JWT payload using pure Python stdlib."""
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = _b64url_encode(
        json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    payload_b64 = _b64url_encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    sig = hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header_b64}.{payload_b64}.{_b64url_encode(sig)}"


def decode_jwt(token: str, expected_type: str) -> dict:
    """Verify an HS256 JWT strictly and return its validated claims."""
    exc_unauth = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
    )
    if not isinstance(token, str) or token.count(".") != 2:
        raise exc_unauth

    header_b64, payload_b64, sig_b64 = token.split(".")
    if not header_b64 or not payload_b64 or not sig_b64:
        raise exc_unauth

    try:
        header = json.loads(_b64url_decode(header_b64).decode("utf-8"))
        if not isinstance(header, dict):
            raise ValueError("Invalid header")
        if header.get("alg") != "HS256" or header.get("typ") != "JWT":
            raise ValueError("Unsupported JWT header")

        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        expected_sig = hmac.new(
            JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256
        ).digest()
        expected_sig_b64 = _b64url_encode(expected_sig)
        if not hmac.compare_digest(expected_sig_b64, sig_b64):
            raise ValueError("Signature mismatch")

        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("Invalid payload")
    except Exception:
        raise exc_unauth

    now = time.time()
    if payload.get("iss") != JWT_ISSUER or payload.get("aud") != JWT_AUDIENCE:
        raise exc_unauth
    if payload.get("typ") != expected_type:
        raise exc_unauth

    exp = payload.get("exp")
    iat = payload.get("iat")
    if isinstance(exp, bool) or not isinstance(exp, (int, float)) or not math.isfinite(exp):
        raise exc_unauth
    if isinstance(iat, bool) or not isinstance(iat, (int, float)) or not math.isfinite(iat):
        raise exc_unauth
    if float(exp) <= now or float(iat) > now + 30.0:
        raise exc_unauth

    sub = payload.get("sub")
    if isinstance(sub, bool) or sub is None:
        raise exc_unauth
    try:
        sub_int = int(sub)
        if sub_int <= 0 or str(sub_int) != str(sub).strip():
            raise ValueError("Invalid sub")
    except (TypeError, ValueError):
        raise exc_unauth

    role = payload.get("role")
    if not isinstance(role, str) or role not in ROLE_MODELS:
        raise exc_unauth

    jti = payload.get("jti")
    pwd_fp = payload.get("pwd_fp")
    if not isinstance(jti, str) or not jti or not isinstance(pwd_fp, str) or not pwd_fp:
        raise exc_unauth

    if expected_type == "refresh":
        fam = payload.get("fam")
        if not isinstance(fam, str) or not fam:
            raise exc_unauth

    return payload


def _prune_revocation_state_locked(now: float) -> None:
    expired_jtis = [k for k, exp in _revoked_jtis.items() if exp <= now]
    for k in expired_jtis:
        del _revoked_jtis[k]

    expired_fams = [k for k, fam in _refresh_families.items() if fam.get("expires_at", 0.0) <= now]
    for k in expired_fams:
        del _refresh_families[k]


def revoke_jti(jti: str, exp: float) -> None:
    """Add a token JTI to the thread-safe denylist until its expiry."""
    if not jti:
        return
    now = time.time()
    with _revocation_lock:
        _prune_revocation_state_locked(now)
        exp_f = float(exp)
        if exp_f > now:
            _revoked_jtis[jti] = max(_revoked_jtis.get(jti, 0.0), exp_f)


def is_jti_revoked(jti: str) -> bool:
    """Check whether a JTI is currently revoked, pruning expired entries."""
    if not jti:
        return True
    now = time.time()
    with _revocation_lock:
        _prune_revocation_state_locked(now)
        return jti in _revoked_jtis


def _issue_session_tokens_locked(
    user_id: int,
    role: str,
    password_hash: str,
    family_id: Optional[str] = None,
) -> dict:
    now = time.time()
    _prune_revocation_state_locked(now)
    fam = family_id or secrets.token_urlsafe(24)
    access_jti = secrets.token_urlsafe(24)
    refresh_jti = secrets.token_urlsafe(24)
    csrf_token = secrets.token_urlsafe(32)
    access_exp = now + ACCESS_TOKEN_TTL
    refresh_exp = now + REFRESH_TOKEN_TTL
    pwd_fp = compute_password_fingerprint(password_hash)

    access_payload = {
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "typ": "access",
        "sub": str(user_id),
        "role": role,
        "jti": access_jti,
        "fam": fam,
        "pwd_fp": pwd_fp,
        "iat": now,
        "exp": access_exp,
    }
    refresh_payload = {
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "typ": "refresh",
        "sub": str(user_id),
        "role": role,
        "jti": refresh_jti,
        "fam": fam,
        "pwd_fp": pwd_fp,
        "iat": now,
        "exp": refresh_exp,
    }

    existing_family = _refresh_families.get(fam)
    if existing_family is None:
        _refresh_families[fam] = {
            "user_id": int(user_id),
            "role": role,
            "current_jti": refresh_jti,
            "used_jtis": set(),
            "active_access_jti": access_jti,
            "active_access_exp": access_exp,
            "active_refresh_exp": refresh_exp,
            "revoked": False,
            "expires_at": refresh_exp,
        }
    else:
        existing_family["user_id"] = int(user_id)
        existing_family["role"] = role
        existing_family["current_jti"] = refresh_jti
        existing_family["active_access_jti"] = access_jti
        existing_family["active_access_exp"] = access_exp
        existing_family["active_refresh_exp"] = refresh_exp
        existing_family["revoked"] = False
        existing_family["expires_at"] = max(existing_family.get("expires_at", 0.0), refresh_exp)

    return {
        "access_token": encode_jwt(access_payload),
        "refresh_token": encode_jwt(refresh_payload),
        "csrf_token": csrf_token,
        "family_id": fam,
        "access_jti": access_jti,
        "refresh_jti": refresh_jti,
        "access_exp": access_exp,
        "refresh_exp": refresh_exp,
    }


def issue_session_tokens(
    user_id: int,
    role: str,
    password_hash: str,
    family_id: Optional[str] = None,
) -> dict:
    """Issue a new access, refresh, and CSRF token tuple bound to a session family."""
    with _revocation_lock:
        return _issue_session_tokens_locked(user_id, role, password_hash, family_id=family_id)


def _revoke_family_locked(family_id: str, now: float) -> None:
    family = _refresh_families.get(family_id)
    if not family:
        return
    family["revoked"] = True
    cur_jti = family.get("current_jti")
    cur_exp = float(family.get("active_refresh_exp", 0.0))
    if cur_jti and cur_exp > now:
        _revoked_jtis[cur_jti] = max(_revoked_jtis.get(cur_jti, 0.0), cur_exp)
    acc_jti = family.get("active_access_jti")
    acc_exp = float(family.get("active_access_exp", 0.0))
    if acc_jti and acc_exp > now:
        _revoked_jtis[acc_jti] = max(_revoked_jtis.get(acc_jti, 0.0), acc_exp)


def revoke_family(family_id: str) -> None:
    """Revoke an entire refresh token family and its active tokens."""
    if not family_id:
        return
    now = time.time()
    with _revocation_lock:
        _prune_revocation_state_locked(now)
        _revoke_family_locked(family_id, now)


def rotate_refresh_token(refresh_token: str, db: Session) -> Tuple[AuthenticatedUser, dict]:
    """Verify a refresh JWT, enforce one-time-use family rotation, and issue new tokens."""
    payload = decode_jwt(refresh_token, expected_type="refresh")
    user_id = int(payload["sub"])
    role = payload["role"]
    jti = payload["jti"]
    fam = payload["fam"]
    pwd_fp = payload["pwd_fp"]
    exp = float(payload["exp"])

    model, id_attr = ROLE_MODELS[role]
    row = db.query(model).filter(getattr(model, id_attr) == user_id).first()
    if row is None or not hmac.compare_digest(compute_password_fingerprint(row.password), pwd_fp):
        revoke_family(fam)
        revoke_jti(jti, exp)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    now = time.time()
    with _revocation_lock:
        _prune_revocation_state_locked(now)
        family = _refresh_families.get(fam)
        if jti in _revoked_jtis:
            _revoke_family_locked(fam, now)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session invalidated due to token reuse",
            )
        if family is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session",
            )
        if (
            family.get("revoked")
            or jti in family.get("used_jtis", set())
            or family.get("current_jti") != jti
            or family.get("user_id") != user_id
            or family.get("role") != role
        ):
            _revoke_family_locked(fam, now)
            if exp > now:
                _revoked_jtis[jti] = max(_revoked_jtis.get(jti, 0.0), exp)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session invalidated due to token reuse",
            )

        family["used_jtis"].add(jti)
        if exp > now:
            _revoked_jtis[jti] = max(_revoked_jtis.get(jti, 0.0), exp)
        tokens = _issue_session_tokens_locked(user_id, role, row.password, family_id=fam)

    auth_user = AuthenticatedUser(
        id=getattr(row, id_attr),
        role=role,
        username=row.username,
        email=row.email,
        created_at=row.created_at,
        jti=tokens["access_jti"],
        exp=float(tokens["access_exp"]),
        family_id=fam,
    )
    return auth_user, tokens


def set_session_cookies(response: Response, tokens: dict) -> None:
    """Attach HttpOnly session/refresh cookies and readable double-submit CSRF cookie."""
    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=tokens["access_token"],
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/",
        max_age=ACCESS_TOKEN_TTL,
    )
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=tokens["refresh_token"],
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/api/auth",
        max_age=REFRESH_TOKEN_TTL,
    )
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=tokens["csrf_token"],
        httponly=False,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/",
        max_age=REFRESH_TOKEN_TTL,
    )


def clear_session_cookies(response: Response) -> None:
    """Expire all authentication and CSRF cookies with matching attributes."""
    response.delete_cookie(
        key=ACCESS_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
    )
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/api/auth",
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
    )
    response.delete_cookie(
        key=CSRF_COOKIE_NAME,
        path="/",
        httponly=False,
        samesite="lax",
        secure=COOKIE_SECURE,
    )


def get_client_ip(request: Request) -> str:
    """Extract client IP address safely without trusting spoofable headers by default."""
    if TRUST_PROXY_HEADERS:
        xff = request.headers.get("x-forwarded-for", "").strip()
        if xff:
            first = xff.split(",")[0].strip()
            if first:
                return first
        x_real = request.headers.get("x-real-ip", "").strip()
        if x_real:
            return x_real
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def check_rate_limit(bucket: str, key: str, limit: int, window_seconds: int) -> None:
    """Enforce a thread-safe sliding-window rate limit, raising HTTP 429 on exhaustion."""
    now = time.time()
    cutoff = now - float(window_seconds)
    bucket_key = (bucket, key)
    with _rate_limit_lock:
        dq = _rate_buckets.get(bucket_key)
        if dq is None:
            dq = collections.deque()
            _rate_buckets[bucket_key] = dq
        while dq and dq[0] <= cutoff:
            dq.popleft()
        if len(dq) >= limit:
            retry_after = max(1, int(math.ceil((dq[0] + window_seconds) - now)))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Retry in {retry_after}s.",
                headers={"Retry-After": str(retry_after)},
            )
        dq.append(now)


def _is_ip_jail_disabled() -> bool:
    return os.getenv("CF_DISABLE_IP_JAIL", "false").strip().lower() == "true"


def record_security_strike(ip: str, weight: int = 1, reason: str = "") -> Optional[int]:
    """Record a weighted security strike for an IP and return jail duration if triggered."""
    if _is_ip_jail_disabled() or not ip:
        return None
    now = time.time()
    cutoff = now - _STRIKE_WINDOW_SECONDS
    strike_weight = max(1, int(weight))

    with _jail_lock:
        dq = _ip_strikes.get(ip)
        if dq is None:
            dq = collections.deque()
            _ip_strikes[ip] = dq
        while dq and dq[0][0] <= cutoff:
            dq.popleft()
        dq.append((now, strike_weight))
        total_weight = sum(w for _, w in dq)

        jail_seconds: Optional[int] = None
        if total_weight >= 70:
            jail_seconds = 1800
        elif total_weight >= 40:
            jail_seconds = 300
        elif total_weight >= 20:
            jail_seconds = 30

        if jail_seconds is not None:
            _jailed_ips[ip] = max(_jailed_ips.get(ip, 0.0), now + jail_seconds)
        return jail_seconds


def check_ip_jail(ip: str) -> None:
    """Raise HTTP 429 with Retry-After if the client IP is currently jailed."""
    if _is_ip_jail_disabled() or not ip:
        return
    now = time.time()
    with _jail_lock:
        until = _jailed_ips.get(ip)
        if until is None:
            return
        remaining = until - now
        if remaining <= 0:
            del _jailed_ips[ip]
            return
        retry_after = max(1, int(math.ceil(remaining)))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Temporarily blocked due to suspicious activity. Retry in {retry_after}s.",
            headers={"Retry-After": str(retry_after)},
        )


def extract_access_token(request: Request) -> Tuple[Optional[str], bool]:
    """Return (token, from_bearer_header) from Authorization header or HttpOnly session cookie."""
    auth_header = request.headers.get("authorization") or ""
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
        if token:
            return token, True
    cookie_token = request.cookies.get(ACCESS_COOKIE_NAME)
    if cookie_token:
        stripped = cookie_token.strip()
        if stripped:
            return stripped, False
    return None, False


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> AuthenticatedUser:
    """Authenticate the caller via access JWT, revocation list, live DB row, and pwd_fp."""
    ip = get_client_ip(request)
    token, _ = extract_access_token(request)
    if not token:
        record_security_strike(ip, weight=1, reason="missing_access_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    try:
        payload = decode_jwt(token, expected_type="access")
    except HTTPException:
        record_security_strike(ip, weight=1, reason="invalid_access_token")
        raise

    if is_jti_revoked(payload["jti"]):
        record_security_strike(ip, weight=1, reason="revoked_access_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )

    role = payload["role"]
    user_id = int(payload["sub"])
    model, id_attr = ROLE_MODELS[role]
    row = db.query(model).filter(getattr(model, id_attr) == user_id).first()
    if row is None:
        record_security_strike(ip, weight=1, reason="missing_user_row")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    expected_fp = compute_password_fingerprint(row.password)
    if not hmac.compare_digest(expected_fp, payload["pwd_fp"]):
        record_security_strike(ip, weight=1, reason="stale_password_fingerprint")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalidated",
        )

    return AuthenticatedUser(
        id=getattr(row, id_attr),
        role=role,
        username=row.username,
        email=row.email,
        created_at=row.created_at,
        jti=payload["jti"],
        exp=float(payload["exp"]),
        family_id=payload.get("fam") if isinstance(payload.get("fam"), str) else None,
    )


def require_roles(*allowed_roles: str):
    """FastAPI dependency enforcing that the authenticated user holds one of allowed_roles."""

    def _role_guard(
        request: Request,
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        if current_user.role not in allowed_roles:
            record_security_strike(
                get_client_ip(request),
                weight=2,
                reason="rbac_forbidden",
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return _role_guard


def sanitize_csv_cell(value) -> str:
    """Neutralize spreadsheet formula injection (DDE) in CSV export cells."""
    if value is None:
        return ""
    text = str(value).replace("\x00", "")
    danger_prefixes = ("=", "+", "-", "@", "\t", "\r", "\n")
    if text.startswith(danger_prefixes) or text.lstrip().startswith(danger_prefixes):
        return f"'{text}"
    return text


def validate_strong_password(
    password: str,
    username: Optional[str] = None,
    email: Optional[str] = None,
) -> str:
    """Enforce strong password complexity, bcrypt length bounds, and common-password checks."""
    if not isinstance(password, str):
        raise ValueError("Password must be a string")
    if "\x00" in password:
        raise ValueError("Password must not contain null bytes")
    byte_len = len(password.encode("utf-8"))
    if len(password) < 10 or byte_len < 10:
        raise ValueError("Password must be at least 10 characters")
    if byte_len > 72:
        raise ValueError("Password must be at most 72 UTF-8 bytes")

    has_letter = any(ch.isalpha() for ch in password)
    has_digit_or_symbol = any(ch.isdigit() or (not ch.isalnum() and not ch.isspace()) for ch in password)
    if not (has_letter and has_digit_or_symbol):
        raise ValueError("Password must contain at least one letter and one number or symbol")

    lowered = password.lower()
    if lowered in _COMMON_BREACHED_PASSWORDS:
        raise ValueError("Password is too common; choose a stronger passphrase")

    if username:
        clean_user = username.strip().lower()
        if len(clean_user) >= 4 and clean_user in lowered:
            raise ValueError("Password must not contain your username")

    if email and "@" in email:
        local_part = email.split("@", 1)[0].strip().lower()
        if len(local_part) >= 4 and local_part in lowered:
            raise ValueError("Password must not contain your email name")

    return password
