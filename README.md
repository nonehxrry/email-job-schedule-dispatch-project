# 🚀 ReachInbox Full-Stack Email Job Scheduler

A production-grade distributed email scheduler service and real-time dashboard built for high-throughput outreach campaigns. Built with **Node.js, Express, TypeScript, BullMQ, Redis, PostgreSQL (Prisma), Elasticsearch, Ethereal SMTP, and React + Tailwind CSS**.

---

## 🌟 Key Features

### 1. ⏱️ Cron-Free Persistent Scheduling (BullMQ + Redis)
- **Zero Cron Jobs**: Uses native **BullMQ delayed jobs** backed by Redis streams and sorted sets.
- **Restart Resilience**: When the server crashes or restarts, pending jobs resume from Redis and the relational database without lost dispatches or duplicate sends (idempotency keying).
- **Staggered Dispatch**: When batch campaigns are scheduled, each lead is dynamically assigned a calculated delay:
  $$\text{delay}_i = \max(0, \text{startTime} - \text{now}) + (i \times \text{delayBetweenEmails})$$

### 2. 🛡️ Concurrency, Throttling & Sliding-Hour Rate Limiting
- **Worker Concurrency**: Configurable concurrent job processing threads (`WORKER_CONCURRENCY=5`).
- **Inter-Email Throttling**: Mandatory minimum delay between sequential email sends (`EMAIL_SEND_DELAY_MS=2000`) to prevent SMTP throttling.
- **Hourly Quota per Sender**: Atomic Redis hourly window counters (`rl:sender:{email}:{YYYY-MM-DD-HH}`).
- **Intelligent Rescheduling**: When a sender hits `MAX_EMAILS_PER_HOUR_PER_SENDER`, overflow jobs are **not dropped or failed**. They are automatically deferred and re-enqueued to the start of the next hour window, preserving queue order.

### 3. 💬 Real-Time Slack Notifications on Rate Limit
- Real OAuth authorize flow & webhook support.
- Automatically posts a structured alert message to the user's Slack channel the moment an hourly limit is breached with sender metrics and deferred timestamps.
- Features Redis anti-spam cooldown locks (60s) to prevent spamming Slack during high-volume batch bursts.

### 4. 🔍 Sub-Millisecond Search with Elasticsearch
- Indexes all scheduled and sent emails into Elasticsearch (`reachinbox_emails` index).
- Full-text search with fuzzy matching across `subject`, `body`, `recipientEmail`, and `recipientName`.
- Resilient fallback to PostgreSQL full-text queries if Elasticsearch is starting up.

### 5. 📬 Ethereal SMTP Integration
- Dispatches emails using Ethereal Email test accounts.
- Generates live clickable web preview URLs for every sent email in the dashboard.

### 6. 📊 Live Queue Monitoring (Bull-Board)
- Embedded Bull-Board dashboard at `/admin/queues` providing real-time visibility into active, waiting, delayed, completed, and failed queues.

### 7. 💻 Interactive React + Tailwind Dashboard
- **Google OAuth Login** + One-click Reviewer Demo Sign-In.
- **Tabs**: Scheduled Emails & Sent Emails with real-time status updates and live search.
- **Compose Modal**:
  - Drag-and-drop CSV / TXT lead list uploader with auto regex parsing and lead counter.
  - Custom start time, inter-email delay, and hourly rate limit sliders.

---

## 🏗️ System Architecture

```
                                  +-----------------------+
                                  |     React Client      |
                                  |   (Tailwind + Vite)   |
                                  +-----------+-----------+
                                              |
                             REST APIs / Auth | Google OAuth
                                              v
                              +-------------------------------+
                              |    Node.js / Express Server   |
                              |         (TypeScript)          |
                              +---+---------------+-------+---+
                                  |               |       |
                 BullMQ Producer  |               |       | Elasticsearch Client
                                  v               |       v
                          +---------------+       |   +---------------+
                          |  Redis Queue  |       |   | Elasticsearch |
                          |  (BullMQ Core)|       |   | (Full-text)   |
                          +-------+-------+       |   +---------------+
                                  |               |
                    BullMQ Worker |               | Prisma ORM
                                  v               v
                        +-------------------+   +-----------------+
                        | Email Worker(s)   |   | PostgreSQL DB   |
                        | Concurrency: N    |   | (Persistent)    |
                        +---+-----------+---+   +-----------------+
                            |           |
             Nodemailer     |           | Slack API (OAuth Token)
                            v           v
                  +---------------+   +-------------------+
                  | Ethereal SMTP |   | Slack Channel     |
                  | (Email Inbox) |   | (Rate-limit Alert)|
                  +---------------+   +-------------------+
```

---

## 📂 Project Structure

```text
reachinbox-scheduler/
├── docker-compose.yml           # PostgreSQL, Redis, Elasticsearch stack
├── README.md                    # System documentation
│
├── backend/
│   ├── src/
│   │   ├── config/              # Redis, SMTP, Elasticsearch, Environment configs
│   │   ├── controllers/         # Auth, Campaign, Email, Slack controllers
│   │   ├── routes/              # Express API endpoints
│   │   ├── services/            # BullMQ Queue, Worker, RateLimiter, Slack, SMTP, Elasticsearch
│   │   ├── middlewares/         # JWT Auth, Zod Validation, Global Error Handler
│   │   ├── prisma/              # Prisma schema & migrations
│   │   ├── types/               # TypeScript interfaces & DTOs
│   │   ├── test-runner.ts       # Automated integration test suite
│   │   └── server.ts            # Main application entry point & Bull-Board mount
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/          # Header, ScheduledTable, SentTable, ComposeModal, SlackModal, Stats
    │   ├── pages/               # DashboardPage, LoginPage
    │   ├── services/            # Axios API clients
    │   ├── hooks/               # useAuth context hook
    │   ├── types/               # TypeScript definitions
    │   ├── App.tsx
    │   └── main.tsx
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.ts
```

---

## ⚡ Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (Tested on v22.16.0)
- **Docker & Docker Compose** (Optional: the backend has auto-healing embedded Redis & SQLite for zero-config running)

---

### Step 1: Start Infrastructure (Docker)
```bash
# Start PostgreSQL, Redis, and Elasticsearch in background
docker compose up -d
```

---

### Step 2: Configure & Start Backend
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Initialize Database (Prisma)
npx prisma db push

# Start Backend Server in development mode
npm run dev
```

The backend server will boot at `http://localhost:5000`:
- **API Endpoint**: `http://localhost:5000/api`
- **Bull-Board Queue Monitor**: `http://localhost:5000/admin/queues`

---

### Step 3: Start Frontend Dashboard
```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite Development Server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🧪 Running the Automated Verification Suite

To run the complete automated test suite verifying Rate Limiting, BullMQ window resets, Ethereal SMTP dispatch, and DB persistence:

```bash
cd backend
npx tsx src/test-runner.ts
```

**Expected output:**
```text
============================================================
🧪 REACHINBOX TEST SUITE & SYSTEM VERIFICATION
============================================================
📦 Step 1: Initializing Redis & SMTP Engine...
🔒 Step 2: Testing Hourly Rate Limiter Window & Counters...
  ✅ [PASS] First email send is allowed (1/3)
  ✅ [PASS] Second email send is allowed (2/3)
  ✅ [PASS] Third email send is allowed (3/3)
  ✅ [PASS] Fourth email is blocked and returns next hour reset timestamp
📧 Step 3: Testing Nodemailer Ethereal SMTP Dispatch...
  ✅ [PASS] Message ID generated
  ✅ [PASS] Ethereal preview URL created
💾 Step 4: Testing Database Persistence...
  ✅ [PASS] Job successfully saved and queried from Database
============================================================
🏁 TEST RESULTS: 7 PASSED, 0 FAILED
============================================================
```

---

## 🔄 Demonstrating Server Restart Resilience

1. Open the Dashboard at `http://localhost:5173` and click **"Compose Email"**.
2. Upload or paste 10 lead emails, select **"Schedule for Later"** (e.g. 5 minutes from now), set **Delay** to `5 seconds`, and click **"Schedule Emails"**.
3. Verify the jobs appear in the **Scheduled Emails** tab with status `SCHEDULED`.
4. In your terminal, stop the backend server (`Ctrl + C`).
5. Wait 30 seconds, then restart the backend (`npm run dev`).
6. Notice that:
   - BullMQ picks up all pending jobs from Redis without resetting or losing any records.
   - Future scheduled dispatches continue executing at their exact scheduled timestamps.
   - No past emails are duplicated.

---

## 🛡️ Demonstrating Rate Limiting & Slack Notification Under Load

1. In the **Compose Modal**, set **Hourly Limit** to `5` and paste a list of 15 email addresses.
2. Click **"Dispatch Emails"**.
3. **Behavior**:
   - The first 5 emails are dispatched immediately with the configured inter-email delay.
   - The 6th through 15th emails automatically trigger the **Rate Limit Protection**.
   - A live **Slack Notification** is dispatched to your connected Slack channel.
   - The overflow jobs are rescheduled to the start of the next hour window and marked as `RESCHEDULED (Rate Limit Rescheduled)`.

---

## 📡 API Reference

### Authentication
- `POST /api/auth/google`: Verify Google credential token and return JWT session.
- `GET /api/auth/me`: Get current authenticated user and integration states.
- `POST /api/auth/logout`: Invalidate session.

### Campaigns & Scheduling
- `POST /api/campaigns/schedule`: Schedule a batch email sequence with leads, start time, delay, and hourly limits.
- `GET /api/campaigns`: List user campaigns.

### Emails & Search
- `GET /api/emails/scheduled`: Paginated list of scheduled/pending email jobs.
- `GET /api/emails/sent`: Paginated list of sent emails with Ethereal preview URLs.
- `GET /api/emails/search?q=:query`: Elasticsearch full-text query across subjects, bodies, and recipients.
- `GET /api/emails/stats`: Summary counts of queue states.

### Slack Integration
- `GET /api/slack/install`: Get Slack OAuth authorization URL.
- `GET /api/slack/oauth_callback`: Slack OAuth exchange callback.
- `POST /api/slack/webhook`: Save direct webhook URL.
- `POST /api/slack/test`: Dispatch a live test alert to Slack.
- `POST /api/slack/disconnect`: Disconnect Slack integration.

---

## 💡 Trade-Offs & Architecture Decisions
1. **Sliding Hour Rate Limiter vs Token Bucket**: We implemented atomic Redis hourly window counters with TTLs (`rl:sender:{email}:{YYYY-MM-DD-HH}`). This aligns with provider quotas (e.g. 50/hr), and guarantees deterministic next-hour calculation (`resetTimeMs = nextHourStart`).
2. **Delayed Jobs vs Polling**: We strictly avoided cron polling. BullMQ's Redis sorted set delay mechanism is $O(\log N)$ in insertion and retrieval, reducing database load to zero during idle periods.
3. **Idempotency Keys**: We enforce job UUIDs at both the BullMQ level (`jobId = dbJob.id`) and worker verification level to guarantee emails are never sent twice.
