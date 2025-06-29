import { callGemini } from './ai.js';

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Wait for full load
    setTimeout(() => {
      chrome.tabs.get(tabId, (updatedTab) => {
        if (
          chrome.runtime.lastError ||  // handles rare cases like closed tabs
          !updatedTab.url ||
          !updatedTab.url.startsWith('http')
        ) {
          return;
        }
        // 🔄 Check if the extension is enabled from popup toggle
        chrome.storage.sync.get('extensionEnabled', (data) => {
          const isEnabled = data.extensionEnabled ?? false; // default to disabled
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
    }, 5000); // Delay to allow page content to settle
  }
});




