import { test as base, type APIRequestContext } from "@playwright/test";
import { LoginPage } from "../poms/LoginPage";
import { DoctorsPage } from "../poms/DoctorsPage";
import { DepartmentsPage } from "../poms/DepartmentsPage";
import { ProfilePage } from "../poms/ProfilePage";
import { RegisterPage } from "../poms/RegisterPage";
import { DashboardPage } from "../poms/DashboardPage";
import { DoctorProfilePage } from "../poms/DoctorProfilePage";
import { config } from "./config";

export class CleanupHelper {
  private createdDoctorIds: string[] = [];
  private createdDepartmentIds: string[] = [];
  private createdUserIds: string[] = [];

  addDoctor(id: string) {
    this.createdDoctorIds.push(id);
  }

  addDepartment(id: string) {
    this.createdDepartmentIds.push(id);
  }

  addUser(id: string) {
    this.createdUserIds.push(id);
  }

  async cleanup(request: APIRequestContext) {
    const loginRes = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: { email: config.adminEmail, password: config.adminPassword },
    });

    if (!loginRes.ok()) {
      return;
    }

    const { accessToken } = await loginRes.json();
    const headers = { Authorization: `Bearer ${accessToken}` };

    for (const id of this.createdDoctorIds) {
      await request.delete(`${config.apiUrl}/api/v1/doctors/${id}`, {
        headers,
      });
    }

    for (const id of this.createdDepartmentIds) {
      await request.delete(`${config.apiUrl}/api/v1/departments/${id}`, {
        headers,
      });
    }

    for (const id of this.createdUserIds) {
      await request.patch(`${config.apiUrl}/api/v1/users/${id}/status`, {
        data: { isActive: false },
        headers,
      });
    }

    this.createdDoctorIds = [];
    this.createdDepartmentIds = [];
    this.createdUserIds = [];
  }
}

export const test = base.extend<{
  cleanup: CleanupHelper;
  loginPage: LoginPage;
  doctorsPage: DoctorsPage;
  departmentsPage: DepartmentsPage;
  profilePage: ProfilePage;
  registerPage: RegisterPage;
  dashboardPage: DashboardPage;
  doctorProfilePage: DoctorProfilePage;
}>({
  cleanup: async ({ request }, use) => {
    const helper = new CleanupHelper();
    await use(helper);
    await helper.cleanup(request);
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  doctorsPage: async ({ page }, use) => {
    await use(new DoctorsPage(page));
  },
  departmentsPage: async ({ page }, use) => {
    await use(new DepartmentsPage(page));
  },
  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  doctorProfilePage: async ({ page }, use) => {
    await use(new DoctorProfilePage(page));
  },
});

export { expect } from "@playwright/test";
