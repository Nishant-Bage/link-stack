import test from "node:test";
import assert from "node:assert/strict";
import {
  addLink,
  applyChange,
  normalizeUrl,
  selectLinks,
  validateLinks,
} from "../src/model.js";

const savedAt = "2026-11-14T10:00:00.000Z";
const first = addLink(
  [],
  {
    url: "https://example.com/docs#intro",
    title: "Useful docs",
    stack: "Learning",
  },
  "one",
  savedAt,
);

test("normalizes host and default port but preserves meaningful paths, query, and anchors", () => {
  assert.equal(
    normalizeUrl("https://EXAMPLE.com:443/docs?q=one#two"),
    "https://example.com/docs?q=one#two",
  );
});

test("rejects executable URLs, browser pages, and embedded credentials", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "chrome://settings",
    "file:///tmp/a",
    "https://user:secret@example.com",
  ]) {
    assert.throws(() => normalizeUrl(url));
  }
});

test("duplicate checking uses normalized URLs without dropping anchors", () => {
  assert.throws(
    () =>
      addLink(first, { url: "https://EXAMPLE.com/docs#intro" }, "two", savedAt),
    /already saved/,
  );
  assert.equal(
    addLink(first, { url: "https://example.com/docs#other" }, "two", savedAt)
      .length,
    2,
  );
});

test("blank stack falls back to Inbox and metadata is bounded", () => {
  const [link] = addLink(
    [],
    { url: "https://example.com", title: "a".repeat(400), stack: " " },
    "one",
    savedAt,
  );
  assert.equal(link.title.length, 300);
  assert.equal(link.stack, "Inbox");
});

test("search, stacks, and favorites compose without mutating data", () => {
  const links = applyChange(first, { type: "favorite", id: "one" });
  assert.equal(
    selectLinks(links, { search: "DOCS", stack: "Learning", favorites: true })
      .length,
    1,
  );
  assert.equal(selectLinks(links, { stack: "Work" }).length, 0);
  assert.equal(first[0].favorite, false);
});

test("delete and restore preserve metadata and repeated restore is idempotent", () => {
  const empty = applyChange(first, { type: "remove", id: "one" });
  const restored = applyChange(empty, { type: "restore", link: first[0] });
  assert.deepEqual(restored, first);
  assert.deepEqual(
    applyChange(restored, { type: "restore", link: first[0] }),
    first,
  );
});

test("malformed storage fails explicitly instead of silently erasing data", () => {
  for (const value of [
    {},
    [null],
    [{ ...first[0], savedAt: "bad" }],
    [first[0], first[0]],
  ]) {
    assert.throws(() => validateLinks(value));
  }
});

test("backup import merges without overwriting current metadata or trusting IDs", () => {
  const second = { ...first[0], url: "https://example.org/", title: "Other" };
  const result = applyChange(first, {
    type: "import",
    backup: { version: 1, links: [second] },
  });
  assert.equal(result.length, 2);
  assert.notEqual(result[0].id, "one");
  const duplicates = applyChange(first, {
    type: "import",
    backup: { version: 1, links: [{ ...first[0], title: "Old title" }] },
  });
  assert.deepEqual(duplicates, first);
});

test("invalid backups are rejected atomically", () => {
  assert.throws(
    () =>
      applyChange(first, { type: "import", backup: { version: 3, links: [] } }),
    /version/,
  );
  assert.throws(() =>
    applyChange(first, {
      type: "import",
      backup: {
        version: 1,
        links: [{ ...first[0], url: "javascript:alert(1)" }],
      },
    }),
  );
  assert.equal(first.length, 1);
});

test('text and email survive validation, search, backup merge and undo', () => {
  let items = addLink(first, {kind:'text', content:'Meeting notes\nFollow up tomorrow'}, 'text', savedAt);
  items = addLink(items, {kind:'email', content:'hello@example.com'}, 'email', savedAt);
  assert.deepEqual(validateLinks(items), items);
  assert.equal(selectLinks(items, {search:'tomorrow'}).length, 1);
  assert.equal(applyChange(items, {type:'import', backup:{version:2, links:items}}).length, 3);
  const removed = applyChange(items, {type:'remove', id:'email'});
  assert.deepEqual(applyChange(removed, {type:'restore', link:items[0]}), items);
  assert.throws(() => addLink(items, {kind:'text', content:' Meeting notes\nFollow up tomorrow '}, 'x', savedAt), /already saved/);
});

test('text stays inert and invalid content fails without changing existing links', () => {
  const [item] = addLink([], {kind:'text',content:'<script>alert(1)</script>'}, 'text', savedAt);
  assert.equal(item.content, '<script>alert(1)</script>');
  for (const input of [{kind:'text',content:' '}, {kind:'text',content:'x'.repeat(8001)}, {kind:'email',content:'not an email'}, {kind:'unknown',content:'test'}]) {
    assert.throws(() => addLink(first, input, 'x', savedAt));
  }
  assert.equal(first.length, 1);
});

test("stale changes are rejected instead of changing unrelated links", () => {
  assert.throws(
    () => applyChange(first, { type: "remove", id: "missing" }),
    /no longer exists/,
  );
});

test('whitespace-only titles fall back to the domain and oversized URLs fail', () => {
  assert.equal(addLink([], { url: 'https://example.com', title: '   ' }, 'one', savedAt)[0].title, 'example.com');
  assert.throws(() => normalizeUrl('https://example.com/' + 'a'.repeat(8000)), /8,000/);
});
