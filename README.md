# Water Support Without Barriers

A privacy-first correspondence organiser with real on-device OCR, reviewable actions, deadlines, notes and calendar reminders. Designed around understandable next steps, large controls, keyboard access and optional read-aloud.

This is an independent portfolio application. It does not access water-company accounts, submit applications, send evidence to providers or determine eligibility. Customer-ID lookup finds records saved on this device; the demo ID uses explicitly labelled fictional records. Completing an action records progress locally.

## Run locally

**Windows quick start:** double-click `Start Water Support.cmd` in this project folder. It checks for the actual app, starts it if needed, and opens the correct browser address. Keep its server window open. A folder listing from a static preview/Live Server is not the app; `.tsx` files need this framework server.

Use Node.js **22.18+** or Node 24 and a modern browser supporting WebAssembly.

```sh
npm ci
npm run dev
```

Open **http://localhost:5173**. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`. No API keys, database credentials or paid services are needed.

Installation generates local OCR assets in `public/ocr/` from the installed dependencies. These assets are ignored by Git and regenerated before development and production builds. Commit the lockfile.

## Features

- Real OCR for up to eight image pages, each under 10 MB; alternatively paste digital letter text.
- Conservative organisation/action/date suggestions, editable before mandatory human review. Letters without deadlines are supported.
- Create, edit, complete, reopen and delete actions; record notes and change status.
- Validated browser persistence, searchable records and status filters.
- Text exports and `.ics` calendar events with optional day-before reminders.
- JSON backup/restore with validation and replacement confirmation.
- Read-aloud where browser speech synthesis is available.
- Responsive dashboard and clearly labelled fictional provider records.
- Interactive overview with status filters, next-action focus and undo for completion/deletion.
- A selectable monthly calendar with deadlines and follow-ups; navigation supports refresh and browser Back.
- A support centre for billing, service issues, accessibility and complaints, with editable message drafts and verified official resource links.
- Persistent case checklists and contact histories, agreed response dates, waiting statuses and complete case-record exports.
- Larger text, stronger contrast and reduced-motion display preferences.
- Recovery copies for unreadable saved plans; original storage is preserved until you explicitly restore or replace it.
- A Community Fund project workspace with evidence drafting, grant-budget checks, local session records and portable project backups.
- A searchable case board with drag-and-drop/status menus, list view, topic/priority controls, a seven-day reminder inbox and editable local conversation records.

## Five-minute demonstration

1. Click **Scan a letter**, select the sample and click **Read my letter**.
2. Compare recognised text with the image; correct the organisation, summary, next step and date.
3. Confirm the date (or absence of one) and save.
4. Open the action, add notes, export a calendar event and mark it complete.
5. Refresh to check persistence, then search in **My letters** and filter by completed status.
6. Export a backup. Use **Clear saved plan** to start with your own data or **Demo** to reload fictional examples.

Open **Support centre**, choose a topic, describe your issue, review the draft and save the case. In its details, tick checklist steps and record a conversation with an optional follow-up date. Your calendar and dashboard then reflect the updated case.

Direct links: `/?view=support`, `/?view=planner`, `/?view=letters`. The **Manage workspace** section at the bottom contains backup, restore and demo controls. **Display** in the header adjusts reading preferences.

Open `/?view=community` for the Community Fund project workspace. Draft your evidence, enter a justified budget and record local sessions. Its backup is separate from personal case backups. The worksheet is preparation material, not an official application.

See [Community Fund alignment and application needs](docs/COMMUNITY-FUND.md). Grants are up to £4,000 for eligible local organisations. Applications close Monday 19 October 2026; confirm the time with your local foundation. The app does not submit applications or confirm eligibility.

If you want to try paste instead of a photo:

```text
Wessex Water
Please upload your income evidence by 19 October 2026.
Keep your customer reference nearby when contacting the support team.
```

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run test:ocr
npm run build
npm start
```

Unit tests cover date extraction, impossible dates, overdue labels, backup validation and calendar serialization. The separate OCR integration check recognises the actual sample image using the local English model. `npm start` previews the built Cloudflare Worker; use the URL it prints. It does not publish the app.

See [testing](docs/TESTING.md), [architecture](docs/ARCHITECTURE.md), and [portfolio copy and demo script](docs/SHOWCASE.md).

## Privacy and limitations

Photos are processed on the device, held temporarily in memory and removed when capture closes. They are not sent to an OCR service. Recognised text, actions and notes are stored in this browser only, without account synchronisation or application-level encryption. Others using the same browser profile may see them. Clearing site data removes the plan; export a backup for recovery. Backups contain your text and notes.

OCR assets are served by this app, without a runtime third-party CDN. Speech synthesis depends on browser/OS voices and their privacy behaviour. Calendar notifications require importing an event into a calendar; the app does not send background alerts.

Suggestions use explainable text rules, not a language-model service. The summary starts from the original letter text. OCR and extraction may miss or misread details; review remains mandatory. PDF parsing, other OCR languages, authentication and live provider integrations are outside this release. Formal accessibility conformance has not been established.

## GitHub and hosting

Upload the source, lockfile, configuration, `scripts/`, `tests/`, `docs/` and `.github/`. Exclude `node_modules`, generated `public/ocr`, `dist`, `.wrangler`, `.sites-runtime`, environment files and personal backups. `.gitignore` covers generated assets and local state.

GitHub Actions runs type checking, lint, unit tests, actual OCR and a production build. The runtime is Vinext/Vite with a Cloudflare Worker artifact. This is not a standard Next.js/Vercel deployment: use the configured Sites hosting workflow or configure Cloudflare for the generated Worker. Local development is ready without hosting setup.

A public deployment and competition submission are separate steps. Check the competition's rubric, originality, AI disclosure and licensing rules. No specific rubric was supplied; no grade, award or hiring outcome is guaranteed.

## Issue update centre

Use **Stay informed about your issue** on any view to inspect the latest personal case record, see repeat-contact cases and opt into watched updates. Public BBC headlines are retrieved through a fixed server endpoint and matched by topic; official incident/report links are separate. News does not verify case status. See [behaviour, limits and test steps](docs/ISSUE-UPDATES.md).

Optional live-source check: `node --experimental-strip-types scripts/test-news.mjs` (requires network access).

## GitHub and phone use

See [GitHub upload, phone access and accessibility checks](docs/GITHUB-AND-MOBILE.md). Use **Customer ID / photo** to find device-local records or take/upload a letter photo. An optional customer reference is preserved in case backups and editable in the action editor. The web manifest supports home-screen use where available; provider authentication and cross-device account syncing are not implemented.
