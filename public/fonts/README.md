# Site fonts

These WOFF2 files are exact copies of the font assets served by DEV revision
`0b4e9437f57f8658b40c6d171fddcdcb9e7c94cf`, captured on 21 November 2026.
The CSS keeps their original families, weights, Unicode ranges, swap behavior,
and fallback metrics. The same Latin files are preloaded. Visitors receive the
same typefaces; builds no longer request Google Fonts CSS or font files.

`manifest.json` records the source URL, byte length, SHA-256 and preload status
of each asset. The font-face declarations live in `src/app/fonts.css` and
`src/app/v2/fonts.css`; layouts read the manifest for preload links.

All five families use the SIL Open Font License 1.1. Each family directory
includes its upstream `OFL.txt`, retrieved from the Google Fonts repository:

- [Anton](https://github.com/google/fonts/tree/main/ofl/anton)
- [DM Mono](https://github.com/google/fonts/tree/main/ofl/dmmono)
- [Literata](https://github.com/google/fonts/tree/main/ofl/literata)
- [IBM Plex Sans](https://github.com/google/fonts/tree/main/ofl/ibmplexsans)
- [IBM Plex Mono](https://github.com/google/fonts/tree/main/ofl/ibmplexmono)

This avoids the extensionless font-URL parser failure tracked in
[Next.js issue 99114](https://github.com/vercel/next.js/issues/99114).
Any future font refresh should retain licenses, update the manifest and CSS,
and pass existing visual checks without changing baselines to conceal drift.
