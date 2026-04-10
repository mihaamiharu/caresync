import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { LoginPage } from './poms/LoginPage';
import { DashboardPage } from './poms/DashboardPage';
import { config } from './utils/config';

test.describe('Navigation', () => {
  test('N-2: Root redirect unauthenticated', async ({ page }) => {
    await page.goto('/');
    
    // Should be redirected to login
    await page.waitForURL('/login');
  });

  test('N-1: Root redirect authenticated', async ({ page, request }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    
    const email = faker.internet.email().toLowerCase();
    const password = faker.internet.password({ length: 12 }) + '!A1';

    await request.post(`${config.apiUrl}/api/v1/auth/register`, {
      data: { role: "patient", firstName: "Test", lastName: "User", email, password }
    });

    await loginPage.goto();
    await loginPage.login(email, password);
    await page.waitForURL('/dashboard');
    
    // Try hitting root
    await page.goto('/');
    
    // Should immediately bounce back to dashboard
    await page.waitForURL('/dashboard');
  });

  test('N-3: Sidebar renders after login', async ({ page, request }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    
    const email = faker.internet.email().toLowerCase();
    const password = faker.internet.password({ length: 12 }) + '!A1';

    await request.post(`${config.apiUrl}/api/v1/auth/register`, {
      data: { role: "patient", firstName: "Test", lastName: "User", email, password }
    });

    await loginPage.goto();
    await loginPage.login(email, password);
    await page.waitForURL('/dashboard');
    
    // In many UIs this might be a generic aside element or identifiable by nav
    // We adjust based on the current actual dashboard UI layout.
    // If it's not present right away, wait for dashboard to load completely.
    await dashboardPage.isLoaded();
    
    // Verify layout elements (assuming a header or sidebar is part of the layout shell)
    // The main Layout usually wraps the dashboard. Let's assert a navigation container exists.
    const hasNavOrSidebar = (await page.locator('nav').count()) > 0 || (await page.locator('aside').count()) > 0;
    
    expect(hasNavOrSidebar).toBeTruthy();
  });
});
