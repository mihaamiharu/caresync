import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { RegisterPage } from './poms/RegisterPage';
import { DashboardPage } from './poms/DashboardPage';
import { config } from './utils/config';

test.describe('Auth — Registration', () => {
  let registerPage: RegisterPage;
  let dashboardPage: DashboardPage;
  
  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page);
    dashboardPage = new DashboardPage(page);
    await registerPage.goto();
  });

  test('R-1: Successful registration', async ({ page }) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email().toLowerCase();
    const password = faker.internet.password({ length: 12 }) + '!A1';

    await registerPage.register(firstName, lastName, email, password);
    
    // Should redirect to dashboard
    await page.waitForURL('/dashboard');
    await dashboardPage.isLoaded();
    await expect(dashboardPage.heading).toBeVisible();
  });

  test('R-2: Duplicate email', async ({ request, page }) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email().toLowerCase();
    const password = faker.internet.password({ length: 12 }) + '!A1';

    // Seed the user via API first
    await request.post(`${config.apiUrl}/api/v1/auth/register`, {
      data: { role: 'patient', firstName, lastName, email, password }
    });

    // Try to register with same email
    await registerPage.register(faker.person.firstName(), faker.person.lastName(), email, password);
    
    await expect(registerPage.errorMessage).toBeVisible();
    await expect(registerPage.errorMessage).toContainText(/already registered/i);
    // Should stay on the same page
    expect(page.url()).toContain('/register');
  });

  test('R-3: Invalid email format', async ({ page }) => {
    const password = faker.internet.password({ length: 12 }) + '!A1';
    await registerPage.register('John', 'Doe', 'notanemail', password);
    
    // Check validation error inline
    await expect(page.getByTestId('email-error')).toBeVisible();
    await expect(page.getByTestId('email-error')).toContainText(/invalid email/i);
  });

  test('R-4: Password too short', async ({ page }) => {
    const email = faker.internet.email().toLowerCase();
    await registerPage.register('John', 'Doe', email, 'short');
    
    // Check validation error inline
    await expect(page.getByTestId('password-error')).toBeVisible();
    await expect(page.getByTestId('password-error')).toContainText(/at least 6 characters/i);
  });

  test('R-5: Empty form submit', async ({ page }) => {
    await registerPage.submitButton.click();
    
    // Should see multiple errors
    const errors = page.locator('p.text-destructive');
    expect(await errors.count()).toBeGreaterThanOrEqual(2); 
  });

  test('R-6: Already logged in visits /register', async ({ page, request }) => {
    // First we register and get logged in
    const email = faker.internet.email().toLowerCase();
    const password = faker.internet.password({ length: 12 }) + '!A1';
    
    await registerPage.register('John', 'Doe', email, password);
    await page.waitForURL('/dashboard');
    
    // Try visiting register again
    await registerPage.goto();
    
    // Should immediately bounce back to dashboard
    await page.waitForURL('/dashboard');
  });
});
