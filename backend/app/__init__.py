from flask import Flask
from flask_cors import CORS

from app.config import Config
from app.extensions import db


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(app)
    db.init_app(app)

    from app.routes.auth import auth_bp
    from app.routes.cards import cards_bp
    from app.routes.watchlist import watchlist_bp
    from app.routes.notifications import notifications_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(cards_bp, url_prefix="/api/cards")
    app.register_blueprint(watchlist_bp, url_prefix="/api/watchlist")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")

    from app.scheduler import init_scheduler
    init_scheduler(app)

    return app
