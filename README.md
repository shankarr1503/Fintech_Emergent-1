# CoinQuest

**Pay, save and level up.** CoinQuest is a UPI payments and personal-finance app: Scan & Pay, bills, credit cards and score, loans against investments, Account Aggregator, savings goals and a debt payoff planner. Good money habits earn coins, XP, streaks and badges.

The design benchmarks Google Pay, PhonePe, Paytm, CRED and 1% Club. See [docs/design/DESIGN.md](docs/design/DESIGN.md) for what we took from each, the principles, and the tokens.

| Sign in | Home | Pay | Paid |
|---|---|---|---|
| ![](docs/screenshots/sign-in.png) | ![](docs/screenshots/home.png) | ![](docs/screenshots/pay.png) | ![](docs/screenshots/paid.png) |

| Money | Rewards | Debts | Credit score |
|---|---|---|---|
| ![](docs/screenshots/money.png) | ![](docs/screenshots/rewards.png) | ![](docs/screenshots/debts.png) | ![](docs/screenshots/credit-score.png) |

## What's in it

- **Home:** what's left this month, Scan / Pay anyone / Bills / Balances, recent people, today's streak, bills due, one insight.
- **Scan & Pay:** camera QR scanning (any UPI QR), amounts from merchant QRs are locked, a large keypad, swipe to pay (a tap can never move money), full-screen receipt.
- **Money:** net worth, spending by category, accounts, debt-free date, goals, activity.
- **Rewards:** level and XP, daily check-in streak, three daily quests, nine badges, coin store, leaderboard.
- **Debts:** avalanche vs snowball in rupees, extra-payment what-ifs, log payments.
- **Also:** credit score with factors and card bills, loans against MF/shares/FD with EMI calculator, Account Aggregator linking, goals, learn, community, security and data export.

The game engine is server-side (`backend/app/services/game.py`): every money endpoint returns a `reward` block, which the app shows as a small toast, or inline on the payment receipt.

## Run it

**Backend** (Python 3.11+). Runs without MongoDB, falling back to an in-memory database:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env          # optional: set MONGO_URL, OPENAI_API_KEY
uvicorn server:app --reload --port 8001
pytest                        # 30 API tests
```

**App** (Expo SDK 54):

```bash
cd frontend
yarn install
cp .env.example .env          # EXPO_PUBLIC_BACKEND_URL=http://<your-ip>:8001
yarn start                    # press w for web, or scan with Expo Go
yarn lint && npx tsc --noEmit
```

Sign in with any valid Indian mobile number. In demo mode (`DEMO_MODE=true`) the OTP is shown on screen, and new players get a starter world with demo transactions, debts and a savings goal.

## Layout

```
backend/
  app/config.py        env settings (Mongo, OpenAI, demo mode, CORS)
  app/db.py            Motor client, or mongomock when MONGO_URL is empty
  app/routers/         one module per feature (auth, upi, bills, debts, game, …)
  app/services/        game engine, debt payoff math, AI insights, demo data
  tests/               end-to-end API tests
frontend/
  app/                 expo-router screens; (tabs) = Home, Money, Rewards, Me (+ Scan)
  src/ui/              design system: tokens, component kit, swipe-to-pay
  src/game/            game state (GameContext), reward toast, the pixel coin
  src/services/api.ts  typed API client
```

## Production notes

Sign-in issues a 30-day session token (JWT). Every non-public route requires it, and the API rejects any request for another user's data (`user_id` in path, query or body, or someone else's debt, goal or consent). Set `SECRET_KEY` in production; without it, sessions end when the server restarts. Logging out revokes the token on the server.

Abuse protection: one-time codes are stored hashed and burn after 5 wrong guesses; code requests are limited to 3 per 10 minutes per phone (20 per hour per IP); payments to 10 per minute per user; loan applications to 5 per hour. Limits live in the database, so they hold across multiple API instances.

The money rails are simulated. Before handling real money you need:
- **SMS:** send OTPs via an SMS provider and set `DEMO_MODE=false`.
- **Partners:** UPI (a PSP bank), BBPS for bills, a credit bureau, an AA (Finvu/CAMS) and a lending partner replace the mock endpoints.
