# Vite Styleguidist themed example style guide

> **Note:** This example uses the local build of Vite Styleguidist (`"vite-styleguidist": "file:../../"` in `package.json`), so the repository root has to be installed and compiled before the example itself; the steps below include that.

This example customizes the look of the style guide with the `theme` and `styles` options pointing to files (`styleguide.theme.js` and `styleguide.styles.js`).

It customizes the colours **in both colour schemes**, which is the choice this example makes and demonstrates. Styleguidist publishes every colour token as a CSS custom property, and a literal in `theme.color.*` replaces that property with one fixed value — so the token stops following the light/dark toggle, and no single colour is legible on a near-white page and a near-black one at the same time (the `#F50` this example used to set was 3.1:1 on the light page, below the 4.5:1 [WCAG AA](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) asks for). So the palette lives in `styleguide.colors.css`, listed in the `require` option, with a light value and a dark value for each colour, and `styleguide.theme.js` points the `link` and `linkHover` tokens at it.

The other choice is a style guide with a single fixed palette: set the colours as literals and set [colorScheme](https://github.com/vite-styleguidist/vite-styleguidist/blob/main/docs/Configuration.md#colorscheme) to `light` or `dark` so the toggle disappears and the palette is never asked to work in the other scheme. `examples/customised` does that.

The example components follow the same rule for their own styles; see `src/components/Button/Button.css` and the [Cookbook recipe](https://github.com/vite-styleguidist/vite-styleguidist/blob/main/docs/Cookbook.md#how-to-make-my-components-follow-the-style-guides-colour-scheme).

How to start locally:

```
git clone https://github.com/vite-styleguidist/vite-styleguidist.git
cd vite-styleguidist
npm ci && npm run compile
cd examples/themed
npm install
npx styleguidist server
```

Then open [http://localhost:6060](http://localhost:6060) in your browser.
