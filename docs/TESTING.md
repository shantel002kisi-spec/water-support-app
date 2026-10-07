# Acceptance testing

Automated tests cover extraction, dates, validation and calendar serialization. A separate integration test runs actual OCR on the sample image. Browser automation was unavailable in the build environment; the following interactive checks still need to be run in your browser. Use fictional information when demonstrating.

| Journey | Expected result |
| --- | --- |
| Open localhost:5173 | Dashboard loads without credentials; demo scope is visible |
| Add/edit an action | Required fields validate and the action appears in the correct section |
| Refresh after editing/completing | Title, notes and status remain |
| Scan the sample | Actual recognised text and editable suggestions appear |
| Paste text with a deadline | Candidate date appears; save requires confirmation |
| Paste text without a deadline | No date is invented; confirm absence and save |
| Change a review date | Confirmation resets |
| Oversized/non-image/ninth upload | Visible error; upload refused |
| Cancel OCR and start a new scan | Previous results never replace the new capture |
| Search/filter | Matching records only; empty results have a clear message |
| Reopen a completed action by editing status | It returns to Action needed |
| Export calendar | Event imports with the correct date and optional day-before alarm |
| Backup/restore | Notes, status and original text survive |
| Restore invalid JSON | Error appears; existing plan stays intact |
| Import demo records repeatedly | No duplicate IDs; current edits preserved |
| Cancel delete/clear | Data remains intact |
| Confirm action deletion | Action stays absent after refresh |
| Keyboard-only use | Visible focus, usable controls, dialog escape and focus return |
| Phone-sized viewport | Cards stack and dialogs/mobile navigation remain usable |
| Reduced-motion preference | Animations are reduced |
| Unavailable/full browser storage | Visible backup recommendation |
| Filter overview using statistics or tabs | Corresponding action records appear |
| Complete/delete and click Undo | Previous action is restored without replacing unrelated records |
| Select a calendar day or move months | Selected-day actions and month label update |
| Visit `/?view=support` and refresh | Support centre remains selected |
| Navigate between sections and use browser Back | Previous section returns |
| Prepare and save a support request | Case appears in plan; draft is not transmitted |
| Copy/download/edit a draft | User can retain their reviewed wording |
| Add/tick a case checklist and refresh | Steps and completion state remain |
| Log a call with a follow-up and Waiting selected | Activity appears; status and calendar date update |
| Export a case record | Checklist, notes, source text and contact history are included |
| Change Display settings and refresh | Reading preferences remain |
| Corrupt saved JSON | Original data remains; recovery download is offered |
| Open water-security lab | Scenario values are clearly labelled illustrative |
| Move scenario sliders/year | Contributions and the 2030–2080 pathway update |
| Set zero participation or full rebound | Demand saving becomes zero |
| Enter decreasing/duplicate meter readings | Visible validation prevents the change |
| Compare readings across an intervention date | Crossing intervals are excluded; insufficient data is shown explicitly |
| Export/restore lab backup | Scenarios, readings and proposal evidence survive; case data stays separate |
| Export proposal worksheet | Missing evidence and novelty/validation limits remain visible |
| Search Ctrl/Cmd+K | Workspace search opens and focuses its field |
| Move board card/dropdown | Status and local history update without losing notes |
| Edit/remove conversation or checklist step | Change persists and Undo restores the previous case |

## Limits

The Node OCR check validates the actual recogniser/model but does not establish worker behaviour on every browser/device. PDF import, live provider access, authentication, cross-device sync, background SMS/email and formal accessibility certification are not included. Paste/manual entry remains available when OCR cannot run.
# Community Fund acceptance checks

Open `/?view=community`. Add a £3,000 grant line and a £1,200 grant line; confirm the aggregate exceeds the £4,000 ceiling. A grant share above its own line's cost must be rejected. Draft evidence, refresh, export a worksheet and JSON backup, restore after confirmation, and reject an invalid backup without replacing current records. Record a completed session and anonymous feedback; confirm the number is labelled attendance, not unique people. Verify the official guidance link and keyboard access to forms and remove controls. These interactive checks still require a real browser review.
