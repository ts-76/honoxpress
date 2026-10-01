# Standard UI design evidence

Observed on 2026-10-01 at 1440×960 and 390×844:

| Reference                                                                                         | Observation                                                                                                                | Starter choice                                                                                                    |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [Nimbus philosophy](https://nimbus-docs.com/philosophy/)                                          | Quiet header, left page tree, restrained right TOC, about 648px reading column; 35px headline and generous section spacing | 680px maximum article, 36px headline, 48px section spacing; thin borders and a small active accent                |
| [Nimbus registry](https://nimbus-docs.com/registry/)                                              | Visible layouts and components remain owned files                                                                          | JSX/CSS templates are copied into consumer routes/components/islands; no themed runtime or installer              |
| [Fumapress docs](https://press.fumadocs.dev/docs)                                                 | Subtle selected sidebar row, bordered code actions, nested TOC; mobile replaces rails with compact disclosures             | Current-page `aria-current`, selectable code with copy feedback, native mobile nav/TOC, no SPA                    |
| [Fumapress config](https://github.com/fuma-nama/fumapress/blob/main/packages/core/src/config.tsx) | Explicit static/dynamic boundaries and caller page/layout ownership                                                        | Standard HonoX renderer owned by consumer, separate package runtime/build entries; dynamic demos stay outside SSG |

Also referenced: [Nimbus source](https://github.com/cloudflare/nimbus), [Fumapress plugins](https://press.fumadocs.dev/docs/plugins), [Fumapress source](https://github.com/fuma-nama/fumapress).

The independently written starter uses system fonts, warm neutral color tokens,
CSS color-scheme and reduced-motion preferences. Desktop rails become native
`details` disclosures below the reading layout breakpoints. Labels and landmarks
remain meaningful without client JavaScript; islands supply only counter/copy
state. Clipboard rejection leaves the code selectable and announces manual-copy
instructions. Missing translations have unavailable text and no invented URL.

QA includes current nav, actual heading anchors, clipboard success/rejection,
repeat navigation, 390px overflow, skip-link keyboard focus, representative dark
body-text contrast, two languages, iframe and true 404s in Vite development and
cf local production. Screenshots are under `examples/poc/evidence/screenshots`.
This covers representative behaviors, not a complete accessibility audit.

Thanks to Nimbus and Fumapress. Both source licenses were checked: [Nimbus MIT](https://github.com/cloudflare/nimbus/blob/main/LICENSE) and [Fumapress MIT](https://github.com/fuma-nama/fumapress/blob/main/LICENSE).
No source code, logo, font, or other asset was copied. Future reuse must retain
the exact source's copyright/license/NOTICE requirements. Their MIT licenses do
not decide this project's license; that decision remains open in Issue #6.
