import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")

    PG_HOST = os.getenv("PG_HOST", "127.0.0.1")
    PG_PORT = os.getenv("PG_PORT", "5432")
    PG_USER = os.getenv("PG_USER", "kapaipai")
    PG_PASSWORD = os.getenv("PG_PASSWORD", "kapaipai")
    PG_DATABASE = os.getenv("PG_DATABASE", "kapaipai")

    SQLALCHEMY_DATABASE_URI = (
        f"postgresql+psycopg2://{PG_USER}:{PG_PASSWORD}"
        f"@{PG_HOST}:{PG_PORT}/{PG_DATABASE}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "")
    LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET", "")
    LINE_USER_ID = os.getenv("LINE_USER_ID", "")

    PRICE_CHECK_INTERVAL_MINUTES = int(os.getenv("PRICE_CHECK_INTERVAL_MINUTES", "10"))

    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", os.getenv("SECRET_KEY", "dev-secret-key"))
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "720"))
