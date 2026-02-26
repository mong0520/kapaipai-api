"""add target_price_min to watchlist_items

Revision ID: 004
Revises: 003
Create Date: 2026-02-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "watchlist_items",
        sa.Column("target_price_min", sa.Integer(), nullable=True, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("watchlist_items", "target_price_min")
