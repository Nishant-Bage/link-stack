import test from "node:test";
import assert from "node:assert/strict";
import { STORAGE_KEY } from "../src/model.js";

test("worker serializes concurrent writes and recovers after failed persistence", async () => {
  let state = {};
  let listener;
  let failNext = false;
  globalThis.chrome = {
    runtime: {
      id: "test-extension",
      onMessage: {
        addListener: (callback) => {
          listener = callback;
        },
      },
    },
    storage: {
      local: {
        get: async () => structuredClone(state),
        set: async (next) => {
          if (failNext) {
            failNext = false;
            throw new Error("Storage full");
          }
          state = structuredClone(next);
        },
      },
    },
  };
  await import("../src/background.js");
  const send = (action) =>
    new Promise((resolve) => {
      assert.equal(
        listener(
          { channel: "link-stack", action },
          { id: "test-extension" },
          resolve,
        ),
        true,
      );
    });
  const results = await Promise.all([
    send({ type: "add", input: { url: "https://one.example" } }),
    send({ type: "add", input: { url: "https://two.example" } }),
  ]);
  assert.equal(results[1].links.length, 2);
  assert.equal(state[STORAGE_KEY].length, 2);
  failNext = true;
  const failed = await send({
    type: "add",
    input: { url: "https://three.example" },
  });
  assert.equal(failed.error, "Storage full");
  assert.equal(state[STORAGE_KEY].length, 2);
  const retried = await send({
    type: "add",
    input: { url: "https://three.example" },
  });
  assert.equal(retried.links.length, 3);
  assert.equal(
    listener(
      { channel: "link-stack", action: { type: "read" } },
      { id: "other" },
      () => {},
    ),
    undefined,
  );
  delete globalThis.chrome;
});
