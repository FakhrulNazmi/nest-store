import { ObjectStore } from "../src/index.js";

// Create a store
const store = new ObjectStore();

// 1. Set nested values
store.set("user.profile.name", "John Dow");
store.set("user.profile.age", 25);

console.log("User:", store.get("user.profile"));

// 2. Get a specific value
console.log("Name:", store.get("user.profile.name"));

// 3. Automatically create arrays
store.set("items[0].name", "Laptop");
store.set("items[1].name", "Mouse");

console.log("Items:", store.get("items"));

// 4. Add an item using push()
store.push("items", { name: "Keyboard" });

console.log("After push:", store.get("items"));

// 5. Wildcard query
console.log("Item names:", store.get("items.*.name"));

// 6. Delete a nested property
store.delete("user.profile.age");

console.log("After delete:", store.get("user.profile"));