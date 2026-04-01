from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
BCRYPT_MAX_BYTES = 72


def _truncate_password(password: str) -> str:
    if not isinstance(password, str):
        raise ValueError("Password must be a string")

    encoded = password.encode("utf-8")
    if len(encoded) > BCRYPT_MAX_BYTES:
        # bcrypt truncates after 72 bytes; do the same explicitly to avoid backend verify issues
        return encoded[:BCRYPT_MAX_BYTES].decode("utf-8", errors="ignore")
    return password


def hash_password(plain_password: str) -> str:
    safe_password = _truncate_password(plain_password)
    return pwd_context.hash(safe_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    safe_password = _truncate_password(plain_password)
    return pwd_context.verify(safe_password, hashed_password)