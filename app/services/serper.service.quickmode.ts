// Quick mode configuration for environments with timeout limitations
export const QUICK_MODE_CONFIG = {
  enabled: false, // Disabled for local development
  searchLimit: 50, // Reduced from 250
  platformLimit: 5, // Reduced from 10-15
  batchSize: 10, // Increased for faster processing
  resultsPerQuery: 10, // Reduced from 20
};

export function isQuickModeEnabled(): boolean {
  return QUICK_MODE_CONFIG.enabled;
}

export function getQuickModeMessage(): string {
  return 'Running in quick mode due to platform limitations. Analysis will complete in 2-3 minutes with reduced data coverage.';
}