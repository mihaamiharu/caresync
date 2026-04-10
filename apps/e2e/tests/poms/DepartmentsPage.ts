import { type Locator, type Page } from '@playwright/test';

export class DepartmentsPage {
  readonly page: Page;
  readonly pageWrapper: Locator;
  readonly searchInput: Locator;
  readonly loadingIndicator: Locator;
  readonly errorMessage: Locator;
  readonly emptyState: Locator;
  readonly createButton: Locator;
  readonly formModal: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly formError: Locator;
  readonly nameError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageWrapper = page.getByTestId('departments-page');
    this.searchInput = page.getByTestId('departments-search');
    this.loadingIndicator = page.getByTestId('departments-loading');
    this.errorMessage = page.getByTestId('departments-error');
    this.emptyState = page.getByTestId('departments-empty');
    this.createButton = page.getByTestId('create-department-button');
    this.formModal = page.getByTestId('department-form-modal');
    this.nameInput = page.getByTestId('dept-name-input');
    this.descriptionInput = page.getByTestId('dept-description-input');
    this.submitButton = page.getByTestId('dept-form-submit');
    this.cancelButton = page.getByTestId('dept-form-cancel');
    this.formError = page.getByTestId('dept-form-error');
    this.nameError = page.getByTestId('dept-name-error');
  }

  async goto() {
    await this.page.goto('/departments');
  }

  async isLoaded() {
    await this.pageWrapper.waitFor({ state: 'visible' });
  }

  /** Wait for the loading spinner to disappear, indicating data has resolved */
  async waitForContent() {
    await this.loadingIndicator.waitFor({ state: 'hidden' });
  }

  /** Get the card locator for a specific department by its ID */
  card(id: string): Locator {
    return this.page.getByTestId(`department-card-${id}`);
  }

  /** Get the edit button for a specific department */
  editButton(id: string): Locator {
    return this.page.getByTestId(`edit-department-${id}`);
  }

  /** Get the delete button for a specific department */
  deleteButton(id: string): Locator {
    return this.page.getByTestId(`delete-department-${id}`);
  }

  /** Fill and submit the department form */
  async fillAndSubmitForm(name: string, description?: string) {
    await this.nameInput.fill(name);
    if (description !== undefined) {
      await this.descriptionInput.fill(description);
    }
    await this.submitButton.click();
  }
}
