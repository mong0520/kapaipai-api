"""add email, avatar_url, is_admin to users

Revision ID: 002
Revises: 001
Create Date: 2026-02-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("email", sa.String(255), unique=True, nullable=True))
    op.add_column("users", sa.Column("avatar_url", sa.String(500), nullable=True))
    op.add_column("users", sa.Column("is_admin", sa.Boolean, server_default=sa.text("false"), nullable=False))


def downgrade() -> None:
    op.drop_column("users", "is_admin")
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "email")
