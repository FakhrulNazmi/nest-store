# nest-store

A lightweight JavaScript object and array store for working with nested paths.

`nest-store` makes it easy to set, get, delete, and manipulate deeply nested values using simple path notation.

## Features

* Set nested values using dot notation
* Get nested values
* Automatically create nested objects and arrays
* Support array indexes
* Wildcard path queries
* Delete nested properties
* Array manipulation helpers
* `isNull()` utility
* `isNullOrEmpty()` utility
* Prototype pollution protection
* Lightweight with no dependencies

## Installation

### npm

```bash
npm install nest-store
```

### pnpm

```bash
pnpm add nest-store
```

### Yarn

```bash
yarn add nest-store
```

## Basic Usage

```js
import { ObjectStore } from "nest-store";

const store = new ObjectStore();
```

### Set and Get

Set nested values using dot notation:

```js
store.set("user.name", "John");
store.set("user.age", 25);

console.log(store.get("user.name"));
// John

console.log(store.get("user"));
// { name: "John", age: 25 }
```

### Nested Objects

You can create deeply nested objects automatically:

```js
store.set("user.profile.name", "John");
store.set("user.profile.email", "john@example.com");

console.log(store.get("user.profile"));
```

Result:

```js
{
  name: "John",
  email: "john@example.com"
}
```

### Nested Arrays

Arrays are automatically created when using array notation:

```js
store.set("items[0].name", "Laptop");
store.set("items[1].name", "Mouse");

console.log(store.get("items"));
```

Result:

```js
[
  { name: "Laptop" },
  { name: "Mouse" }
]
```

You can also use array paths:

```js
store.set(["items", 0, "name"], "Laptop");
```

## Wildcard Paths

Use `*` to retrieve values from multiple objects or array elements.

```js
const store = new ObjectStore({
  users: [
    { name: "John" },
    { name: "Jane" }
  ]
});

console.log(store.get("users.*.name"));
```

Result:

```js
[
  "John",
  "Jane"
]
```

## Delete

Delete a nested property:

```js
const store = new ObjectStore({
  user: {
    name: "John",
    age: 25
  }
});

store.delete("user.age");

console.log(store.get("user"));
```

Result:

```js
{
  name: "John"
}
```

Deleting an array item removes it from the array:

```js
store.delete("items[0]");
```

## Array Helpers

### Push

Add an item to the end of an array:

```js
store.push("items", {
  name: "Keyboard"
});
```

### Pop

Remove the last item:

```js
const item = store.pop("items");
```

### Shift

Remove the first item:

```js
const item = store.shift("items");
```

### Unshift

Add an item to the beginning:

```js
store.unshift("items", {
  name: "Monitor"
});
```

### Splice

Remove or replace array elements:

```js
store.splice("items", 1, 1);
```

The behavior follows JavaScript's `Array.prototype.splice()`.

## Utility Helpers

### `isNull(value)`

Checks whether a value is `null` or `undefined`.

```js
ObjectStore.isNull(null);
// true

ObjectStore.isNull(undefined);
// true

ObjectStore.isNull("hello");
// false

ObjectStore.isNull(0);
// false

ObjectStore.isNull(false);
// false
```

### `isNullOrEmpty(value)`

Checks whether a value is:

* `null`
* `undefined`
* an empty string
* an empty array
* an empty object

```js
ObjectStore.isNullOrEmpty(null);
// true

ObjectStore.isNullOrEmpty(undefined);
// true

ObjectStore.isNullOrEmpty("");
// true

ObjectStore.isNullOrEmpty([]);
// true

ObjectStore.isNullOrEmpty({});
// true

ObjectStore.isNullOrEmpty("hello");
// false

ObjectStore.isNullOrEmpty([1, 2]);
// false

ObjectStore.isNullOrEmpty({ name: "John" });
// false

ObjectStore.isNullOrEmpty(0);
// false

ObjectStore.isNullOrEmpty(false);
// false
```

Whitespace-only strings are not considered empty:

```js
ObjectStore.isNullOrEmpty("   ");
// false
```

## API

### Constructor

```js
new ObjectStore(initialValue)
```

Creates a new object store.

```js
const store = new ObjectStore({
  user: {
    name: "John"
  }
});
```

### `set(path, value)`

Sets a value at a nested path.

```js
store.set("user.name", "John");
```

Supports array notation:

```js
store.set("users[0].name", "John");
```

### `get(path)`

Gets a value from a nested path.

```js
store.get("user.name");
```

Supports wildcards:

```js
store.get("users.*.name");
```

### `delete(path)`

Deletes a value from a nested path.

```js
store.delete("user.name");
```

Returns `true` when a value was deleted and `false` when the path does not exist.

### `push(path, value)`

Adds a value to the end of an array.

```js
store.push("items", "Laptop");
```

### `pop(path)`

Removes and returns the last item from an array.

```js
store.pop("items");
```

### `shift(path)`

Removes and returns the first item from an array.

```js
store.shift("items");
```

### `unshift(path, value)`

Adds a value to the beginning of an array.

```js
store.unshift("items", "Laptop");
```

### `splice(path, start, deleteCount, ...items)`

Changes the contents of an array by removing or replacing existing elements.

```js
store.splice("items", 1, 1);
```

### `ObjectStore.isNull(value)`

Returns `true` when the value is `null` or `undefined`.

```js
ObjectStore.isNull(null);
// true
```

### `ObjectStore.isNullOrEmpty(value)`

Returns `true` when the value is `null`, `undefined`, an empty string, empty array, or empty object.

```js
ObjectStore.isNullOrEmpty("");
// true
```

## Error Handling

`nest-store` provides clear errors for invalid operations while keeping normal lookups simple.

### `get()`

Use `get()` when a missing path should return `undefined` instead of throwing an error.

```js
const store = new ObjectStore({
  user: {
    name: "John"
  }
});

store.get("user.name");
// "John"

store.get("user.email");
// undefined
```

### `getStrict()`

Use `getStrict()` when the path must exist. It throws an `ObjectStoreError` when the path does not exist.

```js
store.getStrict("user.name");
// "John"

store.getStrict("user.email");
// throws ObjectStoreError
```

Example error:

```text
ObjectStoreError: Path "user.email" does not exist.
```

### Invalid Paths

Invalid paths throw an `ObjectStoreError`.

```js
store.set("user..name", "John");
// throws ObjectStoreError
```

Example:

```text
ObjectStoreError: Invalid path "user..name". Path contains an empty segment.
```

### Forbidden Properties

Prototype-related properties are blocked to help prevent prototype pollution.

The following properties cannot be used as path segments:

```text
__proto__
constructor
prototype
```

Example:

```js
store.set("__proto__.isAdmin", true);
// throws ObjectStoreError
```

### Array Index Validation

Array indexes must be valid non-negative indexes within the supported limit.

```js
store.set("items[0].name", "Laptop");
```

Invalid or excessively large indexes throw an `ObjectStoreError`.

### `ObjectStoreError`

You can import `ObjectStoreError` when you need to handle library-specific errors.

```js
import {
  ObjectStore,
  ObjectStoreError
} from "nest-store";

const store = new ObjectStore();

try {
  store.getStrict("user.email");
} catch (error) {
  if (error instanceof ObjectStoreError) {
    console.error(error.message);
  }
}
```

This allows applications to distinguish `nest-store` errors from other JavaScript errors.

## Prototype Pollution Protection

`nest-store` blocks dangerous object property names:

```text
__proto__
constructor
prototype
```

For example:

```js
store.set("__proto__.polluted", true);
```

will throw an error instead of modifying the object prototype.

## Example

A complete example is available in:

```text
examples/basic.js
```

Run it with:

```bash
npm run example
```

## Development

Clone the repository and install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Run the example:

```bash
npm run example
```

Create a package preview:

```bash
npm pack --dry-run
```

## Requirements

* Node.js 18 or later
* No external runtime dependencies

## License

MIT License

Copyright (c) 2026 Fakhrul Nazmi

See the [LICENSE](LICENSE) file for the full license text.