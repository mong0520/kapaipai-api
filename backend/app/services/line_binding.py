"""LINE account binding via verification code."""
import random
import string
from datetime import datetime, timezone, timedelta

from app.extensions import db
from app.models import User

_pending_codes: dict[str, dict] = {}

CODE_TTL_MINUTES = 5


def generate_binding_code(user_id: int) -> str:
    """Generate a 6-digit binding code for the given user. Replaces any existing code."""
    # Remove old codes for this user
    to_remove = [c for c, v in _pending_codes.items() if v["user_id"] == user_id]
    for c in to_remove:
        del _pending_codes[c]

    # Clean expired codes
    now = datetime.now(timezone.utc)
    expired = [c for c, v in _pending_codes.items() if v["expires"] < now]
    for c in expired:
        del _pending_codes[c]

    # Generate unique 6-digit code
    for _ in range(100):
        code = "".join(random.choices(string.digits, k=6))
        if code not in _pending_codes:
            break

    _pending_codes[code] = {
        "user_id": user_id,
        "expires": now + timedelta(minutes=CODE_TTL_MINUTES),
    }
    return code


def verify_binding_code(code: str, line_user_id: str) -> tuple[bool, str]:
    """Verify a binding code and link the LINE user ID to the user account.

    Returns (success, message).
    """
    now = datetime.now(timezone.utc)

    entry = _pending_codes.get(code)
    if not entry:
        return False, "驗證碼無效，請重新產生"

    if entry["expires"] < now:
        del _pending_codes[code]
        return False, "驗證碼已過期，請重新產生"

    user = User.query.get(entry["user_id"])
    if not user:
        del _pending_codes[code]
        return False, "找不到對應的使用者"

    user.line_user_id = line_user_id
    db.session.commit()
    del _pending_codes[code]

    return True, f"綁定成功！{user.nickname}，之後到價通知會發送到你的 LINE"
