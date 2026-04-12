import { type Locator, type Page } from "@playwright/test";

export class ProfilePage {
  readonly page: Page;
  readonly pageWrapper: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly phoneInput: Locator;
  readonly saveButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly avatarUploadInput: Locator;
  readonly avatarUploadButton: Locator;
  readonly avatarInitials: Locator;
  readonly avatarImage: Locator;
  readonly firstNameError: Locator;
  readonly lastNameError: Locator;

  // Medical information section (patient role only)
  readonly medicalInfoSection: Locator;
  readonly dobInput: Locator;
  readonly genderSelect: Locator;
  readonly bloodTypeSelect: Locator;
  readonly allergiesInput: Locator;
  readonly emergencyContactNameInput: Locator;
  readonly emergencyContactPhoneInput: Locator;
  readonly saveMedicalButton: Locator;
  readonly medicalSuccessMessage: Locator;
  readonly medicalErrorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageWrapper = page.getByTestId("profile-page");
    this.firstNameInput = page.getByTestId("first-name-input");
    this.lastNameInput = page.getByTestId("last-name-input");
    this.phoneInput = page.getByTestId("phone-input");
    this.saveButton = page.getByTestId("save-profile-button");
    this.successMessage = page.getByTestId("profile-success");
    this.errorMessage = page.getByTestId("profile-error");
    this.avatarUploadInput = page.getByTestId("avatar-upload-input");
    this.avatarUploadButton = page.getByTestId("avatar-upload-button");
    this.avatarInitials = page.getByTestId("avatar-initials");
    this.avatarImage = page.getByTestId("avatar-image");
    this.firstNameError = page.getByTestId("first-name-error");
    this.lastNameError = page.getByTestId("last-name-error");

    this.medicalInfoSection = page.getByTestId("medical-info-section");
    this.dobInput = page.getByTestId("dob-input");
    this.genderSelect = page.getByTestId("gender-select");
    this.bloodTypeSelect = page.getByTestId("blood-type-select");
    this.allergiesInput = page.getByTestId("allergies-input");
    this.emergencyContactNameInput = page.getByTestId(
      "emergency-contact-name-input"
    );
    this.emergencyContactPhoneInput = page.getByTestId(
      "emergency-contact-phone-input"
    );
    this.saveMedicalButton = page.getByTestId("save-medical-button");
    this.medicalSuccessMessage = page.getByTestId("medical-success");
    this.medicalErrorMessage = page.getByTestId("medical-error");
  }

  async goto() {
    await this.page.goto("/profile");
  }

  async isLoaded() {
    await this.pageWrapper.waitFor({ state: "visible" });
  }

  async updateProfile(firstName: string, lastName: string, phone?: string) {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    if (phone !== undefined) {
      await this.phoneInput.fill(phone);
    }
    await this.saveButton.click();
  }

  async uploadAvatar(
    buffer: Buffer,
    filename = "avatar.jpg",
    mimeType = "image/jpeg"
  ) {
    await this.avatarUploadInput.setInputFiles({
      name: filename,
      mimeType,
      buffer,
    });
  }
}
