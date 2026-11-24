# Event laptop and TV acceptance

The software review was run in headless Chrome using synthetic test pictures. The physical JVC display, actual photographs/logo, HDMI output and overnight operation need a check on the event equipment.

## Before showing the display

1. Replace the existing standalone HTML at its current filename/location and use the same Chrome/Edge profile. Keep backups of original photographs and logo artwork.
2. Open F2 → Event. Verify the real deadline in Asia/Jerusalem and the laptop clock. Upload the original logo if it is not already saved.
3. In Photos, open **Frame photo** for each important image. Set its TV and phone focal points, inspect the two crop previews, and save.
4. Connect HDMI. Choose 3840×2160 at 60 Hz if supported; otherwise 1920×1080 at 60 Hz. Disable TV overscan and begin at 100% browser zoom.
5. Use F11 or the event-control fullscreen button. Check leaving and entering fullscreen on the actual laptop. The headless review did not verify this step.

## Short rehearsal

- [ ] F2 → Control → Run full rehearsal. Watch all unit changes, final ten, anchored zero and launch. The 40-second rehearsal restores the real clock automatically.
- [ ] Check every number and label from across the room. Look for clipping, overlap or awkward photo crops.
- [ ] Check bright and dark photos. Toggle adaptive photo lighting if a different treatment is preferred.
- [ ] Upload/select a prize in Prizes; use Test in 10 seconds. Confirm the picture stays hidden until the end and the campaign clock continues above it.
- [ ] Prepare a different next prize while the first runs. Confirm it starts only when you choose Start prepared prize or Alt+R.
- [ ] Try Alt+O, Alt+→, Alt+P and Alt+H. Restore normal cycling before leaving the display live.
- [ ] Check a phone in portrait and landscape, including the selected portrait crop and a reduced-motion preference.
- [ ] Disconnect internet and refresh the standalone file. Verify deadline, photos, framing and prize state recover. Refresh exits a campaign preview intentionally.

## Overnight check

- [ ] Keep the laptop plugged in, ventilated and awake. Disable plugged-in sleep, display timeout, screen saver and TV auto-off. Schedule Windows updates outside the event.
- [ ] Leave the real countdown running, or use the 10-day preview if no real deadline is configured. Use a normal gallery interval rather than rapid test cycling.
- [ ] Open Control before and after the soak and download a health report. Compare uptime, frame timing and JS heap. JS heap does not include all image/GPU memory; visually check playback as well.
- [ ] Verify the countdown after sleep/wake and reopening. It should catch up from the saved timestamp rather than resume an old number.
- [ ] Exit previews, check the real deadline once more, resume photo cycling, and hide any rehearsal prize before the public display begins.

Frame-rate readings measure browser animation frames, not HDMI/TV output. Hardware testing is required before claiming stable 60 FPS or multi-day endurance.
