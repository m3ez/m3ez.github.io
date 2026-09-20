Run `npm ci`, then `npx playwright install chromium` once.

- `npm test`: data and existing source checks.
- `npm run test:browser`: serves the repository locally and checks cold loads,
  mobile overflow, filters, carousel, navigation and back-to-top in Chromium.

To use an existing Chromium installation, set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium` when running the browser tests.
