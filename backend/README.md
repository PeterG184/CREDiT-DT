# Backend Services Guide (`backend/`)

This directory houses the backend microservices for the Digital Twin platform.

---

## 1. Architectural Rules & The Sole Database Gatekeeper

> [!IMPORTANT]
> **The Sole Gatekeeper Rule**: `backend/api` is the **only service in the entire platform** permitted to connect to PostgreSQL/TimescaleDB. 
> * The frontend application, BentoML forecasting model containers, and secondary compute services must never connect to PostgreSQL directly.
> * All data ingestion queries, digital twin state persistence, and model forecast storage pass through `backend/api` over internal HTTP endpoints.

```
+-------------------------------------------------------------+
|                      Host / Web Clients                     |
|                                                             |
|   +--------------------+          +---------------------+   |
|   |  Expo Web (Nginx)  |          | Standalone Mobile   |   |
|   +---------+----------+          +----------+----------+   |
|             |                                |              |
+-------------|--------------------------------|--------------+
              |                                |
              +--------------+  +--------------+
                             |  |
                             v  v
+-------------------------------------------------------------+
|               Docker Private Bridge Network                 |
|                                                             |
|   +-----------------------------------------------------+   |
|   |            backend/api (Port 4000)                  |   |
|   |         * SOLE DATABASE GATEKEEPER *                |   |
|   +-----------+----------------------+--------------+---+   |
|               |                      |              ^       |
|          HTTP |                      | SQL          | HTTP  |
|               v                      v              |       |
|    +--------------------+   +-----------------+  +--+----+  |
|    | Secondary Compute  |   | PostgreSQL 16 + |  |BentoML|  |
|    | Worker Containers  |   | TimescaleDB     |  |Models |  |
|    +--------------------+   +-----------------+  +-------+  |
+-------------------------------------------------------------+
```

---

## 2. Starter Service: Python / FastAPI

The initial implementation in `backend/api/` uses Python 3.12 and FastAPI:
* **Port**: 4000
* **Configuration**: Reads `SITE_TARGET` from the environment (defaulting to `zambia`).
* **Database Access**: Uses `psycopg` to query the `credit_dt` database using `app_user` credentials.
* **Contracts**: Adheres strictly to `contracts/openapi.yaml`.

### Running Locally (Without Docker)
From the repository root:
```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r backend/api/requirements.txt

# Run the API with hot reloading
SITE_TARGET=zambia uvicorn backend.api.main:app --port 4000 --reload
```

### Running Backend Tests
```bash
pytest backend/api/tests/ -v
```

---

## 3. Language Agnosticism: Replacing or Adding Services

Developers are free to replace `backend/api` or build secondary processing microservices in any language (such as Go, Rust, Node.js, C#, or Python), provided the service meets three criteria:

1. **Exposes HTTP `/health` on Port 4000**:
   Returns HTTP 200 with JSON payload containing:
   ```json
   {
     "status": "healthy",
     "site_target": "zambia",
     "timestamp": "2026-11-17T12:00:00Z",
     "database_connected": true
   }
   ```
2. **Accepts `ARG SITE_TARGET` in Dockerfile**:
   Tags and builds image variants per site.
3. **Respects Database Permissions**:
   Connects only with `app_user` credentials, never superuser, and strictly treats `raw.*` tables as read-only.

---

## 4. Adding Secondary Internal Compute Containers

To add an asynchronous worker or specialized physics calculation container (e.g. `backend/load-balancer`):

1. Create a new directory `backend/<service-name>/`.
2. Add a `Dockerfile` exposing a `/health` endpoint.
3. In `docker-compose.yml`, define the service on the private bridge network:
   ```yaml
   load-balancer:
     build:
       context: .
       dockerfile: backend/load-balancer/Dockerfile
       args:
         SITE_TARGET: ${SITE_TARGET:-zambia}
     environment:
       - SITE_TARGET=${SITE_TARGET:-zambia}
       - BACKEND_API_URL=http://backend-api:4000
     profiles: ["zambia", "malawi", "kenya"]
   ```
4. Configure the worker to send calculated outputs to `backend/api` via HTTP POST rather than writing to PostgreSQL directly.

