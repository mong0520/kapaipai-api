from app.extensions import db
from datetime import datetime, timezone


class PriceSnapshot(db.Model):
    __tablename__ = "price_snapshots"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    watchlist_item_id = db.Column(
        db.Integer, db.ForeignKey("watchlist_items.id", ondelete="CASCADE"), nullable=False
    )
    lowest_price = db.Column(db.Integer, nullable=True)
    avg_price = db.Column(db.Numeric(10, 2), nullable=True)
    buyable_count = db.Column(db.Integer, default=0)
    total_count = db.Column(db.Integer, default=0)
    checked_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )

    watchlist_item = db.relationship("WatchlistItem", back_populates="price_snapshots")

    def to_dict(self):
        return {
            "id": self.id,
            "watchlist_item_id": self.watchlist_item_id,
            "lowest_price": self.lowest_price,
            "avg_price": float(self.avg_price) if self.avg_price else None,
            "buyable_count": self.buyable_count,
            "total_count": self.total_count,
            "checked_at": self.checked_at.isoformat() if self.checked_at else None,
        }
