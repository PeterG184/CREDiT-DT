# Pull Request Guidelines & Engineering Standards

All contributors to the Digital Twin Cloud Platform must adhere to the following standards to ensure multi-site reliability, database security, and zero downtime deployments.

---

## 1. Branch Naming & Workflow
* **Base Branch**: All feature branches and bugfixes branch off `main`.
* **Branch Naming**: Use issue-based prefixes:
  * `feature/<issue-number>-<short-description>` (e.g. `feature/42-battery-telemetry`)
  * `fix/<issue-number>-<short-description>` (e.g. `fix/89-healthcheck-timeout`)
* **Production Releases**: Only the Lead Developer promotes changes from `main` to `prod`.

---

## 2. Test-Driven Development (TDD) Expectations
* **Write Tests First**: Every new endpoint, database migration, or frontend component must include automated tests before implementation.
* **Backend**: Add tests in `backend/api/tests/` (runnable with `pytest`).
* **Frontend**: Add tests in `frontend/tests/` (runnable with `jest`).
* **Multi-Site Verification**: Verify that unit and smoke tests pass across all three site targets: `zambia`, `malawi`, and `kenya`.

---

## 3. Strict Database Gatekeeper Rules
* **Only `backend/api` Connects to Database**:
  No frontend code, secondary compute workers, or BentoML model containers may connect directly to PostgreSQL/TimescaleDB.
* **`raw` Schema Immutability**:
  * The `raw` schema is owned exclusively by the external telemetry ingestion pipeline.
  * Migrations in `database/migrations/` must **never** create, alter, drop, or write to tables in `raw`. (This is enforced by static CI analysis).
  * The `app_user` role has strictly `SELECT`-only privileges on `raw`.
* **No Historical Retention Drops**:
  Do not create TimescaleDB retention policies that drop historical data (`drop_chunks`). Historical records must be preserved indefinitely using columnar compression policies (`add_compression_policy`).

---

## 4. Multi-Site Compatibility
* A change must never break one site to benefit another.
* When adding hardware features or loads, update `config/sites/<site>.json`.
* Standalone mobile configurations (bundle IDs, app icons, and names) must remain distinct per site.
* Check that static web export succeeds for all three targets:
  ```bash
  EXPO_PUBLIC_SITE_TARGET=zambia npm run build:web
  EXPO_PUBLIC_SITE_TARGET=malawi npm run build:web
  EXPO_PUBLIC_SITE_TARGET=kenya npm run build:web
  ```

---

## 5. Review & Merge Requirements
* **Pull Request Required**: Direct pushes to `main` and `prod` are blocked by branch protection.
* **Lead Approval**: 1 required approving review from the Lead Developer.
* **Status Checks**: All CI matrix checks across database, backend, and frontend must pass cleanly.
* **Merge Method**: Strictly **Squash and merge** to keep git history linear and atomic.

