import { callGemini } from './ai.js';
import { NOTION_TOKEN, DATABASE_ID } from "./secrets.js";

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




// Listen for messages from content script and send to Notion
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'notepad-intuition') {
    const intuitionText = message.intuition;
    console.log("▶️ Grabbing active tab...");

    // Get the current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id || !tab.url || !tab.title) {
      alert("Could not fetch tab info.");
      return;
    }

    const leetcodeUrl = tab.url;
    const leetcodeTitle = tab.title.replace(" - LeetCode", "").trim();

    // Inject script to get difficulty and tags from the page
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Get difficulty from div with class containing 'text-difficulty-'
        const diffElem = document.querySelector('div[class*="text-difficulty-"]');
        const difficulty = diffElem ? diffElem.innerText.trim() : "Unknown";

        // Get tags from a tags inside the topics container
        const tagContainer = document.querySelector('div.flex.flex-wrap.gap-1.pl-7');
        let tags = [];
        if (tagContainer) {
          tags = Array.from(tagContainer.querySelectorAll('a')).map(el => el.innerText.trim());
        }
        return { difficulty, tags };
      }
    });

    const { difficulty, tags } = result;

    console.log("🔗 URL:", leetcodeUrl);
    console.log("📄 Title:", leetcodeTitle);
    console.log("💪 Difficulty:", difficulty);
    console.log("🏷️ Tags:", tags);

    // Prepare tags for Notion multi_select
    const notionTags = tags.map(tag => ({ name: tag }));

    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      },
      body: JSON.stringify({
        parent: {
          database_id: DATABASE_ID
        },
        properties: {
          "Problem Title": {
            "title": [
              {
                "text": {
                  "content": leetcodeTitle
                }
              }
            ]
          },
          "Link": {
            "url": leetcodeUrl
          },
          "Status": {
            "select": {
              "name": "Unsolved"
            }
          },
          "Intuition": {
            "rich_text": [
              {
                "text": {
                  "content": intuitionText
                }
              }
            ]
          },
          "Tags": {
            "multi_select": notionTags
          },
          "Difficulty": {
            "select": {
              "name": difficulty
            }
          },
          "TimeStamp" : {
            "date": {
              "start": new Date().toISOString()
            }
          }
        }
      })
    });

    if (response.ok) {
      console.log("✅ Success:", await response.json());
    } else {
      const err = await response.text();
      console.error("❌ Error:", response.status, err);
    }
  }
});



