# Kapaipai API

Pokemon TCG card price alert system for [kapaipai.tw](https://trade.kapaipai.tw).

## Tech Stack

- **Frontend:** React 19 + Vite 7 + TypeScript + Tailwind CSS
- **Backend:** Flask + SQLAlchemy + APScheduler
- **Database:** PostgreSQL 13 (psycopg2 driver)
- **Notifications:** LINE Messaging API
- **Infra:** Docker Compose (2 services: frontend, backend; DB shares Kong's PostgreSQL)

## Architecture

```
frontend (nginx :80)
├── /api/*  → proxy to backend:5001
└── /*     → static files (React SPA)

backend (Flask :5001)
├── /api/auth         → Google OAuth2 login, JWT, LINE binding
├── /api/cards        → search cards, fetch products from kapaipai.tw
├── /api/watchlist    → CRUD watchlist items + manual price check
├── /api/notifications → notification history
└── /api/line         → LINE webhook (verification code binding)

db (PostgreSQL :5432)
```

## Project Structure

```
backend/
├── app/
│   ├── __init__.py        # App factory (Flask + CORS + blueprints + scheduler)
│   ├── auth.py            # JWT generate/decode, login_required decorator
│   ├── config.py          # Env-based config
│   ├── extensions.py      # SQLAlchemy instance
│   ├── scheduler.py       # APScheduler, 10-min interval
│   ├── seed.py            # Seed default user
│   ├── models/            # User, WatchlistItem, PriceSnapshot, Notification
│   ├── routes/
│   │   ├── auth.py        # Google login, /me, LINE binding code generation
│   │   ├── line.py        # LINE webhook (verification code binding)
│   │   ├── cards.py       # Card search, products, multi-search
│   │   ├── watchlist.py   # CRUD + manual price check
│   │   └── notifications.py
│   └── services/
│       ├── kapaipai.py       # Proxy to trade.kapaipai.tw API + card_image_url helper
│       ├── price_checker.py  # Price check + notification trigger logic
│       ├── notifier.py       # LINE push message (text + image)
│       └── line_binding.py   # Verification code generation + LINE profile fetch
├── alembic/               # DB migrations (manual revision IDs: 001, 002, ...)
├── requirements.txt
└── Dockerfile

frontend/
├── src/
│   ├── App.tsx            # Router
│   ├── api/client.ts      # Typed API client (BASE="/api")
│   ├── types/index.ts     # Shared TypeScript interfaces
│   ├── contexts/AuthContext.tsx  # Google OAuth + JWT + refreshUser
│   ├── pages/             # LoginPage, SearchPage, MultiSearchPage,
│   │                      # WatchlistPage, HistoryPage, LineBindingPage
│   └── components/        # Layout (sidebar), PriceAlertModal, ProtectedRoute
├── nginx.conf             # Reverse proxy config
├── tailwind.config.js     # "Collector's Vault" dark theme + gold accents
└── Dockerfile             # Multi-stage: node build → nginx serve

legacy/                    # Original CLI tools (preserved for reference)
```

## Database Schema

- **users** — google_sso_id, email, avatar_url, is_admin, nickname, line_user_id, line_display_name
- **watchlist_items** — user_id (FK), card_key, card_name, rare, pack_id, pack_card_id, target_price, is_active
- **price_snapshots** — watchlist_item_id (FK), lowest_price, avg_price, buyable_count, total_count, checked_at
- **notifications** — watchlist_item_id (FK), triggered_price, target_price, message, status (sent/failed), sent_at

## Key Data Flows

1. **Auth:** Google Sign-In (frontend GIS) → POST credential to `/api/auth/google` → backend verifies → returns JWT (HS256, 30-day expiry) → stored in localStorage
2. **Search → Add:** User searches cards → selects variants → sets target price → saved to watchlist
3. **Scheduler:** Every 10 min, checks all active items against kapaipai.tw API → saves price snapshot → if price ≤ target, sends LINE notification with card image (with dedup)
4. **Manual check:** User can trigger price check per item from watchlist page
5. **LINE Binding:** User generates 6-digit code on web → sends code to LINE Bot → webhook validates + fetches LINE profile → writes line_user_id + display name to DB → frontend polls `/api/auth/me` to detect success

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
task deploy      # deploy to EC2 via SSH (git pull + docker compose up --build)
```

## Environment Variables (.env)

- `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE` — DB connection
- `FLASK_APP`, `SECRET_KEY` — Flask config
- `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID` — Google OAuth2 (VITE_ is build-time, baked into JS bundle)
- `JWT_SECRET_KEY`, `JWT_EXPIRATION_HOURS` — JWT signing (default 720h = 30 days)
- `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET` — LINE Messaging API
- `LINE_BOT_ADD_FRIEND_URL` — LINE Bot add-friend link (for QR code on binding page)
- `PRICE_CHECK_INTERVAL_MINUTES` — Scheduler interval (default 10)

## Database Deployment Options

1. **Standalone** (default): `docker compose up` includes a PostgreSQL service
2. **Shared with Kong**: Point `PG_*` env vars to Kong's PostgreSQL and remove/comment out the `db` service in docker-compose.yml. Create the `kapaipai` database on Kong's instance:
   ```sql
   CREATE DATABASE kapaipai;
   GRANT ALL PRIVILEGES ON DATABASE kapaipai TO kong;
   ```

## Deploy Flow

1. `git push origin main`
2. `task env-sync` — SCP `.env` to EC2 (only when env vars change)
3. `task deploy` — SSH to EC2, git pull, docker compose up -d --build
- If `VITE_*` vars change, frontend must rebuild (deploy does this)
- EC2 host: ubuntu@43.213.132.120, SSH key: ~/.ssh/aws-tpe.pem
- Production URL: https://kapaipai.nt1.dev/

## Design Notes

- Multi-user via Google OAuth2 + JWT; each user binds their own LINE account
- LINE binding uses verification code + webhook (not manual LINE ID input)
- Notification dedup: won't re-send if last notification has same triggered_price + target_price
- Notifications only sent to users with bound LINE accounts
- Card images: `https://static.kapaipai.tw/image/card/pkmtw/{card_key}/{pack_id}/{pack_card_id}/{rare}.jpg`
- APScheduler runs in-process (not Celery)
- Frontend uses nginx as both static server and reverse proxy to avoid CORS
- Cloudflare proxy mode only supports specific ports (80, 443, 8080, etc.) — not 3000
- LINE webhook URL: `https://kapaipai.nt1.dev/api/line/webhook` (must be set in LINE Developers Console)
