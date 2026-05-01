import { Sidebar } from "@/components/sidebar";

export function TestCasesPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">CareSync Test Cases</h1>
        <p className="text-muted-foreground mb-8">
          Written in Gherkin syntax for QA Engineers. E2E tests live in{" "}
          <code className="text-sm bg-muted px-1 rounded">apps/e2e/tests/</code>
          .
        </p>

        {/* ── Authentication ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Authentication
          </h2>

          <h3 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">
            Login
          </h3>
          <div className="space-y-4 mb-6">
            <Gherkin
              id="L-1"
              title="Successful login"
              gherkin={`Given I am on the login page
When I enter my correct email and password
And I click the login button
Then I am redirected to the dashboard`}
            />
            <Gherkin
              id="L-2"
              title="Wrong password"
              gherkin={`Given I am on the login page
When I enter a valid email but wrong password
And I click the login button
Then I see an error message "Invalid email or password"`}
            />
            <Gherkin
              id="L-3"
              title="Non-existent email"
              gherkin={`Given I am on the login page
When I enter an email that does not exist in the system
And I enter any password
And I click the login button
Then I see an error message "Invalid email or password"`}
            />
            <Gherkin
              id="L-4"
              title="Empty form submit"
              gherkin={`Given I am on the login page
When I click the login button without entering any credentials
Then I see validation error messages for the email field
And I see validation error messages for the password field`}
            />
            <Gherkin
              id="L-5"
              title="Already logged in visits /login"
              gherkin={`Given I am logged in as a patient
When I navigate directly to /login
Then I am immediately redirected to /dashboard`}
            />
          </div>

          <h3 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">
            Registration
          </h3>
          <div className="space-y-4 mb-6">
            <Gherkin
              id="R-1"
              title="Successful registration"
              gherkin={`Given I am on the register page
When I fill in first name, last name, a unique email, and a strong password
And I click the register button
Then I am redirected to the dashboard`}
            />
            <Gherkin
              id="R-2"
              title="Duplicate email"
              gherkin={`Given an account with my email already exists
And I am on the register page
When I register with the same email again
Then I see an error message "already registered"
And I remain on the register page`}
            />
            <Gherkin
              id="R-3"
              title="Invalid email format"
              gherkin={`Given I am on the register page
When I enter an invalid email format (e.g. "notanemail")
And I enter a valid password
And I click the register button
Then I see a validation error "Invalid email"`}
            />
            <Gherkin
              id="R-4"
              title="Password too short"
              gherkin={`Given I am on the register page
When I enter a password shorter than 6 characters
And I click the register button
Then I see a validation error "at least 6 characters"`}
            />
            <Gherkin
              id="R-5"
              title="Empty form submit"
              gherkin={`Given I am on the register page
When I click the register button without filling any fields
Then I see multiple validation error messages`}
            />
            <Gherkin
              id="R-6"
              title="Already logged in visits /register"
              gherkin={`Given I am logged in
When I navigate directly to /register
Then I am immediately redirected to /dashboard`}
            />
          </div>

          <h3 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">
            Session &amp; Token
          </h3>
          <div className="space-y-4">
            <Gherkin
              id="S-1"
              title="Logout"
              gherkin={`Given I am logged in
When I click the logout button
Then I am redirected to /login
And navigating to /dashboard redirects me back to /login`}
            />
            <Gherkin
              id="S-2"
              title="Access protected route unauthenticated"
              gherkin={`Given I am not logged in
When I navigate directly to /dashboard
Then I am redirected to /login`}
            />
            <Gherkin
              id="S-3"
              title="Session persists on page refresh"
              gherkin={`Given I am logged in
When I refresh the page
Then I remain on /dashboard
And my session is still valid`}
            />
            <Gherkin
              id="S-4"
              title="Access token auto-refresh"
              gherkin={`Given I am logged in
And my access token has expired
When I refresh the page
Then I remain logged in because the refresh token is used to obtain a new access token`}
            />
            <Gherkin
              id="S-5"
              title="Expired refresh token"
              gherkin={`Given I am logged in
And my refresh token has been cleared
When I reload the page
Then I am redirected to /login`}
            />
          </div>
        </section>

        {/* ── Navigation ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Navigation
          </h2>
          <div className="space-y-4">
            <Gherkin
              id="N-1"
              title="Root redirect authenticated"
              gherkin={`Given I am logged in
When I navigate to the root URL /
Then I am redirected to /dashboard`}
            />
            <Gherkin
              id="N-2"
              title="Root redirect unauthenticated"
              gherkin={`Given I am not logged in
When I navigate to the root URL /
Then I am redirected to /login`}
            />
            <Gherkin
              id="N-3"
              title="Sidebar renders after login"
              gherkin={`Given I am logged in
When the dashboard loads
Then a navigation or sidebar element is visible`}
            />
          </div>
        </section>

        {/* ── Dashboard ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Dashboard
          </h2>
          <div className="space-y-4">
            <Gherkin
              id="BA-1"
              title="Patient sees Book Appointment link in sidebar and dashboard CTA"
              gherkin={`Given I am logged in as a patient
Then the "Book Appointment" sidebar link is visible
And the Book Appointment CTA card on the dashboard is visible`}
            />
            <Gherkin
              id="BA-2"
              title="Non-patient is redirected away from /appointments/book"
              gherkin={`Given I am logged in as an admin
When I navigate to /appointments/book
Then I am redirected to /dashboard
And the book appointment wizard is not visible`}
            />
          </div>
        </section>

        {/* ── Departments ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Departments
          </h2>
          <h3 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">
            Patient View
          </h3>
          <div className="space-y-4 mb-6">
            <Gherkin
              id="D-1"
              title="Navigate to /departments via URL"
              gherkin={`Given I am logged in as a patient
When I navigate to /departments
Then the page heading "Departments" is visible`}
            />
            <Gherkin
              id="D-2"
              title="Page shows loading indicator then resolves"
              gherkin={`Given I am logged in as a patient
When I navigate to /departments
Then a loading indicator is briefly shown
And the department list or empty state eventually appears`}
            />
            <Gherkin
              id="D-3"
              title="Search input accepts text"
              gherkin={`Given I am on the departments list
When I type in the search input (e.g. "cardio")
Then the search input retains the value I typed`}
            />
            <Gherkin
              id="D-4"
              title="Non-admin does NOT see Create Department button"
              gherkin={`Given I am logged in as a patient
When I am on the departments list
Then the "Create Department" button is not visible`}
            />
            <Gherkin
              id="D-5"
              title="Unauthenticated user is redirected to /login"
              gherkin={`Given I am not logged in
When I navigate to /departments
Then I am redirected to /login`}
            />
          </div>

          <h3 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">
            Admin CRUD
          </h3>
          <div className="space-y-4 mb-6">
            <Gherkin
              id="D-6"
              title="Admin sees the Create Department button"
              gherkin={`Given I am logged in as an admin
When I navigate to /departments
Then the "Create Department" button is visible`}
            />
            <Gherkin
              id="D-7"
              title="Admin can open the Create Department modal"
              gherkin={`Given I am logged in as an admin
And I am on the departments page
When I click the "Create Department" button
Then the create department modal is visible
And the name input field is visible
And the submit button is visible`}
            />
            <Gherkin
              id="D-8"
              title="Create Department modal validates — name is required"
              gherkin={`Given I am logged in as an admin
And the Create Department modal is open
When I click the submit button without entering a name
Then I see a validation error "required"`}
            />
            <Gherkin
              id="D-9"
              title="Admin can create a new department"
              gherkin={`Given I am logged in as an admin
And the Create Department modal is open
When I enter a unique department name and description
And I click the submit button
Then the modal closes
And the new department appears in the list`}
            />
            <Gherkin
              id="D-10"
              title="Admin can edit an existing department"
              gherkin={`Given I am logged in as an admin
And I search for a department I own
When I click the edit button for that department
Then the edit modal opens with the name pre-filled
When I update the name and submit
Then the modal closes
And the updated name appears in the list`}
            />
            <Gherkin
              id="D-11"
              title="Admin can delete a department"
              gherkin={`Given I am logged in as an admin
And I search for a department I own
When I click the delete button for that department
Then the department card disappears from the list`}
            />
            <Gherkin
              id="D-12"
              title="Cancel button closes the form without saving"
              gherkin={`Given I am logged in as an admin
And the Create Department modal is open
When I type a name and click the Cancel button
Then the modal closes
And the typed name does not appear in the list`}
            />
          </div>

          <h3 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">
            API Contract
          </h3>
          <div className="space-y-4">
            <Gherkin
              id="D-API-1"
              title="Admin API — POST /departments returns 201"
              gherkin={`Given I am authenticated as an admin
When I send POST /api/v1/departments with a valid name and description
Then the response status is 201
And the response body contains the created department with isActive: true`}
            />
            <Gherkin
              id="D-API-2"
              title="Non-admin API — POST /departments returns 403"
              gherkin={`Given I am authenticated as a patient
When I send POST /api/v1/departments
Then the response status is 403`}
            />
            <Gherkin
              id="D-API-3"
              title="Unauthenticated GET /departments returns 401"
              gherkin={`Given I am not authenticated
When I send GET /api/v1/departments
Then the response status is 401`}
            />
            <Gherkin
              id="D-API-4"
              title="Authenticated GET /departments returns paginated list"
              gherkin={`Given I am authenticated
When I send GET /api/v1/departments
Then the response status is 200
And the response body contains data (array), total, page, limit, and totalPages`}
            />
          </div>
        </section>

        {/* ── Doctors ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Doctors</h2>
          <h3 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">
            Patient View
          </h3>
          <div className="space-y-4 mb-6">
            <Gherkin
              id="DOC-1"
              title="Navigate to /doctors via URL"
              gherkin={`Given I am logged in
When I navigate to /doctors
Then the page heading "Doctors" is visible`}
            />
            <Gherkin
              id="DOC-2"
              title="Non-admin does NOT see Create Doctor button"
              gherkin={`Given I am logged in as a patient
When I am on the doctors list
Then the "Create Doctor" button is not visible`}
            />
          </div>

          <h3 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">
            Admin CRUD
          </h3>
          <div className="space-y-4">
            <Gherkin
              id="DOC-3"
              title="Admin can create a new doctor"
              gherkin={`Given I am logged in as an admin
And a department exists in the system
When I click "Create Doctor"
And I fill in the doctor's details (name, email, department, specialization, license number)
And I submit the form
Then the modal closes
And the doctor appears in the list`}
            />
          </div>
        </section>

        {/* ── Doctor Schedule ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Doctor Schedule
          </h2>
          <div className="space-y-4">
            <Gherkin
              id="SCH-1"
              title="Patient sees slot viewer but NOT schedule form on doctor profile"
              gherkin={`Given a doctor exists with a public schedule
And I am logged in as a patient
When I view the doctor profile
Then the slot viewer is visible
But the schedule form is not visible`}
            />
            <Gherkin
              id="SCH-2"
              title="Doctor can save their weekly schedule via UI"
              gherkin={`Given I am logged in as a doctor viewing my own profile
When I toggle Monday on in the schedule form
And I set start time to "09:00" and end time to "17:00"
And I submit the form
Then I see a success message
And my schedule is saved`}
            />
            <Gherkin
              id="SCH-3"
              title="Available slots appear for patient after doctor sets schedule"
              gherkin={`Given a doctor has set a Monday schedule
And I am logged in as a patient
When I view the doctor profile
And I select the next Monday date in the slot date picker
Then at least one available time slot button is visible
And the empty state is not visible`}
            />
          </div>
        </section>

        {/* ── Book Appointment ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Book Appointment
          </h2>

          <h3 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">
            Wizard Navigation
          </h3>
          <div className="space-y-4 mb-6">
            <Gherkin
              id="BA-3"
              title="Back button from step 2 returns to step 1"
              gherkin={`Given I am on step 2 (select doctor) of the booking wizard
When I click the Back button
Then I am returned to step 1 (select department)
And the department cards are visible`}
            />
            <Gherkin
              id="BA-4"
              title="Empty state shown when doctor has no schedule on selected day"
              gherkin={`Given I have selected a doctor with no schedule set
When I am on step 3 (date & time) of the wizard
And I select a date on which the doctor has no availability
Then the "No slots available" message is visible
And the time slot grid is not visible
And the Continue button is disabled`}
            />
          </div>

          <h3 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">
            Full Happy Path
          </h3>
          <div className="space-y-4 mb-6">
            <Gherkin
              id="BA-5"
              title="Patient completes full 5-step booking wizard and sees success screen"
              gherkin={`Given a department and doctor with an active Monday schedule exist
And I am logged in as a patient
When I go to /appointments/book
And I select the department on step 1
And I select the doctor on step 2
And I select the next Monday and pick the first available slot on step 3
And I fill in "consultation" as the appointment type and a reason on step 4
And I click Confirm
Then I am on step 5 (success screen)
And I see a "View Appointments" button
And I see a "Book Another" button`}
            />
            <Gherkin
              id="BA-6"
              title="'Book Another' resets the wizard to step 1"
              gherkin={`Given I am on the booking success screen
When I click "Book Another"
Then the wizard resets to step 1
And the previously selected department is still visible`}
            />
          </div>

          <h3 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">
            API Contract
          </h3>
          <div className="space-y-4">
            <Gherkin
              id="BA-A1"
              title="POST /appointments creates appointment with status pending"
              gherkin={`Given a doctor with a Monday schedule exists
And I am authenticated as a patient
When I fetch available slots for that doctor on the next Monday
And I book an appointment with one of those slots
Then the response status is 201
And the appointment status is "pending"`}
            />
            <Gherkin
              id="BA-A2"
              title="POST /appointments returns 409 when same slot booked twice"
              gherkin={`Given a doctor with a Monday schedule exists
And two patients have both obtained the same available slot
When the first patient books that slot successfully
And the second patient tries to book the same slot
Then the second response status is 409
And the error message mentions "slot was just booked"`}
            />
            <Gherkin
              id="BA-A3"
              title="POST /appointments returns 403 for admin role"
              gherkin={`Given I am authenticated as an admin
When I try to POST /api/v1/appointments
Then the response status is 403`}
            />
            <Gherkin
              id="BA-A4"
              title="POST /appointments returns 400 for a past date"
              gherkin={`Given I am authenticated as a patient
When I try to book an appointment with a date in the year 2000
Then the response status is 400`}
            />
          </div>
        </section>

        {/* ── Appointment Management ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Appointment Management
          </h2>

          <h3 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">
            UI
          </h3>
          <div className="space-y-4 mb-6">
            <Gherkin
              id="AM-1"
              title="Patient sees their appointments on /appointments list"
              gherkin={`Given I am logged in as a patient
And an appointment exists for me
When I navigate to /appointments
Then my appointment row is visible
And the status badge shows "Pending"`}
            />
            <Gherkin
              id="AM-2"
              title="Status filter limits visible appointments"
              gherkin={`Given I am logged in as a patient
And I have a pending appointment
When I filter by "Confirmed" status
Then my pending appointment is not visible
When I switch the filter back to "Pending"
Then my pending appointment is visible again`}
            />
            <Gherkin
              id="AM-3"
              title="Doctor confirms appointment and status badge updates"
              gherkin={`Given a patient has booked an appointment with me (as a doctor)
And the appointment is in "pending" status
When I view the appointment detail
Then the status badge shows "Pending"
When I click the "Confirm" action button
Then the status badge updates to "Confirmed"
And the "Confirm" button is replaced by an "In Progress" button`}
            />
            <Gherkin
              id="AM-4"
              title="Patient cancels appointment with confirmation dialog"
              gherkin={`Given I am logged in as a patient
And I have a pending appointment
When I view the appointment detail
And I accept the confirmation dialog
And I click "Cancel Appointment"
Then the status badge updates to "Cancelled"
And no action buttons are visible (terminal state)`}
            />
            <Gherkin
              id="AM-5"
              title="Doctor completes appointment and triggers invoice and notification generation"
              gherkin={`Given a patient has booked an appointment with me
When I transition the appointment through: confirmed → in-progress → completed
Then the patient receives a notification that the appointment status was updated to completed
And the patient can see the generated invoice on the /invoices page`}
            />
          </div>

          <h3 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">
            API Contract
          </h3>
          <div className="space-y-4">
            <Gherkin
              id="AM-A1"
              title="GET /appointments returns 200 with paginated list for patient"
              gherkin={`Given I am authenticated as a patient with at least one appointment
When I send GET /api/v1/appointments
Then the response status is 200
And the body contains data, total, page, and totalPages
And each item includes patientName, doctorName, doctorSpecialization, and status`}
            />
            <Gherkin
              id="AM-A2"
              title="PATCH /appointments/:id/status — doctor confirms (pending → confirmed)"
              gherkin={`Given a doctor is authenticated with a pending appointment
When the doctor sends PATCH /api/v1/appointments/:id/status with status "confirmed"
Then the response status is 200
And the returned appointment status is "confirmed"
And the patient and doctor objects are included in the response`}
            />
            <Gherkin
              id="AM-A3"
              title="PATCH returns 422 for invalid transition (pending → completed)"
              gherkin={`Given a doctor is authenticated with a pending appointment
When the doctor tries to PATCH the status directly to "completed"
Then the response status is 422
And the error message mentions "invalid transition"`}
            />
            <Gherkin
              id="AM-A4"
              title="PATCH returns 403 when patient tries to confirm"
              gherkin={`Given I am authenticated as a patient
And I have a pending appointment
When I try to PATCH the appointment status to "confirmed"
Then the response status is 403`}
            />
            <Gherkin
              id="AM-A5"
              title="GET /appointments/:id returns full nested patient and doctor detail"
              gherkin={`Given I am authenticated as the patient who booked an appointment
When I send GET /api/v1/appointments/:id
Then the response status is 200
And the response includes the full patient object (without passwordHash)
And the response includes the full doctor object (without passwordHash)`}
            />
          </div>
        </section>

        {/* ── Medical Records ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Medical Records
          </h2>
          <div className="space-y-4 mb-6">
            <Gherkin
              id="MR-1"
              title="Doctor creates record on completed appointment, patient sees it in history"
              gherkin={`Given a completed appointment exists between a doctor and patient
And I am logged in as the doctor
When I view the appointment detail
Then the medical record section and form are visible
When I fill in diagnosis, symptoms, and notes
And I submit the form
Then the form is replaced by a read-only view showing the diagnosis
And the patient can see the record on their /medical-records page`}
            />
            <Gherkin
              id="MR-A1"
              title="POST /medical-records creates record and GET returns it"
              gherkin={`Given a completed appointment exists
And I am authenticated as the doctor for that appointment
When I POST /api/v1/medical-records with appointmentId, diagnosis, symptoms, and notes
Then the response status is 201
And the diagnosis matches what I submitted
When the patient sends GET /api/v1/medical-records
Then the created record appears in the list
When the patient sends GET /api/v1/medical-records/:id
Then the response includes the diagnosis, doctor first name, and appointment date`}
            />
            <Gherkin
              id="MR-A2"
              title="POST returns 409 when record already exists for appointment"
              gherkin={`Given a medical record already exists for a completed appointment
And I am authenticated as the doctor
When I POST /api/v1/medical-records for the same appointment
Then the response status is 409`}
            />
          </div>
        </section>

        {/* ── Medical Records Attachments ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Medical Records — Attachments
          </h2>
          <div className="space-y-4">
            <Gherkin
              id="MR-ATT-1"
              title="Doctor uploads PDF, patient downloads it; unsupported type shows error"
              gherkin={`Given a completed appointment and medical record exist
And I am logged in as the doctor
When I navigate to the medical record detail page
And I upload a PDF file via the upload zone
Then the PDF filename appears in the attachment list
And a "Download" link is visible
When I try to upload an unsupported file type (e.g. .txt)
Then an error message is visible
When I log in as the patient
And I navigate to the same medical record detail page
Then the PDF filename is visible
And I can download the file by clicking the Download link`}
            />
          </div>
        </section>

        {/* ── Patients ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Patients
          </h2>
          <h3 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">
            Admin View
          </h3>
          <div className="space-y-4 mb-6">
            <Gherkin
              id="PAT-1"
              title="Admin can navigate to /patients via sidebar"
              gherkin={`Given I am logged in as an admin
When I click the "Patients" sidebar link
Then I am on the /patients page
And the page heading "Patients" is visible`}
            />
            <Gherkin
              id="PAT-2"
              title="/patients page renders search and filter controls"
              gherkin={`Given I am on the /patients page as admin
Then the search input is visible
And the gender filter dropdown is visible
And the blood type filter dropdown is visible`}
            />
            <Gherkin
              id="PAT-3"
              title="Patients list shows registered patients"
              gherkin={`Given at least one patient is registered in the system
And I am on the /patients page as admin
Then the empty state is not visible
And pagination info is visible`}
            />
            <Gherkin
              id="PAT-4"
              title="Search filters the list by patient name"
              gherkin={`Given a patient with a unique first name exists
And I am on the /patients page as admin
When I type the unique first name in the search input
Then the patient row appears in the list`}
            />
            <Gherkin
              id="PAT-5"
              title="Gender filter dropdown contains all gender options"
              gherkin={`Given I am on the /patients page as admin
When I inspect the gender filter dropdown options
Then the options include "Male", "Female", and "Other"`}
            />
            <Gherkin
              id="PAT-6"
              title="Blood type filter dropdown contains all blood type options"
              gherkin={`Given I am on the /patients page as admin
When I inspect the blood type filter dropdown options
Then the options include all blood types: A+, A-, B+, B-, AB+, AB-, O+, O-`}
            />
          </div>

          <h3 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">
            Non-Admin Access
          </h3>
          <div className="space-y-4 mb-6">
            <Gherkin
              id="PAT-7"
              title="Patients sidebar link is NOT visible for patient role"
              gherkin={`Given I am logged in as a patient
Then the "Patients" sidebar link is not visible`}
            />
            <Gherkin
              id="PAT-8"
              title="GET /patients returns 403 for patient role"
              gherkin={`Given I am authenticated as a patient
When I send GET /api/v1/patients
Then the response status is 403`}
            />
          </div>

          <h3 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">
            API Contract
          </h3>
          <div className="space-y-4">
            <Gherkin
              id="PAT-A1"
              title="GET /patients returns paginated list for admin"
              gherkin={`Given I am authenticated as an admin
When I send GET /api/v1/patients
Then the response status is 200
And the body contains data (array), total, page (1), limit (20), and totalPages`}
            />
            <Gherkin
              id="PAT-A2"
              title="GET /patients supports gender filter"
              gherkin={`Given I am authenticated as an admin
When I send GET /api/v1/patients?gender=male
Then the response status is 200
And all returned patients have gender "male"`}
            />
            <Gherkin
              id="PAT-A3"
              title="GET /patients rejects invalid gender filter with 400"
              gherkin={`Given I am authenticated as an admin
When I send GET /api/v1/patients?gender=unknown
Then the response status is 400`}
            />
          </div>
        </section>

        {/* ── User Profile ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            User Profile
          </h2>
          <div className="space-y-4">
            <Gherkin
              id="P-1"
              title="Navigate to profile page via sidebar"
              gherkin={`Given I am logged in
When I click the "Profile" sidebar link
Then I am on the /profile page
And the page heading "Profile" is visible`}
            />
            <Gherkin
              id="P-2"
              title="Profile form is pre-filled with current user data"
              gherkin={`Given I am on the profile page
Then the first name and last name inputs are pre-filled with my registered data`}
            />
            <Gherkin
              id="P-3"
              title="Email is shown as read-only (not in an input field)"
              gherkin={`Given I am on the profile page
Then my email is displayed as read-only text
And there is no editable input with my email value`}
            />
            <Gherkin
              id="P-4"
              title="Successful profile update shows success message"
              gherkin={`Given I am on the profile page
When I update my first and last name
And I click the Save button
Then a success message "updated successfully" is visible`}
            />
            <Gherkin
              id="P-5"
              title="Updated name persists after navigating away and back"
              gherkin={`Given I am on the profile page
When I update my first and last name
And I navigate to /dashboard
And I return to /profile
Then the name inputs show the new values I entered`}
            />
            <Gherkin
              id="P-6"
              title="Validation error shown when first name is cleared"
              gherkin={`Given I am on the profile page
When I clear the first name field
And I click Save
Then a validation error "required" is visible for the first name field`}
            />
            <Gherkin
              id="P-7"
              title="Validation error shown when last name is cleared"
              gherkin={`Given I am on the profile page
When I clear the last name field
And I click Save
Then a validation error "required" is visible for the last name field`}
            />
            <Gherkin
              id="P-8"
              title="Save button is disabled while submitting"
              gherkin={`Given I am on the profile page
When I click the Save button
Then the button is disabled while the request is in-flight
And the button becomes enabled again once the request completes`}
            />
            <Gherkin
              id="P-9"
              title="Avatar initials are shown when no avatar is set"
              gherkin={`Given I am on the profile page
And no avatar image is uploaded
Then my avatar initials are visible
And they show the first letter of my first and last name`}
            />
            <Gherkin
              id="P-10"
              title="Avatar upload replaces initials with image"
              gherkin={`Given I am on the profile page
And my avatar shows initials
When I upload a valid JPEG image as my avatar
Then the avatar image is visible (replacing the initials)
And the initials are no longer visible`}
            />
            <Gherkin
              id="P-11"
              title="Phone number can be updated and is saved"
              gherkin={`Given I am on the profile page
When I update my phone number
And I click Save
Then a success message is visible
When I reload the page
Then the phone input shows the new number I entered`}
            />
          </div>
        </section>

        {/* ── Patient Medical Profile ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Patient Medical Profile
          </h2>
          <div className="space-y-4 mb-6">
            <Gherkin
              id="PP-1"
              title="Medical Information section is visible for patients"
              gherkin={`Given I am logged in as a patient
And I am on the profile page
Then the Medical Information section is visible`}
            />
            <Gherkin
              id="PP-2"
              title="All medical fields are present"
              gherkin={`Given I am on the profile page
Then the following fields are visible:
- Date of Birth
- Gender
- Blood Type
- Allergies
- Emergency Contact Name
- Emergency Contact Phone
And a "Save Medical Info" button is visible`}
            />
            <Gherkin
              id="PP-3"
              title="Saving medical info shows success message"
              gherkin={`Given I am on the profile page
When I fill in all medical information fields
And I click "Save Medical Info"
Then a success message "updated successfully" is visible`}
            />
            <Gherkin
              id="PP-4"
              title="Saved medical data persists after page reload"
              gherkin={`Given I am on the profile page
When I fill in date of birth, gender, blood type, and allergies
And I save
And I reload the page
Then all fields retain the values I entered`}
            />
            <Gherkin
              id="PP-5"
              title="Medical info fields start empty for a new patient"
              gherkin={`Given I am a newly registered patient with no medical info saved
When I go to the profile page
Then all medical info fields are empty`}
            />
            <Gherkin
              id="PP-6"
              title="Medical Information section is NOT visible for admin"
              gherkin={`Given I am logged in as an admin
And I am on the profile page
Then the Medical Information section is not visible`}
            />
          </div>

          <h3 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">
            API Contract
          </h3>
          <div className="space-y-4">
            <Gherkin
              id="PP-A1"
              title="GET /patients/me returns empty record for a new patient"
              gherkin={`Given I am a newly registered patient
When I send GET /api/v1/patients/me
Then the response status is 200
And all clinical fields (dateOfBirth, gender, bloodType, allergies, emergencyContactName, emergencyContactPhone) are null`}
            />
            <Gherkin
              id="PP-A2"
              title="PUT /patients/me upserts patient data"
              gherkin={`Given I am a registered patient
When I send PUT /api/v1/patients/me with complete medical data
Then the response status is 200
And the returned record contains the data I submitted`}
            />
            <Gherkin
              id="PP-A3"
              title="PUT /patients/me rejects an invalid blood type"
              gherkin={`Given I am a registered patient
When I send PUT /api/v1/patients/me with bloodType "X+"
Then the response status is 400`}
            />
            <Gherkin
              id="PP-A4"
              title="PUT /patients/me rejects a future date of birth"
              gherkin={`Given I am a registered patient
When I send PUT /api/v1/patients/me with dateOfBirth in the year 2099
Then the response status is 400`}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function Gherkin({
  id,
  title,
  gherkin,
}: {
  id: string;
  title: string;
  gherkin: string;
}) {
  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center gap-2 mb-2">
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
          {id}
        </code>
        <span className="font-medium text-sm">{title}</span>
      </div>
      <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 rounded p-3">
        {gherkin}
      </pre>
    </div>
  );
}
