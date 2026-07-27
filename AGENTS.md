## UI Common Module

- Shared shop config helpers must expose behavior flags and operational settings only.
- Shared formatting and text-normalization helpers must live in `src/utils/formatter.js`; feature modules should import `Formatter` from `ui-common` instead of creating local formatter helpers.
- Institutional media roles such as `logo`, `icon`, `stamp`, and `pin` must stay in company media payloads from `people_media`, not URL configs.
