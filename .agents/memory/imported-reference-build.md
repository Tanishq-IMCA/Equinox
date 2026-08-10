---
name: Imported reference build boundary
description: Imported reference folders may be included by the root TypeScript/build scan without being part of the running Next app.
---

The runnable Next.js app can serve successfully even when imported reference projects under `reffiles/` have missing generated modules or dependencies that fail the root production type check.

**Why:** The imported project contains multiple reference apps with their own dependency assumptions; expanding setup to repair them would exceed the minimal app-start scope.

**How to apply:** Treat failures isolated to `reffiles/` as a separate cleanup task unless the user explicitly asks for a clean production build across all imported references.