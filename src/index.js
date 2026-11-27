const FORBIDDEN_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype"
]);

const MAX_SAFE_ARRAY_INDEX = 100_000;

function isObjectLike(value) {
  return value !== null && typeof value === "object";
}

// Canonical array index: "0", "1", "42" — but not "007" or "-1".
// Non-canonical numeric strings are ordinary property names in JavaScript,
// so treating them as indexes would make delete() remove the wrong element.
function isArrayIndexKey(key) {
  return /^(0|[1-9]\d*)$/.test(key);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export class ObjectStoreError extends Error {
  constructor(message, path = null, options = undefined) {
    super(message, options);

    this.name = "ObjectStoreError";
    this.path = path;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ObjectStoreError);
    }
  }
}

function validateSegment(segment, path) {
  if (segment === "") {
    throw new ObjectStoreError(
      `Invalid path "${path}". Path contains an empty segment.`,
      path
    );
  }

  if (FORBIDDEN_KEYS.has(segment)) {
    throw new ObjectStoreError(
      `Forbidden property "${segment}".`,
      path
    );
  }
}

// Rejects writes that would grow an array past MAX_SAFE_ARRAY_INDEX.
// Indexes inside the array's current length are allowed, so arrays that
// were already large when passed to the store stay writable.
function assertIndexInRange(array, key, path) {
  if (!isArrayIndexKey(key)) {
    return;
  }

  const index = Number(key);

  if (index > MAX_SAFE_ARRAY_INDEX && index >= array.length) {
    throw new ObjectStoreError(
      `Array index "${key}" exceeds the maximum allowed index.`,
      path
    );
  }
}

function assertValidArrayLength(value, path) {
  if (
    !Number.isInteger(value) ||
    value < 0 ||
    value > MAX_SAFE_ARRAY_INDEX + 1
  ) {
    throw new ObjectStoreError(
      `Invalid array length "${String(value)}". Length must be an integer between 0 and ${MAX_SAFE_ARRAY_INDEX + 1}.`,
      path
    );
  }
}

// Validates a write of `value` to `container[key]`.
function assertSafeWrite(container, key, value, path) {
  if (!Array.isArray(container)) {
    return;
  }

  if (key === "length") {
    assertValidArrayLength(value, path);
    return;
  }

  assertIndexInRange(container, key, path);
}

// Wildcards only make sense for reads. In write operations they would
// either create a literal "*" key or silently modify a temporary array.
function assertNoWildcard(parts, path, operation) {
  if (parts.includes("*")) {
    throw new ObjectStoreError(
      `Wildcard "*" is not supported in ${operation}().`,
      path
    );
  }
}

function parsePath(path) {
  // Array path
  // Example: ["user", "profile", "name"]
  if (Array.isArray(path)) {
    if (path.length === 0) {
      throw new ObjectStoreError(
        "Invalid path. Path cannot be empty.",
        path
      );
    }

    return path.map((segment) => {
      const value = String(segment);

      validateSegment(value, path);

      return value;
    });
  }

  if (typeof path !== "string") {
    throw new ObjectStoreError(
      "Invalid path. Path must be a string or an array.",
      path
    );
  }

  if (path.length === 0) {
    throw new ObjectStoreError(
      "Invalid path. Path cannot be empty.",
      path
    );
  }

  const parts = [];

  let i = 0;
  let expectingSegment = true;

  while (i < path.length) {
    // Dot separator
    if (path[i] === ".") {
      if (expectingSegment) {
        throw new ObjectStoreError(
          `Invalid path "${path}". Path contains an empty segment.`,
          path
        );
      }

      expectingSegment = true;
      i++;
      continue;
    }

    // Bracket notation
    if (path[i] === "[") {
      const quote = path[i + 1];

      let segment;
      let closeIndex;

      if (quote === '"' || quote === "'") {
        // ["name"] or ['name'] — the quoted key may contain "]" or ".".
        const endQuote = path.indexOf(quote, i + 2);

        if (endQuote === -1 || path[endQuote + 1] !== "]") {
          throw new ObjectStoreError(
            `Invalid path "${path}". Unterminated quoted bracket expression.`,
            path
          );
        }

        segment = path.slice(i + 2, endQuote);
        closeIndex = endQuote + 1;
      } else {
        closeIndex = path.indexOf("]", i);

        if (closeIndex === -1) {
          throw new ObjectStoreError(
            `Invalid path "${path}". Missing closing bracket.`,
            path
          );
        }

        segment = path.slice(i + 1, closeIndex);

        if (segment.length === 0) {
          throw new ObjectStoreError(
            `Invalid path "${path}". Empty bracket expression.`,
            path
          );
        }

        // Only canonical numeric indexes are allowed for unquoted brackets
        if (!isArrayIndexKey(segment)) {
          throw new ObjectStoreError(
            `Invalid path "${path}". Invalid array index "${segment}".`,
            path
          );
        }

        if (Number(segment) > MAX_SAFE_ARRAY_INDEX) {
          throw new ObjectStoreError(
            `Array index "${segment}" exceeds the maximum allowed index.`,
            path
          );
        }
      }

      validateSegment(segment, path);

      parts.push(segment);

      i = closeIndex + 1;

      // A bracket must be followed by ".", "[" or the end of the path.
      if (
        i < path.length &&
        path[i] !== "." &&
        path[i] !== "["
      ) {
        throw new ObjectStoreError(
          `Invalid path "${path}". Unexpected character "${path[i]}" after "]".`,
          path
        );
      }

      expectingSegment = false;

      continue;
    }

    // Normal property name
    let start = i;

    while (
      i < path.length &&
      path[i] !== "." &&
      path[i] !== "["
    ) {
      i++;
    }

    const segment = path.slice(start, i);

    validateSegment(segment, path);

    parts.push(segment);

    expectingSegment = false;
  }

  if (expectingSegment) {
    throw new ObjectStoreError(
      `Invalid path "${path}". Path contains an empty segment.`,
      path
    );
  }

  return parts;
}

export class ObjectStore {
  constructor(data = {}) {
    if (!isObjectLike(data)) {
      throw new ObjectStoreError(
        "ObjectStore data must be an object or array."
      );
    }

    this.data = data;
  }

  // -----------------------------
  // Utility methods
  // -----------------------------

  static isNull(value) {
    return value === null || value === undefined;
  }

  static isNullOrEmpty(value) {
    if (value === null || value === undefined) {
      return true;
    }

    if (typeof value === "string") {
      return value.length === 0;
    }

    if (Array.isArray(value)) {
      return value.length === 0;
    }

    if (typeof value === "object") {
      return Object.keys(value).length === 0;
    }

    return false;
  }

  // -----------------------------
  // Set
  // -----------------------------

  set(path, value) {
    const parts = parsePath(path);

    assertNoWildcard(parts, path, "set");

    let current = this.data;

    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      const nextKey = parts[i + 1];

      if (!isObjectLike(current)) {
        throw new ObjectStoreError(
          `Cannot set "${path}". Parent path is not an object or array.`,
          path
        );
      }

      // Intermediate segments must respect the index limit too,
      // otherwise "a.4000000000.b" creates a huge sparse array.
      if (Array.isArray(current)) {
        assertIndexInRange(current, key, path);
      }

      if (
        !hasOwn(current, key) ||
        current[key] === null
      ) {
        const container = isArrayIndexKey(nextKey) ? [] : {};

        // Validate before attaching, so a rejected path leaves no
        // half-created containers behind.
        if (Array.isArray(container)) {
          assertIndexInRange(container, nextKey, path);
        }

        current[key] = container;
      } else if (!isObjectLike(current[key])) {
        throw new ObjectStoreError(
          `Cannot set "${path}". "${parts
            .slice(0, i + 1)
            .join(".")}" is not an object or array.`,
          path
        );
      }

      current = current[key];
    }

    const finalKey = parts[parts.length - 1];

    assertSafeWrite(current, finalKey, value, path);

    current[finalKey] = value;

    return this;
  }

  // -----------------------------
  // Get
  // -----------------------------

  get(path) {
    const parts = parsePath(path);

    return this._getRecursive(
      this.data,
      parts,
      new Set()
    );
  }

  // -----------------------------
  // Get strict
  // -----------------------------

  getStrict(path) {
    const parts = parsePath(path);

    return this._getStrictRecursive(
      this.data,
      parts,
      new Set(),
      path
    );
  }

  // -----------------------------
  // Recursive get
  // -----------------------------

  _getRecursive(current, parts, visited) {
    if (parts.length === 0) {
      return current;
    }

    if (!isObjectLike(current)) {
      return undefined;
    }

    if (visited.has(current)) {
      return undefined;
    }

    visited.add(current);

    const [key, ...remaining] = parts;

    // Wildcard
    if (key === "*") {
      const results = [];

      if (Array.isArray(current)) {
        for (const item of current) {
          const value = this._getRecursive(
            item,
            remaining,
            new Set(visited)
          );

          if (value !== undefined) {
            results.push(value);
          }
        }
      } else {
        for (const property of Object.keys(current)) {
          const value = this._getRecursive(
            current[property],
            remaining,
            new Set(visited)
          );

          if (value !== undefined) {
            results.push(value);
          }
        }
      }

      return results;
    }

    if (!hasOwn(current, key)) {
      return undefined;
    }

    return this._getRecursive(
      current[key],
      remaining,
      visited
    );
  }

  // -----------------------------
  // Recursive strict get
  // -----------------------------

  _getStrictRecursive(
    current,
    parts,
    visited,
    originalPath
  ) {
    if (parts.length === 0) {
      return current;
    }

    if (!isObjectLike(current)) {
      throw new ObjectStoreError(
        `Path "${originalPath}" does not exist.`,
        originalPath
      );
    }

    if (visited.has(current)) {
      throw new ObjectStoreError(
        `Cannot resolve path "${originalPath}" because a circular reference was detected.`,
        originalPath
      );
    }

    visited.add(current);

    const [key, ...remaining] = parts;

    // Wildcard
    if (key === "*") {
      const results = [];

      if (Array.isArray(current)) {
        for (const item of current) {
          try {
            const value = this._getStrictRecursive(
              item,
              remaining,
              new Set(visited),
              originalPath
            );

            results.push(value);
          } catch (error) {
            if (!(error instanceof ObjectStoreError)) {
              throw error;
            }
          }
        }
      } else {
        for (const property of Object.keys(current)) {
          try {
            const value = this._getStrictRecursive(
              current[property],
              remaining,
              new Set(visited),
              originalPath
            );

            results.push(value);
          } catch (error) {
            if (!(error instanceof ObjectStoreError)) {
              throw error;
            }
          }
        }
      }

      return results;
    }

    if (!hasOwn(current, key)) {
      throw new ObjectStoreError(
        `Path "${originalPath}" does not exist.`,
        originalPath
      );
    }

    return this._getStrictRecursive(
      current[key],
      remaining,
      visited,
      originalPath
    );
  }

  // -----------------------------
  // Replace
  // -----------------------------

  replace(path, value) {
    const parts = parsePath(path);

    assertNoWildcard(parts, path, "replace");

    if (parts.length === 0) {
      return false;
    }

    const key = parts[parts.length - 1];
    const parentParts = parts.slice(0, -1);

    let parent = this.data;

    if (parentParts.length > 0) {
      parent = this._getRecursive(
        this.data,
        parentParts,
        new Set()
      );
    }

    if (
      parent === undefined ||
      parent === null ||
      !isObjectLike(parent)
    ) {
      return false;
    }

    if (!hasOwn(parent, key)) {
      return false;
    }

    assertSafeWrite(parent, key, value, path);

    parent[key] = value;

    return true;
  }

  // -----------------------------
  // Delete
  // -----------------------------

  delete(path) {
    const parts = parsePath(path);

    assertNoWildcard(parts, path, "delete");

    if (parts.length === 0) {
      return false;
    }

    const key = parts[parts.length - 1];
    const parentParts = parts.slice(0, -1);

    let parent = this.data;

    if (parentParts.length > 0) {
      parent = this._getRecursive(
        this.data,
        parentParts,
        new Set()
      );
    }

    if (
      parent === undefined ||
      parent === null ||
      !isObjectLike(parent)
    ) {
      return false;
    }

    if (!hasOwn(parent, key)) {
      return false;
    }

    if (Array.isArray(parent) && key === "length") {
      throw new ObjectStoreError(
        `Cannot delete "${path}". Array length cannot be deleted.`,
        path
      );
    }

    if (
      Array.isArray(parent) &&
      isArrayIndexKey(key)
    ) {
      parent.splice(Number(key), 1);
    } else {
      delete parent[key];
    }

    return true;
  }

  // -----------------------------
  // Has
  // -----------------------------

  has(path) {
    const parts = parsePath(path);

    let current = this.data;

    for (const key of parts) {
      if (!isObjectLike(current)) {
        return false;
      }

      if (!hasOwn(current, key)) {
        return false;
      }

      current = current[key];
    }

    return true;
  }

  // -----------------------------
  // Is empty
  // -----------------------------

  isEmpty(path) {
    const value = this.get(path);

    return ObjectStore.isNullOrEmpty(value);
  }

  // -----------------------------
  // Keys
  // -----------------------------

  keys(path = null) {
    const value =
      path === null
        ? this.data
        : this.get(path);

    if (!isObjectLike(value)) {
      return [];
    }

    return Object.keys(value);
  }

  // -----------------------------
  // Values
  // -----------------------------

  values(path = null) {
    const value =
      path === null
        ? this.data
        : this.get(path);

    if (!isObjectLike(value)) {
      return [];
    }

    return Object.values(value);
  }

  // -----------------------------
  // Clear
  // -----------------------------

  clear(path = null) {
    if (path === null) {
      if (Array.isArray(this.data)) {
        this.data.length = 0;
      } else {
        for (const key of Object.keys(this.data)) {
          delete this.data[key];
        }
      }

      return true;
    }

    const value = this.get(path);

    if (!isObjectLike(value)) {
      return false;
    }

    if (Array.isArray(value)) {
      value.length = 0;
    } else {
      for (const key of Object.keys(value)) {
        delete value[key];
      }
    }

    return true;
  }

  // -----------------------------
  // Clone
  // -----------------------------

  clone() {
    try {
      return structuredClone(this.data);
    } catch (error) {
      throw new ObjectStoreError(
        `Cannot clone store data: ${error.message}`,
        null,
        { cause: error }
      );
    }
  }

  // -----------------------------
  // Array helpers
  // -----------------------------

  push(path, ...values) {
    const array = this._ensureArray(path, "push");

    array.push(...values);

    return array.length;
  }

  pop(path) {
    const array = this._ensureArray(path, "pop");

    return array.pop();
  }

  shift(path) {
    const array = this._ensureArray(path, "shift");

    return array.shift();
  }

  unshift(path, ...values) {
    const array = this._ensureArray(path, "unshift");

    return array.unshift(...values);
  }

  splice(
    path,
    start,
    deleteCount,
    ...items
  ) {
    const array = this._ensureArray(path, "splice");

    return array.splice(
      start,
      deleteCount,
      ...items
    );
  }

  // -----------------------------
  // Internal array validation
  // -----------------------------

  _ensureArray(path, operation) {
    const parts = parsePath(path);

    // A wildcard get() returns a new results array, so mutating it
    // would silently do nothing to the stored data.
    assertNoWildcard(parts, path, operation);

    const value = this._getRecursive(this.data, parts, new Set());

    if (!Array.isArray(value)) {
      throw new ObjectStoreError(
        `Path "${path}" is not an array.`,
        path
      );
    }

    return value;
  }
}
