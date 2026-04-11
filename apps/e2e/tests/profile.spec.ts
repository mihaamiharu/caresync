import { test, expect } from "./utils/test-base";
import { faker } from "@faker-js/faker";
import { config } from "./utils/config";

test.describe("User Profile Management", () => {
  let testUser: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
  };

  test.beforeEach(async ({ page, request, loginPage, cleanup }) => {
    testUser = {
      email: faker.internet.email().toLowerCase(),
      password: faker.internet.password({ length: 12 }) + "A!",
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: faker.phone.number(),
    };

    const response = await request.post(
      `${config.apiUrl}/api/v1/auth/register`,
      {
        data: {
          role: "patient",
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          email: testUser.email,
          password: testUser.password,
        },
      }
    );
    expect(response.ok()).toBeTruthy();
    const newUser = await response.json();
    cleanup.addUser(newUser.user?.id ?? newUser.id);

    // Login and navigate to profile
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    await page.waitForURL("/dashboard");
  });

  test("P-1: Navigate to profile page via sidebar", async ({
    page,
    profilePage,
  }) => {
    await page.getByTestId("nav-profile").click();
    await page.waitForURL("/profile");
    await profilePage.isLoaded();
    await expect(
      page.getByRole("heading", { name: /^profile$/i, level: 1 })
    ).toBeVisible();
  });

  test("P-2: Profile form is pre-filled with current user data", async ({
    profilePage,
  }) => {
    await profilePage.goto();
    await profilePage.isLoaded();

    await expect(profilePage.firstNameInput).toHaveValue(testUser.firstName);
    await expect(profilePage.lastNameInput).toHaveValue(testUser.lastName);
  });

  test("P-3: Email is shown as read-only (not in an input field)", async ({
    page,
    profilePage,
  }) => {
    await profilePage.goto();
    await profilePage.isLoaded();

    await expect(page.getByText(testUser.email)).toBeVisible();
    // Email must NOT be in an editable input
    const emailInput = page.locator(`input[value="${testUser.email}"]`);
    await expect(emailInput).toHaveCount(0);
  });

  test("P-4: Successful profile update shows success message", async ({
    profilePage,
  }) => {
    await profilePage.goto();
    await profilePage.isLoaded();

    const newFirstName = faker.person.firstName();
    const newLastName = faker.person.lastName();

    await profilePage.updateProfile(newFirstName, newLastName, testUser.phone);

    await expect(profilePage.successMessage).toBeVisible();
    await expect(profilePage.successMessage).toContainText(
      /updated successfully/i
    );
  });

  test("P-5: Updated name persists after navigating away and back", async ({
    page,
    profilePage,
  }) => {
    await profilePage.goto();
    await profilePage.isLoaded();

    const newFirstName = faker.person.firstName();
    const newLastName = faker.person.lastName();

    await profilePage.updateProfile(newFirstName, newLastName);
    await expect(profilePage.successMessage).toBeVisible();

    // Navigate away and return
    await page.goto("/dashboard");
    await page.goto("/profile");
    await profilePage.isLoaded();

    await expect(profilePage.firstNameInput).toHaveValue(newFirstName);
    await expect(profilePage.lastNameInput).toHaveValue(newLastName);
  });

  test("P-6: Validation error shown when first name is cleared", async ({
    profilePage,
  }) => {
    await profilePage.goto();
    await profilePage.isLoaded();

    await profilePage.firstNameInput.clear();
    await profilePage.saveButton.click();

    await expect(profilePage.firstNameError).toBeVisible();
    await expect(profilePage.firstNameError).toContainText(/required/i);
  });

  test("P-7: Validation error shown when last name is cleared", async ({
    profilePage,
  }) => {
    await profilePage.goto();
    await profilePage.isLoaded();

    await profilePage.lastNameInput.clear();
    await profilePage.saveButton.click();

    await expect(profilePage.lastNameError).toBeVisible();
    await expect(profilePage.lastNameError).toContainText(/required/i);
  });

  test("P-8: Save button is disabled while submitting", async ({
    page,
    profilePage,
  }) => {
    await profilePage.goto();
    await profilePage.isLoaded();

    // Gate the PUT /users/me request so we can assert the button state mid-flight
    let releaseRequest!: () => void;
    const requestGate = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });

    await page.route("**/api/v1/users/me", async (route) => {
      if (route.request().method() === "PUT") {
        await requestGate; // hold until we've checked the button
      }
      await route.continue();
    });

    // Fire the click without awaiting — the route intercept will pause the request
    profilePage.saveButton.click();

    // Button must be disabled while the request is in-flight
    await expect(profilePage.saveButton).toBeDisabled();

    // Release the intercepted request and confirm the button recovers
    releaseRequest();
    await expect(profilePage.saveButton).toBeEnabled();
  });

  test("P-9: Avatar initials are shown when no avatar is set", async ({
    profilePage,
  }) => {
    await profilePage.goto();
    await profilePage.isLoaded();

    await expect(profilePage.avatarInitials).toBeVisible();
    // Should show first letter of first and last name
    const initials = testUser.firstName[0] + testUser.lastName[0];
    await expect(profilePage.avatarInitials).toContainText(initials);
  });

  test("P-10: Avatar upload replaces initials with image", async ({
    profilePage,
  }) => {
    await profilePage.goto();
    await profilePage.isLoaded();

    // Create a minimal valid JPEG buffer (1x1 pixel)
    const minimalJpeg = Buffer.from(
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U" +
        "HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN" +
        "DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy" +
        "MjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAA" +
        "AAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/" +
        "aAAwDAQACEQMRAD8AJQAB/9k=",
      "base64"
    );

    await profilePage.uploadAvatar(
      minimalJpeg,
      "test-avatar.jpg",
      "image/jpeg"
    );

    // After upload the avatar image element should appear (replacing initials)
    await expect(profilePage.avatarImage).toBeVisible({ timeout: 10_000 });
    await expect(profilePage.avatarInitials).not.toBeVisible();
  });

  test("P-11: Phone number can be updated and is saved", async ({
    page,
    profilePage,
  }) => {
    await profilePage.goto();
    await profilePage.isLoaded();

    const newPhone = "+19995551234";
    await profilePage.updateProfile(
      testUser.firstName,
      testUser.lastName,
      newPhone
    );
    await expect(profilePage.successMessage).toBeVisible();

    // Reload to confirm persistence
    await page.reload();
    await profilePage.isLoaded();
    await expect(profilePage.phoneInput).toHaveValue(newPhone);
  });
});

test.describe("User Profile — API (admin operations)", () => {
  test("A-1: Admin can list all users via GET /users", async ({
    request,
    cleanup,
  }) => {
    test.skip(
      !config.adminEmail,
      "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars or run Task 24 seed"
    );

    const loginRes = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: { email: config.adminEmail, password: config.adminPassword },
    });
    const { accessToken } = await loginRes.json();

    const res = await request.get(`${config.apiUrl}/api/v1/users`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      data: expect.any(Array),
      total: expect.any(Number),
      page: expect.any(Number),
      limit: expect.any(Number),
      totalPages: expect.any(Number),
    });
  });

  test("A-2: Admin can deactivate a user via PATCH /users/:id/status", async ({
    request,
    cleanup,
  }) => {
    test.skip(
      !config.adminEmail,
      "Set ADMIN_EMAIL + ADMIN_PASSWORD env vars or run Task 24 seed"
    );

    // Register a fresh patient to deactivate
    const regRes = await request.post(`${config.apiUrl}/api/v1/auth/register`, {
      data: {
        role: "patient",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email().toLowerCase(),
        password: faker.internet.password({ length: 12 }) + "A!",
      },
    });
    const { user } = await regRes.json();
    // Track for cleanup if the patch fails for some reason
    cleanup.addUser(user.id);

    const loginRes = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: { email: config.adminEmail, password: config.adminPassword },
    });
    const { accessToken } = await loginRes.json();

    const res = await request.patch(
      `${config.apiUrl}/api/v1/users/${user.id}/status`,
      {
        data: { isActive: false },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.isActive).toBe(false);
  });
});
