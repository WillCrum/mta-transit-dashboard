<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:debugging-protocol -->
# Debugging protocol

## Hung awaits / missing network requests
When an `await` never resolves and no network request appears in the browser:
- The hang is almost always **inside the calling code**, not in the library.
- **Read every file in the call chain first** before touching configuration or credentials.
- Trace the full stack: the component that triggered the call → the storage/util function → the library client. One of those files will contain the lock, race, or ordering bug.
- Common culprits in this codebase: calling `supabase.from()` inside an `onAuthStateChange` callback (deadlocks the auth lock); awaiting inside a function that is itself awaited by the same lock owner.

## General read-before-diagnose rule
Before forming a hypothesis about a bug, read the relevant source files. Symptoms observed in DevTools (network tab, console) describe effects — the cause is always in the code. Skipping straight to configuration changes or library swaps without reading the code first wastes time.
<!-- END:debugging-protocol -->
