# Issue update centre

The update centre is available on every app view. It shows personal case status, latest contact log, next step, outcome and check-in date. Cases with at least two logged calls, emails, webchats or letters are highlighted as repeat-contact cases. A personal note or status change is not counted as customer contact.

Choose **Watch this issue** to track local case changes and related public headlines. While the tab is visible, news is checked every 15 minutes and when returning to the tab. The first successful check establishes a baseline; later items new to watched topics generate a dismissible notice. Seen links and case snapshots persist in this browser to avoid repeated notices. Watching is optional; **Stop watching** turns it off for that case. There is no closed-browser push, SMS or email.

The fixed `/api/issue-news` endpoint retrieves BBC UK and Science & Environment RSS feeds. It sends no account data, location, case text or search query upstream. A server cache limits checks to every 15 minutes (one-minute retry when a source fails). Requests time out and response size is capped. Article links are restricted to HTTPS BBC domains; remote HTML is not rendered. Matching is an explicit broad category-keyword rule, not an AI claim about the customer's case. Source publication dates and fetch timestamps are separate.

Official Wessex Water incident, news and performance-report pages are provided as links. Automated access to the provider news page returned HTTP 403 during development. The app does not scrape or claim to verify those reports. Incident links require the user to check their location and actual provider. Public headlines may refer to unrelated locations or providers.

For a verified statement of what a provider is doing on an individual case, a future authenticated provider/CRM integration is required. Public news cannot supply that truth. The current app labels all case status as personal-record information, leaves unknown actions unknown, and never marks a case resolved from a headline. An urgent issue must be reported directly.

## Manual acceptance

1. Create a case, add two contact logs, and confirm its repeat-contact banner.
2. Watch it; change its next step/status or add a contact log. Confirm one notice and the updated case position.
3. Dismiss, refresh and confirm the same update is not reannounced.
4. Check public news. Verify source links, publication dates, topic-only labels and the absence of a personal repair claim.
5. With the network unavailable, confirm the error and last checked time; previous headlines must remain visible and case status unchanged.
6. Stop watching all cases and confirm periodic fetching stops. Test keyboard navigation and a narrow screen.

Browser interaction checks remain to be completed in an available browser. Automated tests cover parsing, source validation, topic matching and repeat-contact/change detection.
