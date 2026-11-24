# Vercel deployment

This repository contains the complete countdown, a shared event API, private image storage integration, and a password-protected administration interface. The public display is `/`; event control is `/admin` or F2. Use the same production URL on the phone and TV.

## One-time setup

1. Import `MSG5110/Torah-Ohr-Countdown` into Vercel. Keep the repository root as Root Directory. `vercel.json` selects Vite, `npm run build:hosted`, and `dist` automatically. Use Node.js 22.
2. Add `ADMIN_PASSWORD` in Project → Settings → Environment Variables. Use a unique, randomly generated password of at least 16 characters. It is server-only; never use a `VITE_` prefix or commit it.
3. In the project's Storage tab, create/connect a **Private Vercel Blob store**. Enable the read-write token environment variable so `BLOB_READ_WRITE_TOKEN` is available to functions. The store can also provide `BLOB_STORE_ID` for server SDK reads. Client uploads require the read-write token on the server to issue narrowly scoped upload credentials.
4. Redeploy after adding environment variables/storage. Open the production `/admin` URL and sign in.
5. Upload photos/prizes and configure the actual Jerusalem deadline, or choose **Move your saved event online** and select the existing exported HTML. Confirm replacement. The imported deadline and active prize timestamps remain absolute.
6. Open the production root URL on the TV. Updates are polled about every 10 seconds while the page is visible; countdown seconds use the device clock between updates. Set each device's clock correctly.

No actual campaign date, photographs, logo, password or cloud credentials are committed here. The original logo must be uploaded unchanged. Existing photos/settings stored by the old local HTML do not automatically move to the website: use the import feature or upload them again.

## Storage and uploads

Photos are separate immutable files rather than a 50 MB HTML payload. Only current/next photo pixels are decoded for playback. Private media is delivered through short-lived signed image URLs; the display URL is intentionally public, so anyone with the site URL can view published event content. Admin cookies are HttpOnly/Secure/SameSite=Strict; all mutation and upload-token routes require a valid session and same-origin requests.

Large images upload directly from the browser to Blob using authenticated scoped client tokens. They do not pass through Vercel's small function-body limit. Event JSON uses consistent private reads and ETag-conditional writes. Concurrent edits reject with a reload instruction instead of silently overwriting another admin. The settings page reports cloud saving/errors separately from local device state.

Removing a photo/prize removes it from the shared event. Unreferenced uploaded files can remain in storage (for example after a failed import); manage these in Vercel's Blob dashboard. Never delete `state/event.json` or active media during the event. Blob/function bandwidth and operation quotas apply; check your Vercel plan and usage before the campaign. No paid plan is selected or subscription created by this code.

## Offline and previews

Hosted changes require an internet connection. A display retains its last cached configuration during a connection outage; the live clock continues from that deadline. Photos already cached by the browser may remain available, but a full hosted offline gallery is not guaranteed. The original standalone export remains the fully self-contained offline option. Preview countdowns and rehearsals are device-local and do not replace the shared campaign deadline.

`npm run dev` runs the original frontend in local-device mode. `npm run build:hosted` builds shared mode, functions type checks and the offline export template. To develop the API locally, use `vercel dev` with the connected project's environment variables and enable `VITE_SHARED_MODE=true` for that dev environment. `npm test` runs calculation, gallery, storage, authentication, sync and conflict checks. `npm run test:standalone` verifies the embedded standalone artifact.

The code is deployable when the project and required environment variables are connected. A build alone does not prove that Vercel credentials or cloud storage have been configured.
