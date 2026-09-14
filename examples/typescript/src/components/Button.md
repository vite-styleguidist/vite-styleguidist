The three variants:

```tsx
<>
  <Button>Primary</Button>{' '}
  <Button variant="secondary">Secondary</Button>{' '}
  <Button variant="danger">Danger</Button>
</>
```

Sizes, and the loading state:

```tsx
<>
  <Button size="small">Small</Button>{' '}
  <Button size="large">Large</Button> <Button loading>Saving</Button>
</>
```

`ButtonProps` extends `React.ButtonHTMLAttributes`, so every native button attribute works. Note that the props table above lists only the four props this component declares itself: the default parser documents the props as written, it doesn’t expand the ~290 attributes the DOM interface contributes.

```tsx
<Button
  title="A native title attribute"
  onClick={() => alert('Clicked')}
>
  Click me
</Button>
```
