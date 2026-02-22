"""LINE notification service - ported from legacy/notify_test.py."""
import logging

import requests
from flask import current_app

logger = logging.getLogger(__name__)


def send_line_message(message: str, user_id: str | None = None,
                      image_url: str | None = None) -> bool:
    """Send a push message via LINE Messaging API.

    Args:
        message: Text message to send.
        user_id: LINE user ID. If None, uses LINE_USER_ID from config.
        image_url: Optional image URL to send before the text message.

    Returns:
        True if sent successfully, False otherwise.
    """
    token = current_app.config["LINE_CHANNEL_ACCESS_TOKEN"]
    if not user_id:
        user_id = current_app.config["LINE_USER_ID"]

    if not token or not user_id:
        logger.error("LINE credentials not configured")
        return False

    url = "https://api.line.me/v2/bot/message/push"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }
    messages = []
    if image_url:
        messages.append({
            "type": "image",
            "originalContentUrl": image_url,
            "previewImageUrl": image_url,
        })
    messages.append({"type": "text", "text": message})

    payload = {
        "to": user_id,
        "messages": messages,
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        if resp.status_code == 200:
            logger.info("LINE message sent successfully to %s", user_id)
            return True
        else:
            logger.error("LINE Error [%d]: %s", resp.status_code, resp.text)
            return False
    except requests.RequestException as e:
        logger.error("LINE request failed: %s", e)
        return False
