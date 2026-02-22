"""LINE account binding via verification code."""
import logging
import random
import string
from datetime import datetime, timezone, timedelta

import requests
from flask import current_app

from app.extensions import db
from app.models import User

logger = logging.getLogger(__name__)

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
    user.line_display_name = _fetch_line_display_name(line_user_id)
    db.session.commit()
    del _pending_codes[code]

    display = user.line_display_name or user.nickname
    return True, f"綁定成功！{display}，之後到價通知會發送到你的 LINE"


def _fetch_line_display_name(line_user_id: str) -> str | None:
    """Fetch LINE user display name via the LINE Bot Profile API."""
    token = current_app.config.get("LINE_CHANNEL_ACCESS_TOKEN", "")
    if not token:
        return None
    try:
        resp = requests.get(
            f"https://api.line.me/v2/bot/profile/{line_user_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        if resp.status_code == 200:
            return resp.json().get("displayName")
        logger.warning("LINE profile API error [%d]: %s", resp.status_code, resp.text)
    except requests.RequestException as e:
        logger.warning("LINE profile API request failed: %s", e)
    return None
