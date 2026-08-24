# Design Document

## Design Goal

Make the product feel familiar to staff who are used to Excel, while making it clearly faster, safer, and easier to search.

The interface should feel:

- Professional
- Internal and trustworthy
- Data-first rather than marketing-style
- Familiar enough for Excel users to adopt quickly

## Product Style

### Layout

- Desktop-first layout
- Left navigation or top tabs
- Wide content area for tables
- Search and filters always visible near the top
- Record detail shown in a side panel or dedicated detail section

### Visual direction

- Neutral light theme
- Strong table readability
- Status chips for `Assigned`, `Available`, and `Reserved`
- Minimal motion
- Clean spacing and bold section labels

### Color guidance

- `Assigned`: deep blue
- `Available`: green
- `Reserved`: amber
- `Previously Used`: gray badge layered beside the main status
- Error or validation issues: red only when necessary

## Key Screens

### 1. Dashboard

Must show:

- Total assigned aircraft
- Total available marks
- Available-again marks with historical usage
- Recent registrations
- Operator summary or quick leaderboard

### 2. Registry Table

Must support:

- Search by mark, operator, owner, serial number
- Filters by status and date
- Sort by mark or registration date
- Quick visual distinction between never-used and previously-used available marks

### 3. Mark Detail View

Must show:

- Full mark
- Current status
- Current aircraft and operator info if assigned
- Prior owner history if previously used
- Reuse notice state when relevant

### 4. C of R Upload Review

Must feel like a review workflow, not a blind automation.

Required elements:

- File preview
- Extracted fields
- Editable form fields
- Confidence indicator or warning note
- Confirm and save action

### 5. Inspector Assistant

Must feel controlled and factual.

Required elements:

- One question box
- Suggested example questions
- Short data-backed answer
- Optional "show source filters" or "show calculation basis" later

## Interaction Rules

- Always show the current status clearly before showing history.
- Use plain wording instead of technical labels where possible.
- Do not auto-save extracted document data.
- Make reusable historical marks obvious without making them look unavailable.
- Keep primary actions consistent:
  - `Search`
  - `Review`
  - `Confirm and Save`

## Reference Inputs

When you are ready, place screenshots or photos of the current Excel sheets in:

- [docs/reference-images/README.md](/C:/Users/Joseph%20N%20Nimyel/Documents/Codex/2026-04-19-please-feel-free-to-make-any/docs/reference-images/README.md)

Those images should be used later to refine:

- column order
- field names staff already recognize
- naming conventions
- transition strategy from Excel to the new UI

## Demo Recommendation

For the first demo, use a clean internal admin look:

- Simple header
- Five tabs
- Clear metrics
- A realistic data table
- A single upload page with confirmation

That will look serious without forcing you to solve final design details too early.
