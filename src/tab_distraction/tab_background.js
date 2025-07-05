import { callGemini } from './ai.js';

export function handleTabUpdate(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url) {
    setTimeout(() => {
      chrome.tabs.get(tabId, (updatedTab) => {
        if (
          chrome.runtime.lastError ||
          !updatedTab.url ||
          !updatedTab.url.startsWith('http')
        ) {
          return;
        }

        chrome.storage.sync.get('extensionEnabled', (data) => {
          const isEnabled = data.extensionEnabled ?? false;
          if (!isEnabled) {
            console.log("🚫 Extension is disabled. Skipping Gemini call.");
            return;
          }

          try {
            const url = new URL(updatedTab.url);
            const domain = url.hostname.replace('www.', '');

            callGemini(domain, updatedTab.title)
              .then(response => {
                console.log("Gemini Response:", response);
                if (response.trim().toLowerCase() === "distracting") {
                  chrome.tabs.remove(tabId);
                }
              })
              .catch(err => {
                console.error("Gemini API Error:", err);
              });

          } catch (error) {
            console.error("Unexpected Error:", error);
          }
        });
      });
    }, 5000);
  }
}
