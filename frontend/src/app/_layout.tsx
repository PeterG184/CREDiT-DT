import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { Slot } from 'expo-router';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  const extra = Constants.expoConfig?.extra || {};
  const siteTarget = (extra.siteTarget || 'zambia').toUpperCase();
  const siteName = extra.siteName || `CREDiT DT ${siteTarget}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{siteName}</Text>
          <Text style={styles.headerSubtitle}>Digital Twin Cloud Platform</Text>
        </View>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{siteTarget}</Text>
        </View>
      </View>
      <View style={styles.content}>
        <Slot />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  badgeContainer: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
});

