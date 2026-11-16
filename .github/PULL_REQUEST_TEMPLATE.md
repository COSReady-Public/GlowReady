## What changed

## QA checklist

- [ ] `node --test tests/` passes
- [ ] All 6 styles × 3 formats exported with a portrait, a landscape and a mixed pair: labels fit, watermark visible, footer not clipped, PNG exactly 1080 × H
- [ ] Rejected files show an error: HEIC, a file over 20 MiB, an image over 48 MP, a corrupt file
- [ ] Phone gestures: pan doesn't scroll the page, pinch is smooth, double-tap toggles without zooming the page
- [ ] Overlap and Magazine hit the top photo; Diagonal hits the correct side
- [ ] Keyboard-only flow works, focus is visible, status is announced
- [ ] Tested in iPhone Safari (17 and 18+), macOS Safari, Chrome on Android, and Chrome, Firefox and Edge on desktop
- [ ] DevTools Network shows no request carrying image data
- [ ] Page stays under 400 KB excluding example photos
