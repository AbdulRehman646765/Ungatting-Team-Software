# Feature Request: Automatic Status Timestamps & Shift Activity Tracking

I want to add an **Automatic Timestamp Tracking System** to my existing Google Sheets Amazon Ungating & Invoice Submission Automation System.

Please study my existing Apps Script and spreadsheet structure carefully before making changes. Do not rebuild the existing system or disturb any current functionality, formulas, formatting, dropdowns, dashboards, or automation.

## 1. Status Time Column (Column N)

I have added a new column named **Status Time** in Column N.

I want this column to automatically record the date and exact time whenever a record is added or its status is changed.

### Required behavior:

- When a new ASIN/record is added, automatically save its current date and time in Column N.
- When the Account Status in Column F changes (e.g. Gated, Ungated, Rejected, etc.), update the Status Time to the current date and time.
- When the Case Log in Column I changes (e.g. Review, Ungate, etc.), update the Status Time.
- If the same record's status changes multiple times, always update the timestamp to the latest activity time.
- Do not require employees to enter timestamps manually.

## 2. Case Activity Time (New Column O)

I also want a separate timestamp for the **Case re-open** activity in Column K.

Please add a new column immediately after Column N:

**Column O: Case Activity Time**

### Required behavior:

- When a case is opened, automatically record the current date and time.
- When the Case re-open value changes (e.g. 0 case re-open → Case Open → Case re-open 1), update Column O.
- If the case is re-opened multiple times, always record the latest activity time.
- Do not overwrite the actual Case re-open status in Column K. The timestamp must be stored separately in Column O.

## 3. Important Timestamp Rules

- Use the spreadsheet's configured timezone.
- Store actual date-time values, not plain text.
- Display timestamps in a readable format, such as `10/31/2026 05:32 PM`.
- Use an `onEdit(e)` trigger or an appropriate installable trigger, depending on the existing script architecture.
- Avoid unnecessary updates when unrelated columns are edited.
- Handle multiple edited rows and pasted data correctly.
- Do not create duplicate triggers.
- Do not overwrite existing timestamps when unrelated cells are edited.
- When a new record is imported or pasted, initialize its timestamp correctly.

## 4. Main Goal: Shift-Wise Work Tracking

My team works in a shift from **5:00 PM to 1:00 AM**.

I want to use these timestamps to identify exactly how much work was completed during each shift.

For example:

If an employee changes an ASIN from Gated to Ungate at 6:30 PM, that activity should belong to that shift.

If another ASIN is changed from Review to Approved at 11:45 PM, that should also belong to the same shift.

If a case is re-opened at 12:30 AM, it must still belong to the shift that started the previous day at 5:00 PM.

### Future reporting requirements

The timestamp structure should support reports showing:

- Total ASINs added during a shift.
- Total Account Status changes.
- Total Review activities.
- Total Ungate/Approved activities.
- Total Rejected activities.
- Total cases opened.
- Total cases re-opened.
- Employee-wise activity.
- Company-wise activity.
- Category-wise activity.
- Exact activity time and date.

**Important:** Count actual recorded activities, not simply the current status of each ASIN. Avoid double-counting the same edit or counting unrelated changes as new work.

## 5. Shift Date Logic

Because the shift crosses midnight, use a proper shift-date calculation:

- Shift starts: 5:00 PM.
- Shift ends: 1:00 AM next day.
- Activities between 5:00 PM and 11:59 PM belong to that day's shift.
- Activities between 12:00 AM and 1:00 AM belong to the previous day's shift.

For example, activities from October 30 at 5:00 PM until October 31 at 1:00 AM should be grouped under the October 30 shift.

Please make the shift timing configurable in the future.

## 6. Preserve Existing System

- Keep all existing sheets and dashboards working.
- Preserve the existing Report Dashboard, Company Matrix, Supplier Breakdown, Category Breakdown, Brenttons, and Efix & Eden sheets.
- Do not change existing column meanings or dropdown options.
- Ensure the new Column O does not break existing scripts or column references.
- Check whether any existing automation uses fixed column numbers and update those references safely.
- Do not remove or overwrite existing data.

## 7. Testing Before Completion

Please test the following scenarios:

1. Add a new record and verify its Status Time.
2. Change Account Status and verify the timestamp updates.
3. Change Case Log and verify the timestamp updates.
4. Change Case re-open status and verify Case Activity Time updates.
5. Paste multiple records and verify timestamps are initialized correctly.
6. Edit an unrelated column and confirm timestamps do not change.
7. Test an activity at 11:55 PM and another at 12:15 AM and confirm both belong to the correct shift.

### Final Objective

I want a reliable automatic timestamp system that records when work actually happens, so we can later generate accurate employee-wise and company-wise shift performance reports.

**First inspect the complete existing Apps Script, identify the correct columns and triggers, then implement this feature without breaking the existing automation.**