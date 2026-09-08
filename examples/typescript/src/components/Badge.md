The prop table shows `tone` as `BadgeTone`, the exported `enum`, and picks up both default values from the destructuring pattern:

```tsx
import { BadgeTone } from './Badge'
;<>
  <Badge count={3} /> <Badge count={12} tone={BadgeTone.Success} />{' '}
  <Badge count={140} tone={BadgeTone.Warning} />
</>
```

Anything above `max` is rendered as `max+`:

```tsx
<Badge count={7} max={5} />
```
