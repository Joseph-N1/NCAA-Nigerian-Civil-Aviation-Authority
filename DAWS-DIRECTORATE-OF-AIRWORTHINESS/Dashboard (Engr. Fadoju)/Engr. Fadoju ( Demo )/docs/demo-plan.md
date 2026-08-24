# Demo Plan

## Objective

Show a believable finished-product vision without waiting for the full production system.

The demo should answer one question clearly:

**"If NCAA approves this project, what will staff actually be able to do better?"**

## Demo Scope

Build only these five pieces:

1. **Dashboard**
   - Assigned count
   - Available count
   - Reusable historical marks
   - Registrations in the last 5 years

2. **Registration Search**
   - Search `5N-ABC`
   - Show current aircraft/operator details
   - Show whether a mark is available or previously used

3. **Registry Table**
   - Search and filter all marks
   - Show that the registry covers `AAA` to `ZZZ`

4. **C of R Upload Review**
   - Upload a scan or image
   - Show extracted fields
   - Confirm before save

5. **Inspector Assistant**
   - Answer only approved factual questions from the dataset

## What should be real vs mocked

### Real in the demo

- Master list of all `AAA` to `ZZZ` marks
- Search behavior
- Status counts
- Operator and time-based summaries
- Human confirmation step before save

### Mocked in the demo

- OCR extraction internals
- Final database persistence
- Email/phone notification sending
- Full natural-language chatbot behavior

## Recommended Presentation Script

### Step 1: Open dashboard

Say:

"This is the future registry home screen. Instead of manually checking Excel and physical files, staff can see current counts immediately."

### Step 2: Search an active mark

Search `5N-ABC`.

Say:

"A staff member can instantly see whether a mark is assigned and which aircraft and operator it belongs to."

### Step 3: Search a reusable historical mark

Search `5N-AAD`.

Say:

"Older marks that are now reusable stay visible with their previous ownership history, so reuse decisions are traceable."

### Step 4: Open the table

Filter by `Available` or by an operator.

Say:

"The registry covers the full mark inventory, not just what is currently in Excel."

### Step 5: Show upload review

Upload any sample image or PDF.

Say:

"This is the path to reducing manual transcription errors. The system extracts fields, but staff still confirm before anything is saved."

### Step 6: Ask an inspector question

Use:

- `How many currently registered planes are there?`
- `How many registrations are there in the last 5 years?`
- `How many aircraft has Rano Air registered in their history?`

Say:

"This assistant is designed to answer from the data, not to guess."

## Build Priorities for the Extra Time

If you are presenting on **Wednesday, April 22, 2026**:

- Keep the current scope exactly as-is
- Focus on polish and speaking notes

If you are presenting on **Thursday, April 23, 2026**:

- Add one or two extras only:
  - import from a small CSV extract
  - a chart by operator
  - a better record detail layout

Do not spend the extra day trying to build real OCR or a full AI chatbot.

## What to tell your boss

- This is a prototype for workflow validation, not the final production backend
- The production version will include stronger history controls, approvals, authentication, and auditing
- The prototype already validates the most important part: the operational flow
