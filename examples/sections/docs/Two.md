That big pink button again — the pink is the custom property `Button.css` defines with one value per colour scheme:

```jsx
import Button from '../src/components/Button'
;<Button size="large" color="var(--button-pink, #b3125f)">
  Click Me
</Button>
```
