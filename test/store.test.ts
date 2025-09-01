import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";

// Dynamically import after setting HOME to isolate DB location (optional for this implementation)
async function loadStore() {
  return await import("../src/index.js");
}

function makeTempHome() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tinydb-test-"));
  process.env.HOME = dir; // Unix-like
  process.env.USERPROFILE = dir; // Windows
  return dir;
}

let tempHome: string;

beforeEach(() => {
  tempHome = makeTempHome();
});

afterEach(() => {
  // cleanup temp home
  try { fs.rmSync(tempHome, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("TinyDB store", () => {
  it("creates db on first access and supports CRUD", async () => {
    const { TinyDB } = await loadStore();
    const db = new TinyDB("db.json");
    const collection = "links";

    // Initially empty
    expect(db.findAll(collection)).toEqual([]);

    const doc = { id: "abc123", url: "https://example.com/", createdAt: new Date().toISOString(), hits: 0 };
    db.upsert(collection, doc);

    // find and list
    expect(db.findById(collection, "abc123")).toMatchObject({ id: "abc123", url: "https://example.com/" });
    expect(db.findAll(collection).length).toBe(1);

    // update
    db.upsert(collection, { ...doc, hits: 5 });
    expect(db.findById(collection, "abc123")?.hits).toBe(5);

    // remove
    expect(db.remove(collection, "abc123")).toBe(true);
    expect(db.findById(collection, "abc123")).toBeUndefined();
    expect(db.remove(collection, "abc123")).toBe(false); // already removed
  });

  it("persists on disk in ~/.tinydb/db.json", async () => {
    const { TinyDB } = await loadStore();
    const db = new TinyDB("db.json");
    const collection = "links";
    const doc = { id: "xyz", url: "https://x.y/", createdAt: new Date().toISOString(), hits: 0 };
    db.upsert(collection, doc);

    const dbPath = path.join(process.env.HOME!, ".tinydb", "db.json");
    const txt = fs.readFileSync(dbPath, "utf8");
    const parsed = JSON.parse(txt);
    expect(parsed).toHaveProperty(collection);
    expect(Array.isArray(parsed[collection])).toBe(true);
    expect(parsed[collection].find((l: any) => l.id === "xyz")).toBeTruthy();
  });

  it("filters documents using a predicate", async () => {
    const { TinyDB } = await loadStore();
    const db = new TinyDB("db.json");
    const collection = "items";
    db.upsert(collection, { id: "1", type: "a", value: 1 });
    db.upsert(collection, { id: "2", type: "b", value: 2 });
    db.upsert(collection, { id: "3", type: "a", value: 3 });

    const onlyA = db.filter(collection, (d) => d.type === "a");
    expect(onlyA.map(d => d.id)).toEqual(["1", "3"]);
  });
});
