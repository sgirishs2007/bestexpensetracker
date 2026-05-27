
# Expense Tracker — Plan

A real, usable expense tracker (not the 10-module AURA prototype). Premium midnight aesthetic from your AURA spec is kept; the scope is the actual product people need to track money.

## What we're building

A multi-page app where a logged-in user can:
- Add, edit, delete transactions (income + expense)
- Organize by category and account
- Set monthly budgets per category and see progress
- View a dashboard with net flow, top categories, recent activity, and a 6-month trend
- Filter/search the full transaction ledger
- Export their data as CSV

All data persists per user in Lovable Cloud. Each user only sees their own data (RLS).

## Pages

1. **Auth** — email/password + Google sign-in. Branded to match the aesthetic.
2. **Dashboard** — top metric bar (net worth, month income, month expense, savings rate), 6-month area chart, category donut, recent transactions list, budget progress strip.
3. **Transactions** — dense ledger grid with search, filters (date range, category, account, type), sort, slide-over edit drawer, "Add transaction" CTA.
4. **Budgets** — per-category monthly budgets with live progress bars (emerald → amber → crimson as you approach/exceed).
5. **Categories & Accounts** — manage your own categories (with icon + color) and accounts (cash, bank, card).
6. **Settings** — profile basics, currency preference, export CSV, sign out.

## Design system (from your AURA brief, kept)

- Background `#030303 → #08080c`, borders `#ffffff10`, radii 6px / 0px
- Mono numerics (JetBrains Mono), geometric sans for UI (Inter)
- Accents: emerald `#10b981` (income), amber `#f59e0b` (warning), purple `#8b5cf6` (highlights), crimson `#ef4444` (over-budget)
- Subtle card hover glow, smooth transitions via tailwindcss-animate / Framer Motion
- Collapsible left sidebar, sticky top bar
- Command palette (⌘K) for quick nav and "add transaction"

What I'm dropping from AURA: the fake Gmail/SMS/WhatsApp ingestion, multi-sig governance, remittance routing tree, carbon parser, macro shock sliders, dual persona toggle, OCR mock, AI co-pilot cancellation flows. These are demo theater and don't help users track real expenses. We can add any of them later as real features if you want.

## Data model (Lovable Cloud)

```text
profiles(id → auth.users, display_name, currency, created_at)
accounts(id, user_id, name, type, starting_balance, color, created_at)
categories(id, user_id, name, kind[income|expense], color, icon, created_at)
transactions(id, user_id, account_id, category_id, amount, type, note,
             merchant, occurred_at, created_at)
budgets(id, user_id, category_id, month, amount_limit, created_at)
```

RLS: every table scoped by `user_id = auth.uid()`. Public-schema GRANTs to `authenticated` + `service_role`. Profile auto-created via trigger on signup.

## Build order

1. Enable Lovable Cloud, set up auth (email + Google), profiles table + trigger, `/auth` and `/reset-password` pages, protected routes.
2. Schema + RLS for accounts, categories, transactions, budgets. Seed sensible default categories on first login.
3. App shell: sidebar, top bar, command palette, theme tokens in `index.css` and `tailwind.config.ts`.
4. Transactions page: list, add/edit drawer, filters, search.
5. Dashboard: metrics, charts (Recharts), recent activity, budget strip.
6. Budgets page with live progress.
7. Categories & Accounts management.
8. Settings + CSV export.

## Technical notes

- Stack: existing Vite + React + TS + Tailwind + shadcn. Add Recharts, Framer Motion, cmdk (command palette), date-fns, zod.
- Forms validated with zod (amount > 0, required fields, max lengths).
- All money stored as numeric in a single user-chosen base currency for v1. Multi-currency conversion can come later.
- Charts derive from a single React Query hook per page; no prop drilling.
- Mobile: sidebar collapses to a bottom tab bar under `md`.

## Out of scope for v1 (easy to add later)

Bank sync (Plaid), receipt OCR, recurring transactions, shared/household accounts, multi-currency with live FX, AI categorization, mobile app.

If this looks right, approve and I'll build it.
