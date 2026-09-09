# DEPRECATED - scripts/migration

**These SQL scripts are deprecated and kept for reference only.**

The single authoritative migration chain is **embedded in the Go platform**
(`pkg/store/postgres/postgres.go`) and runs automatically at platform startup.
The compose stack deliberately does NOT mount these scripts (see the note on
the postgres service in `deploy/docker-compose/docker-compose.yaml`).

Why not use these files:

- They are a second, incompatible schema: UUID ids and `resolveagent` schema
  search_path here vs `VARCHAR(64)` ids in the Go chain. Applying both breaks
  the Go migrations.
- `make migrate-up` / `make migrate-down` still point at this directory and
  will print a warning before running.

If you need a schema change, extend the Go migration chain instead.
