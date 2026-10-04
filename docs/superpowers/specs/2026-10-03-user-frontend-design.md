# User Frontend Scope

This replaces the previous architecture proposal. The [implementation plan](../plans/2026-10-03-user-frontend.md) is the main document.

Build a simple frontend inside `apps/user-frontend` using the existing Next.js, React, Tailwind, and backend endpoints.

The user can:

1. Sign in with a wallet address and optional name.
2. Open a dashboard with Create task and Open results actions.
3. Select and preview at least two images, enter an optional title and required signature, upload, and create a task.
4. View images, vote counts, and percentage bars; refresh results and sign out.

Use native fetch, one shared auth provider, localStorage for the current JWT flow, and local form state. Keep the UI responsive and show basic loading, validation, and request errors.

Application changes are limited to `apps/user-frontend`. No worker frontend, backend changes, migrations, payment integration, additional architecture layers, or future expansion phases are part of this plan.

The existing backend and S3 configuration are integration dependencies. Manual address/signature entry follows the current API; it does not add verified wallet authentication or payment processing.
