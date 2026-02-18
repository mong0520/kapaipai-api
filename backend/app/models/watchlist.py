from app.extensions import db
from datetime import datetime, timezone


class WatchlistItem(db.Model):
    __tablename__ = "watchlist_items"
    __table_args__ = (
        db.UniqueConstraint("user_id", "card_key", "rare", "pack_id", name="uq_user_card"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    card_key = db.Column(db.String(500), nullable=False)
    card_name = db.Column(db.String(200), nullable=False)
    pack_id = db.Column(db.String(50), nullable=True)
    pack_name = db.Column(db.String(200), nullable=True)
    pack_card_id = db.Column(db.String(50), nullable=True)
    rare = db.Column(db.String(50), nullable=False)
    target_price = db.Column(db.Integer, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = db.relationship("User", back_populates="watchlist_items")
    price_snapshots = db.relationship(
        "PriceSnapshot", back_populates="watchlist_item", lazy="dynamic",
        cascade="all, delete-orphan",
    )
    notifications = db.relationship(
        "Notification", back_populates="watchlist_item", lazy="dynamic",
        cascade="all, delete-orphan",
    )

    def to_dict(self, include_latest_snapshot=False):
        result = {
            "id": self.id,
            "user_id": self.user_id,
            "card_key": self.card_key,
            "card_name": self.card_name,
            "pack_id": self.pack_id,
            "pack_name": self.pack_name,
            "pack_card_id": self.pack_card_id,
            "rare": self.rare,
            "target_price": self.target_price,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_latest_snapshot:
            latest = self.price_snapshots.order_by(
                db.desc("checked_at")
            ).first()
            result["latest_snapshot"] = latest.to_dict() if latest else None
        return result
