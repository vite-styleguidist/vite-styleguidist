`FieldProps` lives in `Field.types.ts`, a module of its own. The default parser follows the relative import, so the descriptions in the table above come out of that file:

```tsx
<Field label="Your name" hint="As it appears on your passport" />
```

Invalid state:

```tsx
<Field
  label="Email"
  defaultValue="not-an-email"
  hint="Enter a valid email"
  invalid
/>
```

The ref is forwarded to the `<input>`, so it can be focused from the outside:

```tsx
import Button from './Button'
const ref = React.useRef(null)
;<>
  <Field ref={ref} label="Focus me" />{' '}
  <Button size="small" onClick={() => ref.current.focus()}>
    Focus
  </Button>
</>
```
