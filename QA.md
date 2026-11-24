# Cinematic edition verification

Current verification: **176 automated tests, 36 full-browser regression checks, and 27 focused settings checks passed.** Earlier inline-HTML compatibility checks and the 4K pixel-detail comparison are recorded below. Fullscreen on the event laptop, HDMI/TV frame rate and overnight endurance remain unverified. See `qa/photo-rendering-review.json` and `TV-REHEARSAL.md`.

## Automated checks

- Countdown boundaries at 24 hours, 1 hour, 1 minute, final ten, zero and past deadline.
- Preview isolation, sleep/clock jumps, large day counts and Jerusalem DST edge cases.
- Layout bounds and non-overlap at TV and phone dimensions; stable surviving unit identities and separators.
- Actual Barlow tabular glyph width, palette migration and image-decoder compatibility.
- Startup API fallbacks and photos-only visibility safeguards.
- Complete theme palettes, one-choice application, persistence and migration of prior custom colors.
- Monotonic, continuous intensity at 24-hour, hour, five-minute, minute, twenty-second and ten-second boundaries; bounded sub-second changes in the final minute.
- Launch timeline, shell schedule, reveal order and permanent settled state.
- Production TypeScript build; standalone CSS/font/JavaScript embedding and classic-script syntax checks.

## Photographic background checks

- Visually inspected the new photographic lighting plate before integration.
- Removed WebGL, metal geometry and the associated shader renderer.
- Tested cover framing, portrait light-source retention, long elapsed times, reduced motion, pixel budgets and theme tone curves.
- Confirmed the PNG is embedded in the standalone script and no old geometry shader remains.

## Verification limit

Managed Chrome blocks direct file:// navigation. The production HTTP build has now been tested through its normal localhost URL, including upload/IndexedDB persistence, framing, keyboard controls, prize reveal, offline cached reload and the full 40-second rehearsal. The standalone file has passed embedding and classic-script syntax checks. Fullscreen entry/exit did not complete in headless Chrome. The actual TV, original artwork and overnight endurance still require the event laptop.

## Operator acceptance

- [ ] Load in current Chrome/Edge and upload the original logo.
- [ ] Review normal countdown and 24-hour, 1-hour and 60-second transitions.
- [ ] Review 10-second preview through the complete reveal and settled end screen.
- [ ] Check photo crossfades, reorder, removal and refresh persistence using real photographs.
- [ ] Verify colors, contrast, original logo proportions and safe margins on the actual TV.
- [ ] Check portrait/landscape phones, fullscreen entry/exit and reduced motion.
- [ ] Disconnect internet, refresh and verify settings and media remain available.
- [ ] Verify clock after sleep/wake and run an extended soak on the event laptop.

Latest automated run: 76 tests passed, with production and standalone packaging checks passing. Photo rendering and storage code were left unchanged in this theme/intensity update. The HTML viewer photo failure has not been reproduced.

## Living-background and anchored-zero update

- The approved lighting plate is unchanged. Added independent haze, wandering light, more particle parallax and slightly more visible camera drift.
- Tested bounded light changes, static reduced-motion layers and continuous cover framing across dense time samples.
- The same countdown component remains mounted through zero and fades using opacity only. Tested identical last-second/zero geometry at TV and phone sizes and the zero hold/fade envelope.
- Startup/build and standalone packaging checks pass. Complete browser and TV playback remain unverified.

## Light-rays, digit edges and zero-fade update

- Preserved the approved lighting plate; added three feathered shafts with independent angular movement, brightness changes and layered haze motion. Cached ray and glow textures avoid rebuilding gradients in the animation loop.
- Ambient drawing is capped by quality; digit transitions and particle animation retain their independent animation loops. A timing tolerance accommodates 59.94 Hz HDMI output. Frame rate on the actual event hardware has not been measured.
- Digit masks now have optical padding and soft edges. A separate bloom layer keeps the glow outside the clipped rolling viewport.
- Final-ten pulses finish before the next number and reset to unit scale at zero. Tested the pulse range and progression.
- Zero remains anchored in the existing countdown. Its tested opacity envelope holds for 0.65 seconds and fades smoothly to zero by 2.4 seconds; the component remains mounted through 2.65 seconds.
- 76 automated tests, production build and standalone embedding checks passed. Browser visual playback, physical TV performance and endurance remain unverified.

## Photo visibility diagnostics

Corrected photos-only suppression during the final minute and after launch. Added an admin display status and an isolated full-visibility photo test. The test uses the independent preview clock and temporary appearance overrides; Exit Preview restores saved settings. All 76 tests and production/standalone checks pass. Browser playback could not be verified: local headless Chromium exits on a sandbox socket restriction. The reported Chrome symptom is not yet reproduced, so this does not establish that the hiding condition was its sole cause.

## Photo transitions update

- Added ink spread, crossfade, mist, wipe and iris with persisted selection and bounded duration.
- Tested ink transparency/coverage endpoints, monotonic reveal, feathered partial coverage, different photo seeds, portrait masks and invalid-setting migration.
- Test photos now remounts the slideshow to replay the first reveal, including a one-photo gallery; saved settings and deadline remain isolated.
- 85 automated tests pass. Production and standalone checks pass. Browser visual playback remains unverified in this environment.

## Continuous handoff and effects polish

- Replaced timed outgoing-slide removal with completion-driven handoff. The outgoing photo stays through incoming decoding, matte setup and the full reveal. Added tests across all five styles for delayed completion, interrupted reveals and stale callbacks.
- Attached glow to moving glyphs; removed the fixed duplicate number layer. Hourly pulses follow actual hour-digit decrements, with tests excluding refresh, zero and large clock jumps.
- Centered the display composition and retained anchored zero behavior.
- Moved blended-photo cutoff to ten seconds with boundary/mode tests.
- Added brighter foreground particles, cached sparkle glints, moving light over photos and an expanding launch glow. Particle populations remain bounded and quality adaptation stays active.
- 97 tests pass. Production and standalone checks pass. Browser/TV visual playback and hardware frame rate remain unverified.

## Optical finish and continuous launch handoff

- Replaced the repeated hard cross with two cached, tapered glint textures; added narrow, feathered lens flares and a higher-resolution soft bloom.
- Added bounded, continuously varying optical catches with offset phases and no frame-random flicker.
- Kept zero geometry and its fade unchanged. Moved logo entrance to 1.8 seconds and title entrance to 2.65 seconds. Added overlapping gather, release and handoff lighting cues and a single title sheen. Glyph-particle release now begins during the zero fade.
- The title uses stable text layout and small transforms; no animated letter spacing or changing line wraps. Its scene follows actual elapsed time rather than queued animation delays.
- Added dense tests for optical continuity, bounds, phase variation and overlap from zero through title. 102 tests pass. Production and standalone checks pass.
- Headless Chrome can start with permitted networking, but managed browser policy blocks the local HTML URL. No visual browser playback or hardware frame-rate claim is made.

## Paint-brush transition

- Added persisted Paint brush selection alongside the existing five options.
- Added a shared permanent alpha frame and an alternating brush arrival field. The shared frame preserves transparent margins across every handoff, including reduced motion. The reveal returns to a normal image layer after completion.
- Visually inspected the generated mask and refined the rounded, bristled stroke ends. This inspection covers the mask, not full browser animation playback.
- Tested transparent outer margins, opaque center, partial feathered edges, nonrectangular bounds, increasing painted coverage and persistent edge transparency at completion in landscape, portrait and square layouts. Existing parameterized settings and handoff tests also cover the new option.
- 109 tests pass. Production and standalone checks pass. Full browser/TV playback remains unverified.

## Canvas color crash repair

The reported Chrome failure was reproduced before changing code: all six optical texture theme tests threw an invalid rgba(NaN,...) color. The color mixer emitted rgb(...) text while rgb()/rgba() expected canonical six-digit hex input. The mixer now returns canonical hex, preserving the visible color while allowing nested mixing and alpha conversion. Regression tests execute bloom, flare and both glint texture builders across all six themes with strict gradient-stop validation. Seven new tests failed on the original code and pass after the repair. All 116 tests, the production build and standalone checks pass. This is a reproduced runtime color-contract fix; browser visual playback remains unverified.

## Varied ink, continuous particles and secondary prize countdown

- Ink now varies origin positions, orientation, flow and session/visit seed. Photo canvas and image use the same elapsed-time zoom curve during reveal and after handoff. Tested repeated appearances, different sessions, zoom during reveal, handoff continuity and reduced motion.
- Removed launchAt from the renderer effect dependencies. The existing dust array, sparkle phases and smoothed energy persist through zero; celebration arrays/cues reset separately. Made sparkle period independent of changing intensity to avoid phase acceleration after long uptime. Tested smooth phase at ten days elapsed.
- Removed central release/title flare streaks; retained soft bloom, side flares and existing anchored zero fade.
- Added a bottom prize countdown with multiple saved prize pictures, selected prize/name, arbitrary positive HH:MM:SS duration, ten-second test, timed or indefinite reveal, and Stop/hide. A separate IndexedDB database and localStorage key preserve the active run without altering campaign settings or previews.
- Tested duration validation and long-hour formatting, exact zero, timed dismissal, indefinite hold, refresh/sleep recovery, corrupt runs and campaign preview isolation.
- All 125 automated tests pass; production and standalone checks pass. Prize image persistence and visual playback still require a real browser/device acceptance run.

## Complete production-polish update

- Added separate persistent TV/phone focal-point editing, crop previews and matched native/canvas cover positioning during zoom.
- Added local, cached low-resolution photo luminance analysis. Bright photos receive gentler flares and additional darkening; transitions smooth the adjustment. An admin toggle disables adaptation.
- Added coordinated final-ten lighting beats aligned with rolling-number pulses; zero remains neutral and anchored.
- Enhanced the bottom prize reveal with anticipation light, a larger uncropped image and a soft wipe. Prepared next-prize state persists separately and does not change an active countdown.
- Added Control dashboard, current/next photo status, real deadline separate from previews, prepared/active prize status, browser frame metrics, session uptime, optional JS heap reporting, JSON export, pause/next controls and keyboard shortcuts.
- Added a 40-second timed rehearsal with automatic restoration and cancel support. Campaign settings and prize clocks remain independent.
- Browser screenshot review found a transient 4K-to-phone clipping issue; resizing now uses a short transition while unit removal retains its slower choreography. Repeated checks include every numeral’s viewport bounds.
- 135 automated tests and 26 browser checks passed. Browser checks use generated fixtures and a fresh localhost profile; no real user data is reset. Fullscreen was explicitly recorded as unverified in headless Chrome, not counted as a pass.
- Added the reproducible `npm run test:browser` runner and a physical TV/overnight acceptance checklist.

## Native photo rendering and optimization repair

- Reproduced the root cause in source: ink/brush photo copies were capped near 1.3 megapixels and redrawn at approximately 30 fps before switching to a native image.
- Removed that photo canvas. A single native image now stays visible throughout the reveal and uses the browser animation system for zoom. Only a small alpha arrival texture is animated, using a native SVG mask. Softening is applied to the mask edge, not the photograph.
- Pattern textures and the permanent brush frame prepare in an embedded worker. Tested worker creation and responses while the browser network was offline, plus the worker-unavailable fallback.
- At 3840×2160, compared 1,751,096 fully revealed pixels with the unmasked image: mean absolute RGB difference was exactly 0 in this fixture. Checked that the same image element and its zoom animation remain after completion.
- Added explicit URL ownership for gallery and outgoing layers; tested reuse across metadata edits, delayed layer disposal, and 1,000 cleanup cycles. The browser confirms framing edits reuse the displayed source.
- Imports decode once for display image, thumbnail and analysis. New images retain up to 4096 pixels at the long edge with higher-quality WebP encoding. Separate small gallery/prize thumbnails reduce decoding and display memory.
- Separated effect-canvas pixel budgets from native photo/text resolution. Quality adaptation preserves positions and changes particle density gradually.
- All 145 tests and production/standalone checks pass. The 27-browser-check regression includes offline cached reload, prizes, focal points, reduced motion, phone/4K bounds and the full finale rehearsal. Additional inline-HTML checks cover offline brush reveal, worker use, resource release and fallback.
- Direct file:// navigation remains blocked in the managed browser. The actual classic bundled HTML was served via localhost, then exercised offline; all scripts/worker code/assets are embedded. This does not certify event-hardware frame rate or overnight stability.

## Floating prize and final-ten light correction

- Removed the prize card, its fill/border/shadow, filename caption and rectangular reveal wipe. The secondary timer remains at the bottom, then the prize fades and gently scales into a large transparent hero region. The campaign clock makes room above it. The image retains its aspect ratio and source alpha.
- Imported a synthetic RGBA PNG through the actual upload control and checked its decoded saved pixels: corner alpha 0, subject alpha 255. Computed styles confirm no panel fill, border, box shadow or clip path. Large image bounds and separation from the campaign clock pass at 1080p, 4K and 390×844.
- Measured countdown layout before presentation transforms to prevent double shrinking on refresh. Froze prize-related clock framing through the main zero dissolve. Browser checks cover refresh, reduced motion, restoration after hide, simultaneous prize reveal/main zero and a prize over the settled campaign launch.
- Replaced width-based final-ten circles that extended below the display with cached, aspect-aware elliptical footprints. Five unit cases cover 1080p, 4K, portrait phones and short landscape. Full falloff stays inside a safe margin at every build scale. Inspected final-ten screenshots at 1080p and phone size.
- All 150 unit tests, production build, standalone embedding/syntax checks and 32 browser regressions pass. Eleven additional focused checks pass, including transparent prize decoding while offline in the bundled HTML served over localhost. No runtime exceptions were recorded.
- Direct file navigation remains restricted in managed Chrome; hardware fullscreen, actual HDMI/TV rendering and overnight endurance require the event laptop. Reports: `qa/browser-review.json`, `qa/prize-light-review.json`.

## Ordered/shuffled photos and Emerald & White

- Photos now offers **Photo order → In gallery order / Shuffle**, saved in localStorage. Older settings default to gallery order. Fisher–Yates shuffle bags show each photo once per cycle and prevent an immediate repeat across cycle boundaries. The current photo stays visible when changing modes; the persistent gallery is never rearranged. The dashboard announces the queued next photo, including across a reshuffle.
- Playback stores only the active and following cycle. Metadata edits preserve the active shuffle; additions, deletions and gallery reordering reconcile the playback sequence without referencing removed photos. Image predecoding, photo URL leases and native resolution transitions are retained.
- **Emerald & White** uses the original emerald master photograph and identical green/gold palette, with white countdown digits. The original theme remains available.
- All 158 automated tests and standalone build/embedding/syntax checks pass. Ordering tests exercise 100 shuffled cycles, loop boundaries, zero/one/two photos, mode switches, gallery edits and preference migration. Theme tests cover complete palettes, saved restoration and unchanged background/effect colors.
- Chrome regression passed 35 checks. A separate five-photo browser run verified actual gallery order, three complete shuffled cycles, no immediate repeats, accurate current/next reporting and unchanged IndexedDB ordering. The bundled HTML restored both options and photos with the network disabled. The 10 focused checks recorded no runtime exceptions. Phone and 1080p white-number screenshots were inspected.
- Reports: `qa/browser-review.json` and `qa/order-theme-review.json`. Direct file navigation, hardware fullscreen, actual HDMI/TV rendering and overnight endurance retain the limits noted above.

## Compact prizes, long reveal holds, corrected glow and ink

- Removed all prize-dependent changes to campaign clock/header/launch sizing and position. Countdown and reveal use a compact lower band. Caption text is optional; transparent PNG/WebP artwork stays uncropped and retains alpha.
- Added reveal duration presets through eight hours, including two hours, an indefinite hold, custom HH:MM:SS, and a saved per-prize message (160 characters / three lines). Prepared prizes snapshot text/duration independently. Applying changes to an active prize preserves its original countdown deadline. Legacy runs and prepared prizes migrate with an empty message.
- Tests cover exact two-hour expiry, refresh/sleep recovery, custom durations, message validation, legacy data, and active deadline preservation. The browser exercised the actual preset/message controls, saved preparation, ten-second reveal, applying custom 2:03:04, restoring the editor, and a simulated one-hour sleep. Compact image and caption bounds pass at 1080p, 4K, portrait and landscape phone sizes; campaign bounds are identical before/after reveal.
- Isolated the visible horizontal cutoff to `.number-aureole`: its farthest-corner gradient was still colored at the rectangular bottom edge. Replaced it with a closest-side ellipse fading to zero at 95%. Actual Chrome screenshots on black reproduce the old edge at RGB channel maximum 4, and show the new edge at 0; the luminous center remains visible at RGB (36,32,23). Both desktop and phone comparisons pass. The existing glyph roll/glow remains synchronized, with zero positional difference across 70 sampled frames. No extra glow animation layers remain.
- Reworked ink into one connected, domain-warped bloom with aspect-correct growth, wider native SVG alpha feathering and smooth timing. Removed separate round satellite holes. Photo resolution and native compositor zoom are unchanged. The outgoing photo stays mounted underneath the complete incoming spread. Tests cover connected coverage across portrait/landscape ratios, varied seeds, finite normalization and matte endpoints; browser checks cover real native feathering and overlapping photos.
- All 167 unit tests, production build and standalone checks pass. Chrome regression passed 36 checks; 17 focused checks passed with no runtime exceptions. The bundled HTML restored custom prize options while offline. Reports: `qa/browser-review.json`, `qa/compact-prize-ink-review.json`. Physical HDMI/TV, hardware fullscreen and overnight endurance remain unverified.

## Independent saved prize library and live controls

- Replaced shared prize form state with a saved library: each prize stores its name, image, countdown duration, reveal duration and caption. Existing images retain reveal options and receive a five-minute countdown default when they have no saved countdown. An existing active run keeps its own deadline.
- Added card-level Start/Restart, Show now, Stop and Edit, multi-image imports, image replacement and inactive removal. Starting a different card uses that card’s settings and replaces the single on-screen prize. Active removal is disabled; removing a prepared prize clears its cue.
- Added a pinned On screen console with pause/resume, reveal now and stop, plus Control dashboard quick actions. Pause freezes either the countdown or reveal hold across refresh/sleep. Resume shifts only the prize deadline to preserve remaining time. Main campaign time and layout remain independent.
- Valid edits autosave after 500 ms, on blur, or when leaving an editor. Invalid partial edits retain the last valid saved configuration and show feedback. Per-prize patches read a current gallery reference and immutable snapshots write serially, preventing stale saves from overwriting another prize or a replaced image. Thumbnail/object-URL leases are released on unmount.
- All 176 unit tests and production/standalone checks pass. New unit cases cover independent options, legacy defaults, invalid timing, pause/restore/resume, paused reveal holds, immediate reveal and corrupt pause metadata and backwards local-clock corrections.
- Chrome regression passed 36 checks. A 26-check multi-prize exercise verifies distinct saved configurations, start while editing another prize, pause/resume after refresh, immediate reveal, switching, inactive stop safety, invalid input recovery, closing before autosave, prepared isolation, active caption application, image replacement, removal protection, phone bounds and offline controls. A further five checks verify sticky controls on desktop/phone and the default Control dashboard’s pause/resume/reveal actions. No runtime exceptions were recorded.
- Reports: `qa/browser-review.json` and `qa/prize-library-review.json`. Physical HDMI/TV, hardware fullscreen, direct file navigation and overnight endurance keep the limits described above.

## Settings cleanup and responsive navigation

- Replaced decorative headings and long introductory paragraphs with plain section names. Added compact grouped controls, a consistent autosave footer and Done action, readable mode/quality option names and small theme cards. Removed the unused event-title field and duplicate countdown-size control. Launch text now belongs to Finale.
- Common controls remain visible; lighting/particles, photo treatment, diagnostics, keyboard shortcuts and secondary prize actions use native collapsible sections. Prize library cards, editor and pinned on-screen controls retain their functions with less copy and padding. Diagnostics and health reports remain available.
- All eight navigation sections are visible on phones without sideways scrolling. Short landscape screens use a compact two-column sidebar. Tabs support arrows/Home/End, reset scroll and isolate native collapsible state. Modified arrows are ignored by tab navigation so Alt+Right retains its slideshow behavior. Preview status/exit is available in every settings header.
- All 176 logic tests, production/standalone checks and 36 real-Chrome regressions pass. The browser regression now opens Diagnostics before requesting a report and treats Runtime.evaluate exceptions as actual test failures.
- Twenty-three focused settings checks cover real advanced controls, a native switch click, persistence, readable options, duplicate removal, global preview exit, Done, offline bundled HTML and 32 panel/viewport combinations across desktop, phone, 320×568 and landscape. Four additional navigation checks verify independent collapsible state and live keyboard shortcut behavior. No runtime exceptions were recorded. Representative desktop/phone panels were visually reviewed.
- Reports: `qa/browser-review.json`, `qa/settings-review.json`. Event-laptop fullscreen, physical TV/HDMI rendering, direct file navigation and overnight endurance retain the limitations recorded above.

## Complete photo-transition rebuild

- Removed the old ink, brush, crossfade, mist, wipe and iris models. Five new styles—Velvet blend, Gallery glide, Silk veil, Lightfall and Watercolour—use eased overlapping native images, coordinated camera movement, new seeded flow fields and optional painted contours. Varied cinematic avoids back-to-back style repeats. Old saved choices fall back to Velvet blend without changing event dates, photos or prizes.
- The incoming photo decodes and prepares its matte before starting. The outgoing photo remains underneath through completion. Rapid skips keep the active handoff and retain only the latest queued request, with no more than two mounted native images. Watercolour's outgoing edges fade only in the reveal tail.
- Native image zoom continues through the reveal and afterward without an image swap, scale reversal, lower-resolution canvas copy or blur. Reduced motion freezes the exact image pose and uses a short blend. Small masks are prepared once per appearance in the embedded worker; temporary mask URLs are revoked after use.
- All 178 automated tests, the production/standalone builds and embedded-file checks pass. Chrome regression passed 36 checks. Seventeen focused transition checks cover all styles, overlapping images, rapid skips, bounded resources over 16 handoffs, varied selection, reduced motion, portrait and 4K framing. Five additional checks cover native 4K source retention, offline standalone Watercolour, no-worker preparation and unsupported-mask fallback. No runtime exceptions were recorded.
- A paused 4K render compared 510,862 confidently opaque pixels before and after removing the reveal mask: maximum RGB channel difference 0. Early/middle/settled frames were visually reviewed using synthetic fixtures. Final Watercolour contours received additional irregularity after that review; edge/coverage tests and the offline fallback checks passed with the refined frame.
- Reports: `qa/browser-review.json` and `qa/photo-transitions-review.json`. Direct file navigation is restricted in managed Chrome; the standalone was served locally and operated with network disabled. Physical GPU/TV frame rate, hardware fullscreen and multi-day endurance remain separate acceptance checks.

## Smooth playback and complete event-file export

- Replaced the per-frame full-screen SVG color-matrix reveals with a single-pass WebGL photo renderer. The original-resolution image stays on the same GPU surface through entrance, zoom and departure. Velvet/Glide and compatibility fallback use compositor animations on native images. Image decoding and two compositor prewarm frames complete before a handoff starts.
- Automatic quality avoids software graphics, oversized textures and unavailable contexts. Sustained slow rendering switches subsequent handoffs to native blends for ten minutes; High retains GPU reveals and Low bypasses them. Photo buffers retain 4K at 1× and up to 2× on phones, capped near 8.4 megapixels independently of decorative canvas quality. Outgoing programs, textures and contexts are released. Reduced motion freezes the current GPU camera; context loss restores a native photo. Hidden photo rendering suspends after its fade and resumes when photographs return.
- Added **Control → Export complete HTML**. The downloaded file includes the complete app, fonts, background, current saved settings, original logo bytes, all photographs/thumbnails/framing, prize images and individual options, prepared prize and any active/paused prize. Campaign and prize timestamps remain absolute; preview/rehearsal clocks are excluded. Export awaits queued prize saves and captures the final valid edit.
- Each export has independent settings/database names. Embedded media works without requiring an initial IndexedDB import or localStorage write. Explicit removal markers preserve an empty gallery or stopped prize after refresh. Export can be repeated after edits without nesting an old application or retaining the old base64 payload in memory. Embedded JSON escapes script endings and preserves Hebrew captions. The web package caches its standalone export template too.
- All 195 automated tests, production/standalone builds and embedding/syntax checks pass. The final Chrome regression passed 36 checks. Eighteen export checks verify actual downloads, a fresh-origin restore, exact photo bytes, original logo, final caption edits, two-hour prize holds, deadlines, offline controls, refresh/edit persistence, re-export, empty galleries, denied storage and phone layout. Eighteen graphics checks verify all three GPU reveals, absence of SVG filter mutations, stable image surfaces, reduced motion, context recovery, resource disposal through twelve transitions, phone/4K buffers and automatic/low fallback. Four final-build checks verify hidden-render suspension/resumption and complete HTML export. No runtime exceptions were recorded.
- The browser fixture now uses a two-hour reveal for viewport screenshots and waits for actual thumbnail decoding. This avoids timing failures on slow software-rendered 4K screenshots while retaining the same behavior assertions.
- Reports: `qa/browser-review.json` and `qa/portable-playback-review.json`. Rendering was exercised using headless software graphics, not the event TV. Direct file navigation is restricted in managed Chrome; the HTML was served locally and operated with networking disabled. Hardware fullscreen, physical HDMI/GPU frame rate and multi-day endurance remain unverified.

## Ink spread photo transition

- Added **Photos → Photo transition → Ink spread** and included it in Varied cinematic. Existing supported selections and settings remain valid, including older saved `ink` choices.
- The new ink follows a single connected front through a smooth, seeded permeability field. A bounded typed-array heap and an isotropic fast-marching solve create irregular capillary channels and lobes. Origin, direction and paper flow vary per appearance. A refined wet-edge feather blends directly over the still-opaque outgoing photo; the same full-resolution GPU surface continues zooming after the reveal. There is no persistent border or per-frame SVG filter.
- Preparation runs once in the existing inline worker, with the existing two-frame prewarm, GPU resource cleanup, automatic performance fallback and reduced-motion blend. The new transition is included in configured single-file exports and runs with networking disabled.
- All 204 automated tests, production/standalone builds and embedding/syntax checks pass. New coverage includes isotropy on uniform paper (axis, diagonal and oblique distances), connected growth at multiple progress values/seeds/aspect ratios, varied deterministic origins, complete endpoints, wet-edge blending, saved preference restoration and six-style varied selection.
- Eleven focused Chrome checks pass: the real settings selector, GPU playback without SVG filters, retained outgoing opacity, stable incoming surface with fully opaque corners at completion, phone/4K buffers, portable export, fresh-origin restore, offline worker/reveal playback and reduced-motion fallback. No runtime exceptions were recorded. Early/middle/late frames were visually reviewed with synthetic fixtures.
- Report: `qa/ink-spread-review.json`. Headless graphics use SwiftShader; physical event-laptop GPU/TV frame rate, hardware fullscreen and multi-day endurance retain their prior acceptance limits.

## Varied ink and full-quality playback optimization

- Added eight ink families with distinct origins, directions, elongation and channel structure. Each appearance jitters its family, and consecutive reveals exclude the previous family and nearby origins. Photo-preview replays share the same history. Every profile retains connected growth and complete coverage in landscape and portrait.
- Cached exact noise lattice values instead of repeatedly hashing the same corners. Full 768×432 field benchmarks produced byte-for-byte identical Float64 output while reducing preparation CPU time by roughly one-third on this cloud machine. These timings do not measure TV frame rate.
- Prepare the next selected-quality ink field during the photo hold and reuse it at the handoff. The cache is bounded to two fields with expiry and cancellation. Decode and share original current/next photos ahead of playback with bounded retention; never substitute thumbnails or reduce source dimensions. Unsupported worker environments use native blends instead of blocking the interface with an ink solve.
- Memoized stable display components and effective preview settings, removed repeated GPU transform parsing and redundant shader samples, replaced per-frame trail allocations with fixed double-precision ring buffers, cached foil shades and maintained confetti depth order on insertion. Existing particle counts, trails, output dimensions and quality choices are retained.
- All 218 automated tests, production/standalone builds and embedding checks pass. The 36-check Chrome regression and 13 focused checks pass, including 14 repeated ink reveals, foreground reuse of a prepared field, retained 4K source, unchanged High field dimensions, bounded live GPU/layer resources, phone/4K output, no-worker fallback, complete media/prize export and offline playback. No runtime exceptions were recorded. A mid-reveal synthetic-fixture frame was visually reviewed.
- Reports: `qa/browser-review.json` and `qa/full-quality-playback-review.json`. Physical event-laptop GPU/TV frame rate, hardware fullscreen, direct file navigation and multi-day endurance retain the limitations above.

## Centered launch, coordinated celebration and gallery clear fix

- Anchored the launch message itself to the screen center, with the logo in a separate upper grid row. Replaced trailing nonbreaking word spaces with balanced flex gaps and centered wrapping. Existing metallic reveal, exact launch wording, zero position and fade remain intact. Fireworks and falling confetti share the 0.65-second entrance cue, retain individual switches/intensities and settle on the original schedule.
- Replaced native `confirm()` for clearing photos with an in-panel confirmation and cancel action, so popup suppression in browsers/viewers cannot silently prevent clearing. Removed the post-save gallery state replay that could restore an older snapshot while another edit was saving. Reordering/removal/clearing are disabled during photo import, and clear feedback distinguishes persistent success from session-only clearing when storage is blocked.
- All 219 unit tests, the production/standalone build and embedded-script/font checks pass. Eleven launch browser checks cover centered title and contained logo/words at 1080p, 4K, phone portrait and short landscape, early celebration overlap, reduced motion and runtime errors. A separate draw-level check isolates actual source-over confetti from screen-blended dust: falling foil and fireworks trails both appeared near 1.07 seconds after zero on this machine.
- Nine gallery checks verify in-panel confirmation without native dialogs, cancellation, clearing, removal of displayed layers, unchanged campaign deadline, refresh persistence, embedded-photo removal and no restoration of bundled photos after refresh. No runtime exceptions were recorded. Settled desktop/phone and simultaneous celebration frames were visually reviewed.
- Report: `qa/launch-gallery-review.json`. Physical GPU/TV playback, hardware fullscreen, direct file navigation and multi-day endurance retain the prior limitations.

## Reliable photo imports and organized gallery

- Moved import state into an app-lifetime photo library rather than the settings panel. Input selections are snapshotted immediately, batches run sequentially, accepted photos appear progressively and publish to the live slideshow, overlapping requests are blocked, and closing settings never discards work. Stop uses abort signals; decoder late results are released. Per-file errors, progress, retry-failed and SHA-256 source duplicate detection make partial failures recoverable.
- Validated supported extensions/MIME metadata and the existing size limit before hashing/decoding. Added HEIC/HEIF guidance, timed bitmap/image/encoding work and a compatible browser decoder fallback. Successfully decoded originals survive optional metadata, thumbnail or WebP-encoding failures; fallback blobs receive valid image MIME metadata for portable exports. Existing 4096-pixel/94%-WebP preparation quality and full-resolution playback remain intact.
- Serialized and coalesced saves, incrementally replacing gallery membership while skipping unchanged photo records. Fixed sticky synchronous IndexedDB-open failures, bounded storage waits, connection-version recovery and synchronous transaction exceptions. Quota failures abort atomically, preserve session photos and expose Retry saving. Failed initial reads cannot overwrite an unread gallery; recovery merges stored photos before saving new files, while a confirmed clear remains authoritative against late recovery.
- Added a file drop area and panel drop handling that prevents accidental file navigation, filename search, checkboxes, selecting search results, confirmed bulk removal, natural filename sorting, reverse order, numbered rows and readable file sizes. Drag ordering uses photo IDs; accessible arrows and TV/phone framing remain. Slideshow settings are collapsible above the gallery. Thumbnail URLs are revoked. Export waits for pending gallery saves and includes ordering, crop metadata and source fingerprints, including session-only media.
- All 240 automated tests across 27 files pass, including mixed batches, cancellation, concurrent edits, failed-only retry, read recovery without data loss, authoritative clearing, serialized incremental writes, rollback/retry after quota errors, decode timeouts and original-byte fallback. Production/standalone builds and embedding/classic-script checks pass.
- Seventy browser checks pass: 36 countdown/prize/photo regressions; 21 focused import/organization checks; five portable/offline-library checks; four denied-storage/4K/export checks; and four file-drop/phone checks. Mixed valid/corrupt/unsupported/duplicate files preserve good photos, imports continue with settings closed, reordering and bulk removal persist, actual quota exceptions recover through retry, a 3840-pixel session photo retains full playback width, and exported embedded galleries can be organized/cleared offline without resurrection. Both 390-pixel and 320-pixel phone organizers fit without horizontal overflow. No runtime exceptions were recorded. Desktop and final phone controls were visually reviewed.
- Reports: `qa/browser-review.json` and `qa/photo-library-review.json`. Hardware fullscreen, physical event-laptop/TV frame rate, direct file navigation and multi-day endurance retain the limitations above.

## Prominent browser-fullscreen controls

- Added a prominent Enter full screen card above the Control dashboard and a shared control in the pinned footer. Both request the entire document with navigation UI hidden from the originating click. Confirmed entry closes settings; reopening recognizes Exit full screen. Exit keeps settings open. Standard and prefixed fullscreen-change events update the label, and listeners are removed when settings close.
- Added standard/WebKit API handling, a switching lock and bounded confirmation. Native requests that reject, emit errors or never settle restore the controls with pinned, platform-specific keyboard/browser guidance. This avoids a permanently stuck Switching state when a viewer or automation environment cannot complete native fullscreen.
- All 247 tests across 28 files pass. Seven fullscreen cases cover immediate request invocation with hidden navigation, active-session exit, rejection, prefixed confirmation, unsupported APIs, silent/native timeout recovery and platform-specific fallback guidance. Production/standalone builds and embedded-script/font checks pass.
- Ten browser checks verify the prominent card, actual request options and timeout recovery, accepted entry/exit UI contracts, footer access from another tab, external-change labels, rejection recovery, small-phone containment and no runtime exceptions. Successful API confirmations are explicitly simulated: native browser-window fullscreen did not complete in managed headless Chromium, and a desktop X server was unavailable. Physical Chrome/Edge fullscreen, OS shortcuts and Safari require device acceptance. The Control card and footer were visually reviewed.
- Report: `qa/fullscreen-settings-review.json`. No claim of physical TV fullscreen or hardware frame-rate verification is made.

## Export without viewer navigation

- Split preparation from download. The settings button prepares a complete snapshot without creating/clicking an anchor; Download is an explicit desktop action. iPhone/iPad omits this unsafe download path. Share uses a second user tap and appears only when file sharing is supported. Copy complete HTML falls back to a read-only source area and complete-text selection when the clipboard API is denied. Existing programmatic exportEvent remains a preparation/download wrapper for compatibility.
- All 247 unit tests, production/standalone builds and embedding checks pass. Seven browser checks with an iPhone user agent and denied viewer clipboard confirm no anchor click/navigation, no unsafe mobile download action, selectable source recovery, complete selection, included photograph/settings, fresh-file restoration and no runtime exceptions. Native HTML Viewer Q editing, clipboard and share APIs require device verification; no native-Q success is claimed.
- Report: `qa/viewer-export-review.json`. The new portable export retains full image and settings data without a screenshot/PDF substitute.

## Embedded-viewer export memory and recovery

- Replaced DOMParser-based full-document assembly with escaped string insertion into the captured standalone shell, avoiding a second document tree containing the embedded app/fonts/photos. Sharing memoizes its File wrapper. Full photo resolution, scene effects and browser controls are unchanged.
- Saves one replaceable recovery Blob separately in scoped IndexedDB before presenting the export. Settings reopening loads the recovery draft without rebuilding the file. Recovery storage is bounded by one latest export; read/write/open failures/timeouts are nonfatal. Recovered HTML is read lazily with FileReader rather than immediately populating a large source textarea. Close/backdrop controls are guarded while preparing; persistence also survives external settings closure or page reload after a completed save.
- All 249 automated tests pass, including new no-DOM export assembly and escaped metadata round-trip cases. Production/standalone builds and embedding checks pass. Seven browser checks verify no preparation navigation, recovery after settings close, recovery after a real page reload, retained photo/settings, full source selection, independent opening of the recovered configured HTML and no runtime exceptions.
- Report: `qa/export-recovery-review.json`. Page reload was exercised in Chromium; HTML Viewer Q’s native iPhone memory termination and its storage permissions remain unverified. The symptoms suggest an app reload, but no specific native failure cause is claimed as confirmed.

## Vercel shared event edition

- Added Node API routes for signed admin-cookie authentication, same-origin protected writes, a shared event document in private Vercel Blob, authenticated direct image uploads and short-lived signed media delivery. Event metadata uses consistent private reads and ETag-conditional writes. Deadline, original logo, settings, gallery order/crops, prizes, active prize and prepared prize synchronize; previews stay device-local.
- Public displays lazily load remote current/next images through stable API URLs instead of unpacking an entire photo-filled HTML. Remote images use anonymous CORS for GPU textures. Original image blobs are reused during saves, replacements upload new pixels, and complete offline export fetches remote source bytes explicitly. The hosted admin imports a saved standalone HTML locally and uploads individual assets, keeping large files out of function request bodies.
- All 265 tests across 30 files, hosted production build and standalone embedding checks pass. New service-level cases cover admin signatures/expiry/origin checks, guarded conditional writes, metadata limits, indefinite holds, removal of completed prizes, two-client synchronization, batching, readonly clients, conflicting admins, delayed reads, upload deduplication, stable URLs and replacement images.
- Live backend/browser acceptance is pending Vercel connection and private storage configuration. Managed preview failed at startup with a listen EPERM; no alternative browser path was used. Report: `qa/vercel-shared-review.json`. User assets/deadline are not embedded in the repository.
