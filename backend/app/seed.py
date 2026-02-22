"""Seed default user into the database."""
import os

from app import create_app
from app.extensions import db
from app.models import User


def seed():
    app = create_app()
    with app.app_context():
        # Check if default user already exists
        existing = User.query.filter_by(nickname="default").first()
        if existing:
            print(f"Default user already exists (id={existing.id}), skipping seed.")
            return

        user = User(
            nickname="default",
            line_user_id=os.getenv("LINE_USER_ID", ""),
            is_admin=True,
        )
        db.session.add(user)
        db.session.commit()
        print(f"Seeded default user (id={user.id}, line_user_id={user.line_user_id})")


if __name__ == "__main__":
    seed()
