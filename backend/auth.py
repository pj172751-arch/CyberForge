import hashlib
try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    HAS_PASSLIB = True
except ImportError:
    HAS_PASSLIB = False

def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt or SHA-256 fallback."""
    if HAS_PASSLIB:
        return pwd_context.hash(password)
    # Safe fallback if passlib is not installed
    return "sha256$" + hashlib.sha256(password.encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored hash."""
    if HAS_PASSLIB and not hashed_password.startswith("sha256$"):
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            pass
    if hashed_password.startswith("sha256$"):
        return ("sha256$" + hashlib.sha256(plain_password.encode("utf-8")).hexdigest()) == hashed_password
    return False
