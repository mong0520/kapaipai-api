#!/usr/bin/env python3
"""
Notification test script - send a message to your phone.
Credentials are loaded from credential.yaml in the same directory.

Usage:
    python notify_test.py "Hello from LINE!"
"""

import argparse
import os
import sys

import requests
import yaml

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIAL_FILE = os.path.join(SCRIPT_DIR, "credential.yaml")


def load_credential() -> dict:
    """Load LINE credentials from credential.yaml."""
    if not os.path.exists(CREDENTIAL_FILE):
        print(f"Error: Credential file not found: {CREDENTIAL_FILE}", file=sys.stderr)
        sys.exit(1)
    with open(CREDENTIAL_FILE) as f:
        cred = yaml.safe_load(f)
    line = cred.get("line", {})
    token = line.get("channel_access_token")
    user_id = line.get("my_user_id")
    if not token or not user_id:
        print("Error: credential.yaml missing 'channel_access_token' or 'my_user_id'", file=sys.stderr)
        sys.exit(1)
    return {"token": token, "user_id": user_id}


def send_line_message(token: str, user_id: str, message: str) -> bool:
    """Send a push message via LINE Messaging API."""
    url = "https://api.line.me/v2/bot/message/push"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }
    payload = {
        "to": user_id,
        "messages": [{"type": "text", "text": message}],
    }

    resp = requests.post(url, headers=headers, json=payload, timeout=10)
    if resp.status_code == 200:
        print("LINE message sent successfully!")
        return True
    else:
        print(f"LINE Error [{resp.status_code}]: {resp.text}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Send a test LINE notification to your phone",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  python notify_test.py "Hello!"
  python notify_test.py "卡牌降價通知 test"
""",
    )
    parser.add_argument("message", help="Message to send")

    args = parser.parse_args()

    cred = load_credential()
    send_line_message(cred["token"], cred["user_id"], args.message)


if __name__ == "__main__":
    main()
