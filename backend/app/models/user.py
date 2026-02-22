from app.extensions import db
from datetime import datetime, timezone


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    google_sso_id = db.Column(db.String(255), unique=True, nullable=True)
    email = db.Column(db.String(255), unique=True, nullable=True)
    avatar_url = db.Column(db.String(500), nullable=True)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    line_user_id = db.Column(db.String(255), nullable=True)
    nickname = db.Column(db.String(100), nullable=False, default="default")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    watchlist_items = db.relationship("WatchlistItem", back_populates="user", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "google_sso_id": self.google_sso_id,
            "email": self.email,
            "avatar_url": self.avatar_url,
            "is_admin": self.is_admin,
            "line_user_id": self.line_user_id,
            "nickname": self.nickname,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
