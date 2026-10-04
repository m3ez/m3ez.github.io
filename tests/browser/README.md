Run `npm ci`, then `npx playwright install chromium` once.

- `npm test`: data and existing source checks.
- `npm run test:browser`: serves the repository locally and checks cold loads,
  mobile overflow, filters, carousel, navigation and back-to-top in Chromium.

To use an existing Chromium installation, set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium` when running the browser tests.

## Connected divider network

`npm run test:browser` includes `divider-network.test.mjs`. It renders the actual
homepage, rather than a screenshot fixture. To run only these checks:

```sh
node --test tests/browser/divider-network.test.mjs
```

Set `DIVIDER_NETWORK_SCREENSHOT_DIR=/path/to/output` to capture desktop light,
desktop dark, expanded-page and mobile screenshots. The production layer is
initialized by `assets/portfolio-redesign.js` and uses `assets/divider-network.js`
and `assets/divider-network.css`; there are no new runtime dependencies.

The effect requires a viewport of at least 1280px AND at least 72px of spare
space on each side of the content. `--edge-strength` controls the outer fade
(default `.62`); `--edge-max-width` caps each wing in unitless pixels (default
`380`). Attachments match the rendered divider color and border width before
fading outward. Refresh randomizes paths; scroll, resize and theme changes do
not reshuffle them. Reduced motion hides the animated trace. Print and forced
colors hide the entire decorative layer.

For environments that prohibit browser navigation, `DIVIDER_NETWORK_OFFLINE=1`
uses `page.setContent` on `about:blank` and fulfills local asset requests from
this checkout, with no external traffic. This mode tests DOM geometry, events,
styles and responsive behavior, but not HTTP serving, saved storage preferences
or native hash navigation. Run the default mode for full navigation coverage.
