# IndexedDB local data layer

IndexedDB is the browser/PWA persistence foundation for local-first learner state. It replaces localStorage as the intended durable store for projects, tasks, progress, settings and queued synchronization mutations.

## Guarantees

- Writes do not depend on network availability.
- Reads do not wait for Supabase.
- Mutation IDs remain stable across retries.
- Schema upgrades are versioned.
- Cloud synchronization is eventual.

## Production hardening still required

The foundation must be expanded with typed repositories, schema migrations, transaction boundaries spanning record + mutation creation, indexes, quota handling, corruption recovery, and tests for browser restart/offline/reconnect scenarios.
