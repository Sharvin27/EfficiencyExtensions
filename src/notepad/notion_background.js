import { NOTION_TOKEN, DATABASE_ID } from "../secrets.js";

// export async function handleNotepadMessage(message, sender, sendResponse) {
//   if (message.type !== 'notepad-intuition') return;

//   const intuitionText = message.intuition.text;
//   const isSolved = message.intuition.solved;
//   const pointer = message.intuition.pointer || "";

//   const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
//   if (!tab || !tab.id || !tab.url || !tab.title) {
//     console.warn("❌ Could not fetch tab info.");
//     return;
//   }

//   const leetcodeUrl = tab.url;
//   const leetcodeTitle = tab.title.replace(" - LeetCode", "").trim();

//   const [{ result }] = await chrome.scripting.executeScript({
//     target: { tabId: tab.id },
//     func: () => {
//       const diffElem = document.querySelector('div[class*="text-difficulty-"]');
//       const difficulty = diffElem ? diffElem.innerText.trim() : "Unknown";
//       const tagContainer = document.querySelector('div.flex.flex-wrap.gap-1.pl-7');
//       let tags = [];
//       if (tagContainer) {
//         tags = Array.from(tagContainer.querySelectorAll('a')).map(el => el.innerText.trim());
//       }
//       return { difficulty, tags };
//     }
//   });

//   const { difficulty, tags } = result;
//   const notionTags = tags.map(tag => ({ name: tag }));

//   // 1. Search for existing page
//   const searchRes = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
//     method: "POST",
//     headers: {
//       "Authorization": `Bearer ${NOTION_TOKEN}`,
//       "Content-Type": "application/json",
//       "Notion-Version": "2022-06-28"
//     },
//     body: JSON.stringify({
//       filter: {
//         property: "Problem Title",
//         title: {
//           equals: leetcodeTitle
//         }
//       }
//     })
//   });

//   const searchData = await searchRes.json();
//   const pageId = searchData?.results?.[0]?.id;

//   if (pageId) {
//     // Update properties and add intuition
//     await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
//       method: "PATCH",
//       headers: {
//         "Authorization": `Bearer ${NOTION_TOKEN}`,
//         "Content-Type": "application/json",
//         "Notion-Version": "2022-06-28"
//       },
//       body: JSON.stringify({
//         properties: {
//           "Status": { "select": { "name": isSolved ? "Solved" : "Unsolved" } },
//           "Pointers": { "rich_text": [{ "text": { "content": pointer } }] },
//           "TimeStamp": { "date": { "start": new Date().toISOString() } }
//         }
//       })
//     });

//     await appendIntuitionBlock(pageId, intuitionText);
//     console.log("✅ Updated existing Notion page.");
//   } else {
//     // Create new page
//     const pageRes = await fetch("https://api.notion.com/v1/pages", {
//       method: "POST",
//       headers: {
//         "Authorization": `Bearer ${NOTION_TOKEN}`,
//         "Content-Type": "application/json",
//         "Notion-Version": "2022-06-28"
//       },
//       body: JSON.stringify({
//         parent: { database_id: DATABASE_ID },
//         properties: {
//           "Problem Title": { "title": [{ "text": { "content": leetcodeTitle } }] },
//           "Link": { "url": leetcodeUrl },
//           "Status": { "select": { "name": isSolved ? "Solved" : "Unsolved" } },
//           "Pointers": { "rich_text": [{ "text": { "content": pointer } }] },
//           "Tags": { "multi_select": notionTags },
//           "Difficulty": { "select": { "name": difficulty } },
//           "TimeStamp": { "date": { "start": new Date().toISOString() } }
//         }
//       })
//     });

//     if (!pageRes.ok) {
//       const err = await pageRes.text();
//       console.error("❌ Error creating page:", pageRes.status, err);
//       return;
//     }

//     const createdPage = await pageRes.json();
//     await appendIntuitionBlock(createdPage.id, intuitionText);
//     console.log("✅ Created new Notion page.");
//   }
// }

export async function handleNotepadMessage(message, sender, sendResponse) {
  if (message.type !== 'notepad-intuition') return;
  console.log("📥 Received intuition message:", message);

  const intuitionText = message.intuition.text;
  const isSolved = message.intuition.solved;
  const pointer = message.intuition.pointer || "";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id || !tab.url || !tab.title) {
    console.warn("❌ Could not fetch tab info.");
    return;
  }

  const leetcodeUrl = tab.url;
  const leetcodeTitle = tab.title.replace(" - LeetCode", "").trim();

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

  const newProblem = {
    id: Date.now(),
    title: leetcodeTitle,
    link: leetcodeUrl,
    status: isSolved ? "Solved" : "To Do",
    difficulty: difficulty,
    pointers: pointer,
    tags: tags,
    timestamp: new Date().toLocaleString(),
    comments: "",
    intuition: intuitionText,
    code: ""
  };

  // 🔁 Save problem to chrome.storage.local
  chrome.storage.local.get(["problems"], (res) => {
    const currentProblems = res.problems || [];
    currentProblems.unshift(newProblem); // Add new problem to the beginning
    chrome.storage.local.set({ problems: currentProblems }, () => {
      console.log("✅ Problem stored in chrome.storage.local.");
    });
  });
}



async function appendIntuitionBlock(pageId, text) {
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
              { type: 'text', text: { content: text } }
            ]
          }
        }
      ]
    })
  });
}
