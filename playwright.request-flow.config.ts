import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/request-flow', testMatch: '*.spec.ts', fullyParallel: true,
  outputDir: './test-results/request-flow',
  use: { baseURL: 'http://127.0.0.1:3107', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', browserName: 'chromium' } },
    { name: 'small-mobile', use: { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' } },
  ],
  webServer: { command: 'npx vite --config tests/request-flow/vite.config.ts', url: 'http://127.0.0.1:3107', reuseExistingServer: false },
});
