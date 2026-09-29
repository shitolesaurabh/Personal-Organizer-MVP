---
name: Lazy starter data
description: Concurrency rule for first-load example data in apps that seed on demand
---

When starter records are inserted lazily on the first read, guard the read-then-insert block with one shared in-flight promise.

**Why:** A dashboard commonly requests several resources at once. Without a lock, each request can observe an empty table and insert the same starter records.

**How to apply:** Keep the promise at module scope, return it to concurrent callers, and clear it on failure so a later request can retry.