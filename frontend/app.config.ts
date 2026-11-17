import { ExpoConfig, ConfigContext } from 'expo/config';
import * as fs from 'fs';
import * as path from 'path';

export default ({ config }: ConfigContext): ExpoConfig => {
  const siteTarget = (process.env.EXPO_PUBLIC_SITE_TARGET || 'zambia').toLowerCase();
  
  // Resolve site manifest path from config/sites/
  const manifestPath = path.resolve(__dirname, '..', 'config', 'sites', `${siteTarget}.json`);
  
  let manifest: any = {
    site_id: siteTarget,
    site_name: `CREDiT DT ${siteTarget.toUpperCase()}`,
    api_base_url: '/api',
    active_features: {},
    mobile: {
      display_name: `CREDiT DT ${siteTarget.toUpperCase()}`,
      ios_bundle_identifier: `org.credit.digitaltwin.${siteTarget}`,
      android_package_name: `org.credit.digitaltwin.${siteTarget}`,
    },
    hardware_profile: { loads: [] }
  };

  if (fs.existsSync(manifestPath)) {
    try {
      const rawData = fs.readFileSync(manifestPath, 'utf-8');
      manifest = JSON.parse(rawData);
    } catch (err) {
      console.warn(`[app.config.ts] Failed to parse manifest for '${siteTarget}':`, err);
    }
  } else {
    console.warn(`[app.config.ts] Manifest not found at ${manifestPath}, using defaults.`);
  }

  const appDisplayName = manifest.mobile?.display_name || `CREDiT DT ${siteTarget.toUpperCase()}`;
  const bundleId = manifest.mobile?.ios_bundle_identifier || `org.credit.digitaltwin.${siteTarget}`;
  const packageName = manifest.mobile?.android_package_name || `org.credit.digitaltwin.${siteTarget}`;

  return {
    ...config,
    name: appDisplayName,
    slug: `credit-dt-${siteTarget}`,
    version: '1.0.0',
    orientation: 'default',
    userInterfaceStyle: 'automatic',
    scheme: 'credit-dt',
    ios: {
      supportsTablet: true,
      bundleIdentifier: bundleId,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#0F172A',
      },
      package: packageName,
    },
    web: {
      bundler: 'metro',
      output: 'static',
    },
    plugins: [
      'expo-router'
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      siteTarget,
      siteName: manifest.site_name,
      country: manifest.country,
      description: manifest.description,
      apiBaseUrl: manifest.api_base_url || '/api',
      activeFeatures: manifest.active_features || {},
      hardwareProfile: manifest.hardware_profile || {},
      expectedRawMetrics: manifest.expected_raw_metric_keys || [],
    },
  };
};

