import {
  ensureBackgroundAlarms,
  EXTENSION_RELEASE_ALARM_NAME,
  handleExtensionInstalled,
  handleNotificationClick,
  handlePingBackgroundMessage,
  LIBRARY_REFRESH_ALARM_NAME,
  resolveReaderRedirect,
  runBackgroundReleaseCheck,
  runBackgroundUpdateSummary,
} from "@infra/services/background";
import { devLog } from "@utils/devLog";

const isDev = import.meta.env.MODE !== "production";

function runBackgroundTask(scope: string, task: () => Promise<unknown>) {
  void task().catch((error: unknown) => {
    devLog(scope, error);
  });
}

chrome.action.setBadgeBackgroundColor({ color: "#F00" });

chrome.notifications.onClicked.addListener((id: string) => {
  handleNotificationClick(id);
});

chrome.runtime.onInstalled.addListener((details: { reason?: string }) => {
  void handleExtensionInstalled(details).catch((error: unknown) => {
    devLog("background:install-failed", error);
  });
});

chrome.runtime.onMessage.addListener(
  (
    message: { msg?: string },
    _sender: unknown,
    sendResponse: (value: { ok: boolean; reason?: string; at?: number; summary?: unknown }) => void,
  ) =>
    handlePingBackgroundMessage(message, sendResponse, { isDev }),
);

chrome.webNavigation.onBeforeNavigate.addListener(
  (details: { tabId: number; url: string }) => {
    const redirectUrl = resolveReaderRedirect(details.url);
    if (!redirectUrl) return;
    chrome.tabs.update(details.tabId, { url: redirectUrl });
  },
  {
    url: [
      { urlMatches: "comicbus.com/online/.*$" },
      { urlMatches: "comic.sfacg.com/HTML/[^/]+/.+$" },
      {
        urlMatches: "^https://www\\.dm5\\.com/m\\d+/?(?:\\?.*)?$",
      },
      {
        urlMatches: "^https://tel\\.dm5\\.com/m\\d+/?(?:\\?.*)?$",
      },
    ],
  },
);

runBackgroundTask("background:ensure-alarms-failed", () =>
  ensureBackgroundAlarms(),
);

chrome.alarms.onAlarm.addListener((alarm: { name?: string }) => {
  if (alarm.name === LIBRARY_REFRESH_ALARM_NAME) {
    runBackgroundTask("background:update-summary-failed", () =>
      runBackgroundUpdateSummary(),
    );
    return;
  }

  if (alarm.name === EXTENSION_RELEASE_ALARM_NAME) {
    runBackgroundTask("background:release-check-failed", () =>
      runBackgroundReleaseCheck(),
    );
  }
});
