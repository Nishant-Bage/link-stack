import { STORAGE_KEY, validateLinks, applyChange } from "./model.js";

// Serialize read-modify-write operations from all open extension views.
// Every operation reads persisted state; worker restarts do not lose links.
let queue = Promise.resolve();
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message?.channel !== "link-stack")
    return;
  const task = queue.then(async () => {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const links = validateLinks(stored[STORAGE_KEY] ?? []);
    if (message.action.type === "read") return links;
    const next = applyChange(links, message.action);
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
    return next;
  });
  queue = task.catch(() => {});
  task.then(
    (links) => respond({ links }),
    (error) => respond({ error: error.message }),
  );
  return true;
});
