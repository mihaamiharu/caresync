import { type Locator, type Page } from "@playwright/test";

export class DoctorsPage {
  readonly page: Page;
  readonly path = "/doctors";

  readonly createButton: Locator;
  readonly searchInput: Locator;
  readonly emptyState: Locator;
  readonly loadingState: Locator;

  readonly formModal: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly departmentSelect: Locator;
  readonly specializationInput: Locator;
  readonly licenseInput: Locator;
  readonly bioInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly formError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createButton = page.getByTestId("create-doctor-button");
    this.searchInput = page.getByTestId("doctors-search");
    this.emptyState = page.getByTestId("doctors-empty");
    this.loadingState = page.getByTestId("doctors-loading");

    this.formModal = page.getByTestId("doctor-form-modal");
    this.firstNameInput = page.getByTestId("doctor-firstName-input");
    this.lastNameInput = page.getByTestId("doctor-lastName-input");
    this.emailInput = page.getByTestId("doctor-email-input");
    this.passwordInput = page.getByTestId("doctor-password-input");
    this.departmentSelect = page.getByTestId("doctor-department-input");
    this.specializationInput = page.getByTestId("doctor-specialization-input");
    this.licenseInput = page.getByTestId("doctor-license-input");
    this.bioInput = page.getByTestId("doctor-bio-input");
    this.submitButton = page.getByTestId("doctor-form-submit");
    this.cancelButton = page.getByTestId("doctor-form-cancel");
    this.formError = page.getByTestId("doctor-form-error");
  }

  async goto() {
    await this.page.goto(this.path);
  }

  async isLoaded() {
    await this.page.waitForURL(this.path);
    await this.page.getByTestId("doctors-page").waitFor({ state: "visible" });
  }

  async waitForContent() {
    await this.loadingState.waitFor({ state: "hidden" });
  }

  editButton(id: string) {
    return this.page.getByTestId(`edit-doctor-${id}`);
  }

  deleteButton(id: string) {
    return this.page.getByTestId(`delete-doctor-${id}`);
  }

  doctorLink(id: string) {
    return this.page.getByTestId(`doctor-link-${id}`);
  }

  async fillAndSubmitForm(data: {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    departmentId: string;
    specialization: string;
    licenseNumber: string;
    bio?: string;
  }) {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.emailInput.fill(data.email);
    if (data.password) await this.passwordInput.fill(data.password);
    await this.departmentSelect.selectOption(data.departmentId);
    await this.specializationInput.fill(data.specialization);
    await this.licenseInput.fill(data.licenseNumber);
    if (data.bio) await this.bioInput.fill(data.bio);

    await this.submitButton.click();
  }
}
