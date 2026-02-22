"""LINE Webhook handler for account binding."""
import hashlib
import hmac
import base64
import logging
import re

import requests
from flask import Blueprint, request, jsonify, current_app

from app.services.line_binding import verify_binding_code

logger = logging.getLogger(__name__)

line_bp = Blueprint("line", __name__)

CODE_PATTERN = re.compile(r"^\d{6}$")


def _verify_signature(body: bytes, signature: str) -> bool:
    """Verify LINE webhook signature (HMAC-SHA256)."""
    secret = current_app.config["LINE_CHANNEL_SECRET"].encode("utf-8")
    digest = hmac.new(secret, body, hashlib.sha256).digest()
    expected = base64.b64encode(digest).decode("utf-8")
    return hmac.compare_digest(signature, expected)


def _reply_message(reply_token: str, text: str):
    """Send a reply message using LINE Reply API."""
    token = current_app.config["LINE_CHANNEL_ACCESS_TOKEN"]
    url = "https://api.line.me/v2/bot/message/reply"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }
    payload = {
        "replyToken": reply_token,
        "messages": [{"type": "text", "text": text}],
    }
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        if resp.status_code != 200:
            logger.error("LINE reply error [%d]: %s", resp.status_code, resp.text)
    except requests.RequestException as e:
        logger.error("LINE reply failed: %s", e)


@line_bp.route("/webhook", methods=["POST"])
def webhook():
    """Handle LINE webhook events."""
    body = request.get_data()
    signature = request.headers.get("X-Line-Signature", "")

    if not _verify_signature(body, signature):
        return jsonify({"error": "Invalid signature"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"status": "ok"})

    for event in data.get("events", []):
        if event.get("type") != "message":
            continue
        if event.get("message", {}).get("type") != "text":
            continue

        text = event["message"]["text"].strip()
        reply_token = event["replyToken"]
        line_user_id = event.get("source", {}).get("userId")

        if not line_user_id:
            continue

        if CODE_PATTERN.match(text):
            success, msg = verify_binding_code(text, line_user_id)
            _reply_message(reply_token, msg)
        else:
            _reply_message(reply_token, "請輸入 6 位數驗證碼來綁定帳號")

    return jsonify({"status": "ok"})
