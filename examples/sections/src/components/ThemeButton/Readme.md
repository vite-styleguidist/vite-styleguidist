An example of using React Context with a component. The toggle keeps the style guide's own colours (`src/styles.css` paints every element of an example magenta to prove that a global stylesheet of yours reaches your components and nothing else — magenta on a browser's default button face is 1.7:1, so this one says what it wants instead):

```jsx
import ThemeContext from '../../ThemeContext.js'

const [theme, setTheme] = React.useState('light')
const toggleTheme = () =>
  setTheme(theme === 'light' ? 'dark' : 'light')
;<>
  <div
    style={{
      backgroundColor: 'var(--rsg-color-code-background, #f3f1ec)',
      margin: '-16px -16px 16px -16px',
      padding: '16px'
    }}
  >
    <button
      onClick={toggleTheme}
      style={{
        color: 'var(--rsg-color-base, #262421)',
        backgroundColor: 'var(--rsg-color-base-background, #fcfbf9)'
      }}
    >
      Theme: {theme}
    </button>
  </div>
  <div>
    <ThemeContext.Provider value={theme}>
      <ThemeButton>Themable button</ThemeButton>
    </ThemeContext.Provider>
  </div>
</>
```
