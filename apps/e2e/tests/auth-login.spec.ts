import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { LoginPage } from './poms/LoginPage';
import { DashboardPage } from './poms/DashboardPage';
import { config } from './utils/config';

test.describe('Auth — Login', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  
  // Dynamic user data
  let testUser: { email: string; password: string };

  test.beforeEach(async ({ page, request }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);

    testUser = {
      email: faker.internet.email().toLowerCase(),
      password: faker.internet.password({ length: 12 }) + 'A!', // Ensure strong password
    };

    // Dynamically create a user directly via API for login UI tests
    const response = await request.post(`${config.apiUrl}/api/v1/auth/register`, {
      data: {
        role: "patient",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: testUser.email,
        password: testUser.password
      }
    });
    
    // Ensure the API call was successful
    expect(response.ok()).toBeTruthy();

    await loginPage.goto();
  });

  test('L-1: Successful login', async ({ page }) => {
    await loginPage.login(testUser.email, testUser.password);
    
    // Verify redirect to dashboard
    await page.waitForURL('/dashboard');
    await dashboardPage.isLoaded();
    
    // Check if correctly authenticated
    await expect(dashboardPage.heading).toBeVisible();
  });

  test('L-2: Wrong password', async () => {
    await loginPage.login(testUser.email, 'wrongPassword123!');
    
    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText(/invalid email or password/i);
  });

  test('L-3: Non-existent email', async () => {
    await loginPage.login('doesnotexist@example.com', 'somePassword123!');
    
    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText(/invalid email or password/i);
  });

  test('L-4: Empty form submit', async ({ page }) => {
    await loginPage.submitButton.click();
    
    // Using test-id locators for field specific validation messages shown by Zod
    await expect(page.getByTestId('email-error')).toBeVisible();
    await expect(page.getByTestId('password-error')).toBeVisible();
  });

  test('L-5: Already logged in visits /login', async ({ page }) => {
    await loginPage.login(testUser.email, testUser.password);
    await page.waitForURL('/dashboard');
    
    // Try to visit login again
    await loginPage.goto();
    
    // Should immediately redirect back to dashboard
    await page.waitForURL('/dashboard');
  });
});
