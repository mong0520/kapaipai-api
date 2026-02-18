import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Build URL from env vars (override alembic.ini)
db_url = (
    f"postgresql+psycopg2://{os.getenv('PG_USER', 'kapaipai')}:{os.getenv('PG_PASSWORD', 'kapaipai')}"
    f"@{os.getenv('PG_HOST', 'db')}:{os.getenv('PG_PORT', '5432')}"
    f"/{os.getenv('PG_DATABASE', 'kapaipai')}"
)
config.set_main_option("sqlalchemy.url", db_url)

# Import all models so autogenerate can detect them
from app.models import User, WatchlistItem, PriceSnapshot, Notification  # noqa: F401, E402
from app.extensions import db  # noqa: E402

target_metadata = db.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
