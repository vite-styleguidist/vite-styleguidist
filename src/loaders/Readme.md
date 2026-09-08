# `src/loaders`

Historical name: these used to be webpack loaders. Today the folder holds the Node-side utilities that the Vite plugin (`src/vite/plugin.ts`) uses to generate its virtual modules:

- `utils/getSections`, `getComponentFiles`, `processComponent` — turn the config into the list of sections and components (`virtual:rsg-styleguide`);
- `utils/getProps`, `sortProps` — post-process react-docgen output (`virtual:rsg-props?…`);
- `utils/chunkify`, `parseExample`, `getImports`, `highlightCode` — split Markdown files into text and playground examples (`virtual:rsg-examples?…`);
- `utils/client/*` — **browser** helpers imported by the generated examples modules (`evalInContext`, `requireInRuntime`).

File references in the generated data are `importIt()` markers, serialized into `import` statements by `src/vite/serialize.ts`.
