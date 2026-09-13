import test from "node:test";
import assert from "node:assert/strict";
import { ObjectStore } from "../src/index.js";

test("sets and gets nested values", () => {
  const store = new ObjectStore();

  store.set("user.name", "John");

  assert.equal(store.get("user.name"), "John");
});

test("creates arrays automatically", () => {
  const store = new ObjectStore();

  store.set("items[0].name", "Laptop");

  assert.deepEqual(store.get("items"), [
    { name: "Laptop" }
  ]);
});

test("deletes nested properties", () => {
  const store = new ObjectStore({
    user: {
      name: "John",
      age: 25
    }
  });

  assert.equal(store.delete("user.age"), true);
  assert.equal(store.get("user.age"), undefined);
});

test("supports wildcard paths", () => {
  const store = new ObjectStore({
    users: [
      { name: "John" },
      { name: "Jane" }
    ]
  });

  assert.deepEqual(store.get("users.*.name"), [
    "John",
    "Jane"
  ]);
});

test("blocks forbidden prototype keys", () => {
  const store = new ObjectStore();

  assert.throws(() => {
    store.set("__proto__.polluted", true);
  });
});

test("isNull detects null and undefined", () => {
  assert.equal(ObjectStore.isNull(null), true);
  assert.equal(ObjectStore.isNull(undefined), true);

  assert.equal(ObjectStore.isNull(""), false);
  assert.equal(ObjectStore.isNull(0), false);
  assert.equal(ObjectStore.isNull(false), false);
});

test("isNullOrEmpty detects null and empty values", () => {
  assert.equal(ObjectStore.isNullOrEmpty(null), true);
  assert.equal(ObjectStore.isNullOrEmpty(undefined), true);

  assert.equal(ObjectStore.isNullOrEmpty(""), true);
  assert.equal(ObjectStore.isNullOrEmpty("hello"), false);

  assert.equal(ObjectStore.isNullOrEmpty([]), true);
  assert.equal(ObjectStore.isNullOrEmpty([1, 2]), false);

  assert.equal(ObjectStore.isNullOrEmpty({}), true);
  assert.equal(ObjectStore.isNullOrEmpty({ name: "John" }), false);

  assert.equal(ObjectStore.isNullOrEmpty(0), false);
  assert.equal(ObjectStore.isNullOrEmpty(false), false);
});