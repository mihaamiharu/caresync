import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { LoginPage } from './poms/LoginPage';
import { DashboardPage } from './poms/DashboardPage';
import { config } from './utils/config';

test.describe('Auth — Session & Token', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let testUser: { email: string; password: string };

  test.beforeEach(async ({ page, request }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);

    testUser = {
      email: faker.internet.email().toLowerCase(),
      password: faker.internet.password({ length: 12 }) + '!A1',
    };

    // Pre-create the user
    await request.post(`${config.apiUrl}/api/v1/auth/register`, {
      data: {
        role: "patient",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: testUser.email,
        password: testUser.password
      }
    });
  });

  test('S-1: Logout', async ({ page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    await page.waitForURL('/dashboard');
    
    // Perform logout
    await dashboardPage.logout();
    
    // Should redirect to login
    await page.waitForURL('/login');
    
    // Try to go back to dashboard
    await dashboardPage.goto();
    await page.waitForURL('/login'); // Should bounce back
  });

  test('S-2: Access protected route unauthenticated', async ({ page }) => {
    // Direct navigate without login
    await dashboardPage.goto();
    
    // Should be redirected to login
    await page.waitForURL('/login');
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('S-3: Session persists on page refresh', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    await page.waitForURL('/dashboard');
    
    // Refresh the page
    await page.reload();
    
    await expect(dashboardPage.heading).toBeVisible();
    expect(page.url()).toContain('/dashboard');
  });

  test('S-4: Access token auto-refresh', async ({ page }) => {
    // Since the refresh logic works internally in the app's api-client interceptor
    // and access tokens usually expire in 15min, mocking the timer is tricky.
    // We can simulate an expired token by modifying the local storage to have a junk access token
    // so the app is forced to refresh it via the valid refresh token (stored in cookies).
    
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    await page.waitForURL('/dashboard');
    
    // Corrupt the access token in local storage
    await page.evaluate(() => {
      let state = localStorage.getItem('auth-storage');
      if (state) {
        const parsed = JSON.parse(state);
        parsed.state.accessToken = 'ey.expired.token';
        localStorage.setItem('auth-storage', JSON.stringify(parsed));
      }
    });

    // Make an interaction that triggers an API call (e.g. reload the page which fetches user data)
    await page.reload();
    await expect(dashboardPage.heading).toBeVisible(); // If it persists, refresh worked
  });

  test('S-5: Expired refresh token', async ({ page, context }) => {
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    await page.waitForURL('/dashboard');
    
    // Clear the refresh token cookie
    await context.clearCookies();
    
    // Clear access token in local storage
    await page.evaluate(() => {
      let state = localStorage.getItem('auth-storage');
      if (state) {
        const parsed = JSON.parse(state);
        parsed.state.accessToken = null;
        localStorage.setItem('auth-storage', JSON.stringify(parsed));
      }
    });

    // Next interaction or reload should boot them
    await page.reload();
    await page.waitForURL('/login');
  });
});
