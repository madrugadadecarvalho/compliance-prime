import { defineConfig } from "@playwright/test";

/**
 * Testes ponta-a-ponta. Requerem a app a correr com a base de dados semeada:
 *   npm run db:setup && npm run build && npm start
 *   npx playwright test
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : undefined,
  },
});
