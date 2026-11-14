export async function request(action) {
  if (!globalThis.chrome?.runtime?.id) {
    throw new Error(
      "Load Link Stack as an unpacked extension in Chrome or Edge to use your library.",
    );
  }
  const response = await chrome.runtime.sendMessage({
    channel: "link-stack",
    action,
  });
  if (!response)
    throw new Error(
      "The extension did not respond. Reopen Link Stack and try again.",
    );
  if (response.error) throw new Error(response.error);
  return response.links;
}

export async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url)
    throw new Error("Open the extension from the page you want to save.");
  return { url: tab.url, title: tab.title || "" };
}
