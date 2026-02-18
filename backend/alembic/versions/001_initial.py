"""initial tables

Revision ID: 001
Revises:
Create Date: 2026-02-11
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("google_sso_id", sa.String(255), unique=True, nullable=True),
        sa.Column("line_user_id", sa.String(255), nullable=True),
        sa.Column("nickname", sa.String(100), nullable=False, server_default="default"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        "watchlist_items",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("card_key", sa.String(500), nullable=False),
        sa.Column("card_name", sa.String(200), nullable=False),
        sa.Column("pack_id", sa.String(50), nullable=True),
        sa.Column("pack_name", sa.String(200), nullable=True),
        sa.Column("pack_card_id", sa.String(50), nullable=True),
        sa.Column("rare", sa.String(50), nullable=False),
        sa.Column("target_price", sa.Integer, nullable=False),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.UniqueConstraint("user_id", "card_key", "rare", "pack_id", name="uq_user_card"),
    )

    op.create_table(
        "price_snapshots",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "watchlist_item_id",
            sa.Integer,
            sa.ForeignKey("watchlist_items.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("lowest_price", sa.Integer, nullable=True),
        sa.Column("avg_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("buyable_count", sa.Integer, server_default=sa.text("0")),
        sa.Column("total_count", sa.Integer, server_default=sa.text("0")),
        sa.Column("checked_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("idx_item_checked", "price_snapshots", ["watchlist_item_id", sa.text("checked_at DESC")])

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "watchlist_item_id",
            sa.Integer,
            sa.ForeignKey("watchlist_items.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("triggered_price", sa.Integer, nullable=False),
        sa.Column("target_price", sa.Integer, nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("status", sa.Enum("sent", "failed", name="notification_status"), server_default="sent"),
        sa.Column("sent_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("idx_item_sent", "notifications", ["watchlist_item_id", sa.text("sent_at DESC")])


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("price_snapshots")
    op.drop_table("watchlist_items")
    op.drop_table("users")
