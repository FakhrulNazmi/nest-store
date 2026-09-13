# nest-store

A lightweight JavaScript store for reading, writing, deleting, and managing nested objects and arrays using simple paths.

## Features

- Get nested values
- Set nested values
- Automatically create missing objects and arrays
- Delete nested properties
- Support wildcard paths
- Push, pop, shift, unshift, and splice arrays
- Protect against prototype pollution
- No external dependencies
- Works with Node.js and modern JavaScript projects

## Installation

```bash
npm install nest-store
```

You can also use pnpm:

```bash
pnpm add nest-store
```

Or Yarn:

```bash
yarn add nest-store
```

## Usage

```js
import { ObjectStore } from "nest-store";

const store = new ObjectStore();

store.set("user.profile.name", "John");
store.set("user.profile.age", 25);

console.log(store.get("user.profile.name"));
// John

console.log(store.get("user.profile"));
// { name: "John", age: 25 }
```

## Nested Arrays

Arrays can be created automatically using bracket notation:

```js
const store = new ObjectStore();

store.set("items[0].name", "Laptop");
store.set("items[1].name", "Mouse");

console.log(store.get("items"));
```

Output:

```js
[
  { name: "Laptop" },
  { name: "Mouse" }
]
```

## Wildcard Paths

Use `*` to retrieve values from every item in an array:

```js
const store = new ObjectStore({
  users: [
    { name: "John" },
    { name: "Jane" }
  ]
});

console.log(store.get("users.*.name"));
```

Output:

```js
["John", "Jane"]
```

## Delete Values

```js
const store = new ObjectStore({
  user: {
    name: "John",
    age: 25
  }
});

store.delete("user.age");

console.log(store.get("user"));
// { name: "John" }
```

## Array Methods

### Push

```js
store.push("items", { name: "Keyboard" });
```

### Pop

```js
const item = store.pop("items");
```

### Shift

```js
const item = store.shift("items");
```

### Unshift

```js
store.unshift("items", { name: "Monitor" });
```

### Splice

```js
store.splice("items", 1, 1, { name: "Tablet" });
```

## API

### `new ObjectStore(initialData?)`

Creates a new store.

```js
const store = new ObjectStore({
  user: {
    name: "John"
  }
});
```

### `set(path, value)`

Sets a value at the specified path.

```js
store.set("user.name", "John");
store.set("items[0].name", "Laptop");
```

### `get(path)`

Returns a value from the specified path.

```js
store.get("user.name");
store.get("items[0].name");
store.get("users.*.name");
```

### `delete(path)`

Deletes a value and returns `true` if the value existed.

```js
store.delete("user.name");
```

### `push(path, ...values)`

Adds values to an array.

```js
store.push("items", "Laptop", "Mouse");
```

### `pop(path)`

Removes and returns the last item in an array.

```js
store.pop("items");
```

### `shift(path)`

Removes and returns the first item in an array.

```js
store.shift("items");
```

### `unshift(path, ...values)`

Adds values to the beginning of an array.

```js
store.unshift("items", "Monitor");
```

### `splice(path, start, deleteCount, ...items)`

Adds, removes, or replaces array items.

```js
store.splice("items", 1, 1, "Keyboard");
```

## Development

Run the automated tests:

```bash
npm test
```

Run the example:

```bash
npm run example
```

## License

MIT