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

### Quoted Keys

Use quoted brackets for keys that contain `.`, `[` or `]`:

```js
store.set('config["api.url"]', "https://example.com");
store.set("config['a]b']", 1);

console.log(store.get('config["api.url"]'));
// "https://example.com"
```

A closing bracket must be followed by `.`, `[`, or the end of the path. Paths such as `a[0]b` or `a["b']` (mismatched quotes) throw an `ObjectStoreError`.

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

Wildcards are **read-only**. They work with `get()` and `getStrict()`, but `set()`, `replace()`, `delete()`, `push()`, `pop()`, `shift()`, `unshift()` and `splice()` throw an `ObjectStoreError` when the path contains `*`:

```js
store.set("users.*.active", true);
// throws ObjectStoreError: Wildcard "*" is not supported in set().
```

To update every item, loop over them:

```js
store.get("users").forEach((_, i) => {
  store.set(["users", i, "active"], true);
});
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

The rules:

* Array indexes must be canonical numbers: `0`, `1`, `42`. Leading zeros (`[007]`) and negative numbers (`[-1]`) are rejected in bracket notation. In dot notation, `items.007` is treated as an ordinary property name, not index 7.
* Arrays cannot grow past index `100000`. This applies to every segment of the path, so `a.4000000000.b` is rejected as well. It prevents huge sparse arrays that would make later wildcard reads hang.
* Large numeric keys on plain **objects** are allowed, e.g. `users.4000000000` where `users` is an object.
* Arrays that are already larger than the limit when passed to the store can still be written below their current length.
* An array's `length` can be set to an integer from `0` to `100001` (for example to truncate it). Other values throw. Deleting `length` throws.

```js
store.set("items.length", 0);
// OK, empties the array

store.set("items.length", 4294967295);
// throws ObjectStoreError: Invalid array length

store.set("items[999999]", "x");
// throws ObjectStoreError: Array index "999999" exceeds the maximum allowed index.
```

When a path is rejected, nothing is written, not even the intermediate objects or arrays.

### `clone()`

`clone()` returns a deep copy using `structuredClone()`. If the data contains values that cannot be cloned, such as functions, it throws an `ObjectStoreError` with the original error as `error.cause`.

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

## Upgrading to 1.2.0

1.2.0 fixes a denial-of-service issue and tightens path parsing. Some paths that used to be accepted now throw an `ObjectStoreError`:

| Before 1.2.0 | 1.2.0 |
|---|---|
| `set("a.4000000000.x", 1)` created a sparse array with 4 billion slots | Throws (index limit now applies to every segment) |
| `set("a.length", 4294967295)` grew the array | Throws (invalid length) |
| `set("a.length", -1)` threw a `RangeError` | Throws `ObjectStoreError` |
| `delete("a.length")` threw a `TypeError` | Throws `ObjectStoreError` |
| `delete("a.007")` removed `a[7]` | Removes the `"007"` property only |
| `set("u.*.x", 1)` wrote a literal `"*"` key | Throws (wildcards are read-only) |
| `delete("u.*.0")` / `push("u.*", x)` returned success but changed nothing | Throws |
| `a[0]b` was read as `a.0.b` | Throws |
| `a["b']` created the key `"b'` | Throws |
| `a[007]` was accepted | Throws |
| `clone()` threw `DataCloneError` | Throws `ObjectStoreError` (original as `cause`) |

New: quoted bracket keys can contain `.` and `]`, e.g. `config["a.b]c"]`.

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