# Torah Ohr Countdown — Vercel edition

The cinematic Torah Ore countdown, now prepared for Vercel with one shared event, private image storage, authenticated administration, phone-to-TV synchronization, and the existing standalone offline export. **Start with [VERCEL.md](VERCEL.md)** for deployment and importing the saved event.

The sections below document the display and standalone features. In hosted mode, settings/photos/prizes save to the shared event; local-only behavior applies to the standalone file and `npm run dev`.


A complete offline countdown for Yeshivas Torah Ore Yerushalayim. React, TypeScript, Vite, Motion, Luxon, Canvas 2D effects, GPU/native photo transitions, inline workers and IndexedDB. No remote fonts, paid APIs, backend or audio dependency.

## Open the standalone file

Open **standalone/torah-ore.html** in a current Chrome or Edge browser. Everything required to render the application is embedded in that one file. No installation, companion assets or internet connection is needed. Keep the file at the same path and use the same browser profile to retain browser-local settings and photographs. Replacing an older HTML at that path is preferable to opening differently named copies.

Use a full browser for the cinematic effects. Attachment previews and third-party HTML viewers may block JavaScript or have insufficient rendering resources. Startup diagnostics and an optional recovery mode remain inside the same file; no separate lightweight edition is distributed. Reduced-motion preferences are respected.

## Configure and rehearse

- First run: **Configure event** or **Experience the countdown**. No campaign date is invented.
- Open event control: **F2**, **Ctrl+Shift+S**, or append **#settings** to the URL. Phones have a small touch settings button. Escape closes event control.
- Event: select the campaign deadline in **Asia/Jerusalem**. Israel daylight-saving time is applied. Ambiguous repeated times and nonexistent spring times are rejected.
- Original logo: upload the original artwork in Event, or place it at `public/assets/torah-ore-logo.png` before building. No original logo was attached to the brief. Artwork is displayed without recoloring or distortion.
- Appearance: choose a complete theme: Emerald & Champagne, Emerald & White, Midnight Sapphire, Obsidian & Platinum, Burgundy & Bronze, Royal Amethyst, or Amber Nocturne. One choice coordinates the background, lights, digits, labels, fireworks, confetti and photo tint. **Emerald & White** keeps the original green photographic background and gold effects, changing only the countdown numbers to white. Existing custom palettes are retained as Saved colors until a theme is chosen.
- Preview: 10 days, 24 hours, 1 hour, 5 minutes, 60 seconds, 10 seconds or full launch. The independent preview clock never changes the real campaign deadline. Exit Preview restores the live clock; refreshing also exits preview.
- Finale: firework/confetti intensities, effect switches, full replay and settled launch preview.

## Settings layout

Use the sidebar on a computer or the eight section buttons on a phone. Arrow keys, Home and End navigate sections. **Done** closes settings. A running preview is shown in the header, with **Exit preview** available from every section.

| Section | Controls |
| --- | --- |
| Control | Live status, photo/prize actions and rehearsal; collapsible Diagnostics and Keyboard shortcuts |
| Event | Campaign deadline, time zone and original logo |
| Appearance | Theme, number size/brightness and quality; Lighting & particles expands detailed effects |
| Photos | Upload queue, search, selection, sorting and gallery; Slideshow settings expands playback, transitions, timing and photo treatment |
| Animation | Rolling digits, dynamic intensity and reduced motion |
| Prizes | Saved prize library, editor and live controls; More actions contains preparation and testing |
| Finale | Launch message, fireworks, confetti, shockwave and launch previews |
| Preview | Independent countdown stage presets |

Valid changes save automatically. The deadline still requires **Save campaign deadline**. The former unused event-title control was removed; launch text is now in **Finale**. Countdown size appears once, under **Appearance**.

The local computer clock is the time source. Remaining time is recalculated from the target timestamp, so sleep, refresh and missed frames do not accumulate drift. A passed deadline restores the launch screen permanently; no negative numbers or automatic restart.

## Photographs

Upload real JPG/JPEG, PNG or WebP photographs in Photos. Use **Add photos**, **Choose files**, or drop files into the Photos panel. Choose **Slideshow settings → Photo order → In gallery order** to follow that arrangement, or **Shuffle** to show all photos once per randomly mixed cycle. Shuffle avoids repeating the last photo immediately when a new cycle begins. Switching modes keeps the current picture on screen and never rearranges the saved gallery. The order setting persists after refresh. The Control dashboard’s next-photo name follows the chosen playback order.

Duration, crossfade, zoom, photo visibility, darkening and display mode are editable.

Photos use IndexedDB; settings use localStorage. Data is local to the browser profile and origin/file path. No media is sent to a remote service. If persistent storage is restricted, photos can be displayed for the current session with a warning. Keep the original photographs as a backup.

Large uploads are optimized to a 4096-pixel maximum edge with higher-quality encoding and a little UHD zoom headroom. A single decode supplies the photo, a small stored gallery thumbnail, and brightness analysis. The slideshow decodes one upcoming photo at a time and keeps the current image visible until its successor is ready. No photos or failed decoding falls back to the countdown. Photographs begin fading away at ten seconds remaining so the seconds dominate.

## Visual production

The public display contains branding, numerals and unit labels without extra slogans or decorative text. The original logo stays unchanged.

The background uses an original generated lighting plate with a photographic look: a broad champagne light source, deep emerald shadows and restrained optical bokeh. All geometric panels and 3D rendering have been removed. Three independently pivoting, feathered light shafts, layered drifting haze, a gently wandering warm light source, restrained camera drift and depth-traveling particles provide motion. The rays breathe at different rates and overlap the haze rather than moving as one flat layer. Appearance → Lighting & particles → Atmosphere motion adjusts their speed together. Reduced motion freezes all added movement. Portrait framing keeps the warm source visible rather than cropping it out. Theme grading uses a precomputed tone curve and is applied once per theme change. The image is embedded directly into the standalone HTML. Lighting and particle intensity still build continuously toward zero without a ten-second flash. The number cells match the bundled font's actual tabular advance, preserving complete glyph contours and stable width. Optical padding and soft masks feather the rolling edges; each glyph carries its own light bloom through the padded mask, so it follows the rolling movement. Changed digits roll with perspective and a brief specular sweep. The final ten seconds receive coordinated scale-and-light pulses that grow toward zero and settle before the next beat. Reduced motion disables the pulses. Departing units dissolve first, then surviving numbers expand and recenter together; portrait grid transitions move through separate rows before merging.

Launch sequence:

1. At zero the existing seconds digits reach 00 in their original position and size. They hold for 0.65 seconds, then fade in place over 1.75 seconds with a soft start and finish; no separate centered zero is introduced. Sparks and light waves originate from the measured countdown location.
2. Paired firework shells rise around the edges, with varied depth, spherical bursts, long trails and gravity-driven decay.
3. The original logo begins revealing at 1.8 seconds while the zero finishes fading. At 2.65 seconds the launch title begins a restrained inward reveal, followed by a single metallic light sweep.
4. Confetti starts with the first fireworks cue at 0.65 seconds, falling into view during the firework entrance. Both effects continue together through the title reveal, with perspective-scaled, shaded and tumbling foil.
5. Firework creation stops before ten seconds. Confetti emission and opacity taper, leaving the final logo and message indefinitely.

Effects use bounded particle populations, cached glow textures, capped canvas resolution and automatic quality reduction. Light and haze textures are cached. Soft background motion paints at a capped 30 fps in Auto, 24 fps in Low and up to 60 fps in High, independently of digit and particle animation. The background canvas uses a pixel budget that scales with the quality setting; a plain embedded image remains visible if canvas rendering is unavailable. Sound remains off.

## Windows laptop and JVC TV

1. Connect HDMI and choose that TV input. Use 3840×2160 at 60 Hz if supported, otherwise 1920×1080 at 60 Hz.
2. Disable TV overscan with its Screen Fit/Just Scan setting. Start at 100% browser zoom.
3. Move the browser to the TV. Open settings with **F2**, then click **Enter full screen** at the top of **Control** or in the pinned footer. Settings close on successful entry. Press **Esc** to leave browser fullscreen, or reopen settings and choose **Exit full screen**. Configure and rehearse before showing the display.
4. Keep the laptop plugged in and ventilated. Set plugged-in sleep/display timeout to Never, disable screen saver, and schedule updates/restarts outside the event. Disable the TV sleep/auto-off timer.
5. Verify the Windows clock and campaign deadline. Rehearse the 10-second finale, exit preview, and leave the live screen open.

The browser cannot guarantee that Windows stays awake. If sleep occurs, the clock catches up on wake. Physical TV and endurance checks should be completed on the event hardware.

## Source installation and builds

Install Node.js 22 or newer, then:

```sh
npm install
npm run dev
```

Production assets, served locally:

```sh
npm run build
npm run preview -- --host 127.0.0.1
```

Build the self-contained HTML:

```sh
npm run build:standalone
```

The result is `standalone/torah-ore.html`. The separate `dist/` directory is a static web build with a service worker for offline caching after its first successful HTTPS/localhost load. That service worker is intentionally skipped in the standalone file.

Tests:

```sh
npm test
npm run test:standalone
```

See `QA.md` for verification status and operator acceptance checks.

The photo implementation is unchanged in this update. Its decoding, layer order, visibility settings and storage path were reviewed without finding a definite new app bug. The reported behavior in the third-party HTML viewer remains unconfirmed. Use a current full browser for reliable file uploads and object-URL image display.

## Background verification

The lighting plate was visually inspected before integration. Automated checks cover background cropping at TV/phone sizes over long elapsed times, portrait focal-point retention, static reduced-motion framing, render pixel budgets, theme tone curves, embedded image data and removal of the old geometry shaders. Full browser and TV playback remain separate acceptance checks.

## Photo display troubleshooting

In F2 → Photos, the status explains whether images are ready or hidden by display mode, slideshow settings, the final ten seconds or launch. **Test photos now** opens a photos-only preview with full visibility and no darkening, without changing saved settings or the real deadline. Use Exit Preview to restore the real display. Photos-only mode now remains available even during the final minute and after launch; blended countdown photos begin fading at ten seconds remaining.

## Export a fully configured event

Open **F2 → Control → Export complete HTML**. Save the downloaded **torah-ore-ready.html**, then copy that one file to the event laptop or another computer and open it in Chrome or Edge.

The file includes the complete offline application, your settings, uploaded original logo, ordered photo gallery and crop positions, all prize images and individual timings/captions, the prepared prize and any active or paused prize. Transparent image data is preserved. The campaign deadline and active prize timestamps remain absolute: moving the file does not restart their clocks. Temporary countdown previews and rehearsals are not exported.

Each export has its own saved workspace. Opening one never replaces another event’s settings or gallery. Later edits persist in that file’s browser storage; export again to put those edits into a new portable file. Re-exporting replaces the embedded package rather than nesting a second application. Explicitly clearing a gallery or stopping a bundled prize remains effective after refresh. The embedded settings and media still open for the current session when browser storage is unavailable.

There is no network upload. File size grows with the photographs and prizes included. The standalone export works entirely offline. The production web package also includes the standalone template when built using **npm run build:standalone**; its service worker caches that template for offline export.

## Photo transitions

Choose **F2 → Photos → Photo transition**. Choose from six styles:

| Style | Look |
| --- | --- |
| Velvet blend | A slow, eased blend with a subtle camera drift |
| Gallery glide | Two photographs pass with restrained, complementary lateral movement |
| Silk veil | A broad, softly curved reveal flowing across the image |
| Lightfall | A feathered reveal descending from a varied light source, with a restrained warm bloom |
| Watercolour | A flowing painted reveal with soft, irregular edges that leave the atmosphere visible around the photograph |
| Ink spread | A continuous ink bloom that follows irregular paper channels, with a different origin and flow each time |
| Varied cinematic | Mixes the six styles, avoiding consecutive repeats |

**Transition duration (s)** controls the handoff and is capped at half the photograph interval. **Test photos now** replays the selected effect, including with a single photo. During ordinary playback a single photograph stays visible after its entrance. Exit Preview restores the real countdown and saved display mode.

Photos retain their original saved resolution throughout. Velvet blend and Gallery glide use native browser images and compositor animations. The four flowing reveals use a WebGL image layer that stays in place throughout the photo’s appearance. The incoming photo decodes, prepares its small reveal texture and gets two compositor frames to prewarm before the outgoing photo moves. Continuous zoom runs underneath the reveal and remains on the same image afterward; there is no lower-resolution photo canvas, image swap or blur at the end. Rapid Next commands finish the current handoff and then show the latest queued photograph, with at most two mounted image layers. Watercolour blends away the outgoing edges only after the new center fills. Reduced motion uses a short dissolve and freezes the current camera pose. Unavailable graphics acceleration falls back to a native-image blend.

Ink spread grows through a seeded, smooth paper-permeability field. Eight flow families alternate between side plumes, upper/lower cascades, branching and broad diagonals, central blooms and rising feathers. Consecutive reveals use a different family and a well-separated origin, with fresh channel shapes, rotation and curl. Preview replays vary too. One connected front follows faster and slower capillary channels, producing irregular lobes and fine contours with a soft wet edge. The exact noise lattice is cached in double precision. The next full-quality arrival texture is prepared ahead during the quiet hold and reused at handoff; playback uses the existing GPU pass without per-frame SVG filtering. The outgoing photo stays opaque below the entire spread, and the incoming image keeps zooming on the same surface afterward.

The flow, direction and painted contour vary for each appearance. Unsupported older transition choices migrate to Velvet blend; campaign settings, uploaded photographs and prize settings are preserved. No external transition videos or services are used.

## Continuous transitions and countdown polish

Every transition now keeps the last fully revealed photo mounted until the incoming image has loaded and its reveal has actually completed. No timed exit removes the old image during mask preparation or decoding. The glow is attached to each rolling glyph rather than a stationary copy. Each displayed hour decrement produces a short scale-and-glow pulse; refresh and large sleep/preview jumps do not trigger it.

The countdown is centered vertically in the TV composition, with separate portrait safe spacing. Photos remain through most of the final minute and begin their soft fade at ten seconds. Brighter depth particles, reflective sparkle glints and soft moving lens illumination appear above the photographs and build toward zero. A soft expanding light bloom accompanies the anchored zero and launch reveal. Reduced motion and existing intensity/quality controls remain available.

## Optical finish and launch handoff

The sparkle graphics now use two cached diffraction textures with feathered rays, warm-white cores and offset, smooth light catches. Side flares combine a narrow anamorphic streak with a soft bloom; they remain behind the countdown and become stronger as the deadline approaches. Theme colors and lighting controls apply to the new effects.

At zero, the existing digits stay fixed and fade on their original envelope. Light gathers, releases into a broad streak, and carries into the logo and title. The logo starts before the zero has fully faded, eliminating the empty interval. Glyph sparks release during the fade. The message resolves with a gentle inward movement and one metallic sheen; fireworks and confetti retain their existing switches. Scene position is driven by elapsed deadline time, so refresh and wake restore the correct stage.

## Prize countdown and reveal

Open **F2 → Prizes → Add prizes** to build a saved prize library. Add several pictures at once, or add more later. Every prize keeps its own name, countdown duration, reveal duration and message. **Edit** opens that prize’s settings; valid edits save automatically, and **Save prize** saves immediately. **Replace image** keeps the existing timings and text.

Each prize card has **Start / Restart**, **Show now**, **Stop** and **Edit**. Start uses that card’s saved settings even if you are editing a different prize. Show now skips its countdown and begins the selected reveal hold immediately. One prize occupies the small bottom display; starting or showing a different prize replaces the active one. Stop hides it, leaving its saved configuration ready to start again.

The pinned **On screen** controls stay accessible while scrolling through settings. **Pause prize** holds the countdown or the remaining reveal time; **Resume prize** continues from that point, including after refresh or sleep. **Reveal now** finishes the active countdown immediately. The Control tab also offers pause/resume, reveal and hide. An active prize must be stopped before removal, and removing a prepared prize clears its prepared cue.

The secondary countdown and revealed prize stay compact at the bottom. Starting, pausing, revealing or hiding a prize never moves, shrinks or repositions the main campaign countdown or launch content. Its deadline remains unchanged. The image keeps its transparency without a rectangular backdrop. **More actions → Test in 10 seconds** rehearses the selected prize without changing its saved countdown duration.

**Show revealed prize for** offers 20 seconds, 1/5/15/30 minutes, 1/2/4/8 hours, **Until I hide it**, or a **Custom duration** in hours/minutes/seconds. This is the display time after the prize countdown ends. A custom duration of zero also holds until hidden.

**Text with revealed prize** adds an optional message beside the revealed image, up to 160 characters and three lines. Line breaks and Hebrew text are supported; leaving it empty shows only the image. Countdown duration, reveal duration, name and message save separately for each prize. **More actions → Prepare as next prize** snapshots them for later. To change an already running/revealed prize, use **Apply to current prize**; its countdown deadline stays unchanged.

Upload a PNG or WebP with actual transparency for a floating cutout prize. Transparency is preserved when processing and saving the image; the scene shows through the clear pixels. The full image fits without cropping or stretching. A background already inside an opaque picture remains part of that picture.

Prize photos and their saved configurations use a separate IndexedDB database; the active prize deadline uses its own localStorage key. Refresh and sleep recover the current prize phase from wall-clock time. A deliberately paused prize stays paused until resumed. Campaign deadlines and campaign preview clocks are unchanged by prize controls. Expired prize reveals stay dismissed; a zero-duration reveal hold stays visible until stopped. If browser storage is restricted, prizes work for the current session and settings explain the persistence limitation.

## Zero continuity

The particle renderer remains mounted through zero, retaining dust positions, light-catch phases and smoothed intensity. Only the celebration cue state resets when a new launch begins. The horizontal streak through zero and the title area has been removed; soft blooms and side flares remain.

## Control dashboard and rehearsal

F2 opens **Control** with the live deadline, display source, photo and prize status. **Diagnostics** expands session uptime, frame rate, p95 frame time and JS heap when Chrome exposes it. **Control → Diagnostics → Download health report** saves a local JSON snapshot without image data. The 40-second **Run full rehearsal** checks normal presentation, unit changes and the complete finale, then restores the real clock. Stop rehearsal restores it immediately. Active prize clocks continue on real time.

Operator shortcuts, ignored while typing:

| Shortcut | Action |
| --- | --- |
| F2 / Ctrl+Shift+S | Toggle event control |
| Alt+O | Toggle control dashboard |
| Alt+→ | Next photograph |
| Alt+P | Pause/resume photo cycling |
| Alt+R | Start the prepared prize |
| Alt+H | Stop/hide the active prize |

## Subject framing and adaptive photo light

In **Photos → Frame photo**, select a focal point on the original picture or use the horizontal/vertical sliders. TV/landscape and phone/portrait positions save separately. The two crop previews show the resulting cover framing. Framing is stored with the photo in IndexedDB. The same native image and crop are used during and after every reveal. Older pictures default to a centered crop.

**Match lighting to photographs** is enabled by default. Photo brightness/highlights are sampled locally at low resolution, once per image. Bright photos receive softer flares and a little more darkening; darker ones retain stronger atmospheric light. Light strength and darkening transition gradually, and the original image colors are not rewritten. No photographs are sent anywhere.

## Prepared prizes and reveal

In **Prizes**, edit the next prize’s settings, then choose **More actions → Prepare as next prize**. This leaves an active prize countdown unchanged. Start it later from Control or Alt+R; clear it from Prizes if plans change. At zero, the timer gives way to a small, uncropped floating image and optional message beneath the campaign clock, with a restrained light build and gentle fade. The campaign clock keeps its original size and position. Reduced motion uses a short dissolve with no layout travel.

## Browser review and hardware acceptance

The production web build was exercised in headless Chrome with synthetic fixtures: uploads, saved framing, adaptive image analysis, prize preparation and reveal, keyboard controls, responsive layouts, anchored zero, rehearsal restoration, refresh persistence, reduced motion and cached offline reload. Standalone packaging checks verify embedded scripts, fonts and assets. The original artwork and the physical TV were not available for that review. Fullscreen entry/exit did not complete in headless Chrome. See **TV-REHEARSAL.md** for the event-laptop and overnight checks.

To repeat the scripted review, use a fresh Chrome profile with remote debugging on port 9226 and serve the production build at http://127.0.0.1:4177/. Then run `TORAH_REVIEW_RESET=1 npm run test:browser` (POSIX shell; set that environment variable separately in PowerShell). The script intentionally resets its localhost test origin, generates its own synthetic pictures in a temporary directory, and writes screenshots/results there. Never connect it to a live event browser profile. `TORAH_CDP_PORT` and `TORAH_APP_URL` override the defaults.

## Photo rendering and performance repair

Silk veil, Lightfall, Watercolour and Ink spread sample the original full-resolution photograph and a small arrival field in one WebGL pass. The old per-frame SVG color-matrix filter has been removed. Zoom, focal framing and the reveal share one continuous camera calculation; the same GPU image stays visible after completion. Velvet blend and Gallery glide keep compositor animations on native images.

The small 16-bit arrival texture and optional Watercolour frame are prepared once per appearance, using an inline worker when available. During reveal, only small GPU uniforms change; no SVG filter is invalidated. Settled images skip unused mask sampling, and camera parameters are cached rather than reparsed every frame. Temporary texture URLs are released after upload. The idle preparation worker terminates after 60 seconds, and outgoing GPU contexts/textures are explicitly released. Graphics context loss falls back to a native photograph. Photo rendering suspends after the three-second fade-out and resumes when the slideshow returns, keeping invisible photos from using graphics capacity during the final seconds and fireworks. The worker and all code remain embedded in the standalone HTML.

Original-resolution photos are predecoded ahead in a bounded two-image cache (with a 20-megapixel retention budget). Large frames are evicted rather than resized, and deleted gallery frames are released. Photo source URLs are reused across metadata edits and reordering. Visible and outgoing layers hold explicit leases, so old sources are released when the layer is actually removed rather than by a timer. New imports decode once for the full image, analysis and thumbnail. Existing uploaded pictures work with both renderers.

Countdown units, unchanged digits and slideshow layers skip unrelated React renders. Firework trails reuse fixed double-precision buffers; confetti enters its correct depth order at birth, and reflective shades are cached. Particle counts, detail, source-photo resolution, selected mask quality, lighting and finale features are retained. Rendering quality controls affect mask detail and decorative canvas load. Automatic avoids software WebGL and uses native blends if graphics acceleration is unavailable; after sustained slow GPU rendering, subsequent handoffs use native blends for ten minutes. High keeps the GPU reveals enabled. Low uses native blends and reduces decorative effects. The GPU photo buffer retains full 4K at 1× device pixel ratio and up to 2× on phones, capped near 8.4 megapixels; it is independent of the decorative-effects buffer. Auto caps the celebration canvas near 2.1 megapixels, High near 4.2 megapixels, and Low near 0.65 megapixels. Under sustained slow rendering, the effect buffer reduces further and particle density adjusts gradually. Real TV frame rate and multi-day endurance still require the event laptop.

## Final-ten light framing

The anticipation glows use screen-safe elliptical footprints with their complete soft falloff inside the viewport. Their positions and dimensions adapt on resize, including portrait and short landscape phones, without per-frame layout measurements. The final-ten brightness and beat remain continuous through zero.

The soft light behind the numbers now uses a closest-side ellipse that reaches full transparency inside its own bounds. This removes the horizontal cutoff beneath the seconds while retaining the moving glyph glow and final-ten pulses.

## Centered launch and gallery clearing

The launch message stays centered horizontally and vertically, independently of the logo above it. Words use balanced spacing and wrap into centered lines on phones. Confetti and fireworks start from the same celebration cue and overlap through the message reveal; their switches, intensities and reduced-motion behavior remain available.

In **Photos**, choose **Clear gallery**, then **Clear all photos** in the in-panel confirmation, or **Cancel** to keep them. This works without browser popup permissions. Clearing releases the slideshow and persists an empty gallery, including for exported files with embedded photos. If storage is blocked, the status explains that the change lasts for the session and can be preserved by exporting a new HTML.

## Reliable uploads and photo organization

Uploads run in a persistent queue while the app stays open, even after closing settings. Photos appear as they are prepared; a corrupt or unsupported file does not discard the good files. Progress shows the current filename and completed count. **Stop** keeps accepted photos and cancels the remaining work; late decoder results are ignored and released. **Retry failed photos** retries just the failed files. Decode and encoding timeouts prevent indefinite busy controls. JPG/PNG/WebP files with missing or unusual MIME metadata are accepted by filename; HEIC/HEIF gets a clear instruction to export as JPG.

**Skip identical uploads** compares SHA-256 source fingerprints when Web Crypto is available, including across refresh/export for newly imported files. Turn it off to deliberately add a duplicate. Legacy photos without source fingerprints are retained without guessing whether their filenames identify the same picture. Original quality is not reduced beyond the existing 4096-pixel/94%-WebP import policy. If optional preview/analysis or WebP encoding fails, a successfully decoded original remains usable; existing image bytes and framing are not rewritten by the upload pipeline.

Find photos by filename, select individual items or all search results, and remove a selected group with confirmation. **Sort A–Z** uses natural filename order; **Reverse**, dragging, and up/down buttons change the saved gallery order. Numbered rows show the actual sequence. **Frame photo** retains separate TV and phone crops. Open **Slideshow settings** above the gallery for ordered/shuffled playback, transitions and timing. Thumbnail URLs are released when rows unmount.

Saving is serialized and coalesced to the latest state. Unchanged photo records are not rewritten for every added file. The status distinguishes **Saving gallery**, **Saved on this device**, and **Session only**. Storage failures retain current-session photos and offer **Retry saving**; **Control → Export complete HTML** also preserves session-only photos. An unread existing gallery is recovered and merged before any new imports replace persistent membership, preventing a temporary storage-read failure from wiping older photos. A confirmed clear remains authoritative during recovery. Export waits for pending gallery saves and includes the current order, media, fingerprints and crops.

## Browser full screen

**Settings → Control → Enter full screen** requests browser fullscreen for the entire document with navigation UI hidden. The same button is available in the footer of every settings section. A successful entry closes settings; reopening settings shows **Exit full screen**, and exiting keeps settings open. External fullscreen changes update the labels. Duplicate clicks are blocked while switching.

Entry requires a real button click and browser support. Standard and prefixed WebKit fullscreen APIs are supported. Rejected or unresponsive requests keep settings open, restore the button and show a pinned fallback message: **F11 / Fn+F11** on Windows, **Control+Command+F** on Mac, or Home Screen guidance on unsupported iPhones/iPads. Browsers control fullscreen permission; the app cannot override a blocked viewer or embedded frame. Changing fullscreen never changes the campaign deadline, preview, photos or prizes.

## iPhone HTML viewer export

Export complete HTML now prepares a snapshot without starting a download or navigating away. After preparation, desktop browsers offer Download HTML; file-capable share APIs offer Share HTML file from a second direct tap. On iPhone/iPad, unsafe download navigation is omitted. Copy complete HTML uses the clipboard when permitted and otherwise displays selectable source with Select HTML.

For HTML Viewer Q, keep the configured original. Prepare the export, copy the complete exported HTML (use Show HTML → Select HTML and the native Copy menu if necessary), then create a new HTML document or duplicate a file in the app, replace its entire source with the copied text, and save as .html. The new source includes settings, logo, photographs and prizes. Check the new copy before removing anything. This source-editor workflow requires the viewer to permit editing and pasting; its native Share/Archive alone is not a verified backup of browser storage. Q’s native editor/share integration was not available for testing. The app cannot bypass a viewer that blocks native sharing, clipboard access and source editing.

## HTML viewer export recovery

Export assembly inserts escaped package data into the immutable standalone shell without parsing a second document containing the embedded app and images. Sharing reuses a single File object. These changes reduce export-time memory pressure in older embedded viewers without changing display effects, photo quality or normal browser controls.

A single latest prepared export is saved separately in IndexedDB when storage permits. If the viewer reloads or settings close after preparation, reopen Settings → Control: **Recovered your prepared export** offers the saved file without regenerating it. Show HTML loads recovered source only when requested, using FileReader for older viewers. The recovery file is a snapshot; prepare again to include later edits. Recovery depends on the viewer permitting persistent storage and the save completing before any app termination. Keep your configured original until a copied/shared export is checked.
