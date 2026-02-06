# gatherly – Project Planning

## Architecture & Goals

- **Stack:** React 19, TypeScript, Tailwind CSS, react-router v7, React Query.
- **Purpose:** Help users organize gift-giving activities: create events, assign gatherly recipients, manage a gift registry (create/view/filter gifts).
- **State:** Events in `EventsContext` (localStorage); Gifts in `GiftsContext` (localStorage). Optional future link: gifts scoped by event ID.

## Naming & Structure

- **Routes:** `/` (Home), `/decipher`, `/gift-registry`.
- **Pages:** Live under `src/pages/`; one main component per route.
- **Components:** Feature components in `src/components/`; group by feature (e.g. `gift-registry/`).
- **Contexts:** `src/contexts/` for global state (Events, Gifts).
- **Imports:** Prefer path aliases from `src` (e.g. `components/`, `contexts/`, `pages/`).

## Style & Conventions

- Use Tailwind for layout and styling; red/green as primary accents (red-600, green-600) aligned with existing UI.
- Keep files under **500 lines**; split by feature or responsibility (e.g. GiftCard, CreateGiftForm, GiftFilters).
- Non-obvious logic: add a short `# Reason:` comment.

## Testing

- Unit tests in `/tests` mirroring app structure, or colocated `*.spec.tsx` where the project already uses them (e.g. `components/button/index.spec.tsx`).
- For new features: at least one happy-path, one edge, one failure case.

## Documentation

- Update README when adding features or changing setup. Mark completed work in TASK.md.
