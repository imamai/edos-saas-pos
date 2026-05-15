# EDOS POS — Solar & Electrical Shop Management System

> Enterprise-grade Point of Sale and Inventory Management System built specifically for solar and electrical retail businesses in Kenya, with deep M-Pesa integration and local business workflow support.

**Live:** [edos-saas-pos-ol8t.vercel.app](https://edos-saas-pos-ol8t.vercel.app)

---

## Features

### POS / Sales
- Fast touchscreen-optimized checkout interface
- Barcode scanning (press Enter after scan)
- Product search by name, SKU, barcode, category
- Cart with quantity adjustment and item-level discounts
- Cart-level discounts (fixed or percentage)
- VAT/Tax calculation (16% default, configurable)
- **Multi-payment support:**
  - Cash with change calculation
  - Credit/Debit card
  - **M-Pesa STK Push** (Safaricom Daraja API)
  - Credit sale with customer balance tracking
- Hold/Resume sales
- Return/Refund processing
- Receipt printing (browser print dialog)
- Customer selection and walk-in support

### M-Pesa Integration (Daraja API)
- STK Push (Lipa na M-Pesa Online) — **Till number (Buy Goods)** supported
- Automatic payment confirmation via callback
- Payment status polling with graceful pending handling
- Transaction logs in database
- Sandbox and Production environments
- Secure credential management (server-only env vars)

### Inventory Management
- Product catalog with categories
- Stock tracking per branch
- Reorder level alerts
- Low stock notifications on dashboard
- Stock adjustments (in, out, set quantity)
- Stock movement history
- Serial number and warranty tracking
- Multi-category (Solar, Batteries, Inverters, Cables, Lighting, etc.)
- Supplier linking

### Customer Management
- Customer profiles with contact details
- Credit limits and outstanding balances
- Loyalty points tracking
- Purchase history
- Credit aging report

### Supplier Management
- Supplier profiles and contacts
- Payment terms tracking
- Outstanding balance tracking

### Accounting & Reports
- Daily/weekly/monthly sales reports
- Revenue trend charts (7-day)
- Top products by revenue
- Payment method breakdown
- Credit aging report
- Expense tracking with categories

### Admin Panel
- Role-based access (Admin, Manager, Cashier, Storekeeper)
- User management (create, activate/deactivate, change roles)
- Audit logs
- Branch management

---

## Tech Stack

| Layer       | Technology                       |
|-------------|----------------------------------|
| Frontend    | Next.js 15, React 19, TypeScript |
| Styling     | Tailwind CSS v4, Dark/Light mode |
| State       | Zustand (cart + auth)            |
| Data        | TanStack Query + Supabase        |
| Database    | Supabase (PostgreSQL)            |
| Auth        | Supabase Auth + JWT + RLS        |
| Charts      | Recharts                         |
| Payment     | Safaricom Daraja API (M-Pesa)    |
| Deployment  | Vercel + Supabase Cloud          |

---

## Project Structure

```
pos-system/
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # Login page
│   │   ├── (dashboard)/           # Protected dashboard routes
│   │   │   ├── layout.tsx         # Sidebar + topbar layout
│   │   │   ├── page.tsx           # Dashboard home
│   │   │   ├── pos/               # POS / Checkout
│   │   │   ├── inventory/         # Inventory management
│   │   │   ├── customers/         # Customer management
│   │   │   ├── suppliers/         # Supplier management
│   │   │   ├── expenses/          # Expense tracking
│   │   │   ├── reports/           # Analytics & reports
│   │   │   ├── admin/             # User management & audit logs
│   │   │   └── settings/          # Store & user settings
│   │   └── api/mpesa/             # M-Pesa API routes
│   ├── components/                # React components by module
│   ├── lib/
│   │   ├── supabase/              # Supabase client/server helpers
│   │   ├── mpesa/daraja.ts        # M-Pesa Daraja API
│   │   └── utils.ts               # Formatters and helpers
│   ├── store/cart.ts              # POS cart state (Zustand)
│   ├── types/index.ts             # TypeScript type definitions
│   └── middleware.ts              # Route protection
├── supabase/migrations/
│   ├── 001_initial_schema.sql     # Full database schema + sample data
│   └── 002_functions.sql         # DB functions, triggers, views
├── .env.local                     # Environment variables (gitignored)
└── .env.example                   # Template for env variables
```

---

## Setup & Deployment

### 1. Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → run `supabase/migrations/001_initial_schema.sql`
3. Then run `supabase/migrations/002_functions.sql`
4. Go to **Settings → API** → copy your URL and anon key

### 2. M-Pesa Daraja API

1. Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Create a new app — get **Consumer Key** and **Consumer Secret**
3. For sandbox: use the test credentials provided on the portal
4. For production: apply for **Go Live** with your **Till number** (Buy Goods) — Safaricom provides a Passkey after approval
5. Set `MPESA_CALLBACK_URL` to `https://your-domain.vercel.app/api/mpesa/callback`
6. For local development, use [ngrok](https://ngrok.com) to expose your callback: `ngrok http 3000`

### 3. Local Development

```bash
cd pos-system
npm install
cp .env.example .env.local
# Edit .env.local with your credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel

```bash
npx vercel --prod
```

Add these environment variables in Vercel dashboard (Settings → Environment Variables):

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL |
| `MPESA_ENV` | `sandbox` or `production` |
| `MPESA_CONSUMER_KEY` | Daraja app Consumer Key |
| `MPESA_CONSUMER_SECRET` | Daraja app Consumer Secret |
| `MPESA_SHORTCODE` | Your Till number |
| `MPESA_PASSKEY` | Daraja Passkey (from portal) |
| `MPESA_CALLBACK_URL` | `https://your-domain.vercel.app/api/mpesa/callback` |

### 5. Create First Admin User

1. Go to Supabase → **Authentication → Users → Add User**
2. Email: `admin@edospos.com` | Password: `Admin@123!`
3. Run in SQL Editor:
   ```sql
   UPDATE profiles 
   SET role = 'admin', full_name = 'System Admin' 
   WHERE email = 'admin@edospos.com';
   ```

---

## Sample Data (Included)

- **10 product categories** (Solar, Batteries, Inverters, Cables, Lighting, etc.)
- **12 products** with realistic Kenyan pricing (KES)
- **3 suppliers** (Solar Kenya Ltd, Electrical Supplies Co, PowerTech Distributors)
- **5 customers** including corporate account
- **7 expense categories**
- All products pre-stocked at 20 units

---

## Security

- Row Level Security (RLS) on all Supabase tables
- Role-based access enforced at UI and database level
- JWT authentication via Supabase Auth
- M-Pesa credentials in server-only environment variables
- Audit logs for all critical operations

---

## License

MIT © EDOS POS System 2026
