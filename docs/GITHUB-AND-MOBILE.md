# Publish the project and use it on a phone

This is a responsive web app. Hosting the source in GitHub does not itself host the running server: the OCR app and `/api/issue-news` endpoint require the framework/Cloudflare runtime. GitHub Pages cannot run that endpoint.

## GitHub repository

Create an empty repository in GitHub, then run from this folder:

```sh
git init -b main
git add .
git status
git commit -m "Build accessible community water-support app"
git remote add origin https://github.com/YOUR-USERNAME/water-support-app.git
git push -u origin main
```

Use your repository URL. Configure your Git name/email if prompted. Review staged files before committing; include no private letters, customer IDs, backups or secrets. `.gitignore` excludes dependencies, build output, local service state, OCR assets and environment files. CI verifies installation, type checking, lint, tests, OCR and build. Choose a licence for your own code before granting reuse rights; vendored dependencies retain their existing licences.

The source ZIP exporter is `powershell -ExecutionPolicy Bypass -File scripts/export-source.ps1`. It exports an allowlisted set of source/configuration directories into `outputs/`, excluding local caches, dependencies, secrets and generated OCR assets. Review any project-specific source/configuration content before sharing.

## Phone use

Use a hosted HTTPS URL in Safari or Chrome. The layout has a bottom navigation bar, scrollable dialogs, large input text, visible keyboard focus and reading preferences. A web manifest supports a home-screen shortcut where the browser supports it. There is no offline guarantee or closed-app push service.

For testing on your own trusted home Wi-Fi, start `npm run dev -- --hostname 0.0.0.0`, then open `http://YOUR-PC-LAN-IP:5173` on your phone. Local firewall access may be needed. Do not expose this development server to the public internet. Phone file/camera controls depend on browser/device support; upload and paste alternatives are always available. The customer-ID records remain in that phone's browser, not synced from your PC. Use case backups to transfer records deliberately.

## Customer-ID and photo flow

Use **Customer ID / photo** on the dashboard. Enter a customer ID to find records already saved on that device, or choose **Take a photo / upload a letter instead**. The reference carries into letter review and is saved with the action. A photo is optional: upload or paste text instead. Customer ID is a local organisation reference, not a password or authenticated account lookup. The demo ID is labelled fictional.

## Accessibility and phone acceptance

Test 320px and 390px widths, landscape, 200% zoom, keyboard-only operation and VoiceOver/TalkBack. Confirm dialogs expose titles, focus stays in an open dialog and returns on close, bottom navigation does not cover actions, and camera denial still allows upload/paste. Test large-text/contrast/reduced-motion preferences. Accessibility certification and real-device/browser verification have not been completed.
