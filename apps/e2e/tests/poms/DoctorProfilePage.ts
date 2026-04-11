import { type Locator, type Page } from "@playwright/test";

export class DoctorProfilePage {
  readonly page: Page;

  // Profile
  readonly profilePage: Locator;

  // Schedule form (owning doctor only)
  readonly scheduleForm: Locator;
  readonly slotDurationInput: Locator;
  readonly scheduleSubmit: Locator;
  readonly scheduleSuccess: Locator;
  readonly scheduleError: Locator;
  readonly scheduleLoadError: Locator;

  // Slot viewer (all users)
  readonly slotViewer: Locator;
  readonly slotDatePicker: Locator;
  readonly slotLoading: Locator;
  readonly slotEmpty: Locator;
  readonly slotFetchError: Locator;

  constructor(page: Page) {
    this.page = page;

    this.profilePage = page.getByTestId("doctor-profile-page");

    this.scheduleForm = page.getByTestId("schedule-form");
    this.slotDurationInput = page.getByTestId("slot-duration-input");
    this.scheduleSubmit = page.getByTestId("schedule-submit");
    this.scheduleSuccess = page.getByTestId("schedule-success");
    this.scheduleError = page.getByTestId("schedule-error");
    this.scheduleLoadError = page.getByTestId("schedule-load-error");

    this.slotViewer = page.getByTestId("slot-viewer");
    this.slotDatePicker = page.getByTestId("slot-date-picker");
    this.slotLoading = page.getByTestId("slot-loading");
    this.slotEmpty = page.getByTestId("slot-empty");
    this.slotFetchError = page.getByTestId("slot-fetch-error");
  }

  dayToggle(day: string): Locator {
    return this.page.getByTestId(`day-toggle-${day}`);
  }

  startTimeInput(day: string): Locator {
    return this.page.getByTestId(`start-time-${day}`);
  }

  endTimeInput(day: string): Locator {
    return this.page.getByTestId(`end-time-${day}`);
  }

  /** Buttons rendered for each available slot (testid = "slot-<ISO>") */
  slotButtons(): Locator {
    // ISO slot testids start with "slot-20" (e.g. "slot-2026-05-04T02:00:00.000Z")
    return this.page.locator('[data-testid^="slot-2"]');
  }

  async goto(doctorId: string) {
    await this.page.goto(`/doctors/${doctorId}`);
    await this.profilePage.waitFor({ state: "visible" });
  }
}
