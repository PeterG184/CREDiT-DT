import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Standalone Mobile 3D / Spatial Canvas Stub
 * Placed in .native.tsx so mobile-specific Expo GL / Metal / OpenGL ES code
 * never leaks into or breaks desktop web exports.
 */
export function TwinCanvas({ siteTarget }: { siteTarget: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.badge}>Mobile Native Canvas (Expo GL Stub)</Text>
      <Text style={styles.info}>Site: {siteTarget.toUpperCase()} — Native GPU acceleration ready</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 140,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#A855F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  badge: {
    color: '#A855F7',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  info: {
    color: '#64748B',
    fontSize: 12,
  },
});

