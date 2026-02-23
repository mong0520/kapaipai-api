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
        user_id: LINE user ID (from user's LINE binding).
        image_url: Optional image URL to send before the text message.

    Returns:
        True if sent successfully, False otherwise.
    """
    token = current_app.config["LINE_CHANNEL_ACCESS_TOKEN"]

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


def send_price_alert_flex(card_name: str, target_price: int, current_price: int,
                          image_url: str | None, product_url: str | None,
                          user_id: str | None = None) -> bool:
    """Send a price alert using Flex Message with card-style UI.

    Args:
        card_name: Card name.
        target_price: Target price set by user.
        current_price: Current lowest price.
        image_url: Card image URL.
        product_url: Product page URL.
        user_id: LINE user ID.

    Returns:
        True if sent successfully, False otherwise.
    """
    token = current_app.config["LINE_CHANNEL_ACCESS_TOKEN"]

    if not token or not user_id:
        logger.error("LINE credentials not configured")
        return False

    # Build Flex Message
    flex_content = {
        "type": "bubble",
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {
                            "type": "image",
                            "url": image_url or "https://via.placeholder.com/800x600?text=No+Image",
                            "aspectRatio": "2:3",
                            "aspectMode": "fit",
                            "size": "full",
                        }
                    ],
                    "paddingAll": "5%",
                },
                {
                    "type": "text",
                    "text": "🎉 到價通知",
                    "weight": "bold",
                    "size": "sm",
                    "color": "#1DB446",
                    "margin": "md",
                },
                {
                    "type": "text",
                    "text": card_name,
                    "weight": "bold",
                    "size": "xl",
                    "margin": "md",
                    "wrap": True,
                },
                {
                    "type": "separator",
                    "margin": "md",
                },
                {
                    "type": "box",
                    "layout": "vertical",
                    "margin": "lg",
                    "spacing": "sm",
                    "contents": [
                        {
                            "type": "box",
                            "layout": "baseline",
                            "spacing": "sm",
                            "contents": [
                                {
                                    "type": "text",
                                    "text": "目標價格",
                                    "color": "#aaaaaa",
                                    "size": "sm",
                                    "flex": 2,
                                },
                                {
                                    "type": "text",
                                    "text": f"${target_price}",
                                    "wrap": True,
                                    "color": "#666666",
                                    "size": "sm",
                                    "flex": 3,
                                },
                            ],
                        },
                        {
                            "type": "box",
                            "layout": "baseline",
                            "spacing": "sm",
                            "contents": [
                                {
                                    "type": "text",
                                    "text": "目前價格",
                                    "color": "#aaaaaa",
                                    "size": "sm",
                                    "flex": 2,
                                },
                                {
                                    "type": "text",
                                    "text": f"${current_price}",
                                    "wrap": True,
                                    "color": "#E74C3C",
                                    "size": "lg",
                                    "weight": "bold",
                                    "flex": 3,
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    }

    # Add button if product URL is provided
    if product_url:
        flex_content["footer"] = {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": [
                {
                    "type": "button",
                    "style": "primary",
                    "height": "sm",
                    "action": {
                        "type": "uri",
                        "label": "前往商品頁面",
                        "uri": product_url,
                    },
                },
            ],
            "flex": 0,
        }

    url = "https://api.line.me/v2/bot/message/push"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }
    payload = {
        "to": user_id,
        "messages": [
            {
                "type": "flex",
                "altText": f"🎉 到價通知：{card_name} 目前 ${current_price}！",
                "contents": flex_content,
            }
        ],
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        if resp.status_code == 200:
            logger.info("LINE Flex message sent successfully to %s", user_id)
            return True
        else:
            logger.error("LINE Error [%d]: %s", resp.status_code, resp.text)
            return False
    except requests.RequestException as e:
        logger.error("LINE request failed: %s", e)
        return False
