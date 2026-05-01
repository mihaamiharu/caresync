export type TestCase = {
  id: string;
  title: string;
  category: string;
  gherkin: string;
  status: 'Automated' | 'Manual' | 'Failing';
  priority: 'P0' | 'P1' | 'P2';
};

export const TEST_CASES: TestCase[] = [
  {
    "id": "L-1",
    "title": "Successful login",
    "category": "Authentication",
    "gherkin": "Given I am on the login page\nWhen I enter my correct email and password\nAnd I click the login button\nThen I am redirected to the dashboard",
    "status": "Automated",
    "priority": "P1"
  },
  {
    "id": "L-2",
    "title": "Wrong password",
    "category": "Authentication",
    "gherkin": "Given I am on the login page\nWhen I enter a valid email but wrong password\nAnd I click the login button\nThen I see an error message \"Invalid email or password\"",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "L-3",
    "title": "Non-existent email",
    "category": "Authentication",
    "gherkin": "Given I am on the login page\nWhen I enter an email that does not exist in the system\nAnd I enter any password\nAnd I click the login button\nThen I see an error message \"Invalid email or password\"",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "L-4",
    "title": "Empty form submit",
    "category": "Authentication",
    "gherkin": "Given I am on the login page\nWhen I click the login button without entering any credentials\nThen I see validation error messages for the email field\nAnd I see validation error messages for the password field",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "L-5",
    "title": "Already logged in visits /login",
    "category": "Authentication",
    "gherkin": "Given I am logged in as a patient\nWhen I navigate directly to /login\nThen I am immediately redirected to /dashboard",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "R-1",
    "title": "Successful registration",
    "category": "Authentication",
    "gherkin": "Given I am on the register page\nWhen I fill in first name, last name, a unique email, and a strong password\nAnd I click the register button\nThen I am redirected to the dashboard",
    "status": "Automated",
    "priority": "P1"
  },
  {
    "id": "R-2",
    "title": "Duplicate email",
    "category": "Authentication",
    "gherkin": "Given an account with my email already exists\nAnd I am on the register page\nWhen I register with the same email again\nThen I see an error message \"already registered\"\nAnd I remain on the register page",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "R-3",
    "title": "Invalid email format",
    "category": "Authentication",
    "gherkin": "Given I am on the register page\nWhen I enter an invalid email format (e.g. \"notanemail\")\nAnd I enter a valid password\nAnd I click the register button\nThen I see a validation error \"Invalid email\"",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "R-4",
    "title": "Password too short",
    "category": "Authentication",
    "gherkin": "Given I am on the register page\nWhen I enter a password shorter than 6 characters\nAnd I click the register button\nThen I see a validation error \"at least 6 characters\"",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "R-5",
    "title": "Empty form submit",
    "category": "Authentication",
    "gherkin": "Given I am on the register page\nWhen I click the register button without filling any fields\nThen I see multiple validation error messages",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "R-6",
    "title": "Already logged in visits /register",
    "category": "Authentication",
    "gherkin": "Given I am logged in\nWhen I navigate directly to /register\nThen I am immediately redirected to /dashboard",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "S-1",
    "title": "Logout",
    "category": "Authentication",
    "gherkin": "Given I am logged in\nWhen I click the logout button\nThen I am redirected to /login\nAnd navigating to /dashboard redirects me back to /login",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "S-2",
    "title": "Access protected route unauthenticated",
    "category": "Authentication",
    "gherkin": "Given I am not logged in\nWhen I navigate directly to /dashboard\nThen I am redirected to /login",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "S-3",
    "title": "Session persists on page refresh",
    "category": "Authentication",
    "gherkin": "Given I am logged in\nWhen I refresh the page\nThen I remain on /dashboard\nAnd my session is still valid",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "S-4",
    "title": "Access token auto-refresh",
    "category": "Authentication",
    "gherkin": "Given I am logged in\nAnd my access token has expired\nWhen I refresh the page\nThen I remain logged in because the refresh token is used to obtain a new access token",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "S-5",
    "title": "Expired refresh token",
    "category": "Authentication",
    "gherkin": "Given I am logged in\nAnd my refresh token has been cleared\nWhen I reload the page\nThen I am redirected to /login",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "N-1",
    "title": "Root redirect authenticated",
    "category": "Navigation",
    "gherkin": "Given I am logged in\nWhen I navigate to the root URL /\nThen I am redirected to /dashboard",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "N-2",
    "title": "Root redirect unauthenticated",
    "category": "Navigation",
    "gherkin": "Given I am not logged in\nWhen I navigate to the root URL /\nThen I am redirected to /login",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "N-3",
    "title": "Sidebar renders after login",
    "category": "Navigation",
    "gherkin": "Given I am logged in\nWhen the dashboard loads\nThen a navigation or sidebar element is visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "BA-1",
    "title": "Patient sees Book Appointment link in sidebar and dashboard CTA",
    "category": "Dashboard",
    "gherkin": "Given I am logged in as a patient\nThen the \"Book Appointment\" sidebar link is visible\nAnd the Book Appointment CTA card on the dashboard is visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "BA-2",
    "title": "Non-patient is redirected away from /appointments/book",
    "category": "Dashboard",
    "gherkin": "Given I am logged in as an admin\nWhen I navigate to /appointments/book\nThen I am redirected to /dashboard\nAnd the book appointment wizard is not visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "D-1",
    "title": "Navigate to /departments via URL",
    "category": "Departments",
    "gherkin": "Given I am logged in as a patient\nWhen I navigate to /departments\nThen the page heading \"Departments\" is visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "D-2",
    "title": "Page shows loading indicator then resolves",
    "category": "Departments",
    "gherkin": "Given I am logged in as a patient\nWhen I navigate to /departments\nThen a loading indicator is briefly shown\nAnd the department list or empty state eventually appears",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "D-3",
    "title": "Search input accepts text",
    "category": "Departments",
    "gherkin": "Given I am on the departments list\nWhen I type in the search input (e.g. \"cardio\")\nThen the search input retains the value I typed",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "D-4",
    "title": "Non-admin does NOT see Create Department button",
    "category": "Departments",
    "gherkin": "Given I am logged in as a patient\nWhen I am on the departments list\nThen the \"Create Department\" button is not visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "D-5",
    "title": "Unauthenticated user is redirected to /login",
    "category": "Departments",
    "gherkin": "Given I am not logged in\nWhen I navigate to /departments\nThen I am redirected to /login",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "D-6",
    "title": "Admin sees the Create Department button",
    "category": "Departments",
    "gherkin": "Given I am logged in as an admin\nWhen I navigate to /departments\nThen the \"Create Department\" button is visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "D-7",
    "title": "Admin can open the Create Department modal",
    "category": "Departments",
    "gherkin": "Given I am logged in as an admin\nAnd I am on the departments page\nWhen I click the \"Create Department\" button\nThen the create department modal is visible\nAnd the name input field is visible\nAnd the submit button is visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "D-8",
    "title": "Create Department modal validates \u2014 name is required",
    "category": "Departments",
    "gherkin": "Given I am logged in as an admin\nAnd the Create Department modal is open\nWhen I click the submit button without entering a name\nThen I see a validation error \"required\"",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "D-9",
    "title": "Admin can create a new department",
    "category": "Departments",
    "gherkin": "Given I am logged in as an admin\nAnd the Create Department modal is open\nWhen I enter a unique department name and description\nAnd I click the submit button\nThen the modal closes\nAnd the new department appears in the list",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "D-10",
    "title": "Admin can edit an existing department",
    "category": "Departments",
    "gherkin": "Given I am logged in as an admin\nAnd I search for a department I own\nWhen I click the edit button for that department\nThen the edit modal opens with the name pre-filled\nWhen I update the name and submit\nThen the modal closes\nAnd the updated name appears in the list",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "D-11",
    "title": "Admin can delete a department",
    "category": "Departments",
    "gherkin": "Given I am logged in as an admin\nAnd I search for a department I own\nWhen I click the delete button for that department\nThen the department card disappears from the list",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "D-12",
    "title": "Cancel button closes the form without saving",
    "category": "Departments",
    "gherkin": "Given I am logged in as an admin\nAnd the Create Department modal is open\nWhen I type a name and click the Cancel button\nThen the modal closes\nAnd the typed name does not appear in the list",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "D-API-1",
    "title": "Admin API \u2014 POST /departments returns 201",
    "category": "Departments",
    "gherkin": "Given I am authenticated as an admin\nWhen I send POST /api/v1/departments with a valid name and description\nThen the response status is 201\nAnd the response body contains the created department with isActive: true",
    "status": "Automated",
    "priority": "P1"
  },
  {
    "id": "D-API-2",
    "title": "Non-admin API \u2014 POST /departments returns 403",
    "category": "Departments",
    "gherkin": "Given I am authenticated as a patient\nWhen I send POST /api/v1/departments\nThen the response status is 403",
    "status": "Automated",
    "priority": "P1"
  },
  {
    "id": "D-API-3",
    "title": "Unauthenticated GET /departments returns 401",
    "category": "Departments",
    "gherkin": "Given I am not authenticated\nWhen I send GET /api/v1/departments\nThen the response status is 401",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "D-API-4",
    "title": "Authenticated GET /departments returns paginated list",
    "category": "Departments",
    "gherkin": "Given I am authenticated\nWhen I send GET /api/v1/departments\nThen the response status is 200\nAnd the response body contains data (array), total, page, limit, and totalPages",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "DOC-1",
    "title": "Navigate to /doctors via URL",
    "category": "Doctors",
    "gherkin": "Given I am logged in\nWhen I navigate to /doctors\nThen the page heading \"Doctors\" is visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "DOC-2",
    "title": "Non-admin does NOT see Create Doctor button",
    "category": "Doctors",
    "gherkin": "Given I am logged in as a patient\nWhen I am on the doctors list\nThen the \"Create Doctor\" button is not visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "DOC-3",
    "title": "Admin can create a new doctor",
    "category": "Doctors",
    "gherkin": "Given I am logged in as an admin\nAnd a department exists in the system\nWhen I click \"Create Doctor\"\nAnd I fill in the doctor's details (name, email, department, specialization, license number)\nAnd I submit the form\nThen the modal closes\nAnd the doctor appears in the list",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "SCH-1",
    "title": "Patient sees slot viewer but NOT schedule form on doctor profile",
    "category": "Doctor Schedule",
    "gherkin": "Given a doctor exists with a public schedule\nAnd I am logged in as a patient\nWhen I view the doctor profile\nThen the slot viewer is visible\nBut the schedule form is not visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "SCH-2",
    "title": "Doctor can save their weekly schedule via UI",
    "category": "Doctor Schedule",
    "gherkin": "Given I am logged in as a doctor viewing my own profile\nWhen I toggle Monday on in the schedule form\nAnd I set start time to \"09:00\" and end time to \"17:00\"\nAnd I submit the form\nThen I see a success message\nAnd my schedule is saved",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "SCH-3",
    "title": "Available slots appear for patient after doctor sets schedule",
    "category": "Doctor Schedule",
    "gherkin": "Given a doctor has set a Monday schedule\nAnd I am logged in as a patient\nWhen I view the doctor profile\nAnd I select the next Monday date in the slot date picker\nThen at least one available time slot button is visible\nAnd the empty state is not visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "BA-3",
    "title": "Back button from step 2 returns to step 1",
    "category": "Book Appointment",
    "gherkin": "Given I am on step 2 (select doctor) of the booking wizard\nWhen I click the Back button\nThen I am returned to step 1 (select department)\nAnd the department cards are visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "BA-4",
    "title": "Empty state shown when doctor has no schedule on selected day",
    "category": "Book Appointment",
    "gherkin": "Given I have selected a doctor with no schedule set\nWhen I am on step 3 (date & time) of the wizard\nAnd I select a date on which the doctor has no availability\nThen the \"No slots available\" message is visible\nAnd the time slot grid is not visible\nAnd the Continue button is disabled",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "BA-5",
    "title": "Patient completes full 5-step booking wizard and sees success screen",
    "category": "Book Appointment",
    "gherkin": "Given a department and doctor with an active Monday schedule exist\nAnd I am logged in as a patient\nWhen I go to /appointments/book\nAnd I select the department on step 1\nAnd I select the doctor on step 2\nAnd I select the next Monday and pick the first available slot on step 3\nAnd I fill in \"consultation\" as the appointment type and a reason on step 4\nAnd I click Confirm\nThen I am on step 5 (success screen)\nAnd I see a \"View Appointments\" button\nAnd I see a \"Book Another\" button",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "BA-6",
    "title": "'Book Another' resets the wizard to step 1",
    "category": "Book Appointment",
    "gherkin": "Given I am on the booking success screen\nWhen I click \"Book Another\"\nThen the wizard resets to step 1\nAnd the previously selected department is still visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "BA-A1",
    "title": "POST /appointments creates appointment with status pending",
    "category": "Book Appointment",
    "gherkin": "Given a doctor with a Monday schedule exists\nAnd I am authenticated as a patient\nWhen I fetch available slots for that doctor on the next Monday\nAnd I book an appointment with one of those slots\nThen the response status is 201\nAnd the appointment status is \"pending\"",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "BA-A2",
    "title": "POST /appointments returns 409 when same slot booked twice",
    "category": "Book Appointment",
    "gherkin": "Given a doctor with a Monday schedule exists\nAnd two patients have both obtained the same available slot\nWhen the first patient books that slot successfully\nAnd the second patient tries to book the same slot\nThen the second response status is 409\nAnd the error message mentions \"slot was just booked\"",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "BA-A3",
    "title": "POST /appointments returns 403 for admin role",
    "category": "Book Appointment",
    "gherkin": "Given I am authenticated as an admin\nWhen I try to POST /api/v1/appointments\nThen the response status is 403",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "BA-A4",
    "title": "POST /appointments returns 400 for a past date",
    "category": "Book Appointment",
    "gherkin": "Given I am authenticated as a patient\nWhen I try to book an appointment with a date in the year 2000\nThen the response status is 400",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "AM-1",
    "title": "Patient sees their appointments on /appointments list",
    "category": "Appointment Management",
    "gherkin": "Given I am logged in as a patient\nAnd an appointment exists for me\nWhen I navigate to /appointments\nThen my appointment row is visible\nAnd the status badge shows \"Pending\"",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "AM-2",
    "title": "Status filter limits visible appointments",
    "category": "Appointment Management",
    "gherkin": "Given I am logged in as a patient\nAnd I have a pending appointment\nWhen I filter by \"Confirmed\" status\nThen my pending appointment is not visible\nWhen I switch the filter back to \"Pending\"\nThen my pending appointment is visible again",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "AM-3",
    "title": "Doctor confirms appointment and status badge updates",
    "category": "Appointment Management",
    "gherkin": "Given a patient has booked an appointment with me (as a doctor)\nAnd the appointment is in \"pending\" status\nWhen I view the appointment detail\nThen the status badge shows \"Pending\"\nWhen I click the \"Confirm\" action button\nThen the status badge updates to \"Confirmed\"\nAnd the \"Confirm\" button is replaced by an \"In Progress\" button",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "AM-4",
    "title": "Patient cancels appointment with confirmation dialog",
    "category": "Appointment Management",
    "gherkin": "Given I am logged in as a patient\nAnd I have a pending appointment\nWhen I view the appointment detail\nAnd I accept the confirmation dialog\nAnd I click \"Cancel Appointment\"\nThen the status badge updates to \"Cancelled\"\nAnd no action buttons are visible (terminal state)",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "AM-5",
    "title": "Doctor completes appointment and triggers invoice and notification generation",
    "category": "Appointment Management",
    "gherkin": "Given a patient has booked an appointment with me\nWhen I transition the appointment through: confirmed \u2192 in-progress \u2192 completed\nThen the patient receives a notification that the appointment status was updated to completed\nAnd the patient can see the generated invoice on the /invoices page",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "AM-A1",
    "title": "GET /appointments returns 200 with paginated list for patient",
    "category": "Appointment Management",
    "gherkin": "Given I am authenticated as a patient with at least one appointment\nWhen I send GET /api/v1/appointments\nThen the response status is 200\nAnd the body contains data, total, page, and totalPages\nAnd each item includes patientName, doctorName, doctorSpecialization, and status",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "AM-A2",
    "title": "PATCH /appointments/:id/status \u2014 doctor confirms (pending \u2192 confirmed)",
    "category": "Appointment Management",
    "gherkin": "Given a doctor is authenticated with a pending appointment\nWhen the doctor sends PATCH /api/v1/appointments/:id/status with status \"confirmed\"\nThen the response status is 200\nAnd the returned appointment status is \"confirmed\"\nAnd the patient and doctor objects are included in the response",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "AM-A3",
    "title": "PATCH returns 422 for invalid transition (pending \u2192 completed)",
    "category": "Appointment Management",
    "gherkin": "Given a doctor is authenticated with a pending appointment\nWhen the doctor tries to PATCH the status directly to \"completed\"\nThen the response status is 422\nAnd the error message mentions \"invalid transition\"",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "AM-A4",
    "title": "PATCH returns 403 when patient tries to confirm",
    "category": "Appointment Management",
    "gherkin": "Given I am authenticated as a patient\nAnd I have a pending appointment\nWhen I try to PATCH the appointment status to \"confirmed\"\nThen the response status is 403",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "AM-A5",
    "title": "GET /appointments/:id returns full nested patient and doctor detail",
    "category": "Appointment Management",
    "gherkin": "Given I am authenticated as the patient who booked an appointment\nWhen I send GET /api/v1/appointments/:id\nThen the response status is 200\nAnd the response includes the full patient object (without passwordHash)\nAnd the response includes the full doctor object (without passwordHash)",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "MR-1",
    "title": "Doctor creates record on completed appointment, patient sees it in history",
    "category": "Medical Records",
    "gherkin": "Given a completed appointment exists between a doctor and patient\nAnd I am logged in as the doctor\nWhen I view the appointment detail\nThen the medical record section and form are visible\nWhen I fill in diagnosis, symptoms, and notes\nAnd I submit the form\nThen the form is replaced by a read-only view showing the diagnosis\nAnd the patient can see the record on their /medical-records page",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "MR-A1",
    "title": "POST /medical-records creates record and GET returns it",
    "category": "Medical Records",
    "gherkin": "Given a completed appointment exists\nAnd I am authenticated as the doctor for that appointment\nWhen I POST /api/v1/medical-records with appointmentId, diagnosis, symptoms, and notes\nThen the response status is 201\nAnd the diagnosis matches what I submitted\nWhen the patient sends GET /api/v1/medical-records\nThen the created record appears in the list\nWhen the patient sends GET /api/v1/medical-records/:id\nThen the response includes the diagnosis, doctor first name, and appointment date",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "MR-A2",
    "title": "POST returns 409 when record already exists for appointment",
    "category": "Medical Records",
    "gherkin": "Given a medical record already exists for a completed appointment\nAnd I am authenticated as the doctor\nWhen I POST /api/v1/medical-records for the same appointment\nThen the response status is 409",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "MR-ATT-1",
    "title": "Doctor uploads PDF, patient downloads it; unsupported type shows error",
    "category": "Medical Records \u2014 Attachments",
    "gherkin": "Given a completed appointment and medical record exist\nAnd I am logged in as the doctor\nWhen I navigate to the medical record detail page\nAnd I upload a PDF file via the upload zone\nThen the PDF filename appears in the attachment list\nAnd a \"Download\" link is visible\nWhen I try to upload an unsupported file type (e.g. .txt)\nThen an error message is visible\nWhen I log in as the patient\nAnd I navigate to the same medical record detail page\nThen the PDF filename is visible\nAnd I can download the file by clicking the Download link",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "PAT-1",
    "title": "Admin can navigate to /patients via sidebar",
    "category": "Patients",
    "gherkin": "Given I am logged in as an admin\nWhen I click the \"Patients\" sidebar link\nThen I am on the /patients page\nAnd the page heading \"Patients\" is visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "PAT-2",
    "title": "/patients page renders search and filter controls",
    "category": "Patients",
    "gherkin": "Given I am on the /patients page as admin\nThen the search input is visible\nAnd the gender filter dropdown is visible\nAnd the blood type filter dropdown is visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "PAT-3",
    "title": "Patients list shows registered patients",
    "category": "Patients",
    "gherkin": "Given at least one patient is registered in the system\nAnd I am on the /patients page as admin\nThen the empty state is not visible\nAnd pagination info is visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "PAT-4",
    "title": "Search filters the list by patient name",
    "category": "Patients",
    "gherkin": "Given a patient with a unique first name exists\nAnd I am on the /patients page as admin\nWhen I type the unique first name in the search input\nThen the patient row appears in the list",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "PAT-5",
    "title": "Gender filter dropdown contains all gender options",
    "category": "Patients",
    "gherkin": "Given I am on the /patients page as admin\nWhen I inspect the gender filter dropdown options\nThen the options include \"Male\", \"Female\", and \"Other\"",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "PAT-6",
    "title": "Blood type filter dropdown contains all blood type options",
    "category": "Patients",
    "gherkin": "Given I am on the /patients page as admin\nWhen I inspect the blood type filter dropdown options\nThen the options include all blood types: A+, A-, B+, B-, AB+, AB-, O+, O-",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "PAT-7",
    "title": "Patients sidebar link is NOT visible for patient role",
    "category": "Patients",
    "gherkin": "Given I am logged in as a patient\nThen the \"Patients\" sidebar link is not visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "PAT-8",
    "title": "GET /patients returns 403 for patient role",
    "category": "Patients",
    "gherkin": "Given I am authenticated as a patient\nWhen I send GET /api/v1/patients\nThen the response status is 403",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "PAT-A1",
    "title": "GET /patients returns paginated list for admin",
    "category": "Patients",
    "gherkin": "Given I am authenticated as an admin\nWhen I send GET /api/v1/patients\nThen the response status is 200\nAnd the body contains data (array), total, page (1), limit (20), and totalPages",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "PAT-A2",
    "title": "GET /patients supports gender filter",
    "category": "Patients",
    "gherkin": "Given I am authenticated as an admin\nWhen I send GET /api/v1/patients?gender=male\nThen the response status is 200\nAnd all returned patients have gender \"male\"",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "PAT-A3",
    "title": "GET /patients rejects invalid gender filter with 400",
    "category": "Patients",
    "gherkin": "Given I am authenticated as an admin\nWhen I send GET /api/v1/patients?gender=unknown\nThen the response status is 400",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "P-1",
    "title": "Navigate to profile page via sidebar",
    "category": "User Profile",
    "gherkin": "Given I am logged in\nWhen I click the \"Profile\" sidebar link\nThen I am on the /profile page\nAnd the page heading \"Profile\" is visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "P-2",
    "title": "Profile form is pre-filled with current user data",
    "category": "User Profile",
    "gherkin": "Given I am on the profile page\nThen the first name and last name inputs are pre-filled with my registered data",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "P-3",
    "title": "Email is shown as read-only (not in an input field)",
    "category": "User Profile",
    "gherkin": "Given I am on the profile page\nThen my email is displayed as read-only text\nAnd there is no editable input with my email value",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "P-4",
    "title": "Successful profile update shows success message",
    "category": "User Profile",
    "gherkin": "Given I am on the profile page\nWhen I update my first and last name\nAnd I click the Save button\nThen a success message \"updated successfully\" is visible",
    "status": "Automated",
    "priority": "P1"
  },
  {
    "id": "P-5",
    "title": "Updated name persists after navigating away and back",
    "category": "User Profile",
    "gherkin": "Given I am on the profile page\nWhen I update my first and last name\nAnd I navigate to /dashboard\nAnd I return to /profile\nThen the name inputs show the new values I entered",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "P-6",
    "title": "Validation error shown when first name is cleared",
    "category": "User Profile",
    "gherkin": "Given I am on the profile page\nWhen I clear the first name field\nAnd I click Save\nThen a validation error \"required\" is visible for the first name field",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "P-7",
    "title": "Validation error shown when last name is cleared",
    "category": "User Profile",
    "gherkin": "Given I am on the profile page\nWhen I clear the last name field\nAnd I click Save\nThen a validation error \"required\" is visible for the last name field",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "P-8",
    "title": "Save button is disabled while submitting",
    "category": "User Profile",
    "gherkin": "Given I am on the profile page\nWhen I click the Save button\nThen the button is disabled while the request is in-flight\nAnd the button becomes enabled again once the request completes",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "P-9",
    "title": "Avatar initials are shown when no avatar is set",
    "category": "User Profile",
    "gherkin": "Given I am on the profile page\nAnd no avatar image is uploaded\nThen my avatar initials are visible\nAnd they show the first letter of my first and last name",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "P-10",
    "title": "Avatar upload replaces initials with image",
    "category": "User Profile",
    "gherkin": "Given I am on the profile page\nAnd my avatar shows initials\nWhen I upload a valid JPEG image as my avatar\nThen the avatar image is visible (replacing the initials)\nAnd the initials are no longer visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "P-11",
    "title": "Phone number can be updated and is saved",
    "category": "User Profile",
    "gherkin": "Given I am on the profile page\nWhen I update my phone number\nAnd I click Save\nThen a success message is visible\nWhen I reload the page\nThen the phone input shows the new number I entered",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "PP-1",
    "title": "Medical Information section is visible for patients",
    "category": "Patient Medical Profile",
    "gherkin": "Given I am logged in as a patient\nAnd I am on the profile page\nThen the Medical Information section is visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "PP-2",
    "title": "All medical fields are present",
    "category": "Patient Medical Profile",
    "gherkin": "Given I am on the profile page\nThen the following fields are visible:\n- Date of Birth\n- Gender\n- Blood Type\n- Allergies\n- Emergency Contact Name\n- Emergency Contact Phone\nAnd a \"Save Medical Info\" button is visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "PP-3",
    "title": "Saving medical info shows success message",
    "category": "Patient Medical Profile",
    "gherkin": "Given I am on the profile page\nWhen I fill in all medical information fields\nAnd I click \"Save Medical Info\"\nThen a success message \"updated successfully\" is visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "PP-4",
    "title": "Saved medical data persists after page reload",
    "category": "Patient Medical Profile",
    "gherkin": "Given I am on the profile page\nWhen I fill in date of birth, gender, blood type, and allergies\nAnd I save\nAnd I reload the page\nThen all fields retain the values I entered",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "PP-5",
    "title": "Medical info fields start empty for a new patient",
    "category": "Patient Medical Profile",
    "gherkin": "Given I am a newly registered patient with no medical info saved\nWhen I go to the profile page\nThen all medical info fields are empty",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "PP-6",
    "title": "Medical Information section is NOT visible for admin",
    "category": "Patient Medical Profile",
    "gherkin": "Given I am logged in as an admin\nAnd I am on the profile page\nThen the Medical Information section is not visible",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "PP-A1",
    "title": "GET /patients/me returns empty record for a new patient",
    "category": "Patient Medical Profile",
    "gherkin": "Given I am a newly registered patient\nWhen I send GET /api/v1/patients/me\nThen the response status is 200\nAnd all clinical fields (dateOfBirth, gender, bloodType, allergies, emergencyContactName, emergencyContactPhone) are null",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "PP-A2",
    "title": "PUT /patients/me upserts patient data",
    "category": "Patient Medical Profile",
    "gherkin": "Given I am a registered patient\nWhen I send PUT /api/v1/patients/me with complete medical data\nThen the response status is 200\nAnd the returned record contains the data I submitted",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "PP-A3",
    "title": "PUT /patients/me rejects an invalid blood type",
    "category": "Patient Medical Profile",
    "gherkin": "Given I am a registered patient\nWhen I send PUT /api/v1/patients/me with bloodType \"X+\"\nThen the response status is 400",
    "status": "Automated",
    "priority": "P2"
  },
  {
    "id": "PP-A4",
    "title": "PUT /patients/me rejects a future date of birth",
    "category": "Patient Medical Profile",
    "gherkin": "Given I am a registered patient\nWhen I send PUT /api/v1/patients/me with dateOfBirth in the year 2099\nThen the response status is 400",
    "status": "Automated",
    "priority": "P2"
  }
];
