# Frontend Application Guide (`frontend/`)

This directory contains the dual-target frontend application for the Digital Twin platform, built using [Expo](https://expo.dev) and [React Native](https://reactnative.dev).

From a single shared codebase, the frontend targets:
1. **Desktop Web Browsers**: Compiled to static HTML/JS/CSS assets via `expo export --platform web` and served directly by Nginx on each site's dedicated production server.
2. **Standalone Native Mobile Applications**: Independent native iOS (`.ipa`) and Android (`.apk`/`.aab`) binaries distributed separately per site.

---

## 1. Why Expo Runs on the Host OS (Not Inside Docker)

In both local development and during production host deployments, **Expo runs directly on the host OS / WSL rather than inside a Docker container**. 

* **Local Development**: Running on the host provides zero-latency file watching, instant Fast Refresh, direct access to physical devices on the local Wi-Fi, and frictionless integration with iOS Simulators and Android Emulators without Docker NAT/port-mapping issues.
* **Production Deployment**: On the production server, `deploy/deploy.sh` invokes `npx expo export --platform web` directly on the host Node.js runtime and copies the output to `/var/www/digital-twin-web`. This avoids bloated Docker build contexts and keeps web bundling rapid and lightweight.

---

## 2. Multi-Site Build Flag: `EXPO_PUBLIC_SITE_TARGET`

The application adapts dynamically to the target site at build time:

```bash
# Export static web for Zambia (default)
EXPO_PUBLIC_SITE_TARGET=zambia npm run build:web

# Export static web for Malawi
EXPO_PUBLIC_SITE_TARGET=malawi npm run build:web

# Export static web for Kenya
EXPO_PUBLIC_SITE_TARGET=kenya npm run build:web
```

### How It Works (`app.config.ts`):
1. Reads `process.env.EXPO_PUBLIC_SITE_TARGET` (defaults to `zambia`).
2. Loads the corresponding manifest from `config/sites/<site>.json`.
3. Injects that site's display name, bundle identifier (`org.credit.digitaltwin.<site>`), Android package name, and hardware load parameters into Expo's configuration.
4. Exposes site parameters to components via `Constants.expoConfig.extra`.

---

## 3. Platform Divergence Convention: `.web.tsx` vs `.native.tsx`

When building 3D digital twin visualizations (e.g. WebGL, Three.js, Canvas), web APIs and native mobile APIs diverge fundamentally:
* Desktop Web uses standard DOM Canvas, WebGL, or `@react-three/fiber`.
* Standalone Mobile uses `expo-gl`, Metal, or OpenGL ES.

To prevent web dependencies from breaking native mobile compilations (and vice versa):
* Create a desktop web file: `ComponentName.web.tsx`
* Create a native mobile file: `ComponentName.native.tsx`
* Reference it simply as: `import { ComponentName } from './components/ComponentName';`

Metro bundler will automatically resolve the `.web.tsx` file during web builds and the `.native.tsx` file during iOS/Android builds.

---

## 4. Directory Structure

```
frontend/
├── app.config.ts        # Dynamic multi-site configuration
├── metro.config.js      # Monorepo root workspace resolution
├── package.json         # Expo, React Native, and Jest dependencies
├── tsconfig.json        # TypeScript configuration
├── src/
│   ├── app/             # Expo Router pages
│   │   ├── _layout.tsx  # Shared responsive header and layout
│   │   └── index.tsx    # Responsive dashboard & backend health check
│   ├── components/      # UI components & platform-divergent canvas stubs
│   │   ├── TwinCanvas.web.tsx     # Desktop WebGL / Three.js canvas stub
│   │   └── TwinCanvas.native.tsx  # Mobile Expo GL canvas stub
│   └── modules/         # Site-specific visualization views
│       └── resolver.ts  # Dynamic site view resolver (Zambia/Malawi/Kenya)
└── tests/
    └── smoke.test.tsx   # Jest component smoke test
```

---

## 5. Running & Testing Locally

```bash
# Start Expo development server (defaults to Zambia)
npm run start --prefix frontend

# Launch in web browser directly
npm run web --prefix frontend

# Run TypeScript typecheck
npm run typecheck --prefix frontend

# Run Jest tests
npm run test --prefix frontend
```

