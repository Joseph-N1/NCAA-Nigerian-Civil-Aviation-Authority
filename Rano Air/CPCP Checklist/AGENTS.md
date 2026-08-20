# Rano Air CPCP Checklist — AI Development Instructions

## 1. PROJECT IDENTITY

This repository contains the Rano Air AMO CPCP Checklist application.

This is an EXISTING, FUNCTIONAL APPLICATION.

It is not a greenfield project.

The application is already being developed and tested, and existing functionality must be preserved unless the user explicitly requests that functionality to be changed or removed.

The primary objective of development is:

> Improve the existing application without breaking working functionality.

Treat every requested modification as an incremental production upgrade.

Do NOT rebuild the application from scratch simply because another implementation may appear cleaner.

Do NOT replace working architecture unnecessarily.

Do NOT perform broad refactors unless explicitly requested or unless a refactor is required to safely implement the requested feature.

---

# 2. CURRENT BASELINE

The current Git baseline is the known-good version of the CPCP application.

Before making significant modifications:

1. Inspect the current Git status.
2. Identify the current branch.
3. Identify the current commit.
4. Inspect the existing implementation.
5. Understand how the relevant feature currently works.
6. Make the smallest safe change necessary.

The current known-good Git commit at the beginning of this development cycle is:

`4d7174f`

Commit message:

`New content`

Do not assume this commit will remain the latest commit forever.

Always inspect the current repository state before making changes.

---

# 3. PROJECT SCOPE

The primary project directory is:

`Rano Air/CPCP Checklist`

Only modify files inside this project unless the user explicitly instructs otherwise.

The parent Git repository contains other NCAA and aviation projects.

DO NOT modify unrelated files outside:

`Rano Air/CPCP Checklist`

without explicit user permission.

In particular, do not modify other NCAA projects merely because they exist inside the same Git repository.

---

# 4. DESKTOP VERSION

There is a second deployment/version of this application:

`Rano Air/CPCP Checklist-Desktop-Bundle`

The web/source version and desktop version must remain functionally synchronized.

However:

DO NOT automatically modify the Desktop Bundle whenever a web/source file changes.

First determine how the desktop bundle is structured and how synchronization/building currently works.

When the user requests implementation of a feature, ensure the corresponding desktop implementation is updated appropriately.

Never assume that copying files blindly between the two projects is safe.

Before changing the desktop version:

1. Inspect its structure.
2. Determine whether it contains bundled/build output or source files.
3. Identify the correct source files.
4. Determine the correct build/package process.
5. Preserve desktop-specific functionality.

The final result must provide equivalent functionality in both versions.

---

# 5. GOLDEN RULE — PRESERVE FUNCTIONALITY

Before changing existing code, understand what it currently does.

Never remove a function simply because it appears unnecessary.

Never delete a component merely because a different implementation looks cleaner.

Never replace an existing working feature with a simplified approximation.

Never alter existing data structures unless necessary.

Never change existing behaviour unrelated to the user's request.

If an existing feature appears buggy, investigate it first.

If fixing the bug requires changing existing behaviour, explain the change before proceeding when the impact is significant.

---

# 6. SCAN BEFORE IMPLEMENTING

For every major task, follow this sequence:

## Step 1 — Inspect

Read the relevant source files.

## Step 2 — Understand

Determine:

* current architecture
* data flow
* state management
* storage
* event handling
* rendering
* report generation
* printing
* exports
* authentication
* progress tracking
* desktop integration

## Step 3 — Identify dependencies

Determine which files/functions/components depend on the code being changed.

## Step 4 — Plan

Create a concise implementation plan before modifying multiple files.

## Step 5 — Implement

Make targeted changes.

## Step 6 — Validate

Run the relevant application/build/test commands.

## Step 7 — Inspect the diff

Run:

`git diff`

and verify that only intended files changed.

## Step 8 — Check status

Run:

`git status`

and verify there are no unexpected files.

---

# 7. DO NOT MAKE UNREQUESTED CHANGES

Do not use a user's request as an excuse to redesign unrelated parts of the application.

For example:

If the user asks to fix printing, do not redesign the dashboard.

If the user asks to add login, do not rewrite the database.

If the user asks to change the logo, do not replace the entire CSS architecture.

If a broader change is genuinely necessary, explain why.

---

# 8. USER IS THE FINAL AUTHORITY

Do not assume that the AI knows the user's preferred design better than the user.

If there are multiple technically valid approaches, recommend the best one and explain the trade-offs.

For important architectural decisions, wait for user approval before implementing a major alternative.

---

# 9. CPCP APPLICATION FUNCTIONALITY

Existing functionality may include:

* CPCP checklist workflow
* checklist progression
* DSR generation
* DSR reporting
* PDF export
* HTML export
* printing
* progress tracking
* charts
* local data storage
* database/storage utilities
* service worker/offline behaviour
* Vite development environment
* desktop packaging
* form validation
* existing navigation
* existing UI components

All existing functionality must be preserved unless the user specifically requests otherwise.

---

# 10. DSR REPORTING

DSR generation is an important business function.

Before changing DSR functionality, inspect:

* `js/dsr.js`
* related functions in `js/app.js`
* relevant HTML
* print CSS
* export functionality
* date handling
* table generation

Do not break existing DSR content while modifying its presentation.

When modifying DSR reports, verify:

* correct aircraft information
* correct checklist information
* correct dates
* correct progress/status
* correct table content
* correct formatting
* correct logo
* correct page dimensions
* correct signatures/approval areas if present
* correct PDF output
* correct HTML output
* correct print output

---

# 11. PRINTING

Printing is a critical function.

The application should produce professional A4 documents.

When modifying print functionality:

* use proper `@media print`
* respect A4 page dimensions
* avoid horizontal overflow
* avoid clipping
* avoid unnecessary page breaks
* prevent table columns from being cut off
* keep headers aligned
* keep logos correctly positioned
* preserve readable font sizes
* ensure margins are appropriate
* test the actual browser print preview

Do not assume that a layout that looks correct on screen will print correctly.

Always inspect print preview behaviour.

---

# 12. AUTOSAVE

The application is intended for users who may not be technically experienced.

Autosave should therefore prioritise reliability and simplicity.

When implementing or modifying autosave:

* save changes automatically
* avoid requiring users to manually save
* prevent excessive writes
* debounce rapid field changes
* recover unfinished work after accidental closure where appropriate
* clearly communicate save state
* handle storage failures gracefully
* avoid silently losing user-entered data

Preferred UX:

`Saving...`

then:

`✓ Saved`

Do not create an autosave system that interferes with normal checklist interaction.

---

# 13. DATA SAFETY

Never silently delete user data.

Before implementing destructive operations:

* provide confirmation
* clearly identify what will be deleted
* prevent accidental deletion

Never change the storage schema without understanding existing stored data.

If a migration is required, make it backward-compatible where practical.

---

# 14. LOGIN AND ACCESS CONTROL

The application will support authorised Rano Air AMO users.

Expected access groups include:

* DCA
* LBMM
* MCC

Login functionality should be simple enough for non-technical users.

Do not expose credentials unnecessarily.

Do not hard-code sensitive production secrets into frontend code.

If credentials are currently intended only for local/offline application use, preserve the existing security model unless the user explicitly requests a stronger authentication architecture.

If the application is moved to a real server or multi-user environment, reassess authentication and credential storage before deployment.

---

# 15. BRANDING

The application should represent:

Rano Air AMO

The design should look like professional airline/aviation maintenance software.

Avoid:

* excessive colours
* cartoon-like interfaces
* unnecessary gradients
* oversized decorative elements
* visually noisy layouts

Prefer:

* clean typography
* professional spacing
* restrained shadows
* clear hierarchy
* subtle borders
* aviation/airline-level presentation
* consistent component styling

The Rano Air visual identity should influence:

* logo placement
* headers
* buttons
* navigation
* report headers
* status indicators
* print documents

Use the supplied Rano Air logo and approved branding assets when available.

Do not distort the logo.

Do not stretch the logo.

Maintain appropriate aspect ratio.

---

# 16. COLOUR SYSTEM

The visual system should be inspired by the existing Rano Air identity.

Use the established Rano Air palette rather than inventing unrelated colours.

Where appropriate, use subtle transitions between:

* purple
* magenta
* orange

The result should be professional rather than overly colourful.

Use neutral colours for most application surfaces.

Colour should communicate hierarchy and status rather than simply decorate the interface.

---

# 17. RESPONSIVE DESIGN

The application should remain usable at:

* desktop resolution
* laptop resolution
* smaller browser windows
* appropriate tablet/mobile widths where supported

Do not fix one screen size by breaking another.

Avoid unnecessary fixed widths.

Avoid horizontal scrolling wherever possible.

---

# 18. CODE QUALITY

Keep the existing project structure unless there is a strong reason to change it.

Prefer:

* readable functions
* descriptive names
* small reusable functions
* clear separation of concerns
* minimal duplication
* consistent formatting
* defensive error handling

Avoid:

* unnecessary abstractions
* over-engineering
* huge functions
* duplicated logic
* unexplained magic numbers
* unused dependencies
* dead code

Do not introduce a new framework merely because it is fashionable.

---

# 19. JAVASCRIPT SAFETY

Before modifying JavaScript:

Check for:

* existing event listeners
* DOM lifecycle assumptions
* null elements
* asynchronous operations
* storage operations
* race conditions
* duplicate initialization
* global variables
* dependencies between scripts

Avoid introducing duplicate event listeners.

Avoid creating multiple timers for the same function.

Clean up listeners/timers where appropriate.

---

# 20. CSS SAFETY

Before modifying CSS:

Inspect existing selectors and dependencies.

Do not create conflicting styles unnecessarily.

Avoid:

* excessive `!important`
* arbitrary pixel offsets
* duplicate selectors
* conflicting media queries
* unexplained z-index values
* fixed dimensions that cause overflow

When fixing alignment issues, prefer structural/layout fixes over random pixel adjustments.

---

# 21. DEPENDENCY MANAGEMENT

Do not install a package unless it is actually required.

Before installing a dependency:

1. Check whether the project already provides the required functionality.
2. Check whether an existing dependency can solve the problem.
3. Consider bundle size and maintenance.
4. Explain why the dependency is needed.

Never remove a dependency without checking whether the project uses it.

---

# 22. GIT SAFETY

Never automatically:

* commit
* push
* force push
* reset
* rebase
* delete branches

unless the user explicitly asks.

Before major changes, inspect:

`git status`

After changes, inspect:

`git diff`

and:

`git status`

Never use destructive Git commands such as:

`git reset --hard`

or:

`git clean -fd`

unless the user explicitly instructs you to do so.

---

# 23. NO AUTOMATIC COMMITS

Do not create Git commits automatically.

The user controls project history.

When a major feature is complete, you may recommend a commit message, but wait for the user's instruction before committing.

---

# 24. NO AUTOMATIC GITHUB PUSH

Never push changes to GitHub automatically.

The user must explicitly request a push.

---

# 25. TESTING REQUIREMENT

After implementing a change, test the relevant functionality.

At minimum check:

* application starts
* no obvious console errors
* relevant page loads
* relevant buttons work
* relevant forms work
* data saves
* data loads
* existing workflow still works

For DSR changes:

* generate DSR
* preview DSR
* export HTML
* export PDF
* print preview
* verify A4 layout

For login changes:

* valid credentials work
* invalid credentials fail
* logout works
* protected application state behaves correctly

For autosave:

* enter data
* wait for save
* refresh
* verify data remains
* close/reopen if recovery is implemented

---

# 26. REGRESSION TESTING

After implementing a major feature, do not test only the new feature.

Also verify that existing core functionality still works.

The AI must assume that regressions are possible.

If a modification affects shared code, test all features that depend on that code.

---

# 27. BUG FIXING

Minor bugs should be fixed when discovered if they are:

* clearly understood
* low risk
* directly related to the affected code
* unlikely to alter intended behaviour

Examples:

* console errors
* broken event handlers
* obvious alignment issues
* typo errors
* incorrect date formatting
* small print offsets
* missing null checks
* obvious responsive overflow

Do not use minor bug fixing as a reason to perform an unrelated redesign.

---

# 28. VISUAL QUALITY

The application should look like software used by a professional aviation organisation.

Prioritise:

* clarity
* consistency
* hierarchy
* usability
* accuracy
* professionalism

Do not optimise for flashy visuals.

The application should feel like an aviation maintenance system, not a generic startup dashboard.

---

# 29. USER EXPERIENCE

Many users of the application may not be technically experienced.

Therefore:

* minimise unnecessary steps
* use clear labels
* avoid technical error messages
* provide obvious actions
* preserve entered data
* provide clear feedback
* avoid requiring users to understand browser behaviour
* make common tasks obvious

When an operation succeeds, provide clear confirmation.

When an operation fails, explain what happened in simple language and provide the next useful action.

---

# 30. ERROR HANDLING

Do not allow a single failed operation to crash the entire application.

Use defensive checks where appropriate.

Errors should:

* be logged appropriately during development
* provide understandable user feedback
* avoid exposing internal implementation details unnecessarily

Do not silently swallow important errors.

---

# 31. PERFORMANCE

Do not optimise prematurely.

However, avoid introducing:

* unnecessary repeated DOM queries
* excessive rendering
* unnecessary timers
* large dependencies for simple features
* duplicate data processing

For large tables or reports, consider efficient rendering and data handling.

---

# 32. PROJECT DOCUMENTATION

When implementing a significant architectural change, update relevant documentation.

Do not create excessive documentation for trivial changes.

Important architectural decisions should be documented clearly.

---

# 33. IMPLEMENTATION STYLE

When asked to implement a feature:

1. Inspect existing implementation.
2. Identify the minimum required files.
3. Explain the implementation approach if the task is substantial.
4. Modify only necessary files.
5. Test.
6. Review the diff.
7. Report what changed.
8. Report anything that could not be tested.

---

# 34. DO NOT CLAIM SUCCESS WITHOUT VERIFICATION

Never say:

"Everything works"

unless the relevant functionality was actually tested.

Instead state exactly what was tested.

Example:

"Vite starts successfully and the login flow was tested, but PDF printing could not be fully verified because browser print preview was unavailable."

Be honest about limitations.

---

# 35. WHEN REQUIREMENTS ARE AMBIGUOUS

If a requirement materially affects architecture, security, data integrity, or user workflow:

Ask the user before making the architectural decision.

For minor implementation details:

Choose the safest reasonable option and proceed.

Do not repeatedly ask the user about trivial implementation details.

---

# 36. CURRENT DEVELOPMENT PRIORITY

The current major upgrade direction includes:

1. Preserve the existing functional CPCP application.
2. Add secure/simple login access for:

   * DCA
   * LBMM
   * MCC
3. Add Rano Air AMO branding.
4. Improve Rano Air colour integration.
5. Improve A4 printing.
6. Improve DSR report layout.
7. Allow DSR export as HTML or PDF.
8. Fix DSR date handling.
9. Improve checklist progress tracking.
10. Add 1C, 2C and 3C progress tracking.
11. Add reliable autosave.
12. Improve preview table width.
13. Fix minor UI and print bugs.
14. Synchronise functionality with the desktop version.
15. Improve overall professional presentation.

These requirements are subject to the user's latest instructions.

Do not implement all of them merely because they appear here.

Implement only the features the user has explicitly requested for the current task.

---

# 37. CRITICAL DEVELOPMENT RULE

The most important rule in this document is:

> PRESERVE THE EXISTING WORKING APPLICATION.

When in doubt:

Inspect first.

Make the smallest safe change.

Test.

Review the diff.

Do not rewrite working functionality unnecessarily.

---

# 38. FINAL RESPONSE FORMAT

After completing a task, report:

### Changed

List files modified and what changed.

### Tested

List what was actually tested.

### Not Tested

Clearly identify anything that could not be tested.

### Git Status

Report whether unexpected changes remain.

### Notes

Mention any risks, limitations, or recommended next steps.

Do not claim success without evidence.

---

# END OF PROJECT INSTRUCTIONS
