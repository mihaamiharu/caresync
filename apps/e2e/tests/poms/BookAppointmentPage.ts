import { type Locator, type Page } from "@playwright/test";

export class BookAppointmentPage {
  readonly page: Page;
  readonly pageWrapper: Locator;

  // Step 3
  readonly datePicker: Locator;
  readonly noSlotsMessage: Locator;
  readonly slotGrid: Locator;
  readonly step3NextButton: Locator;

  // Step 4
  readonly appointmentTypeSelect: Locator;
  readonly reasonInput: Locator;
  readonly notesInput: Locator;
  readonly confirmButton: Locator;
  readonly submitError: Locator;

  // Shared / navigation
  readonly backButton: Locator;

  // Step 5 — success
  readonly viewAppointmentsButton: Locator;
  readonly bookAnotherButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageWrapper = page.getByTestId("book-appointment-page");

    this.datePicker = page.getByTestId("date-picker");
    this.noSlotsMessage = page.getByTestId("no-slots-message");
    this.slotGrid = page.getByTestId("slot-grid");
    this.step3NextButton = page.getByTestId("step3-next");

    this.appointmentTypeSelect = page.getByTestId("appointment-type");
    this.reasonInput = page.getByTestId("reason-input");
    this.notesInput = page.getByTestId("notes-input");
    this.confirmButton = page.getByTestId("confirm-button");
    this.submitError = page.getByTestId("submit-error");

    this.backButton = page.getByTestId("back-button");
    this.viewAppointmentsButton = page.getByTestId("view-appointments-button");
    this.bookAnotherButton = page.getByTestId("book-another-button");
  }

  stepIndicator(step: number): Locator {
    return this.page.getByTestId(`step-indicator-${step}`);
  }

  departmentCard(deptId: string): Locator {
    return this.page.getByTestId(`department-card-${deptId}`);
  }

  doctorCard(doctorId: string): Locator {
    return this.page.getByTestId(`doctor-card-${doctorId}`);
  }

  /** First available slot button (testid starts with "slot-20xx") */
  firstSlot(): Locator {
    return this.page.locator('[data-testid^="slot-2"]').first();
  }

  async goto() {
    await this.page.goto("/appointments/book");
    await this.pageWrapper.waitFor({ state: "visible" });
  }

  async isLoaded() {
    await this.pageWrapper.waitFor({ state: "visible" });
  }
}
