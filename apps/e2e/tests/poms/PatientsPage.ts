import { type Locator, type Page } from "@playwright/test";

export class PatientsPage {
  readonly page: Page;
  readonly pageWrapper: Locator;
  readonly searchInput: Locator;
  readonly genderFilter: Locator;
  readonly bloodTypeFilter: Locator;
  readonly emptyState: Locator;
  readonly paginationInfo: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageWrapper = page.getByTestId("patients-page");
    this.searchInput = page.getByTestId("search-input");
    this.genderFilter = page.getByTestId("gender-filter");
    this.bloodTypeFilter = page.getByTestId("blood-type-filter");
    this.emptyState = page.getByTestId("patients-empty");
    this.paginationInfo = page.getByTestId("pagination-info");
  }

  async goto() {
    await this.page.goto("/patients");
  }

  async isLoaded() {
    await this.pageWrapper.waitFor({ state: "visible" });
  }

  patientRow(id: string) {
    return this.page.getByTestId(`patient-row-${id}`);
  }
}
