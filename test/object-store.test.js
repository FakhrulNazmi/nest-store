import test from "node:test";
import assert from "node:assert/strict";

import {
  ObjectStore,
  ObjectStoreError
} from "../src/index.js";


test("sets and gets nested values", () => {
  const store = new ObjectStore();

  store.set("user.name", "John");

  assert.equal(
    store.get("user.name"),
    "John"
  );
});


test("creates arrays automatically", () => {
  const store = new ObjectStore();

  store.set(
    "items[0].name",
    "Laptop"
  );

  assert.deepEqual(
    store.get("items"),
    [{ name: "Laptop" }]
  );
});


test("deletes nested properties", () => {
  const store = new ObjectStore({
    user: {
      name: "John",
      age: 25
    }
  });

  assert.equal(
    store.delete("user.age"),
    true
  );

  assert.equal(
    store.get("user.age"),
    undefined
  );
});


test("supports wildcard paths", () => {
  const store = new ObjectStore({
    users: [
      { name: "John" },
      { name: "Jane" }
    ]
  });

  assert.deepEqual(
    store.get("users.*.name"),
    ["John", "Jane"]
  );
});


test("blocks forbidden prototype keys", () => {
  const store = new ObjectStore();

  assert.throws(
    () => {
      store.set(
        "__proto__.polluted",
        true
      );
    },
    ObjectStoreError
  );
});


test("isNull detects null and undefined", () => {
  assert.equal(
    ObjectStore.isNull(null),
    true
  );

  assert.equal(
    ObjectStore.isNull(undefined),
    true
  );

  assert.equal(
    ObjectStore.isNull(""),
    false
  );

  assert.equal(
    ObjectStore.isNull(0),
    false
  );

  assert.equal(
    ObjectStore.isNull(false),
    false
  );
});


test("isNullOrEmpty detects null and empty values", () => {
  assert.equal(
    ObjectStore.isNullOrEmpty(null),
    true
  );

  assert.equal(
    ObjectStore.isNullOrEmpty(undefined),
    true
  );

  assert.equal(
    ObjectStore.isNullOrEmpty(""),
    true
  );

  assert.equal(
    ObjectStore.isNullOrEmpty("hello"),
    false
  );

  assert.equal(
    ObjectStore.isNullOrEmpty([]),
    true
  );

  assert.equal(
    ObjectStore.isNullOrEmpty([1, 2]),
    false
  );

  assert.equal(
    ObjectStore.isNullOrEmpty({}),
    true
  );

  assert.equal(
    ObjectStore.isNullOrEmpty({
      name: "John"
    }),
    false
  );

  assert.equal(
    ObjectStore.isNullOrEmpty(0),
    false
  );

  assert.equal(
    ObjectStore.isNullOrEmpty(false),
    false
  );
});


test("throws meaningful error for missing path", () => {
  const store = new ObjectStore({
    user: {
      name: "John"
    }
  });

  assert.throws(
    () => {
      store.getStrict("user.email");
    },
    (error) => {
      assert.equal(
        error instanceof ObjectStoreError,
        true
      );

      assert.equal(
        error.message,
        'Path "user.email" does not exist.'
      );

      assert.equal(
        error.path,
        "user.email"
      );

      return true;
    }
  );
});


test("throws meaningful error for invalid path", () => {
  const store = new ObjectStore();

  assert.throws(
    () => {
      store.get("user..name");
    },
    (error) => {
      assert.equal(
        error instanceof ObjectStoreError,
        true
      );

      assert.equal(
        error.message,
        'Invalid path "user..name". Path contains an empty segment.'
      );

      return true;
    }
  );
});


test("throws meaningful error for forbidden prototype keys", () => {
  const store = new ObjectStore();

  assert.throws(
    () => {
      store.set(
        "__proto__.polluted",
        true
      );
    },
    (error) => {
      assert.equal(
        error instanceof ObjectStoreError,
        true
      );

      assert.equal(
        error.message,
        'Forbidden property "__proto__".'
      );

      return true;
    }
  );
});


test("replaces an existing value", () => {
  const store = new ObjectStore({
    user: {
      name: "John",
      age: 25
    }
  });

  assert.equal(
    store.replace(
      "user.name",
      "Jane"
    ),
    true
  );

  assert.equal(
    store.get("user.name"),
    "Jane"
  );
});


test("does not create a new value when replacing", () => {
  const store = new ObjectStore({
    user: {
      name: "John"
    }
  });

  assert.equal(
    store.replace(
      "user.email",
      "jane@example.com"
    ),
    false
  );

  assert.equal(
    store.get("user.email"),
    undefined
  );
});


test("has checks whether a path exists", () => {
  const store = new ObjectStore({
    user: {
      name: "John"
    }
  });

  assert.equal(
    store.has("user.name"),
    true
  );

  assert.equal(
    store.has("user.email"),
    false
  );
});


test("isEmpty checks empty values", () => {
  const store = new ObjectStore({
    user: {},
    items: [1, 2]
  });

  assert.equal(
    store.isEmpty("user"),
    true
  );

  assert.equal(
    store.isEmpty("items"),
    false
  );
});


test("array helpers work", () => {
  const store = new ObjectStore({
    items: ["Laptop"]
  });

  store.push(
    "items",
    "Mouse"
  );

  assert.deepEqual(
    store.get("items"),
    ["Laptop", "Mouse"]
  );

  assert.equal(
    store.pop("items"),
    "Mouse"
  );

  assert.equal(
    store.shift("items"),
    "Laptop"
  );
});


test("keys returns object keys", () => {
  const store = new ObjectStore({
    user: {
      name: "John",
      age: 25
    }
  });

  assert.deepEqual(
    store.keys("user"),
    ["name", "age"]
  );
});


test("values returns object values", () => {
  const store = new ObjectStore({
    user: {
      name: "John",
      age: 25
    }
  });

  assert.deepEqual(
    store.values("user"),
    ["John", 25]
  );
});