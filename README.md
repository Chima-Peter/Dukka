# Dukka

NestJS monorepo for the Dukka commerce platform API: multi-market catalog, cart/checkout, orders, payments (Paystack), warehouses, shipments, promotions/coupons, and staff RBAC.

## Apps & libraries

| Path | Role |
| --- | --- |
| `apps/dukka` | HTTP API (default Nest app) |
| `apps/mail_worker` | BullMQ worker for outbound email |
| `apps/general_worker` | BullMQ worker for background jobs (orders, inventory, expiries, etc.) |
| `libs/common` | Prisma, auth guards, Redis, Supabase, shared filters/interceptors |
| `libs/queues` | Mail + general queue producers/constants |
| `libs/utils` | Shared utilities |

API routes are versioned under `/api/v1/dukka`. Swagger UI is at `/docs`. Health checks are at `/health` (unversioned).

## Prerequisites

- Node.js 24+ (npm)
- PostgreSQL
- Redis (BullMQ + caching)

## Setup

```bash
npm install
```

### JWT key pairs

Customer and staff auth use separate RSA key pairs. Generate them once:

```bash
mkdir -p keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
openssl genrsa -out keys/staff-private.pem 2048
openssl rsa -in keys/staff-private.pem -pubout -out keys/staff-public.pem
```

Point the JWT path env vars at these files (see below). `keys/` is gitignored.

### Environment

Create a root `.env`. Required variables for the API (`apps/dukka`):

| Variable | Notes |
| --- | --- |
| `NODE_ENV` | `development` \| `production` \| `test` |
| `DUKKA_PORT` | API port (default `8000`) |
| `DATABASE_URL` | Prisma / app Postgres URL |
| `DIRECT_URL` | Direct Postgres URL (migrations) |
| `REDIS_URL` | e.g. `redis://127.0.0.1:6379` |
| `JWT_PRIVATE_KEY_PATH` / `JWT_PUBLIC_KEY_PATH` | Customer JWT keys |
| `STAFF_JWT_PRIVATE_KEY_PATH` / `STAFF_JWT_PUBLIC_KEY_PATH` | Staff JWT keys |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_BUCKETS` | Storage (comma-separated buckets) |
| `STAFF_APP_URL` | Staff app base URL (invites, links) |
| `CORS_ORIGINS` | Comma-separated origins |
| `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` / `PAYSTACK_BASE_URL` | Payments |
| `REST_COUNTRIES_API_KEY` | Countries lookup |
| `OBSERVE_SERVICE_NAME` / `OBSERVE_APP_KEY` / `OBSERVE_APP_SECRET` | NestJS Observe |

**Mail worker** also needs: `MAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, optional `SMTP_USER` / `SMTP_PASS`.

**General worker** shares `DATABASE_URL`, `REDIS_URL`, Supabase, Paystack, and `REST_COUNTRIES_API_KEY`.

### Database (Prisma 7)

Schema and migrations live under `libs/common/prisma`. Config: `libs/common/prisma7.config.ts`.

```bash
cd libs/common
npx prisma generate --config prisma7.config.ts
npx prisma migrate dev --config prisma7.config.ts
npx prisma db seed --config prisma7.config.ts
```

Seed creates baseline permissions, currencies, markets, roles, and demo staff/customers.

## Run

```bash
# API
npm run start:dev

# Mail worker
npm run start:mail_worker:dev

# General worker
npm run start:general_worker:dev
```

Production entrypoints:

```bash
npm run build
npm run start:prod
npm run start:mail_worker:prod
npm run start:general_worker:prod
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run start:dev` | API in watch mode |
| `npm run build` | Compile all apps |
| `npm run lint` | Oxlint (type-aware) |
| `npm run test` | Vitest unit tests |
| `npm run test:watch` | Vitest watch |
| `npm run test:cov` | Coverage |
| `npm run test:e2e` | E2E suite |
| `npm run format` | Prettier on `apps/**` and `libs/**` |

## Features

### Auth & access

- **Dual JWT auth** — separate RSA key pairs and guards for customers and staff (`CustomerJwtAuthGuard`, `StaffJwtAuthGuard`), plus `StaffPermissionsGuard` for RBAC.
- **Customer auth** — register, login, refresh, logout, password reset; profile update, change password, set **active market**, account deletion (initiate + verify).
- **Staff auth** — login, refresh, logout, password reset; self profile (avatar, qualifications).
- **RBAC** — roles and permissions CRUD; assign/revoke roles and scopes (global / market / warehouse / distribution point); staff audit history; deactivate staff.
- **Invitations** — create, list, cancel, resend staff invites; public accept flow; scheduled expiry via the general worker.

### Multi-market commerce

- **Markets** — provision, open/close, update, delete; staff listing; public **IP-based market search**; ID validation.
- **Currencies** — manage currencies; public list/get.
- **Service states** — geographic service coverage; open/close; assign warehouses; public list.
- Customer commerce is scoped by **active market**; staff operations are often scoped by assigned `market_ids` / scopes.

### Catalog & merchandising

- **Categories** — public browse; staff manage and attach/detach to markets.
- **Products & variants** — public catalog; staff create/update/archive, images via Supabase upload URLs, market-variants.
- **Approval workflow** — product and variant **pending updates** with approve/reject (`products:review` / `products:manage`).
- **Reviews** — public list; customers create reviews (with image uploads), like/dislike, delete; post-delivery **review reminder** emails.

### Inventory & fulfillment network

- **Inventory** — stock create/update; public availability by product/variant; staff reads by warehouse / market-variant.
- **Reservations** — checkout holds stock; general worker releases **expired reservations** on a schedule.
- **Low / finished stock reminders** — scheduled jobs fan out to mail templates for ops.
- **Warehouses** — create, open/close, assign manager/staff, scoped listing.
- **Distribution points** — create, open/close, assign staff, scoped listing.
- **Logistics partners** — CRUD plus activate/deactivate.
- **Shipments** — staff move / deliver / acknowledge / cancel movement; public **track by tracking number**.

### Cart, checkout & orders

- **Cart** — authenticated customer cart (items, totals) and **guest cart** (`@Public`).
- **Checkout** — guest or authenticated precheckout/checkout; optional **points redeem** (customers only); Paystack initialize or cash; supports `X-Idempotency-Key`.
- **Orders** — customer list/get/cancel; staff internal list/get/by number (market-scoped).
- Background lifecycle jobs: awaiting payment, processing, shipped, completion, cancel (with mail + side effects).

### Payments

- **Payment methods** — staff create; public list/get; approve for a market; remove from market.
- **Paystack** — customer checkout init; staff can start Paystack pay for cash orders; **webhook** at `POST /payments/webhooks/paystack` (raw body + signature).
- **Refunds & attempts** — staff list/retry refunds (including retry with customer details); payment attempt history.

### Promotions & coupons

- **Promotions** — CRUD; discount definitions; attach to markets; activate/deactivate per market; target variants; usage history.
- **Coupons** — CRUD; activate/deactivate; usage history.
- Scheduled **expire-promotion-market** and **expire-coupon** jobs in the general worker.

### Loyalty & messaging

- **Points** — customer points history; redeem at checkout.
- **Notifications** — list and mark read for customers and staff; **SSE streams** (`/notifications/stream`, `/notifications/internal/stream`) with `Last-Event-ID` resume.
- **Mail worker** — Handlebars SMTP templates for welcome, password flows, account deletion, order lifecycle, review reminders, staff invite/role/market changes, inventory alerts, and more.

### Background workers

| Worker | Queue | Responsibilities |
| --- | --- | --- |
| `mail_worker` | `mail` | Templated email send; inventory stock reminder mail |
| `general_worker` | `general` | Order lifecycle, reservation expiry, promo/coupon/invitation expiry, stock reminders, review reminders, customer/staff/market teardown; embeds Paystack verify/refund helpers |

Schedulers (general worker) include reservation expiry, promo/coupon/invitation expiry, review reminders, and low/finished stock sweeps.

### Platform cross-cutting

- URI versioning → `/api/v1/dukka/...`; Swagger at `/docs` (Bearer).
- Global validation pipe, response transform interceptor, unified exception filter.
- Health (`GET /health`): disk, memory, Postgres, Redis, mail + general queues.
- NestJS Observe instrumentation (HTTP, DB, jobs, runtime metrics).
- Supabase Storage for avatars, product/review images, staff qualifications.

## Stack

NestJS 12 · Prisma 7 (PostgreSQL) · BullMQ / Redis · Supabase Storage · Paystack · Swagger · Vitest · Oxlint · Rspack
