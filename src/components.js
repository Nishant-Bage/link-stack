function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function linkCard(link, onFavorite, onRemove, onCopy) {
  const isLink = !link.kind || link.kind === "link";
  const hostname = isLink ? new URL(link.url).hostname : "";
  const card = element("article", "link-card");
  const badge = element(
    "span",
    "site-badge",
    (isLink ? hostname : link.kind === "email" ? "@" : "T")
      .replace(/^www\./, "")
      .slice(0, 1)
      .toUpperCase(),
  );
  badge.setAttribute("aria-hidden", "true");
  const content = element("div", "link-content");
  const anchor = element(isLink ? "a" : "strong", "link-title", link.title);
  if (isLink) {
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
  }
  const domain = element("p", isLink ? "domain" : "saved-content", isLink ? hostname : link.content);
  const meta = element("div", "link-meta");
  meta.append(
    element("span", "stack-tag", link.stack),
    element(
      "span",
      "",
      new Date(link.savedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    ),
  );
  content.append(anchor, domain, meta);
  const actions = element("div", "card-actions");
  const favorite = element("button", "icon-button", link.favorite ? "★" : "☆");
  favorite.setAttribute(
    "aria-label",
    `${link.favorite ? "Unfavorite" : "Favorite"} ${link.title}`,
  );
  favorite.setAttribute("aria-pressed", String(link.favorite));
  favorite.addEventListener("click", () => onFavorite(link));
  const remove = element("button", "icon-button remove", "×");
  remove.setAttribute("aria-label", `Delete ${link.title}`);
  remove.addEventListener("click", () => onRemove(link));
  actions.append(favorite, remove);
  const copy = element("button", "icon-button", "Copy");
  copy.setAttribute("aria-label", `Copy ${link.title}`);
  copy.addEventListener("click", () => onCopy(link));
  actions.prepend(copy);
  card.append(badge, content, actions);
  return card;
}
