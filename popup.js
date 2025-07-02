import { NOTION_TOKEN, DATABASE_ID } from "./secrets.js";

const toggleSwitch = document.getElementById('toggleSwitch');

// Load saved state
chrome.storage.sync.get('extensionEnabled', (data) => {
  toggleSwitch.checked = data.extensionEnabled ?? false; // default to false
});

// Save toggle state
toggleSwitch.addEventListener('change', () => {
  chrome.storage.sync.set({ extensionEnabled: toggleSwitch.checked });
});


// -----------------------------------------------------------------------------------------
// Function to send LeetCode data to Notion
// -----------------------------------------------------------------------------------------

document.getElementById("send").addEventListener("click", async () => {
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
                "content": ""
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
    alert("✅ Sent to Notion!");
    console.log("✅ Success:", await response.json());
  } else {
    const err = await response.text();
    alert("❌ Failed to send. See console.");
    console.error("❌ Error:", response.status, err);
  }
});
