# Architecture and decisions

Image pages → browser Tesseract worker → recognised text → rule-based extraction → human review → validated action → browser storage → dashboard / calendar / backup.

Pasted text enters at extraction. Photos are temporary. The recognised text is retained with the action for later comparison. No remote OCR or language-model API is used.

## Components

- `app/page.tsx`: validates the requested view for initial server rendering.
- `components/support/WaterSupportApp.tsx`: navigation, capture lifecycle, fictional lookup, persistence and task details.
- `components/support/Dashboard.tsx`: interactive status filters, priority focus, progress and quick actions.
- `components/support/Planner.tsx`: selectable monthly calendar and follow-up list.
- `components/support/SupportCentre.tsx`: topic selection, request preparation, editable drafts and official links.
- `components/support/CaseWorkspace.tsx`: checklists, conversation records, status changes, follow-up dates and case exports.
- `components/support/DisplaySettings.tsx`: persistent reading/contrast/motion preferences.
- `components/support/PlanTools.tsx`: action form, backup/restore and replacement confirmation.
- `components/support/MobileNavButton.tsx`: shared mobile navigation and current-page semantics.
- `lib/support-engine.ts`: Zod validation, extraction rules, dates, calendar serialization and downloads.
- `scripts/prepare-ocr.mjs`: reproducible local worker, WebAssembly and English model assets.

## Tradeoffs

Browser storage avoids server collection of financial correspondence and removes credential setup. It means no cross-device sync, authentication or encrypted cloud backup. JSON export provides an explicit recovery path. A live provider release would need identity checks, authorization, retention policies, encrypted storage and approved integration contracts.

Extraction rules recognise full English month names, UK numeric dates and ISO dates near deadline keywords. They deliberately leave missing dates and organisations blank. They do not understand every letter, abbreviated months or ambiguous context. The suggested summary is an excerpt of the first lines rather than an invented rewrite. Users must review all details.

OCR runs in a worker to keep intensive recognition off the UI thread. Cancelling invalidates the scan generation so late results cannot overwrite a newer capture. The worker terminates in `finally`; upload size and count are bounded. Bundling OCR assets removes runtime CDN reliance.

Calendar export escapes text, folds UTF-8 lines, uses CRLF and an exclusive all-day end date, and optionally includes a VALARM. The calendar application controls actual notifications.

Accessibility features include semantic controls, labels, dialog focus handling through UI primitives, visible focus, text alongside status colours, large targets, reduced-motion styles and read-aloud. Formal WCAG conformance and user research have not been established.

Future improvements include PDF import, more languages, richer extraction, IndexedDB for larger plans, usability studies and authenticated provider integration. The local-only mode should remain available to portfolio visitors.

Case histories and checklists are part of the validated task schema and travel with JSON backups. Contact logging never sends a message: users record their own conversations. Drafts are copy/download only. Official resources are linked directly, with a visible verification date. A check-in date is explicitly a personal choice, not a provider SLA. Duplicate task IDs are rejected on restore. If stored data fails validation, it remains untouched and can be exported as a recovery copy before replacement.
