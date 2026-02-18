# Kapaipai API

Pokemon TCG card price alert system for [kapaipai.tw](https://trade.kapaipai.tw).

## Tech Stack

- **Frontend:** React 19 + Vite 7 + TypeScript + Tailwind CSS
- **Backend:** Flask + SQLAlchemy + APScheduler
- **Database:** PostgreSQL 13 (psycopg2 driver)
- **Notifications:** LINE Messaging API
- **Infra:** Docker Compose (3 services)

## Architecture

```
frontend (nginx :80)
├── /api/*  → proxy to backend:5001
└── /*     → static files (React SPA)

backend (Flask :5001)
├── /api/cards       → search cards, fetch products from kapaipai.tw
├── /api/watchlist   → CRUD watchlist items + manual price check
└── /api/notifications → notification history

db (PostgreSQL :5432)
```

## Project Structure

```
backend/
├── app/
│   ├── __init__.py        # App factory (Flask + CORS + blueprints + scheduler)
│   ├── config.py          # Env-based config
│   ├── extensions.py      # SQLAlchemy instance
│   ├── scheduler.py       # APScheduler, 10-min interval
│   ├── seed.py            # Seed default user (user_id=1)
│   ├── models/            # User, WatchlistItem, PriceSnapshot, Notification
│   ├── routes/            # cards.py, watchlist.py, notifications.py
│   └── services/
│       ├── kapaipai.py    # Proxy to trade.kapaipai.tw API
│       ├── price_checker.py  # Price check + notification trigger logic
│       └── notifier.py    # LINE push message
├── alembic/               # DB migrations
├── requirements.txt
└── Dockerfile

frontend/
├── src/
│   ├── App.tsx            # Router: Search, Watchlist, History
│   ├── api/client.ts      # Typed API client (BASE="/api")
│   ├── types/index.ts     # CardVariant, WatchlistItem, PriceSnapshot, etc.
│   ├── pages/             # SearchPage, WatchlistPage, HistoryPage
│   └── components/        # Layout (sidebar), PriceAlertModal
├── nginx.conf             # Reverse proxy config
├── tailwind.config.js     # "Collector's Vault" dark theme + gold accents
└── Dockerfile             # Multi-stage: node build → nginx serve

legacy/                    # Original CLI tools (preserved for reference)
```

## Database Schema

- **users** — google_sso_id, line_user_id, nickname
- **watchlist_items** — user_id (FK), card_key, card_name, rare, pack_id, target_price, is_active
- **price_snapshots** — watchlist_item_id (FK), lowest_price, avg_price, buyable_count, checked_at
- **notifications** — watchlist_item_id (FK), triggered_price, target_price, message, status (sent/failed), sent_at

## Key Data Flows

1. **Search → Add:** User searches cards → selects variants → sets target price → saved to watchlist
2. **Scheduler:** Every 10 min, checks all active items against kapaipai.tw API → saves price snapshot → if price <= target, sends LINE notification (with dedup)
3. **Manual check:** User can trigger price check per item from watchlist page

## Commands

```bash
task up          # docker compose up -d --build
task down        # docker compose down
task logs        # docker compose logs -f
task db-shell    # pgcli into PostgreSQL
task db-migrate  # alembic upgrade head
task db-revision # create new migration (pass message as arg)
task seed        # seed default user
task fe-dev      # frontend dev server (npm run dev)
task be-dev      # backend dev server (flask run)
```

## Environment Variables (.env)

- `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE` — DB connection
- `FLASK_APP`, `SECRET_KEY` — Flask config
- `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`, `LINE_USER_ID` — LINE API
- `PRICE_CHECK_INTERVAL_MINUTES` — Scheduler interval (default 10)

## Database Deployment Options

1. **Standalone** (default): `docker compose up` includes a PostgreSQL service
2. **Shared with Kong**: Point `PG_*` env vars to Kong's PostgreSQL and remove/comment out the `db` service in docker-compose.yml. Create the `kapaipai` database on Kong's instance:
   ```sql
   CREATE DATABASE kapaipai;
   GRANT ALL PRIVILEGES ON DATABASE kapaipai TO kong;
   ```

## Design Notes

- Single hardcoded user (user_id=1) for now; DB schema supports multi-user
- Notification dedup: won't re-send if last notification has same triggered_price + target_price
- APScheduler runs in-process (not Celery)
- Frontend uses nginx as both static server and reverse proxy to avoid CORS
- Cloudflare proxy mode only supports specific ports (80, 443, 8080, etc.) — not 3000
