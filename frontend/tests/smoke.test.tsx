import React from 'react';
import { render } from '@testing-library/react-native';
import DashboardScreen from '../src/app/index';

// Mock Constants for testing
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      siteTarget: 'zambia',
      siteName: 'Zambia Solar Microgrid',
      hardwareProfile: {
        loads: [
          { id: 'hammer_mill_1', name: 'Primary Hammer Mill', nominal_power_kw: 15.0, priority: 'flexible' }
        ]
      }
    }
  }
}));

// Mock global fetch for health check
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        status: 'healthy',
        site_target: 'zambia',
        timestamp: '2026-11-17T12:00:00Z',
        database_connected: true,
        raw_schema_readable: true,
        version: '1.0.0'
      })
  })
) as jest.Mock;

describe('Frontend Smoke Test Suite', () => {
  it('renders DashboardScreen without crashing and displays active site target', async () => {
    const { getByTestId, getByText } = render(<DashboardScreen />);
    
    // Check that banner title renders
    const titleElement = getByTestId('site-target-title');
    expect(titleElement).toBeTruthy();

    // Check that Zambia text is present
    expect(getByText('ZAMBIA')).toBeTruthy();

    // Check that loads render
    expect(getByText('Primary Hammer Mill')).toBeTruthy();
  });
});

