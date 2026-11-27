# OGPDPA Operations Dashboard — prototype

Frontend-only prototype for the Ogun State Planning and Development Permit Authority. It covers zonal operations (applications, revenue, enforcement, petitions and assignments), automatic weekly, monthly and quarterly reports, and HQ oversight across all zonal planning offices. Requirements are in [`../REQUIREMENTS.md`](../REQUIREMENTS.md).

## Run

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build / type check
```

On first load the app generates a deterministic dataset in the browser:

- 13 zones and 82 staff
- Activity from 1 Jan of the current year up to today: about 1.7k applications with full status history, payments, enforcement cases, petitions, assignments, report submissions and an audit trail

The dataset is saved to `localStorage` (LZ-compressed, key `ogpdpa-prototype`). Every change after that is saved there too, so the flows can be evaluated end to end.

## Prototype controls (bottom-right)

- **Active role:** switch between all 6 roles: Super Admin, HQ Director, HQ Records, ZTPO, Planning Officer and Clerical.
- **Zone:** choose which zonal office the zonal roles belong to.
- **Deputy acting ZTPO:** lets the deputy approve permits.
- **Simulated today:** replay any date. Periods, SLAs and due dates follow it.
- **Reset data / Export JSON.**

To hide the panel, set `NEXT_PUBLIC_DEV_TOOLS=false`.

## Architecture

```
src/
  app/                  routes (App Router). (app)/ holds the authenticated shell.
  components/
    ui.tsx              design-system primitives (Button, Card, Badge, Segmented, Tabs, Modal, Table…)
    charts.tsx          chart kit (Recharts) — validated palette, dark tooltip chips
    widgets.tsx         Stat, MiniStat, HeroCard, PeriodPicker
    zone-map.tsx        illustrated Ogun State zone map (HQ: choropleth + select; zone: own zone lit)
    reports/            print-faithful report layouts (weekly, monthly, quarterly)
  lib/
    types.ts            domain model
    catalog.ts          use types, fee heads, notices, statuses, roles, palettes
    rbac.ts             permission matrix + can()
    store.ts            Zustand store + persisted localStorage DB + domain actions (audit-logged)
    selectors.ts        pure metrics & report tables (zone-indexed, cached timestamps)
    reports.ts          report builders + submission snapshot/diff
    seed.ts             deterministic data generator
    fees.ts, periods.ts, format.ts, csv.ts
  fonts/                Satoshi (Indian Type Foundry, Fontshare Free Font Licence — FFL.txt)
scripts/build-map.mjs   builds src/lib/geo/ogun-map.ts from geoBoundaries NGA ADM2 (CC BY 4.0)
```

How the code is organised:

1. **One source of truth.** Every dashboard figure and report number comes from pure selectors over the logged records. Submitted reports freeze a snapshot, so later changes to records show up as drift.
2. **RBAC in one place.** `can(user, action)` controls navigation, pages and buttons.
3. **Store boundary.** UI → hooks/store actions. To move to a real backend, replace the store's persistence and actions with a Supabase or REST client. Selectors and UI stay as they are.

## Notes and assumptions

- **Zone geography:** zone boundaries are unions of real LGA boundaries, but the grouping of LGAs into zones is illustrative. Replace it with OGPDPA's official zone list and re-run `scripts/build-map.mjs`.
- **Fees:** fee rates, the meaning of the registration-number series letter (A–D) and the due dates are placeholders. They're listed as open questions in REQUIREMENTS.md §10.
- **Personal data:** all names, phone numbers and addresses in the dataset are fictional.
