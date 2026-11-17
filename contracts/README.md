# API Contracts (`contracts/`)

This directory contains the language-agnostic OpenAPI 3.0 specification (`openapi.yaml`) defining all public and inter-service HTTP endpoints exposed by `backend/api`.

---

## Purpose

1. **Language Agnosticism**: Ensures that whether `backend/api` is written in Python (FastAPI), TypeScript (Fastify/Node), Go, or Rust, the exposed contract remains strictly identical.
2. **Frontend-Backend Alignment**: The Expo React Native frontend and any client tools rely on this specification for types, endpoint signatures, and response formats.
3. **Automated Validation**: CI and smoke tests validate responses against this contract.

---

## Core Endpoints

* `GET /health`:
  * Returns `200 OK` when the service is up and database connection is healthy.
  * Reports active `site_target`, ISO 8601 `timestamp`, `database_connected` (boolean), and `raw_schema_readable` (boolean).
* `GET /api/site`:
  * Returns the parsed site manifest for the active `SITE_TARGET` (loads, generation hardware, feature flags).
* `GET /api/twin/state`:
  * Returns the latest digital twin state record from `app.digital_twin_state`.

---

## Updating Contracts

When introducing new endpoints (such as forecast triggering or telemetry queries):
1. Add the path and schema to `contracts/openapi.yaml`.
2. Implement the endpoint in `backend/api/`.
3. Add corresponding smoke tests in `backend/api/tests/`.
4. Update frontend client types if required.

