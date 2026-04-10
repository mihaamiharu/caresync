import { type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('email-input');
    this.passwordInput = page.getByTestId('password-input');
    this.submitButton = page.getByTestId('login-submit');
    this.errorMessage = page.getByTestId('login-error');
    this.registerLink = page.getByTestId('register-link');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email?: string, password?: string) {
    if (email) await this.emailInput.fill(email);
    if (password) await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
