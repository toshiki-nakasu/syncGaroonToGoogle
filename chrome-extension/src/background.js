import { ExtensionApplication } from './application/ExtensionApplication.js';

const application = new ExtensionApplication();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  application.handleMessage(message, sender).then(
    (value) => sendResponse({ ok: true, value }),
    (error) => sendResponse({ ok: false, error: error.message }),
  );
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) =>
  application.handleAlarm(alarm).catch(() => {}),
);
chrome.runtime.onInstalled.addListener(() =>
  application.refreshStatus().catch(() => {}),
);
chrome.runtime.onStartup.addListener(() =>
  application.refreshStatus().catch(() => {}),
);
chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (change.status === 'complete' && tab.url?.includes('.cybozu.com/g/')) {
    application.refreshStatus().catch(() => {});
  }
});
chrome.tabs.onRemoved.addListener(() =>
  application.refreshStatus().catch(() => {}),
);
