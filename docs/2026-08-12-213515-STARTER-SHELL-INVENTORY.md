# Starter shell inventory

Updated for ticket 16 of the frontend refactor plan.

| Area | Current consumer | Decision | Reason |
|---|---|---|---|
| `layouts/app/app-sidebar-layout.tsx` | Authenticated management and POS pages | Active | Owns the production shell used by `AppLayout`. |
| `components/app-sidebar.tsx` | `app-sidebar-layout.tsx` | Active | Uses the shared navigation source in `resources/js/config/navigation.ts`. |
| `components/app-sidebar-header.tsx` | `app-sidebar-layout.tsx` | Active | Provides breadcrumbs and the authenticated shell header. |
| `components/app-header.tsx` | No current route/layout consumer | Candidate cleanup | Legacy header-layout variant; keep until the header layout is confirmed unused in deployment. |
| `layouts/app/app-header-layout.tsx` | No current page consumer | Candidate cleanup | Depends on the legacy `AppHeader`; do not remove until route/layout inventory is confirmed. |
| `pages/welcome.tsx` | No route in `routes/web.php` | Candidate cleanup | Starter artifact is not reachable from the current route map. Remove in a dedicated cleanup change after deployment verification. |
| `components/nav-footer.tsx` | No current consumer | Candidate cleanup | Starter navigation fragment; no production consumer found. |
| `components/appearance-dropdown.tsx` | Settings/user flows | Active | Appearance preference is still part of the settings surface. |
| `components/appearance-tabs.tsx` | `pages/settings/appearance.tsx` | Active | Settings page consumer exists. |

## Cleanup rule

Candidate cleanup items are intentionally not deleted in ticket 16. They should be removed only after a route/build/deployment check confirms that no external entry point imports the legacy shell. Unused UI primitives remain available for future feature work and are not deleted only to reduce file count.
