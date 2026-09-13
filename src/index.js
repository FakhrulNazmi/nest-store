// Block keys capable of altering object prototypes
const FORBIDDEN_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype"
]);

// Maximum array size allowed when creating empty arrays via paths
const MAX_SAFE_ARRAY_INDEX = 100_000;

/**
 * Checks whether a value can be traversed safely
 * like an object or array.
 */
function isObjectLike(value) {
  return value !== null && typeof value === "object";
}

/**
 * Checks whether a string represents a non-negative integer.
 */
function isArrayIndexKey(key) {
  return typeof key === "string" && /^\d+$/.test(key);
}

/**
 * Normalizes a path string and checks for dangerous properties.
 *
 * Supported examples:
 *   "user.profile.name"
 *   "items[0].id"
 *   'items["0"].id'
 *   ["user", "profile", "name"]
 */
function parsePath(path) {
  let keys;

  if (Array.isArray(path)) {
    keys = path;
  } else if (typeof path === "string") {
    keys = path
      .replace(/\[["']?([^"']+)["']?\]/g, ".$1")
      .split(".")
      .filter(Boolean);
  } else {
    return [];
  }

  for (const key of keys) {
    if (typeof key !== "string") {
      throw new TypeError("Path segments must be strings.");
    }

    if (FORBIDDEN_KEYS.has(key)) {
      throw new Error(
        `Security Exception: Accessing forbidden property "${key}" is disallowed.`
      );
    }
  }

  return keys;
}

/**
 * Safely checks whether an object has its own property.
 */
function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export class ObjectStore {
  constructor(initialData = {}) {
    if (!isObjectLike(initialData)) {
      throw new TypeError(
        "Initial data must be a non-null object or array."
      );
    }

    this.data = initialData;
  }

  /**
   * Safely sets a value at a deeply nested path.
   *
   * Examples:
   *   store.set("user.profile.name", "John");
   *   store.set("items[0].id", 100);
   */
  set(path, value) {
    const keys = parsePath(path);

    if (keys.length === 0) {
      return this.data;
    }

    let current = this.data;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const nextKey = keys[i + 1];

      // Check array index limits before creating an array
      if (isArrayIndexKey(nextKey)) {
        const index = Number(nextKey);

        if (index > MAX_SAFE_ARRAY_INDEX) {
          throw new RangeError(
            `Array index ${index} exceeds maximum safe initialization limit.`
          );
        }
      }

      const shouldCreateArray = isArrayIndexKey(nextKey);

      // Replace missing or non-object values with a new container
      if (!isObjectLike(current[key])) {
        current[key] = shouldCreateArray ? [] : {};
      }

      current = current[key];
    }

    const finalKey = keys[keys.length - 1];

    // Prevent creating an excessively large array through the final key
    if (Array.isArray(current) && isArrayIndexKey(finalKey)) {
      const index = Number(finalKey);

      if (index > MAX_SAFE_ARRAY_INDEX) {
        throw new RangeError(
          `Array index ${index} exceeds maximum safe initialization limit.`
        );
      }
    }

    current[finalKey] = value;

    return this.data;
  }

  /**
   * Safely retrieves a value or collection of values matching a path.
   *
   * Supports wildcard segments:
   *   "users.*.name"
   */
  get(path) {
    if (!path) {
      return this.data;
    }

    let keys;

    try {
      keys = parsePath(path);
    } catch {
      return undefined;
    }

    const visited = new WeakSet();

    return this._getRecursive(this.data, keys, 0, visited);
  }

  _getRecursive(current, keys, index, visited) {
    if (index === keys.length) {
      return current;
    }

    if (!isObjectLike(current)) {
      return undefined;
    }

    // Prevent infinite recursion caused by circular references
    if (visited.has(current)) {
      return undefined;
    }

    visited.add(current);

    const key = keys[index];

    // Wildcard branch
    if (key === "*") {
      const values = Array.isArray(current)
        ? current
        : Object.values(current);

      const results = [];

      for (const item of values) {
        const value = this._getRecursive(
          item,
          keys,
          index + 1,
          visited
        );

        if (value !== undefined) {
          if (
            Array.isArray(value) &&
            keys.slice(index + 1).includes("*")
          ) {
            results.push(...value);
          } else {
            results.push(value);
          }
        }
      }

      return results;
    }

    // Only allow access to own properties
    if (!hasOwn(current, key)) {
      return undefined;
    }

    return this._getRecursive(
      current[key],
      keys,
      index + 1,
      visited
    );
  }

  /**
   * Deletes a property or array element at a specified path.
   *
   * Array elements are removed using splice().
   */
  delete(path) {
    const keys = parsePath(path);

    if (keys.length === 0) {
      return false;
    }

    let current = this.data;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];

      if (!isObjectLike(current) || !hasOwn(current, key)) {
        return false;
      }

      current = current[key];
    }

    if (!isObjectLike(current)) {
      return false;
    }

    const finalKey = keys[keys.length - 1];

    if (Array.isArray(current)) {
      if (!isArrayIndexKey(finalKey)) {
        return false;
      }

      const index = Number(finalKey);

      if (index >= 0 && index < current.length) {
        current.splice(index, 1);
        return true;
      }

      return false;
    }

    if (hasOwn(current, finalKey)) {
      delete current[finalKey];
      return true;
    }

    return false;
  }

  /**
   * Ensures that a path contains an array.
   *
   * If the path does not exist, an empty array is created.
   */
  _ensureArray(path) {
    let target = this.get(path);

    if (target === undefined) {
      target = [];
      this.set(path, target);
    } else if (!Array.isArray(target)) {
      throw new TypeError(
        `Target at path "${path}" is not an Array.`
      );
    }

    return target;
  }

  /**
   * Adds one or more items to the end of an array.
   */
  push(path, ...items) {
    const arr = this._ensureArray(path);
    return arr.push(...items);
  }

  /**
   * Removes and returns the last item.
   */
  pop(path) {
    const arr = this._ensureArray(path);
    return arr.pop();
  }

  /**
   * Removes and returns the first item.
   */
  shift(path) {
    const arr = this._ensureArray(path);
    return arr.shift();
  }

  /**
   * Adds one or more items to the beginning of an array.
   */
  unshift(path, ...items) {
    const arr = this._ensureArray(path);
    return arr.unshift(...items);
  }

  /**
   * Removes, replaces, or adds items at a specified position.
   */
  splice(path, start, deleteCount, ...items) {
    const arr = this._ensureArray(path);
    return arr.splice(start, deleteCount, ...items);
  }
}