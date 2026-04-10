# CareSync — E2E Test Scenarios

Test suite: Playwright (`apps/e2e`)
Base URL: `http://localhost:5173` (web) + `http://localhost:3000` (api)

---

## Auth — Registration

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| R-1 | Successful registration | Fill valid form → submit | Redirected to `/dashboard`, user is logged in |
| R-2 | Duplicate email | Register with existing email | Error message shown, stays on register |
| R-3 | Invalid email format | Submit `notanemail` | Inline validation error on email field |
| R-4 | Password too short | Submit password < 6 chars | Inline validation error on password field |
| R-5 | Empty form submit | Click submit with no data | All required fields show errors |
| R-6 | Already logged in visits `/register` | Navigate to `/register` while authenticated | Redirected to `/dashboard` |

## Auth — Login

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| L-1 | Successful login | Valid credentials → submit | Redirected to `/dashboard` |
| L-2 | Wrong password | Submit bad password | "Invalid credentials" error shown |
| L-3 | Non-existent email | Submit unknown email | "Invalid credentials" error shown |
| L-4 | Empty form submit | Click sign in with no data | Validation errors shown on both fields |
| L-5 | Already logged in visits `/login` | Navigate to `/login` while authenticated | Redirected to `/dashboard` |

## Auth — Session & Token

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| S-1 | Logout | Login → click logout | Redirected to `/login`, session cleared |
| S-2 | Access protected route unauthenticated | Navigate to `/dashboard` without login | Redirected to `/login` |
| S-3 | Session persists on page refresh | Login → refresh page | Still on dashboard, still authenticated |
| S-4 | Access token auto-refresh | Let access token expire → make API call | Silently refreshes, request succeeds |
| S-5 | Expired refresh token | Both tokens expired → navigate | Redirected to `/login` |

## Navigation

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| N-1 | Root redirect authenticated | Navigate to `/` while logged in | Redirected to `/dashboard` |
| N-2 | Root redirect unauthenticated | Navigate to `/` without login | Redirected to `/login` |
| N-3 | Sidebar renders after login | Login → check sidebar | Sidebar visible with navigation items |

---

## Priority Order

Implement in this order — happy paths first, then guards, then edge cases:

1. L-1 — Successful login
2. R-1 — Successful registration
3. S-2 — Protected route blocks unauthenticated access
4. S-1 — Logout
5. S-3 — Session persists on refresh
6. L-5 / R-6 — Already-authenticated redirect
7. L-2, L-3, L-4 — Login error states
8. R-2, R-3, R-4, R-5 — Registration error states
9. N-1, N-2, N-3 — Navigation
10. S-4, S-5 — Token refresh edge cases

---

## Test File Mapping

| File | Covers |
|------|--------|
| `tests/auth-login.spec.ts` | L-1 through L-5 |
| `tests/auth-register.spec.ts` | R-1 through R-6 |
| `tests/auth-session.spec.ts` | S-1 through S-5 |
| `tests/navigation.spec.ts` | N-1 through N-3 |
