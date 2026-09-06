# Security policy

Vite Styleguidist is a maintained fork of React Styleguidist. This policy covers the `vite-styleguidist` npm package and the code in this repository only.

## Supported versions

Security fixes are released for the latest minor of the current major line. We don’t backport fixes to older majors.

| Version | Supported |
| --- | --- |
| `vite-styleguidist` 1.x | Yes |
| `vite-styleguidist` 1.0.0-next.N | Yes, while `next` is the only published line; fixes land in the next prerelease |
| `react-styleguidist` 13.x and older | No: that is the original package, maintained separately at [styleguidist/react-styleguidist][upstream] |

See the [migration guide](docs/Migration.md) if you are still on `react-styleguidist`.

## Reporting a vulnerability

**Please don’t open a public issue, discussion or pull request for a security problem.** Public reports put every user at risk before a fix exists.

Use [GitHub Private Vulnerability Reporting](https://github.com/vite-styleguidist/vite-styleguidist/security/advisories/new) instead: it opens a private advisory that only you and the maintainers can see, and it gives us a place to work on the fix and to publish a CVE and release notes when it is ready. If the form is unavailable for any reason, email mihail.alexe@outlook.com with “security” in the subject line.

A good report includes:

- the version of `vite-styleguidist` (and of Node.js and Vite, if relevant),
- what the vulnerability is and what an attacker can do with it,
- steps or a minimal project that reproduces it,
- whether it is already public somewhere.

## What to expect

- **Acknowledgement within 7 days.** This project is run by volunteers, so please allow for that; if you don’t hear back in a week, send a reminder through the same channel.
- **A fix on a best-effort basis**, prioritised by severity. We will keep you informed about progress and ask for your help validating the fix if needed.
- **Coordinated disclosure.** We ask you to keep the report private until a fixed version is published. We will publish a GitHub security advisory and a release with the fix, and credit you in it unless you prefer to stay anonymous.

## Scope

Keep the following in mind when deciding whether something is a vulnerability in Vite Styleguidist:

- **Styleguidist runs at development and build time**, on the machine of the developer or the CI runner, with the permissions of that user. It is not meant to be exposed to untrusted networks: the development server exists to preview your own components.
- **Examples run arbitrary code by design.** The interactive playground compiles and executes the JavaScript written in your Markdown examples and typed into the editor, in the browser of the person looking at the style guide. That is the feature, not a bug: don’t report “the playground executes code”. Do report ways to escape from it that you wouldn’t expect, such as the development server reading or writing files it shouldn’t.
- **The built style guide is static HTML, CSS and JavaScript.** Vulnerabilities in the components you document, or in the server you host the build on, are out of scope here.
- **Dependencies.** For a vulnerability in one of our dependencies (Vite, React, react-docgen, etc.) please report it to that project. If Styleguidist needs to update a dependency to pick up a fix, open a regular issue or pull request: that is not sensitive.

## Thanks

We appreciate the time and care that go into a responsible report. Thank you for helping keep the project and its users safe.

[upstream]: https://github.com/styleguidist/react-styleguidist
