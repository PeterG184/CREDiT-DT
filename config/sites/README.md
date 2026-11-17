# Site Configuration Manifests (`config/sites/`)

This directory contains the build-time single source of truth for each dedicated site deployment:
* `zambia.json` — Phase 1 deployment (Active Development)
* `malawi.json` — Phase 2 deployment (Base Manifest)
* `kenya.json` — Phase 3 deployment (Base Manifest)

All three site manifests compile simultaneously across the backend, frontend, and CI/CD pipelines to prevent configuration and schema drift.

---

## Manifest Schema Specification

Each manifest JSON file adheres to the following structure:

```json
{
  "site_id": "string",                  // Unique lowercase identifier (e.g. "zambia")
  "site_name": "string",                // Human-readable site title
  "country": "string",                  // Target country name
  "timezone": "string",                 // IANA Timezone string (e.g. "Africa/Lusaka")
  "coordinates": {                      // Geographic center for maps/weather
    "latitude": -15.3875,
    "longitude": 28.3228
  },
  "description": "string",              // Site summary and hardware context
  "hardware_profile": {
    "generation": {
      "type": "solar_pv",               // Energy generation type
      "capacity_kw": 50.0,              // Rated generation capacity in kW
      "storage_type": "bess",           // Battery energy storage system
      "storage_capacity_kwh": 120.0     // Storage capacity in kWh
    },
    "loads": [                          // Connected high-power and critical loads
      {
        "id": "hammer_mill_1",          // Unique load ID
        "name": "Primary Hammer Mill",  // Human-readable name
        "category": "milling",          // Classification (e.g. milling, water_supply, residential, commercial)
        "nominal_power_kw": 15.0,       // Nominal rating in kW
        "priority": "flexible"          // Load priority: "critical", "high", "medium", or "flexible"
      }
    ]
  },
  "expected_raw_metric_keys": [         // List of sensor telemetry metric keys expected from ingestion
    "timestamp",
    "voltage_v",
    "current_a",
    "active_power_kw",
    "battery_soc_pct"
  ],
  "active_features": {                  // Feature flags for frontend and backend components
    "realtime_telemetry": true,
    "load_monitoring": true,
    "forecasting": true,
    "digital_twin_3d": false,
    "alerts": true
  },
  "models": [                           // BentoML model identifiers required by this site
    "solar_irradiance_v1",
    "battery_degradation_v1"
  ],
  "api_base_url": "/api",               // Base URL for API requests (/api on Nginx, or full URL)
  "mobile": {
    "display_name": "CREDiT DT Zambia", // App display name on iOS/Android home screen
    "ios_bundle_identifier": "org.credit.digitaltwin.zambia",
    "android_package_name": "org.credit.digitaltwin.zambia"
  }
}
```

---

## Mobile Bundle Conventions

Standalone mobile applications are built independently per site from the single Expo React Native codebase:
* **iOS Bundle Identifier**: `org.credit.digitaltwin.<site_id>`
* **Android Package Name**: `org.credit.digitaltwin.<site_id>`
* **Display Name**: Displayed under the app icon on the user's home screen.

When `EXPO_PUBLIC_SITE_TARGET` is set at build time (e.g., `EXPO_PUBLIC_SITE_TARGET=malawi npx expo export`), `app.config.ts` dynamically resolves the corresponding manifest and injects these site-specific values into the native application bundle.

---

## Enabling Site-Specific Features & Model Containers

When Malawi or Kenya transition from base manifests to active deployment:

1. **Update Hardware & Load Profiles**: Add the verified site loads and solar/storage hardware parameters in `config/sites/<site>.json`.
2. **Register Forecasting Models**: List the model identifiers under `"models"`. Then attach those BentoML service containers to the corresponding Docker Compose profile in `docker-compose.yml`.
3. **Activate Frontend Visualizations**:
   * Set `"active_features"."digital_twin_3d": true` or `"forecasting": true`.
   * Add site-specific layout components into `frontend/src/modules/<site>/`.
4. **Deploy Dedicated Server**: Configure the GitHub Environment (`malawi` or `kenya`) secrets (`PROD_SERVER_HOST`, `DATABASE_URL`, etc.) to activate automated deployments in `.github/workflows/deploy-prod.yml`.

