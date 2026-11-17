import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface SiteModuleProps {
  siteTarget: string;
  hardwareProfile?: any;
}

/**
 * Site-Aware Module Resolver
 * Dynamically resolves and renders site-specific visualization components
 * (zambia, malawi, kenya) while falling back cleanly to a unified view.
 */
export function resolveSiteView(siteTarget: string): React.ComponentType<SiteModuleProps> {
  switch (siteTarget.toLowerCase()) {
    case 'zambia':
      return ZambiaView;
    case 'malawi':
      return MalawiView;
    case 'kenya':
      return KenyaView;
    default:
      return GenericSiteView;
  }
}

function ZambiaView({ siteTarget, hardwareProfile }: SiteModuleProps) {
  const loads = hardwareProfile?.loads || [];
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Zambia Microgrid Overview</Text>
      <Text style={styles.subtitle}>Solar PV & High-Power Industrial / Community Loads</Text>
      <View style={styles.list}>
        {loads.map((load: any) => (
          <View key={load.id} style={styles.loadRow}>
            <Text style={styles.loadName}>{load.name}</Text>
            <Text style={styles.loadDetails}>{load.nominal_power_kw} kW • {load.priority}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MalawiView({ siteTarget, hardwareProfile }: SiteModuleProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Malawi Microgrid (Phase 2)</Text>
      <Text style={styles.subtitle}>Base Site Manifest Active — Awaiting Physical Installation</Text>
    </View>
  );
}

function KenyaView({ siteTarget, hardwareProfile }: SiteModuleProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Kenya Microgrid (Phase 3)</Text>
      <Text style={styles.subtitle}>Base Site Manifest Active — Awaiting Physical Installation</Text>
    </View>
  );
}

function GenericSiteView({ siteTarget }: SiteModuleProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Site: {siteTarget}</Text>
      <Text style={styles.subtitle}>Standard Digital Twin Overview</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 12,
  },
  list: {
    marginTop: 8,
  },
  loadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  loadName: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500',
  },
  loadDetails: {
    color: '#38BDF8',
    fontSize: 13,
  },
});

