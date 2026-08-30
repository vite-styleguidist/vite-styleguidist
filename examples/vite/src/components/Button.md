Basic button:

```jsx
<Button>Push Me</Button>
```

Variants and sizes:

```jsx padded
<Button variant="primary" size="small">Small primary</Button>
<Button variant="danger" size="large">Large danger</Button>
<Button disabled>Disabled</Button>
```

Examples can hold state with React hooks:

```jsx
const [count, setCount] = React.useState(0)
;<Button onClick={() => setCount(count + 1)}>
  Clicked {count} times
</Button>
```
