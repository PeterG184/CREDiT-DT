import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Desktop Web 3D / Spatial Canvas Stub
 * Placed in .web.tsx so web-specific Three.js / WebGL / Canvas code
 * never leaks into or breaks native iOS/Android builds.
 */
export function TwinCanvas({ siteTarget }: { siteTarget: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.badge}>Desktop Web Canvas (WebGL / Three.js Stub)</Text>
      <Text style={styles.info}>Site: {siteTarget.toUpperCase()} — WebGL acceleration ready</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 180,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  badge: {
    color: '#38BDF8',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  info: {
    color: '#64748B',
    fontSize: 12,
  },
});

