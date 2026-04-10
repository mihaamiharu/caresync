import { type Locator, type Page } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly pageWrapper: Locator;
  readonly heading: Locator;
  readonly sidebar: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageWrapper = page.getByTestId('dashboard-page');
    this.heading = page.getByRole('heading', { name: 'Dashboard' });
    this.sidebar = page.getByTestId('sidebar');
    this.logoutButton = page.getByTestId('logout-button');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async isLoaded() {
    await this.pageWrapper.waitFor({ state: 'visible' });
  }

  async logout() {
    await this.logoutButton.click();
  }
}
