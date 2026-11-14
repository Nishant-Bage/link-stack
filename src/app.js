import { selectLinks, STORAGE_KEY } from "./model.js";
import { request, currentTab } from "./storage.js";
import { linkCard } from "./components.js";

const $ = (id) => document.getElementById(id);
let links = [];
let removed = null;
let busy = false;

function notify(text, error = false) {
  $("message").textContent = text;
  $("message").classList.toggle("error", error);
}

function render() {
  const selected = $("stack-filter").value;
  const stacks = [...new Set(links.map((link) => link.stack))].sort();
  $("stack-filter").replaceChildren(
    new Option("All stacks", ""),
    ...stacks.map((stack) => new Option(stack, stack)),
  );
  $("stack-filter").value = stacks.includes(selected) ? selected : "";
  $("stack-options").replaceChildren(
    ...stacks.map((stack) => new Option(stack, stack)),
  );
  const visible = selectLinks(links, {
    search: $("search").value,
    stack: $("stack-filter").value,
    favorites: $("favorites").checked,
  });
  $("links").replaceChildren(
    ...visible.map((link) =>
      linkCard(
        link,
        () => mutate({ type: "favorite", id: link.id }, "Favorite updated."),
        () =>
          mutate({ type: "remove", id: link.id }, "Link deleted.", () => {
            removed = link;
            $("undo").hidden = false;
          }),
      ),
    ),
  );
  $("count").textContent = String(links.length);
  $("empty").hidden = visible.length > 0;
  $("empty").textContent = links.length
    ? "No matching links. Try another search or filter."
    : "No links yet. Save a page you want to come back to.";
}

async function mutate(action, message, onSuccess) {
  if (busy) return;
  busy = true;
  document.body.setAttribute("aria-busy", "true");
  try {
    links = await request(action);
    onSuccess?.();
    render();
    notify(message);
  } catch (error) {
    notify(error.message, true);
  } finally {
    busy = false;
    document.body.removeAttribute("aria-busy");
  }
}

$("toggle-manual").addEventListener("click", () => {
  $("add-form").hidden = false;
  $("url").focus();
});
$("cancel").addEventListener("click", () => {
  $("add-form").hidden = true;
});
$("save-current").addEventListener("click", async () => {
  try {
    const tab = await currentTab();
    await mutate(
      {
        type: "add",
        input: { ...tab, stack: $("stack-filter").value || "Inbox" },
      },
      "Current tab saved. You can close it now.",
    );
  } catch (error) {
    notify(error.message, true);
  }
});
$("add-form").addEventListener("submit", (event) => {
  event.preventDefault();
  void mutate(
    {
      type: "add",
      input: {
        url: $("url").value,
        title: $("title").value,
        stack: $("stack").value,
      },
    },
    "Link saved.",
    () => {
      $("add-form").reset();
      $("add-form").hidden = true;
    },
  );
});
$("undo").addEventListener("click", () => {
  if (removed)
    void mutate({ type: "restore", link: removed }, "Link restored.", () => {
      removed = null;
      $("undo").hidden = true;
    });
});
for (const id of ["search", "stack-filter", "favorites"])
  $(id).addEventListener("input", render);
$("expand").addEventListener("click", () =>
  chrome.tabs.create({ url: chrome.runtime.getURL("index.html?view=library") }),
);
if (new URLSearchParams(location.search).get("view") === "library") {
    document.documentElement.classList.add("full-library");
  document.body.classList.add("full-library");
  $("expand").hidden = true;
  $("save-current").hidden = true;
  $("toggle-manual").textContent = "＋ Add a link";
}
$("export").addEventListener("click", async () => {
  try {
    const latest = await request({ type: "read" });
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ version: 1, links: latest }, null, 2)], {
        type: "application/json",
      }),
    );
    const download = document.createElement("a");
    download.href = url;
    download.download = `link-stack-${new Date().toISOString().slice(0, 10)}.json`;
    download.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Backup exported. Keep it somewhere safe.");
  } catch (error) {
    notify(error.message, true);
  }
});
$("import").addEventListener("click", () => $("import-file").click());
$("import-file").addEventListener("change", async () => {
  const file = $("import-file").files[0];
  if (!file) return;
  try {
    if (file.size > 8_000_000)
      throw new Error("Backup is too large. Choose a file smaller than 8 MB.");
    const backup = JSON.parse(await file.text());
    await mutate(
      { type: "import", backup },
      "Backup merged. Existing links were kept; duplicates were skipped.",
    );
  } catch (error) {
    notify(`Could not restore backup: ${error.message}`, true);
  } finally {
    $("import-file").value = "";
  }
});
async function load() {
  try {
    links = await request({ type: "read" });
    render();
  } catch (error) {
    notify(error.message, true);
  }
}
globalThis.chrome?.storage?.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[STORAGE_KEY]) void load();
});
void load();
