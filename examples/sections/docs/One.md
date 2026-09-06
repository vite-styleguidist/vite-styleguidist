# Heading 1

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6

There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, “Oh dear! Oh dear! I shall be late!” (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural); but when the Rabbit actually _took a watch out of its waistcoat-pocket_, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.

> In another moment down went Alice after it, never once considering how in the world she was to get out again.

Text attributes: _italic_, **bold**, `monospace`.

Bullet list:

- coffee
- croissant

Numbered list:

1.  coffee
2.  croissant

Nested list:

- coffee
- food
  1.  croissant
  1.  pizza
- dog

List with checkboxes:

- [x] Coffee
- [x] Croissant
- [ ] Pizza

Table:

| Foo | Bar |
| --- | --- |
| 1   | 2   |

A [link](http://example.com).

---

![A blue circle on a pale background](data:image/svg+xml;utf8,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27160%27%20height=%2790%27%20viewBox=%270%200%20160%2090%27%3E%3Crect%20width=%27160%27%20height=%2790%27%20rx=%276%27%20fill=%27%23dfe7f2%27/%3E%3Ccircle%20cx=%2780%27%20cy=%2745%27%20r=%2724%27%20fill=%27%235b8dbe%27/%3E%3C/svg%3E)

```js static
function eatFood(food) {
  if (!food.length) {
    return ['No food']
  }

  return food.map(dish => `No ${dish.toLowerCase()}`)
}

const food = ['Pizza', 'Buger', 'Coffee']
console.log(eatFood(food))
```

Some more text here.

## Details

<details>
 <summary>Solution</summary>

Some hidden text.

</details>
