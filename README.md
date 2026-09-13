# AutoOps

**AI-powered operations, human-approved.**

AutoOps is an AI Agent Orchestrator for small business operations. It monitors incoming operational emails, uses an AI agent to classify and draft responses/actions, and requires human approval before taking any action — so nothing is ever sent, scheduled, or decided without explicit authorization.

> **Status: Phase 3 Complete** — Gmail → Zapier → AutoOps Inbound Webhook Ingestion pipeline is live.
> Phases 1 (UI/UX) and 2 (Auth/DB/RLS) are also complete.

---

## Phase 2 Features

1. **Supabase Authentication**: Native cookie-based session handling using `@supabase/ssr` (`src/lib/supabase/client.ts` and `src/lib/supabase/server.ts`).
2. **Google OAuth**: One-tap sign-in with Google via Supabase Auth PKCE flow (`/auth/callback`).
3. **Email/Password Auth**: Real authentication supporting sign-in and sign-up with feedback.
4. **Protected Dashboard Routes**: Middleware (`src/middleware.ts`) protects `/dashboard`, `/dashboard/queue`, `/dashboard/activity`, and `/dashboard/settings`. Unauthenticated users are redirected to `/login`.
5. **PostgreSQL Database Schema & RLS**: 4 isolated core tables (`connected_accounts`, `inbound_events`, `agent_actions`, `activity_log`) with strict Row Level Security policies (`user_id = auth.uid()`).
6. **Real Supabase Dashboard Data**: Metrics on the dashboard (`Emails Processed`, `Pending Approval`, `Approved Today`, `Automation Rate`) query Supabase directly for the authenticated user.
7. **User Profile & Session Logout**: Header dropdown displaying user details, avatar, and instant session teardown.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```env
# Supabase (public — safe for browser)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Supabase service role (server-only, never NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret

# Inbound webhook shared secret (you choose this value; set the same in Zapier)
AUTOOPS_WEBHOOK_SECRET=your-random-secret-min-32-chars

# Your Supabase auth.users UUID (Dashboard → Authentication → Users)
AUTOOPS_WEBHOOK_USER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

> **Security Note**: Never commit `.env.local`. `SUPABASE_SERVICE_ROLE_KEY` and `AUTOOPS_WEBHOOK_SECRET` must remain server-only secrets.

---

## Supabase Setup Instructions

### 1. Database Schema Migration
Run the SQL migration script in your Supabase SQL Editor:
- Script location: [`supabase/migrations/001_initial_schema.sql`](file:///d:/AutoOps/supabase/migrations/001_initial_schema.sql)

This script creates:
- `connected_accounts` table
- `inbound_events` table
- `agent_actions` table (with constraints for classification, suggested_action, and status)
- `activity_log` table
- Indexes on `user_id`, `status`, and `created_at`
- Enables Row Level Security (RLS) on all 4 tables with `auth.uid()` user ownership policies.

Also run the Phase 3 deduplication migration:
- Script location: [`supabase/migrations/002_inbound_event_dedup.sql`](file:///d:/AutoOps/supabase/migrations/002_inbound_event_dedup.sql)

This adds:
- Partial unique index `(user_id, source, external_event_id)` for idempotent Zapier delivery.
- Service-role INSERT policies for `inbound_events` and `activity_log`.

### 2. Google OAuth Setup
1. Open **Supabase Dashboard → Authentication → Providers → Google**.
2. Toggle Google **Enabled**.
3. In Google Cloud Console, create OAuth 2.0 Credentials:
   - **Authorized Redirect URIs**: `https://<your-project-id>.supabase.co/auth/v1/callback`
4. Copy the Client ID and Client Secret into your Supabase Google Provider configuration.
5. In Supabase **Authentication → URL Configuration**, add your Site URL and Redirect URL:
   - **Redirect URL**: `http://localhost:3000/auth/callback` (and your production domain).

---

## Phase 3: Zapier Webhook Setup

### Endpoint

```
POST /api/webhooks/inbound
Header: x-autoops-webhook-secret: <AUTOOPS_WEBHOOK_SECRET>
Content-Type: application/json
```

### Zapier Configuration

1. **Trigger**: Gmail → _New Email_ (or _New Email Matching Search_)
2. **Action**: Webhooks by Zapier → _POST_
   - **URL**: `https://your-autoops-domain.com/api/webhooks/inbound`
   - **Payload Type**: `json`
   - **Data** (map Zapier Gmail fields):
     | Zapier Field | Payload Key |
     |---|---|
     | Message ID | `id` |
     | From | `from` |
     | Subject | `subject` |
     | Body Plain | `bodyPlain` |
     | Date | `date` |
   - **Headers**:
     | Header Name | Header Value |
     |---|---|
     | `x-autoops-webhook-secret` | `<your AUTOOPS_WEBHOOK_SECRET>` |
     | `Content-Type` | `application/json` |

### Security Model

- The shared secret in `x-autoops-webhook-secret` authenticates every Zapier request.
- `user_id` is **never** accepted from the payload — it is always read from `AUTOOPS_WEBHOOK_USER_ID` (server environment variable).
- Duplicate deliveries (same Gmail message ID) are silently ignored via a Postgres partial unique index.
- All writes use the Supabase service-role client which bypasses RLS only for this controlled insert path.

### Testing Locally

```bash
curl -X POST http://localhost:3000/api/webhooks/inbound \
  -H "Content-Type: application/json" \
  -H "x-autoops-webhook-secret: your-secret-here" \
  -d '{
    "id": "test-message-001",
    "from": "Jane Doe <jane@example.com>",
    "subject": "Urgent: Invoice #1042 overdue",
    "bodyPlain": "Hi, just following up on the overdue invoice...",
    "date": "2026-09-13T12:00:00Z"
  }'
```

Expected response:
```json
{ "ok": true, "event_id": "<uuid>", "sender_email": "jane@example.com", "subject": "Urgent: Invoice #1042 overdue" }
```

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local

# 3. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
AutoOps/
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql       # Core database schema + RLS policies
│       └── 002_inbound_event_dedup.sql  # Deduplication index + service-role policies
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── webhooks/inbound/
│   │   │       └── route.ts             # POST /api/webhooks/inbound
│   │   ├── (marketing)/                 # Landing page
│   │   ├── (auth)/login/                # Real Supabase Auth login page
│   │   ├── auth/callback/               # OAuth PKCE callback handler
│   │   ├── dashboard/                   # Dashboard routes (protected by middleware)
│   │   │   ├── activity/                # Activity Log (colour-coded, Supabase)
│   │   │   ├── queue/                   # Approval Queue (Supabase queries)
│   │   │   ├── settings/                # Settings & Connected Accounts
│   │   │   └── page.tsx                 # Main Dashboard (metrics + recent emails)
│   │   ├── globals.css                  # Design tokens & keyframes
│   │   └── layout.tsx                   # Root layout with AutoOpsProvider
│   ├── components/
│   │   ├── ui/                          # UI components (toast, button, card, tabs…)
│   │   ├── dashboard/                   # Sidebar, UserProfileMenu, MetricCard
│   │   ├── logo.tsx
│   │   └── workflow-diagram.tsx
│   ├── context/
│   │   └── autoops-context.tsx          # Live operational state provider & toasts
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                # Browser Supabase client
│   │   │   ├── server.ts                # Cookie-based server client
│   │   │   ├── admin.ts                 # Service-role admin client (server only)
│   │   │   └── config.ts               # URL normalisation + env helpers
│   │   └── webhooks/
│   │       └── normalize-email.ts       # Zapier payload → inbound_events normalizer
│   └── middleware.ts                    # Session refresh & route protection
```
