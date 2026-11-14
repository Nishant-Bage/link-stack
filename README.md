# Link Stack

A small Chrome / Edge extension for links worth keeping. Save the current tab, close it, and find it later in a searchable local library.

Built with plain JavaScript modules, semantic HTML, and CSS. No framework, server, account, tracking, remote fonts, or runtime dependencies.

## Try it locally

Requires Node.js 22 or later for development commands.

```sh
npm test
npm run build
```

1. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
2. Enable **Developer mode**, choose **Load unpacked**, and select this project's `dist` folder.
3. Pin Link Stack from the browser's extensions menu.
4. Visit an ordinary web page, click Link Stack, and choose **Save current tab**.
5. Close the original tab. Open Link Stack again to find the saved link.

After changing code, build again and click **Reload** on the extension's management card. Opening `index.html` as an ordinary website does not provide extension storage or active-tab access.

## What it does

- Save the current page to Inbox or the currently selected stack.
- Add a URL manually with a title and custom stack name.
- Search by title, URL, or stack; combine search with stack and favorite filters.
- Open saved pages, mark favorites, and delete links with one-step undo while the view remains open.
- Open a full-width library in a separate tab.
- Export JSON backups and restore them by merging new URLs without overwriting existing links.
- Keep multiple open views updated when local storage changes.

Only HTTP(S) URLs are accepted. Duplicate detection normalizes URLs while preserving query parameters and fragments because those may identify distinct resources. Link titles are inserted as text, never interpreted as HTML. Domain initials are generated locally instead of fetching external favicons.

## Design and permissions

`activeTab` reads the current URL/title when you invoke the extension. `storage` persists your library in `chrome.storage.local`. There are no host permissions, content scripts, browsing-history collection, or automatic tab tracking. Full-library mode accepts manual links; capture is done from the toolbar popup on the page you want to keep.

Saved links survive closing tabs, closing the popup, and restarting the browser. They are specific to this browser profile and are not synchronized between devices. Uninstalling the extension removes its local data; export a backup first. Backups contain your saved URLs and titles, so store them appropriately.

The service worker is the only writer. It serializes mutations from popup and library views and reads persisted state for each operation. A failed write leaves the previous library intact and does not block later retries. Invalid persisted data produces an explicit error rather than resetting the library. The library is limited to 2,000 links; storage quota errors are surfaced to the user.

## Code map

| File                       | Responsibility                                          |
| -------------------------- | ------------------------------------------------------- |
| `src/model.js`             | URL validation, filtering, mutations, backup validation |
| `src/background.js`        | Serialized reads/writes to extension storage            |
| `src/storage.js`           | Browser API adapter and current-tab lookup              |
| `src/components.js`        | Safe, reusable link-card rendering                      |
| `src/app.js`               | Popup/library state and event wiring                    |
| `index.html`, `styles.css` | Accessible controls and responsive layout               |

## Verification

`npm test` runs Node's built-in test runner. Tests cover URL safety, duplicate handling, composed filters, delete/undo, malformed storage, backup merging, concurrent worker mutations, and recovery after a storage write fails. Browser APIs are mocked in the worker test.

`npm run build` packages local files into `dist`; there is no bundler or compilation step. Automated tests do not install the extension in a real browser. Before publishing, manually check save → close tab → reopen, favorite/search, two open library views, delete/undo, export/restore, and browser restart persistence. No store publication or store review has been completed.

## Next improvements

- Edit titles and move existing links between stacks.
- Keyboard shortcut for saving a page.
- Accessible keyboard interaction tests in an installed-extension test environment.

## Platform references

- [Extension storage](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [activeTab permission](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- [Manifest V3](https://developer.chrome.com/docs/extensions/reference/manifest)
