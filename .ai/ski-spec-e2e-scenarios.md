# E2E Test Scenarios for Ski Surface Spec Extension

## Authentication Module

### Scenario E2E-001: Successful User Registration and Auto-Login

**Description:** New user successfully registers an account and is automatically logged in
**Preconditions:**

- User is on landing page
- Email is not already registered
  **Test Steps:**

1. Navigate to landing page `/`
2. Click "Zarejestruj się" (Register) CTA button
3. Verify redirect to `/auth/register`
4. Fill registration form with valid email "test-{timestamp}@example.com"
5. Fill password field with valid password "Test123!Pass"
6. Fill password confirmation with same password
7. Click "Zarejestruj" submit button
   **Expected Results:**

- User is automatically logged in after registration
- User is redirected to `/ski-specs` page
- Navigation bar shows user menu with email
- Empty ski specs list is displayed with "Dodaj pierwszą specyfikację" message
  **Mapped US/TC:** US-001, TC1

### Scenario E2E-002: Registration Validation Errors

**Description:** Registration form properly validates and displays errors for invalid inputs
**Preconditions:** User is on registration page
**Test Steps:**

1. Navigate to `/auth/register`
2. Fill email with invalid format "notanemail"
3. Fill password with weak password "123"
4. Leave password confirmation empty
5. Click submit button
6. Correct email to valid format
7. Fill password with valid but mismatched passwords
8. Click submit again
   **Expected Results:**

- Email validation error appears: "Invalid email format"
- Password validation error appears: "Password must be at least 8 characters"
- Password confirmation error appears: "Passwords do not match"
- Form is not submitted until all errors are resolved
  **Mapped US/TC:** US-001, TC5

### Scenario E2E-003: Successful Login and Session Management

**Description:** Existing user logs in successfully and session is maintained
**Preconditions:**

- User account exists in system
- User is logged out
  **Test Steps:**

1. Navigate to `/auth/login`
2. Fill email field with "existing@example.com"
3. Fill password field with correct password
4. Click "Zaloguj" button
5. Verify redirect to `/ski-specs`
6. Refresh page
7. Navigate to different protected pages
   **Expected Results:**

- User is logged in successfully
- Redirect to `/ski-specs` occurs
- Session persists after page refresh
- User can access all protected routes without re-authentication
  **Mapped US/TC:** US-002, TC2

### Scenario E2E-004: Password Reset Flow

**Description:** User successfully resets forgotten password through email flow
**Preconditions:** User account exists with known email
**Test Steps:**

1. Navigate to `/auth/login`
2. Click "Zapomniałem hasła" link
3. Verify redirect to `/auth/reset-password`
4. Enter email "reset@example.com"
5. Click "Wyślij link resetujący"
6. Verify success message appears (security: same message regardless of email existence)
7. Simulate clicking email link with tokens to `/auth/update-password`
8. Enter new password "NewPass123!"
9. Confirm new password
10. Click "Ustaw nowe hasło"
    **Expected Results:**

- Success message always shows after step 5
- Password strength indicator shows requirements
- After password update, redirect to `/auth/login` with success toast
- User can login with new password
  **Mapped US/TC:** US-004, TC4

### Scenario E2E-005: Protected Route Access Control

**Description:** Unauthenticated users are redirected when accessing protected routes
**Preconditions:** User is not logged in
**Test Steps:**

1. Navigate directly to `/ski-specs`
2. Verify redirect to `/auth/login?redirectTo=/ski-specs`
3. Login with valid credentials
4. Verify redirect back to originally requested `/ski-specs`
5. Navigate to `/auth/login` while logged in
6. Verify redirect to `/ski-specs`
   **Expected Results:**

- Unauthenticated access redirects to login with return URL
- After login, user returns to originally requested page
- Logged-in users cannot access auth pages (auto-redirect to ski-specs)
  **Mapped US/TC:** US-002, TC3

## Landing Page Module

### Scenario E2E-006: Landing Page Content and Navigation

**Description:** Landing page displays correct content and navigation for both authenticated and unauthenticated users
**Preconditions:** None
**Test Steps:**

1. Navigate to `/` as unauthenticated user
2. Verify hero section with problem description is visible
3. Verify benefits list is displayed (4 key benefits)
4. Click "Log in" CTA button
5. Login with valid credentials
6. Navigate to `/` as authenticated user
7. Verify user can stay on landing page (no auto-redirect)
8. Verify navigation menu shows "Home" and "Ski Specs"
   **Expected Results:**

- Landing page accessible to all users
- CTA buttons work correctly for unauthenticated users
- Authenticated users can access landing page without redirect
- Navigation menu adapts based on auth state
  **Mapped US/TC:** US-000

## Ski Specification Management Module

### Scenario E2E-007: Create New Ski Specification

**Description:** User successfully creates a new ski specification with all required fields
**Preconditions:** User is logged in
**Test Steps:**

1. Navigate to `/ski-specs`
2. Click "Dodaj specyfikację" button (top-right CTA)
3. Verify URL changes to `/ski-specs?action=new` without page reload
4. Fill form:
   - Name: "Volkl Mantra M6 184"
   - Description: "All-mountain ski for advanced riders"
   - Length: 184 cm
   - Tip width: 135 mm
   - Waist width: 96 mm
   - Tail width: 119 mm
   - Radius: 20 m
   - Weight: 2100 g
5. Click "Zapisz" button
   **Expected Results:**

- Modal opens without page reload
- After save, toast shows "Specyfikacja została dodana"
- Modal closes and URL returns to `/ski-specs`
- New specification appears in list with calculated surface_area and relative_weight
- List shows correct units for all values
  **Mapped US/TC:** US-005, TC6

### Scenario E2E-008: Ski Specification Validation

**Description:** Form validates all business rules for ski specifications
**Preconditions:** User is on create specification modal
**Test Steps:**

1. Open create specification modal
2. Enter invalid tip/waist/tail relationship (waist: 100, tip: 90, tail: 95)
3. Enter out-of-range values (length: 300, weight: 100)
4. Enter description exceeding 2000 characters
5. Try to save
6. Correct tip to 110, tail to 105
7. Correct length to 180, weight to 1800
8. Reduce description to under 2000 chars
9. Save specification
   **Expected Results:**

- Validation error: "Tip must be greater than or equal to waist"
- Validation error: "Tail must be greater than or equal to waist"
- Range errors for length and weight
- Character count shows exceeded limit
- Form cannot be saved until all errors resolved
- After correction, specification saves successfully
  **Mapped US/TC:** US-005, TC9, US-015

### Scenario E2E-009: Edit Existing Specification

**Description:** User successfully edits an existing ski specification
**Preconditions:**

- User is logged in
- At least one specification exists
  **Test Steps:**

1. Navigate to `/ski-specs`
2. Click edit button on existing specification
3. Verify URL changes to `/ski-specs?action=edit&id={uuid}`
4. Verify form is pre-filled with current values
5. Modify weight from 2100g to 2050g
6. Add/modify description
7. Click "Zapisz"
8. Check updated values in list
   **Expected Results:**

- Edit modal opens with current data
- Changes are saved successfully
- Updated values appear in list immediately
  **Mapped US/TC:** US-006, TC7

### Scenario E2E-010: Delete Specification with Cascade

**Description:** User deletes specification with associated notes
**Preconditions:**

- User has specification with 3 notes attached
  **Test Steps:**

1. Navigate to specification details page `/ski-specs/{id}`
2. Click "Usuń" button
3. Verify confirmation dialog shows:
   - Specification name
   - Number of notes (3 notatki)
   - Warning about irreversibility
4. Click "Anuluj" and verify dialog closes
5. Click "Usuń" again
6. Click "Usuń" in confirmation dialog
7. Verify redirect to `/ski-specs`
   **Expected Results:**

- Confirmation dialog displays correct information
- After deletion, toast shows "Specyfikacja została usunięta"
- User is redirected to list
- Specification and all notes are removed from database
  **Mapped US/TC:** US-007, TC8

### Scenario E2E-011: List Operations - Search, Sort, Pagination

**Description:** User interacts with list controls to find and organize specifications
**Preconditions:**

- User has 15+ specifications in system
  **Test Steps:**

1. Navigate to `/ski-specs`
2. Enter "Volkl" in search field
3. Wait for debounce (300ms)
4. Verify URL updates with `?search=Volkl`
5. Change sort to "weight" ascending
6. Verify URL updates with `&sort_by=weight&sort_order=asc`
7. Navigate to page 2 using pagination
8. Verify URL updates with `&page=2`
9. Change items per page to 20
10. Clear search field
    **Expected Results:**

- Search filters results in real-time after debounce
- Sorting reorders list correctly
- Pagination works with URL state preserved
- All parameters persist in URL and survive page refresh
  **Mapped US/TC:** US-008, TC11, TC12

## Notes Management Module

### Scenario E2E-012: Add and Manage Notes

**Description:** User adds, edits, and deletes notes for a specification
**Preconditions:**

- User has at least one specification
  **Test Steps:**

1. Navigate to specification details `/ski-specs/{id}`
2. Click "Dodaj notatkę" button
3. Enter note text "First test in powder conditions - excellent float"
4. Save note
5. Add second note
6. Edit first note to add more details
7. Delete second note with confirmation
8. Verify note count updates in list view
   **Expected Results:**

- Notes appear sorted by newest first
- Each note shows creation and edit timestamps
- Character counter shows remaining characters (max 2000)
- Deletion requires confirmation
- Note count badge updates immediately
  **Mapped US/TC:** US-019, US-020, US-021, US-022

## Comparison Module

### Scenario E2E-013: Compare Multiple Specifications

**Description:** User selects and compares up to 4 ski specifications
**Preconditions:**

- User has at least 5 specifications
  **Test Steps:**

1. Navigate to `/ski-specs`
2. Select checkbox for first specification
3. Select checkboxes for 3 more specifications
4. Verify 5th checkbox is disabled
5. Click "Porównaj" button
6. Verify redirect to `/compare?ids=uuid1,uuid2,uuid3,uuid4`
7. Click on second column to make it active
8. Verify percentage differences shown for other columns
9. Sort by surface_area ascending
10. Return to list using back button
    **Expected Results:**

- Maximum 4 specifications can be selected
- Compare button enabled only with 2+ selections
- Comparison table shows all parameters
- Surface area and relative weight are highlighted
- Active column shows differences for others
- Sorting works per parameter row
  **Mapped US/TC:** US-010, US-011, US-012

## Import/Export Module

### Scenario E2E-014: CSV Import with Validation

**Description:** User imports multiple specifications from CSV file
**Preconditions:**

- User is logged in
- Has valid and invalid CSV files prepared
  **Test Steps:**

1. Navigate to `/ski-specs`
2. Click "Import" button
3. Select CSV file with 5 valid and 2 invalid rows
4. Upload file
5. Review import summary tabs:
   - "Zaimportowane" tab shows 5 successful
   - "Błędy" tab shows 2 with error details
6. Close modal
7. Verify list refreshes with new specifications
   **Expected Results:**

- Import modal shows upload progress
- Summary clearly separates successes and failures
- Error details include line numbers and reasons
- Only valid specifications are imported
- List automatically refreshes after import
  **Mapped US/TC:** US-013, TC13

### Scenario E2E-015: CSV Export

**Description:** User exports all specifications to CSV file
**Preconditions:**

- User has multiple specifications with descriptions
  **Test Steps:**

1. Navigate to `/ski-specs`
2. Click "Eksport CSV" button
3. Verify button is disabled during download
4. Check downloaded file name format `ski-specs-YYYY-MM-DD.csv`
5. Open CSV and verify:
   - Headers with units
   - All specifications included
   - Descriptions properly escaped
   - Special characters handled correctly
     **Expected Results:**

- File downloads automatically
- Correct filename with date
- CSV contains all data including descriptions
- Proper escaping for commas, quotes, newlines
  **Mapped US/TC:** US-014, TC14

## Error Handling and Edge Cases

### Scenario E2E-016: Network Error Recovery

**Description:** Application handles network errors gracefully
**Preconditions:** User is logged in
**Test Steps:**

1. Navigate to `/ski-specs`
2. Start creating new specification
3. Simulate network failure
4. Attempt to save specification
5. Verify error toast appears
6. Restore network connection
7. Click retry option
8. Verify save completes successfully
   **Expected Results:**

- Error message is user-friendly
- Form data is preserved during error
- Retry mechanism works
- No data loss occurs
  **Mapped US/TC:** US-017

### Scenario E2E-017: Empty States and Onboarding

**Description:** Application provides helpful empty states for new users
**Preconditions:**

- Newly registered user with no data
  **Test Steps:**

1. Login as new user
2. Navigate to `/ski-specs`
3. Verify empty state message and CTA
4. Click "Dodaj pierwszą specyfikację"
5. Create first specification
6. Verify empty state is replaced with list
7. Navigate to specification details
8. Verify empty notes state
9. Add first note
   **Expected Results:**

- Empty states provide clear CTAs
- Messages are encouraging and helpful
- CTAs lead to appropriate actions
- Empty states disappear when data exists
  **Mapped US/TC:** US-016

### Scenario E2E-018: Concurrent Edit Protection

**Description:** System handles concurrent edits appropriately
**Preconditions:**

- Two browser sessions for same user
  **Test Steps:**

1. Open specification edit in session 1
2. Open same specification edit in session 2
3. Save changes in session 1
4. Attempt to save different changes in session 2
5. Verify conflict handling
   **Expected Results:**

- Second save might show conflict error
- User is informed of the conflict
- Option to refresh and retry is provided
- No data corruption occurs
  **Mapped US/TC:** TC10

### Scenario E2E-019: Session Timeout Handling

**Description:** Application handles session expiration gracefully
**Preconditions:**

- User is logged in
  **Test Steps:**

1. Login and navigate to `/ski-specs`
2. Simulate session expiration (wait or manual invalidation)
3. Attempt to create new specification
4. Verify redirect to login with return URL
5. Login again
6. Verify return to previous action
   **Expected Results:**

- 401 responses trigger login redirect
- Return URL is preserved
- User can continue after re-authentication
- Unsaved data warning appears if applicable
  **Mapped US/TC:** TC3

### Scenario E2E-020: Mobile Responsive Behavior

**Description:** Application works correctly on mobile devices
**Preconditions:**

- Mobile viewport (375px width)
  **Test Steps:**

1. Navigate through all main pages on mobile
2. Test hamburger menu navigation
3. Create specification on mobile
4. Test swipe/scroll in comparison table
5. Verify form inputs are accessible
6. Test pagination touch controls
   **Expected Results:**

- All features accessible on mobile
- Forms are usable with touch keyboard
- Tables scroll horizontally when needed
- Touch targets are adequate size (44px minimum)
- No content is cut off or inaccessible
  **Mapped US/TC:** General UX requirement
