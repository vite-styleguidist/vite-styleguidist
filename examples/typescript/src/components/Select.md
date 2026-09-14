`Option` is a type parameter, inferred from whatever you pass to `options`:

```tsx
const cities = [
  { code: 'AMS', name: 'Amsterdam' },
  { code: 'BER', name: 'Berlin' },
  { code: 'LIS', name: 'Lisbon' }
]
;<Select
  label="Destination"
  options={cities}
  getLabel={city => `${city.name} (${city.code})`}
  onPick={city => console.log(city.code)}
/>
```

It works just as well with a list of plain strings:

```tsx
<Select
  label="Size"
  options={['S', 'M', 'L']}
  getLabel={size => size}
/>
```
