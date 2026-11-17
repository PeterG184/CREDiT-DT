import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Constants from 'expo-constants';
import { resolveSiteView } from '../modules/resolver';
import { TwinCanvas } from '../components/TwinCanvas';

interface HealthData {
  status: string;
  site_target: string;
  timestamp: string;
  database_connected: boolean;
  raw_schema_readable: boolean;
  version: string;
}

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const extra = Constants.expoConfig?.extra || {};
  const siteTarget = (extra.siteTarget || 'zambia').toLowerCase();
  const siteName = extra.siteName || `CREDiT DT ${siteTarget.toUpperCase()}`;
  const hardwareProfile = extra.hardwareProfile || {};
  const apiBaseUrl = extra.apiBaseUrl || 'http://localhost:4000';

  const [healthStatus, setHealthStatus] = useState<'checking' | 'healthy' | 'error'>('checking');
  const [healthDetails, setHealthDetails] = useState<HealthData | null>(null);

  const checkHealth = async () => {
    setHealthStatus('checking');
    try {
      // In local dev try port 4000, in production use apiBaseUrl
      const url = apiBaseUrl.startsWith('http')
        ? `${apiBaseUrl}/health`
        : `http://localhost:4000/health`;

      const response = await fetch(url, { method: 'GET' });
      if (response.ok) {
        const data: HealthData = await response.json();
        setHealthDetails(data);
        setHealthStatus('healthy');
      } else {
        setHealthStatus('error');
      }
    } catch {
      setHealthStatus('error');
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const SiteView = resolveSiteView(siteTarget);

  return (
    <ScrollView contentContainerStyle={[styles.container, isDesktop && styles.desktopContainer]}>
      {/* Site Header Banner */}
      <View style={styles.banner}>
        <View>
          <Text style={styles.bannerTitle} testID="site-target-title">
            Site Target: <Text style={styles.highlight}>{siteTarget.toUpperCase()}</Text>
          </Text>
          <Text style={styles.bannerSubtitle}>{siteName} — Deployment Target</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={checkHealth}>
          <Text style={styles.refreshText}>Refresh Health</Text>
        </TouchableOpacity>
      </View>

      {/* Responsive Grid / Column Layout */}
      <View style={[styles.grid, isDesktop && styles.desktopGrid]}>
        {/* Left Column: Backend Health & Digital Twin Status */}
        <View style={[styles.column, isDesktop && styles.halfColumn]}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Backend Health Gateway</Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Service Status:</Text>
              {healthStatus === 'checking' && (
                <View style={styles.badgePending}>
                  <ActivityIndicator size="small" color="#38BDF8" />
                  <Text style={styles.badgePendingText}>Checking...</Text>
                </View>
              )}
              {healthStatus === 'healthy' && (
                <View style={styles.badgeSuccess}>
                  <Text style={styles.badgeSuccessText}>Online (HTTP 200)</Text>
                </View>
              )}
              {healthStatus === 'error' && (
                <View style={styles.badgeError}>
                  <Text style={styles.badgeErrorText}>Offline / Unreachable</Text>
                </View>
              )}
            </View>

            {healthDetails && (
              <View style={styles.detailsBox}>
                <Text style={styles.detailText}>Target: {healthDetails.site_target}</Text>
                <Text style={styles.detailText}>
                  DB Connected: {healthDetails.database_connected ? 'Yes' : 'No'}
                </Text>
                <Text style={styles.detailText}>
                  Raw Schema: {healthDetails.raw_schema_readable ? 'Readable (SELECT OK)' : 'Pending'}
                </Text>
                <Text style={styles.detailText}>Timestamp: {healthDetails.timestamp}</Text>
              </View>
            )}
          </View>

          {/* 3D / Spatial Visualization Canvas Stub */}
          <TwinCanvas siteTarget={siteTarget} />
        </View>

        {/* Right Column: Site Module & Load Profile */}
        <View style={[styles.column, isDesktop && styles.halfColumn]}>
          <SiteView siteTarget={siteTarget} hardwareProfile={hardwareProfile} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  desktopContainer: {
    paddingHorizontal: 40,
    paddingVertical: 24,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  banner: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  bannerTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
  },
  highlight: {
    color: '#38BDF8',
  },
  bannerSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 4,
  },
  refreshButton: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  grid: {
    flexDirection: 'column',
    gap: 16,
  },
  desktopGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  column: {
    width: '100%',
  },
  halfColumn: {
    flex: 1,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    color: '#CBD5E1',
    fontSize: 14,
  },
  badgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C4A6E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  badgePendingText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeSuccess: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeSuccessText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeError: {
    backgroundColor: '#7F1D1D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeErrorText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '600',
  },
  detailsBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 4,
  },
  detailText: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
  },
});

