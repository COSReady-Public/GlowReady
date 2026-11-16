# Contributing to GlowReady

Thanks for helping. GlowReady is a static site in plain HTML, CSS and JavaScript (ES modules).

## Ground rules

- Keep it dependency-free and browser-only. No build step, no frameworks, no third-party runtime requests.
- Photos must never leave the device. Don't add any upload path, including in analytics.
- Every feature stays free.
- Open an issue before starting larger changes.

## Run it locally

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

## Before you open a pull request

1. Run `node --test tests/`.
2. Export all **6 styles × 3 formats** with a portrait pair, a landscape pair and a mixed pair. Check that labels fit, the watermark is visible, the footer isn't clipped and each PNG is exactly 1080 × H.
3. Fill in the QA checklist in the pull request template.
