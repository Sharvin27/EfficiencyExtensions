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
    const intuitionText = message.intuition.text;
    const isSolved = message.intuition.solved;
    console.log("▶️ Grabbing active tab...");

    // Get the current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || !tab.url || !tab.title) {
      console.warn("Could not fetch tab info.");
      return;
    }
    const leetcodeUrl = tab.url;
    const leetcodeTitle = tab.title.replace(" - LeetCode", "").trim();

    // Get difficulty and tags from the page
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const diffElem = document.querySelector('div[class*="text-difficulty-"]');
        const difficulty = diffElem ? diffElem.innerText.trim() : "Unknown";
        const tagContainer = document.querySelector('div.flex.flex-wrap.gap-1.pl-7');
        let tags = [];
        if (tagContainer) {
          tags = Array.from(tagContainer.querySelectorAll('a')).map(el => el.innerText.trim());
        }
        return { difficulty, tags };
      }
    });
    const { difficulty, tags } = result;
    const notionTags = tags.map(tag => ({ name: tag }));

    // STEP 1: Search for existing page with the same title
    const searchRes = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      },
      body: JSON.stringify({
        filter: {
          property: "Problem Title",
          title: {
            equals: leetcodeTitle
          }
        }
      })
    });
    const searchData = await searchRes.json();
    if (searchData.results && searchData.results.length > 0) {
      // Page exists, update properties and append intuition block
      const pageId = searchData.results[0].id;
      // Update properties
      await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28"
        },
        body: JSON.stringify({
          properties: {
            "Status": { "select": { "name": isSolved ? "Solved" : "Unsolved" } },
            
            "TimeStamp": { "date": { "start": new Date().toISOString() } }
          }
        })
      });
      // Append intuition block
      await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28"
        },
        body: JSON.stringify({
          children: [
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [
                  {
                    type: 'text',
                    text: { content: intuitionText }
                  }
                ]
              }
            }
          ]
        })
      });
      console.log("✅ Existing page updated and intuition block appended.");
    } else {
      // Page does not exist, create as before
      const pageRes = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28"
        },
        body: JSON.stringify({
          parent: { database_id: DATABASE_ID },
          properties: {
            "Problem Title": {
              "title": [
                { "text": { "content": leetcodeTitle } }
              ]
            },
            "Link": { "url": leetcodeUrl },
            "Status": {
              "select": { "name": isSolved ? "Solved" : "Unsolved" }
            },
            "Tags": {
              "multi_select": notionTags
            },
            "Difficulty": {
              "select": { "name": difficulty }
            },
            "TimeStamp": {
              "date": { "start": new Date().toISOString() }
            }
          }
        })
      });
      if (!pageRes.ok) {
        const err = await pageRes.text();
        console.error("❌ Error creating page:", pageRes.status, err);
        return;
      }
      const createdPage = await pageRes.json();
      const pageId = createdPage.id;
      // Append Intuition block
      await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28"
        },
        body: JSON.stringify({
          children: [
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [
                  {
                    type: 'text',
                    text: { content: intuitionText }
                  }
                ]
              }
            }
          ]
        })
      });
      console.log("✅ Page created and intuition block appended successfully.");
    }
  }
});



