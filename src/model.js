export const STORAGE_KEY = "link-stack:v1";

export function normalizeContent(input) {
  const kind = input.kind ?? "link";
  if (kind === "link") return { url: normalizeUrl(input.url) };
  if (!["text", "email"].includes(kind)) throw new Error("Choose link, text, or email.");
  const content = typeof input.content === "string" ? input.content.trim() : "";
  if (!content || content.length > 8000) throw new Error("Enter content between 1 and 8,000 characters.");
  if (kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content))
    throw new Error("Enter an email address, or choose Text for an email message.");
  return { kind, content };
}

function itemKey(item) {
  return item.kind && item.kind !== "link" ? `${item.kind}:${item.content}` : `link:${item.url}`;
}

export function normalizeUrl(value) {
  if (typeof value !== "string" || value.length > 8000) {
    throw new Error("Enter a URL shorter than 8,000 characters.");
  }
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol)) {
    throw new Error("Only http and https links can be saved.");
  }
  if (url.username || url.password)
    throw new Error("Links containing passwords cannot be saved.");
  // Keep query strings and fragments: these can identify distinct resources.
  return url.href;
}

export function validateLinks(value) {
  if (!Array.isArray(value)) throw new Error("Saved data is not a link list.");
  const ids = new Set();
  const urls = new Set();
  return value.map((link) => {
    if (
      !link ||
      typeof link.id !== "string" ||
      !link.id ||
      typeof link.title !== "string" ||
      !link.title.trim() || link.title.length > 300 ||
      typeof link.stack !== "string" ||
      !link.stack.trim() || link.stack.length > 60 ||
      typeof link.favorite !== "boolean" ||
      typeof link.savedAt !== "string" ||
      !Number.isFinite(Date.parse(link.savedAt))
    ) {
      throw new Error(
        "Saved data contains an invalid link. Recover your extension storage before continuing; it has not been overwritten.",
      );
    }
    const payload = normalizeContent(link);
    const key = itemKey(payload);
    if (ids.has(link.id) || urls.has(key))
      throw new Error("Saved data contains duplicate links.");
    ids.add(link.id);
    urls.add(key);
    return {
      id: link.id,
      title: link.title,
      stack: link.stack,
      favorite: link.favorite,
      savedAt: link.savedAt,
      ...payload,
    };
  });
}

export function addLink(links, input, id, savedAt) {
  const payload = normalizeContent(input);
  if (links.some((link) => itemKey(link) === itemKey(payload)))
    throw new Error("This item is already saved.");
  if (links.length >= 2000)
    throw new Error(
      "Your library is full. Export a backup and remove unused links.",
    );
  const title = String(input.title || "")
    .trim()
    .slice(0, 300) || (payload.url ? new URL(payload.url).hostname : payload.content.split(/\r?\n/)[0].slice(0, 80));
  const stack =
    String(input.stack || "Inbox")
      .trim()
      .slice(0, 60) || "Inbox";
  return [{ id, ...payload, title, stack, savedAt, favorite: false }, ...links];
}

export function selectLinks(
  links,
  { search = "", stack = "", favorites = false } = {},
) {
  const term = search.trim().toLocaleLowerCase();
  return links.filter(
    (link) =>
      (!stack || link.stack === stack) &&
      (!favorites || link.favorite) &&
      `${link.title} ${link.url ?? link.content} ${link.stack}`
        .toLocaleLowerCase()
        .includes(term),
  );
}

export function applyChange(links, action) {
  if (action.type === "add")
    return addLink(
      links,
      action.input,
      crypto.randomUUID(),
      new Date().toISOString(),
    );
  if (action.type === "import") {
    if (![1, 2].includes(action.backup?.version))
      throw new Error("Unsupported backup version.");
    const incoming = validateLinks(action.backup.links);
    const urls = new Set(links.map(itemKey));
    const additions = incoming
      .filter((link) => !urls.has(itemKey(link)))
      .map((link) => ({ ...link, id: crypto.randomUUID() }));
    if (links.length + additions.length > 2000)
      throw new Error("This backup would exceed the 2,000-link limit.");
    return [...additions, ...links];
  }
  if (action.type === "restore") {
    const [link] = validateLinks([action.link]);
    if (links.some((item) => item.id === link.id || itemKey(item) === itemKey(link)))
      return links;
    if (links.length >= 2000) throw new Error("Your library is full.");
    return [link, ...links];
  }
  const existing = links.find((link) => link.id === action.id);
  if (!existing)
    throw new Error("This link no longer exists. Refresh your library.");
  if (action.type === "remove")
    return links.filter((link) => link.id !== action.id);
  if (action.type === "favorite")
    return links.map((link) =>
      link.id === action.id ? { ...link, favorite: !link.favorite } : link,
    );
  throw new Error("Unknown change.");
}
