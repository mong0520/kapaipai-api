from app.extensions import db
from datetime import datetime, timezone


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    watchlist_item_id = db.Column(
        db.Integer, db.ForeignKey("watchlist_items.id", ondelete="CASCADE"), nullable=False
    )
    triggered_price = db.Column(db.Integer, nullable=False)
    target_price = db.Column(db.Integer, nullable=False)
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.Enum("sent", "failed", name="notification_status"), default="sent")
    sent_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )

    watchlist_item = db.relationship("WatchlistItem", back_populates="notifications")

    def to_dict(self):
        return {
            "id": self.id,
            "watchlist_item_id": self.watchlist_item_id,
            "triggered_price": self.triggered_price,
            "target_price": self.target_price,
            "message": self.message,
            "status": self.status,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "card_name": self.watchlist_item.card_name if self.watchlist_item else None,
            "rare": self.watchlist_item.rare if self.watchlist_item else None,
        }
