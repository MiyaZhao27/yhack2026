# SuiteEase

Check it out: https://yhack2026-nu.vercel.app/

SuiteEase is a full-stack shared-living web app for roommates and suitemates. It combines chores, a shared bulletin board, expense tracking, settle-up flows, Google sign-in, and multi-suite membership in a single Next.js app backed by MongoDB.

This repository is the active app. It uses:
- Next.js App Router
- React + TypeScript
- Tailwind CSS
- MongoDB + Mongoose
- NextAuth

## What It Does

SuiteEase is designed as a one-suite-at-a-time experience, while still allowing a user to belong to multiple suites.

Core features:
- Google OAuth login
- Guest demo login
- Suite creation and invite-code joining
- Multi-suite membership with one active suite at a time
- Dashboard with a shared bulletin board and personal task summary
- Chores/tasks page with calendar + task board
- Shared expense tracking and settle-up flows
- Receipt scanning for expenses
- Suite assistant endpoint

## Product Model

SuiteEase distinguishes between:

- Membership: the suites a user is allowed to access
- Active suite: the one suite the user is currently viewing

The UI behaves as a single-suite app:
- all dashboard, tasks, finance, and bulletin data is scoped to the active suite
- switching suites changes the active suite only
- no view mixes data from multiple suites

## Current App Structure

Top-level app routes:
- `/login`
- `/onboarding`
- `/`
- `/dashboard`
- `/tasks`
- `/finance`
- `/setup`

## Authentication

SuiteEase currently supports:
- Google sign-in through NextAuth
- guest/demo sign-in through a credentials provider

Google sign-in is configured in:
- [src/auth.ts](/Users/evazheng/Desktop/yhack/src/auth.ts)

Guest login:
- creates or reuses demo data through [src/server/utils/guestSeed.ts](/Users/evazheng/Desktop/yhack/src/server/utils/guestSeed.ts)

Post-auth behavior:
- new users without onboarding complete are routed through onboarding
- onboarded users go to the dashboard flow

## Suite Creation and Joining

Users create or join suites from:
- [src/features/SetupPage.tsx](/Users/evazheng/Desktop/yhack/src/features/SetupPage.tsx)

Behavior:
- `Create Suite` creates a new suite and makes it active immediately
- `Join by Code` adds the suite to the user’s memberships and makes it active
- users can belong to multiple suites
- the active suite is switchable from the app header

Suite APIs:
- `GET /api/suites`
- `POST /api/suites`
- `PATCH /api/suites` for active-suite switching
- `GET /api/suites/:id`
- `POST /api/suites/join`

## Dashboard

Dashboard is powered by:
- [src/features/DashboardPage.tsx](/Users/evazheng/Desktop/yhack/src/features/DashboardPage.tsx)

Current dashboard behavior:
- shared bulletin board for the active suite
- `My Tasks` card scoped to the signed-in user
- task summary includes:
  - overdue tasks
  - due today tasks
  - upcoming tasks within the next 7 days

Dashboard API:
- `GET /api/dashboard/:suiteId`

## Bulletin Board

The bulletin board is a shared per-suite surface.

Key files:
- [src/components/BulletinBoard.tsx](/Users/evazheng/Desktop/yhack/src/components/BulletinBoard.tsx)
- [src/components/StickyNote.tsx](/Users/evazheng/Desktop/yhack/src/components/StickyNote.tsx)

Behavior:
- notes are stored in MongoDB
- notes are scoped to the active suite
- notes support color, inline edit, drag, delete, and persisted position

APIs:
- `GET /api/bulletin-notes?suiteId=...`
- `POST /api/bulletin-notes`
- `PATCH /api/bulletin-notes/:id`
- `DELETE /api/bulletin-notes/:id`

## Tasks and Chores

Tasks are managed from:
- [src/features/TasksPage.tsx](/Users/evazheng/Desktop/yhack/src/features/TasksPage.tsx)

Current capabilities:
- add a task
- assign to a suitemate
- due dates
- recurrence
- status updates
- Google Tasks sync for the assignee
- task board view
- calendar view

Important behavior:
- task board is active-suite scoped
- Google calendar tasks are filtered to tasks linked to the active suite, so tasks from other suites do not leak into the current calendar view

APIs:
- `GET /api/tasks?suiteId=...`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `POST /api/tasks/:id` for Google Tasks sync
- `GET /api/google-calendar?suiteId=...`

## Finance

Finance is managed from:
- [src/features/FinancePage.tsx](/Users/evazheng/Desktop/yhack/src/features/FinancePage.tsx)

Current capabilities:
- add manual expenses
- add receipt-based expenses
- record payments
- edit expenses
- delete expenses
- delete settlements
- compute balances
- suggest settle-ups

Supporting services:
- [src/server/services/balanceService.ts](/Users/evazheng/Desktop/yhack/src/server/services/balanceService.ts)
- [src/server/services/settlementService.ts](/Users/evazheng/Desktop/yhack/src/server/services/settlementService.ts)

APIs:
- `GET /api/expenses?suiteId=...`
- `POST /api/expenses`
- `PATCH /api/expenses/:id`
- `DELETE /api/expenses/:id`
- `POST /api/expenses/:id/pay`
- `GET /api/expenses/balances/:suiteId`
- `GET /api/settlements?suiteId=...`
- `POST /api/settlements`
- `DELETE /api/settlements/:id`

## Receipt Scanning

Receipt scanning is implemented server-side and used from the finance flow.

Endpoint:
- `POST /api/scan-receipt`

Current implementation:
- accepts an uploaded image
- validates image type
- sends it to the configured AI receipt parser
- returns normalized receipt data for prefill

Current route:
- [src/app/api/scan-receipt/route.ts](/Users/evazheng/Desktop/yhack/src/app/api/scan-receipt/route.ts)

Note:
- the current server route checks `LAVA_API_KEY`
- if receipt scanning is not configured, finance still works; only OCR-assisted prefill is unavailable

## Demo / Guest Mode

Guest mode is seeded through:
- [src/server/utils/guestSeed.ts](/Users/evazheng/Desktop/yhack/src/server/utils/guestSeed.ts)

It creates:
- a demo suite
- demo roommates
- demo tasks
- demo expenses
- demo bulletin notes

Guest access is useful for:
- UI demos
- quick testing without Google OAuth
- local development when auth credentials are not set up yet

## Environment Variables

This repository’s current `.env.example` is minimal, but the app supports additional variables used by the active codebase.

Recommended local `.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/suiteease

AUTH_SECRET=replace_with_a_long_random_string
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

NEXTAUTH_URL=http://localhost:3000

LAVA_API_KEY=

NEXT_PUBLIC_EXPERIMENTAL_BOARD=true
```

Variable notes:
- `MONGODB_URI`: Mongo connection string, local or Atlas
- `AUTH_SECRET`: NextAuth secret
- `AUTH_GOOGLE_ID`: Google OAuth client id
- `AUTH_GOOGLE_SECRET`: Google OAuth client secret
- `NEXTAUTH_URL`: app base URL for NextAuth
- `LAVA_API_KEY`: required for receipt scanning and the suite assistant
- `NEXT_PUBLIC_EXPERIMENTAL_BOARD`: set to `false` to disable corkboard mode toggle

## MongoDB Setup

You can use either:
- local MongoDB
- MongoDB Atlas

### Option A: Local MongoDB

If you use Homebrew on macOS:

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

Test the connection:

```bash
mongosh "mongodb://127.0.0.1:27017/suiteease"
```

If `mongosh` connects, MongoDB is ready.

### Option B: MongoDB Atlas

1. Create a MongoDB Atlas cluster
2. Create a database user
3. Add your IP to Network Access
4. Copy your connection string
5. Set:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-url>/suiteease
```

## Google OAuth Setup

To use Google login locally:

1. Create a Google Cloud project
2. Enable the Google OAuth API flow
3. Add an OAuth client
4. Set authorized redirect URIs, including:

```text
http://localhost:3000/api/auth/callback/google
```

5. Put the credentials into `.env`:

```env
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
AUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

Without Google OAuth configured, you can still use the guest/demo login path.

## Local Development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

## How To Use The App

### Sign in

Choose one:
- Continue with Google
- Try as Guest

### Create or join a suite

Go to:
- `/setup`

Use:
- `Create Suite` to make a brand-new suite
- `Join by Code` to join an existing suite

### Switch suites

Use the suite switcher in the header. This updates the active suite for the current user.

### Manage chores

Go to:
- `/tasks`

You can:
- create tasks
- assign tasks
- update statuses
- sync eligible tasks to Google Tasks

### Manage expenses

Go to:
- `/finance`

You can:
- record expenses
- upload receipts
- record payments
- view balances and settle-up recommendations

### Shared bulletin board

Use the dashboard board to:
- create notes
- edit notes
- drag notes
- share reminders with everyone in the active suite

## Health / Diagnostics

Health endpoint:
- `GET /api/health`

Useful when checking if the app is booting correctly.

## Scripts

Available npm scripts:

```bash
npm run dev
npm run build
npm run start
```

## Quick Start

The shortest path to run locally:

```bash
cp .env.example .env
npm install
npm run dev
```

Then update `.env` with at least:
- `MONGODB_URI`
- `AUTH_SECRET`

If you want Google login:
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NEXTAUTH_URL`

If you want receipt scanning / AI features:
- `LAVA_API_KEY`
