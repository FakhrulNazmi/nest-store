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

// -----------------------------
// Array size limits (DoS protection)
// -----------------------------

test("rejects huge array index in an intermediate dot segment", () => {
  const store = new ObjectStore();

  assert.throws(
    () => store.set("a.4000000000.x", 1),
    /exceeds the maximum allowed index/
  );

  assert.equal(store.get("a"), undefined);
});

test("rejects huge array index in an intermediate array-path segment", () => {
  const store = new ObjectStore({ a: [] });

  assert.throws(
    () => store.set(["a", 4000000000, "x"], 1),
    ObjectStoreError
  );

  assert.equal(store.get("a").length, 0);
});

test("rejects huge quoted bracket index on an array", () => {
  const store = new ObjectStore({ a: [] });

  assert.throws(
    () => store.set('a["4000000000"]', 1),
    ObjectStoreError
  );
});

test("allows large numeric keys on plain objects", () => {
  const store = new ObjectStore({ users: {} });

  store.set("users.4000000000", "id");

  assert.equal(store.get("users.4000000000"), "id");
});

test("allows writing within an existing large array", () => {
  const big = [];
  big.length = 200_000;

  const store = new ObjectStore({ big });

  store.set("big.150000", "ok");

  assert.equal(store.get("big.150000"), "ok");
});

test("rejects setting a huge array length", () => {
  const store = new ObjectStore({ a: [] });

  assert.throws(
    () => store.set("a.length", 4294967295),
    /Invalid array length/
  );

  assert.equal(store.get("a").length, 0);
});

test("rejects huge array length via replace", () => {
  const store = new ObjectStore({ a: [] });

  assert.throws(
    () => store.replace("a.length", 4294967295),
    ObjectStoreError
  );

  assert.equal(store.get("a").length, 0);
});

test("rejects negative array length with ObjectStoreError", () => {
  const store = new ObjectStore({ a: [] });

  assert.throws(
    () => store.set("a.length", -1),
    ObjectStoreError
  );
});

test("allows truncating an array via length", () => {
  const store = new ObjectStore({ a: [1, 2, 3] });

  store.set("a.length", 1);

  assert.deepEqual(store.get("a"), [1]);
});


// -----------------------------
// Array index handling
// -----------------------------

test("leading-zero keys are not treated as array indexes", () => {
  const store = new ObjectStore({ a: [0, 1, 2, 3, 4, 5, 6, 7, 8] });

  store.set("a.007", "x");

  assert.equal(store.delete("a.007"), true);
  assert.deepEqual(store.get("a"), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(store.has("a.007"), false);
});

test("rejects leading-zero bracket index", () => {
  const store = new ObjectStore();

  assert.throws(
    () => store.get("a[007]"),
    /Invalid array index "007"/
  );
});

test("deleting array length throws ObjectStoreError", () => {
  const store = new ObjectStore({ a: [1] });

  assert.throws(
    () => store.delete("a.length"),
    ObjectStoreError
  );

  assert.deepEqual(store.get("a"), [1]);
});


// -----------------------------
// Wildcards in write operations
// -----------------------------

test("rejects wildcard in set", () => {
  const store = new ObjectStore({ u: [{}] });

  assert.throws(
    () => store.set("u.*.n", 1),
    /not supported in set\(\)/
  );

  assert.equal(hasOwnKey(store.get("u"), "*"), false);
});

test("rejects wildcard in delete", () => {
  const store = new ObjectStore({ u: [[1], [2]] });

  assert.throws(
    () => store.delete("u.*.0"),
    /not supported in delete\(\)/
  );

  assert.deepEqual(store.get("u"), [[1], [2]]);
});

test("rejects wildcard in replace", () => {
  const store = new ObjectStore({ u: [[1]] });

  assert.throws(
    () => store.replace("u.*.0", 9),
    /not supported in replace\(\)/
  );
});

test("rejects wildcard in array helpers", () => {
  const store = new ObjectStore({ u: [[1]] });

  for (const method of ["push", "pop", "shift", "unshift", "splice"]) {
    assert.throws(
      () => store[method]("u.*", 9),
      new RegExp(`not supported in ${method}\(\)`)
    );
  }

  assert.deepEqual(store.get("u"), [[1]]);
});

test("wildcard still works in get", () => {
  const store = new ObjectStore({ u: [[1], [2]] });

  assert.deepEqual(store.get("u.*.0"), [1, 2]);
});


// -----------------------------
// Bracket parsing
// -----------------------------

test("rejects mismatched quotes in brackets", () => {
  const store = new ObjectStore();

  assert.throws(
    () => store.set(`a["b']`, 1),
    /Unterminated quoted bracket expression/
  );
});

test("rejects unterminated quoted bracket", () => {
  const store = new ObjectStore();

  assert.throws(
    () => store.get('a["b'),
    ObjectStoreError
  );
});

test("rejects characters directly after a closing bracket", () => {
  const store = new ObjectStore();

  assert.throws(
    () => store.set("a[0]b", 1),
    /Unexpected character "b" after "\]"/
  );
});

test("quoted bracket keys may contain dots and brackets", () => {
  const store = new ObjectStore();

  store.set('config["a.b]c"].value', 1);

  assert.deepEqual(store.data, {
    config: { "a.b]c": { value: 1 } }
  });
});

test("supports single-quoted bracket keys", () => {
  const store = new ObjectStore();

  store.set("a['b'].c", 1);

  assert.equal(store.get("a.b.c"), 1);
});

test("still blocks forbidden keys inside quoted brackets", () => {
  const store = new ObjectStore();

  assert.throws(
    () => store.set('a["__proto__"].x', 1),
    /Forbidden property "__proto__"/
  );

  assert.equal({}.x, undefined);
});

test("bracket followed by dot or bracket still parses", () => {
  const store = new ObjectStore();

  store.set("a[0].b[1]", "x");

  assert.equal(store.get("a.0.b.1"), "x");
});


// -----------------------------
// Clone
// -----------------------------

test("clone wraps uncloneable data in ObjectStoreError", () => {
  const store = new ObjectStore({ fn: () => {} });

  assert.throws(
    () => store.clone(),
    (error) => {
      assert.equal(error instanceof ObjectStoreError, true);
      assert.match(error.message, /Cannot clone store data/);
      assert.ok(error.cause);
      return true;
    }
  );
});

test("clone returns a deep copy", () => {
  const store = new ObjectStore({ user: { name: "John" } });
  const copy = store.clone();

  copy.user.name = "Jane";

  assert.equal(store.get("user.name"), "John");
});


function hasOwnKey(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}
