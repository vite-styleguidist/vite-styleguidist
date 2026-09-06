# 0006: Brand and logo

- **Date:** 2026-09-06
- **Status:** accepted

## Context

The MIT license covers the code, not the project’s name or its logo. The React Styleguidist logo was designed by Sara Vieira and Andrey Okonetchnikov and is credited as their work in the README; the README image is served from a third-party file-sharing URL that the fork doesn’t control and that can disappear at any time. The name “React Styleguidist” identifies the original project and its maintainers. Reusing either under new ownership without asking would be, at best, impolite, and would make it hard for users to tell the two projects apart.

## Options considered

1. **Keep the name and the logo.** Maximum continuity, no permission, exactly the ambiguity the fork wants to avoid.
2. **Keep the name, drop the logo.** Avoids the artwork question but still claims the original project’s name.
3. **New display name, no logo reuse, ask for permission.** Distinct identity, honest lineage statement, and the artists decide about their work.

## Decision

The display name is **Vite Styleguidist**; the npm package is `vite-styleguidist` (see [Package name](0001-package-name.md)). The **logo is not reused**: the README, the docs and the generated style guide use a plain text header until the fork has a mark of its own. The original name appears only in lineage statements such as “Vite Styleguidist is a maintained fork of React Styleguidist”, together with the sentence “It is not affiliated with or endorsed by the original React Styleguidist maintainers” wherever there is room for it (README, docs, site; not in tiny UI strings). Sara Vieira and Andrey Okonetchnikov are asked whether the fork may reuse or adapt the logo, see the outreach record in [About this fork](../Fork.md#outreach-record); a positive answer would be recorded in a new decision.

## Consequences

- The logo image, the favicon derived from it and the CloudFront-hosted PNG are removed from the README and the site; the credit to the designers stays.
- UI strings, CLI help, the page title and the default footer of generated style guides say “Vite Styleguidist”. Tests that assert on the old name are updated.
- “Styleguidist” on its own remains the short name in prose and in the CLI binary, as it always was.
- If permission for the logo is granted, the fork can adopt it (with credit) without changing anything else in this record’s reasoning.
