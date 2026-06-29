# Assigner Dashboard Redesign

Rebuild `src/routes/_authenticated/assigner.tsx` as an admin console that looks and behaves distinctly from the substitute view. No backend/schema changes — purely a frontend/presentation rework using existing data.

## Layout

```text
┌────────────────────────────────────────────┐
│  Admin Console            [name]  [logout] │  ← dark slate header strip
├────────────────────────────────────────────┤
│  ▓ Stat  ▓ Stat  ▓ Stat  ▓ Stat            │  ← 2x2 on mobile, 4-up on sm+
│  Teachers Available Pending  Today          │
├────────────────────────────────────────────┤
│  [ + Add Substitution ]  [ View Teachers ] │  ← two primary command buttons
├────────────────────────────────────────────┤
│  Tab: Assignments  |  Teachers              │
│  ── filter chips: All / Pending / Received  │
│  ── list of cards (assignments or teachers) │
└────────────────────────────────────────────┘
```

## Sections

1. **Header band** — darker `bg-slate-900 text-slate-50` strip with "Admin Console" eyebrow, user name, sign-out icon. Visually separates from the light-themed substitute page.
2. **Stat cards (4)** — Total Teachers, Available Now, Pending Assignments, Today's Assignments. Each is a compact card with icon, big number, label. Derived from already-loaded `substitutes` and `subs`.
3. **Command bar** — two prominent buttons:
   - **Add Substitution** → opens existing `AssignForm` modal (replaces the floating FAB).
   - **View Teachers** → switches the tab below to the Teachers list (and scrolls to it).
4. **Tabs** — `Assignments` (default) and `Teachers`.
   - *Assignments tab*: filter chips (All / Pending / Received), reuse existing card design but tightened; keep delete action.
   - *Teachers tab*: table-style rows on desktop, stacked cards on mobile. Columns: Name, Email, Availability, Account, quick "Assign" button that opens `AssignForm` pre-filled with that teacher.
5. **Empty states** — distinct illustrations/copy per tab.

## Visual differentiation from substitute page

- Dark header band vs substitute's light header.
- Stat grid at the top (substitute has none).
- Tabbed content vs substitute's single scroll.
- Slate/indigo accent palette for admin chrome; status pills keep their semantic colors.
- Remove floating FAB; commands live in the command bar.

## Files touched

- `src/routes/_authenticated/assigner.tsx` — full rewrite of presentation; reuse existing `AssignForm`, data loading, and pill components. Add `assignPrefillId` state so the Teachers tab's per-row Assign button opens the modal with that teacher selected (small prop addition to `AssignForm`).

No DB migrations. No changes to substitute page, auth, or routing.
