"""Authentication routes — Google OAuth2 login."""
from flask import Blueprint, jsonify, request, current_app, g
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.extensions import db
from app.models import User
from app.auth import generate_jwt, login_required

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/google", methods=["POST"])
def google_login():
    """Verify Google ID token, find/create user, return JWT."""
    body = request.get_json()
    credential = body.get("credential") if body else None
    if not credential:
        return jsonify({"error": "credential is required"}), 400

    try:
        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            current_app.config["GOOGLE_CLIENT_ID"],
        )
    except ValueError as e:
        return jsonify({"error": f"Invalid token: {e}"}), 401

    google_sub = idinfo["sub"]
    email = idinfo.get("email", "")
    name = idinfo.get("name", "")
    picture = idinfo.get("picture", "")

    user = User.query.filter_by(google_sso_id=google_sub).first()
    if not user:
        user = User(
            google_sso_id=google_sub,
            email=email,
            nickname=name,
            avatar_url=picture,
        )
        db.session.add(user)
        db.session.commit()
    else:
        user.email = email
        user.nickname = name
        user.avatar_url = picture
        db.session.commit()

    token = generate_jwt(user.id)
    return jsonify({"token": token, "user": user.to_dict()})


@auth_bp.route("/me", methods=["GET"])
@login_required
def me():
    """Return the current authenticated user."""
    return jsonify({"user": g.current_user.to_dict()})


@auth_bp.route("/line-binding", methods=["PATCH"])
@login_required
def bind_line():
    """Bind or update the user's LINE user ID."""
    body = request.get_json()
    line_user_id = body.get("line_user_id", "").strip() if body else ""

    g.current_user.line_user_id = line_user_id or None
    if not line_user_id:
        g.current_user.line_display_name = None
    db.session.commit()

    return jsonify({"user": g.current_user.to_dict()})


@auth_bp.route("/line-binding/code", methods=["POST"])
@login_required
def generate_line_code():
    """Generate a 6-digit verification code for LINE binding."""
    from app.services.line_binding import generate_binding_code
    code = generate_binding_code(g.current_user.id)
    bot_url = current_app.config.get("LINE_BOT_ADD_FRIEND_URL", "")
    return jsonify({"code": code, "bot_url": bot_url})
