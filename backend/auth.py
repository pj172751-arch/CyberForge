import threading
import bcrypt

_BCRYPT_SEMAPHORE = threading.BoundedSemaphore(8)

DUMMY_PASSWORD_HASH: str = bcrypt.hashpw(
    b"cyberforge-dummy-timing-guard-password",
    bcrypt.gensalt(rounds=12),
).decode("utf-8")


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt (12 rounds) bounded by a CPU semaphore."""
    with _BCRYPT_SEMAPHORE:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash."""
    try:
        with _BCRYPT_SEMAPHORE:
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except ValueError:
        return False


def dummy_verify_password(plain_password: str) -> None:
    """Run a constant-cost dummy bcrypt check when an account does not exist."""
    try:
        pw_bytes = (plain_password or "").encode("utf-8")[:72]
        with _BCRYPT_SEMAPHORE:
            bcrypt.checkpw(pw_bytes, DUMMY_PASSWORD_HASH.encode("utf-8"))
    except ValueError:
        pass
