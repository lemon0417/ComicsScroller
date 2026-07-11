export function openExternalUrl(url: string) {
  if (!url) return;
  chrome.tabs.create({ url });
}

function getRuntimeError() {
  const error = (
    chrome.runtime as typeof chrome.runtime & { lastError?: { message?: string } }
  ).lastError;
  return error?.message ? new Error(error.message) : null;
}

export function closeCurrentTab() {
  return new Promise<void>((resolve, reject) => {
    chrome.tabs.getCurrent((tab) => {
      const getError = getRuntimeError();
      if (getError) {
        reject(getError);
        return;
      }
      if (typeof tab?.id !== "number") {
        resolve();
        return;
      }
      chrome.tabs.remove(tab.id, () => {
        const removeError = getRuntimeError();
        if (removeError) {
          reject(removeError);
          return;
        }
        resolve();
      });
    });
  });
}

export function openReaderPage(
  site: string,
  chapterID?: string,
  fallbackUrl = "",
) {
  if (site && chapterID) {
    const params = new URLSearchParams({ site, chapter: chapterID });
    chrome.tabs.create({
      url: `${chrome.runtime.getURL("app.html")}?${params.toString()}`,
    });
    return;
  }

  openExternalUrl(fallbackUrl);
}

export function openManagePage(tab = "following") {
  const params = new URLSearchParams({ tab });
  chrome.tabs.create({
    url: `${chrome.runtime.getURL("manage.html")}?${params.toString()}`,
  });
}
