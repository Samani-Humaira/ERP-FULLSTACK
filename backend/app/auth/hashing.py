import bcrypt

BCRYPT_MAX_BYTES = 72


def _truncate_password(password: str) -> bytes:
    if not isinstance(password, str):
        raise ValueError('Password must be a string')

    password_bytes = password.encode('utf-8')
    if len(password_bytes) > BCRYPT_MAX_BYTES:
        # bcrypt only supports up to 72 bytes; truncate explicitly to avoid backend errors.
        password_bytes = password_bytes[:BCRYPT_MAX_BYTES]
    return password_bytes


def hash_password(plain_password: str) -> str:
    safe_password = _truncate_password(plain_password)
    hashed = bcrypt.hashpw(safe_password, bcrypt.gensalt())
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    safe_password = _truncate_password(plain_password)
    return bcrypt.checkpw(safe_password, hashed_password.encode('utf-8'))
