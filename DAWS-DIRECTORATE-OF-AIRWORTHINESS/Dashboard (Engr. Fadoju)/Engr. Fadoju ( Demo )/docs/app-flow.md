# App Flow Document

This document uses Mermaid so you can preview the flows directly in VS Code with Markdown preview.

## High-Level Navigation

```mermaid
flowchart LR
    A["Login / Internal Access"] --> B["Dashboard"]
    B --> C["Registry Table"]
    B --> D["Registration Search"]
    B --> E["C of R Upload Review"]
    B --> F["Inspector Assistant"]
    C --> G["Mark Detail Drawer"]
    D --> G
    E --> H["Extraction Preview"]
    H --> I["Manual Confirmation"]
    I --> J["Save to Registry"]
    F --> K["Approved Query Engine"]
    K --> L["Analytics Result"]
```

## Registration Search and Reuse Flow

```mermaid
flowchart TD
    A["Search mark: 5N-ABC"] --> B{"Mark exists?"}
    B -- "No" --> C["Show not found"]
    B -- "Yes" --> D{"Current status"}
    D -- "Assigned" --> E["Show current aircraft, owner, operator, dates"]
    D -- "Reserved" --> F["Show special mark / hold details"]
    D -- "Available" --> G{"Previously used?"}
    G -- "No" --> H["Show mark as available for assignment"]
    G -- "Yes" --> I["Show available again + prior owner history + reuse review state"]
```

## C of R Upload Flow

```mermaid
flowchart TD
    A["Upload scan or photo"] --> B["OCR / extraction service"]
    B --> C["Field mapping preview"]
    C --> D["Reviewer edits if needed"]
    D --> E{"Confirm?"}
    E -- "No" --> F["Discard or re-upload"]
    E -- "Yes" --> G["Create or update aircraft record"]
    G --> H["Link assignment to registration mark"]
    H --> I["Write audit log"]
```

## Inspector Assistant Flow

```mermaid
flowchart TD
    A["Inspector asks question"] --> B["Question classifier"]
    B --> C{"Approved analytics intent?"}
    C -- "No" --> D["Return supported question guidance"]
    C -- "Yes" --> E["Generate parameterized query"]
    E --> F["Run against registry database"]
    F --> G["Return answer + short explanation"]
```

## Screen-Level Flow for the Demo

```mermaid
flowchart LR
    A["Dashboard"] --> B["Search active mark"]
    B --> C["Show reusable old mark"]
    C --> D["Open registry table filters"]
    D --> E["Upload C of R preview"]
    E --> F["Ask assistant a count-based question"]
```

## Notes

- For the demo, keep the app as a single internal tool with tabbed pages.
- For production, split the registry, upload, analytics, and assistant into clear backend services behind one UI.
- The assistant should only answer from approved query templates until the data quality is stable.
