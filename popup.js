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

  if (!tab || !tab.url || !tab.title) {
    alert("❌ Could not fetch tab info.");
    return;
  }

  const leetcodeUrl = tab.url;
  const leetcodeTitle = tab.title.replace(" - LeetCode", "").trim();

  console.log("🔗 URL:", leetcodeUrl);
  console.log("📄 Title:", leetcodeTitle);

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
          "multi_select": []
        },
        "Difficulty": {
          "select": {
            "name": "Medium"
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
