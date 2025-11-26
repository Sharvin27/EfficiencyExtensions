import { NOTION_TOKEN, DATABASE_ID } from "../secrets.js";

export async function handleNotepadMessage(message, sender, sendResponse) {
  if (message.type !== 'notepad-intuition') return;

  const intuitionText = message.intuition.blocks;
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
  const notionTags = tags.map(tag => ({ name: tag }));

  // 1. Search for existing page
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
  const pageId = searchData?.results?.[0]?.id;

  if (pageId) {
    // Update properties and add intuition
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
          "Pointers": { "rich_text": [{ "text": { "content": pointer } }] },
          "TimeStamp": { "date": { "start": new Date().toISOString() } }
        }
      })
    });

    await appendIntuitionBlock(pageId, intuitionText);
    console.log("✅ Updated existing Notion page.");
  } else {
    // Create new page
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
          "Problem Title": { "title": [{ "text": { "content": leetcodeTitle } }] },
          "Link": { "url": leetcodeUrl },
          "Status": { "select": { "name": isSolved ? "Solved" : "Unsolved" } },
          "Pointers": { "rich_text": [{ "text": { "content": pointer } }] },
          "Tags": { "multi_select": notionTags },
          "Difficulty": { "select": { "name": difficulty } },
          "TimeStamp": { "date": { "start": new Date().toISOString() } }
        }
      })
    });

    if (!pageRes.ok) {
      const err = await pageRes.text();
      console.error("❌ Error creating page:", pageRes.status, err);
      return;
    }

    const createdPage = await pageRes.json();
    await appendIntuitionBlock(createdPage.id, intuitionText);
    console.log("✅ Created new Notion page.");
  }
}

// export async function handleNotepadMessage(message, sender, sendResponse) {
//   if (message.type !== 'notepad-intuition') return;
//   console.log("📥 Received intuition message:", message);

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

//   const newProblem = {
//     id: Date.now(),
//     title: leetcodeTitle,
//     link: leetcodeUrl,
//     status: isSolved ? "Solved" : "To Do",
//     difficulty: difficulty,
//     pointers: pointer,
//     tags: tags,
//     timestamp: new Date().toLocaleString('en-US', {
//         year: 'numeric',
//         month: 'long',
//         day: 'numeric',
//         hour: 'numeric',
//         minute: '2-digit',
//         hour12: true
//     }),

//     comments: "",
//     intuition: intuitionText,
//     code: ""
//   };

//   // 🔁 Save problem to chrome.storage.local
//   chrome.storage.local.get(["problems"], (res) => {
//     const currentProblems = res.problems || [];
//     currentProblems.unshift(newProblem); // Add new problem to the beginning
//     chrome.storage.local.set({ problems: currentProblems }, () => {
//       console.log("✅ Problem stored in chrome.storage.local.");
//     });
//   });
// }


// The Actual Function to send Inner Text to Notion- V1

// async function appendIntuitionBlock(pageId, text) {
//   await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
//     method: "PATCH",
//     headers: {
//       "Authorization": `Bearer ${NOTION_TOKEN}`,
//       "Content-Type": "application/json",
//       "Notion-Version": "2022-06-28"
//     },
//     body: JSON.stringify({
//       children: [
//         {
//           object: 'block',
//           type: 'paragraph',
//           paragraph: {
//             rich_text: [
//               { type: 'text', text: { content: text } }
//             ]
//           }
//         }
//       ]
//     })
//   });
// }

//// Function to send Inner Text to Notion with Image- V2
async function appendIntuitionBlock(pageId, blocks) {
  const textBlocks = [];
  const imageUploads = [];

  for (const block of blocks) {
    if (block.type === "text") {
      textBlocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: block.data }}]
        }
      });
    }

    if (block.type === "image") {
      // Do NOT await sequentially → upload all images in parallel
      imageUploads.push(uploadAndAttachImage(pageId, block.data));
    }
  }

  // Insert all text at once (fast)
  if (textBlocks.length > 0) {
    await notionAppend(pageId, textBlocks);
  }

  // Upload all images in parallel (massive speed-up)
  if (imageUploads.length > 0) {
    await Promise.all(imageUploads);
  }
}

async function notionAppend(pageId, children) {
  return fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
    method: "PATCH",
    headers: notionJSONHeaders,
    body: JSON.stringify({ children })
  });
}

const notionJSONHeaders = {
  "Authorization": `Bearer ${NOTION_TOKEN}`,
  "Content-Type": "application/json",
  "Notion-Version": "2022-06-28"
};

const notionFormHeaders = {
  "Authorization": `Bearer ${NOTION_TOKEN}`,
  "Notion-Version": "2022-06-28"
};

async function createNotionUploadObject() {
  const res = await fetch("https://api.notion.com/v1/file_uploads", {
    method: "POST",
    headers: notionJSONHeaders,
    body: "{}"
  });
  const data = await res.json();
  return { uploadId: data.id, uploadUrl: data.upload_url };
}

async function uploadBytesToNotion(uploadUrl, file) {
  const form = new FormData();
  form.append("file", file);

  return fetch(uploadUrl, {
    method: "POST",
    headers: notionFormHeaders,
    body: form
  });
}

async function attachUploadedFile(pageId, uploadId) {
  return notionAppend(pageId, [
    {
      type: "image",
      image: {
        type: "file_upload",
        file_upload: { id: uploadId }
      }
    }
  ]);
}

async function uploadAndAttachImage(pageId, base64) {
  const file = base64ToFile(base64);

  const { uploadId, uploadUrl } = await createNotionUploadObject();
  await uploadBytesToNotion(uploadUrl, file);
  await attachUploadedFile(pageId, uploadId);
}

function base64ToFile(base64, filename = "image.png") {
  const [meta, b64] = base64.split(",");
  const mime = meta.match(/:(.*?);/)[1];
  const bin = atob(b64);
  const len = bin.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}
