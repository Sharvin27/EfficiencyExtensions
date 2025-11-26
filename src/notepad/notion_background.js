import { NOTION_TOKEN, DB_MAP, DB_SCHEMA } from "../secrets.js";

/* ===========================================================
   🔹 Handle Incoming Notepad Message (FULLY DYNAMIC)
   =========================================================== */
export async function handleNotepadMessage(message) {
  if (message.type !== "notepad-intuition") return;

  const blocks = message.intuition.blocks || [];
  const pointer = message.intuition.pointer || "";
  const isSolved = message.intuition.solved;
  const targetDB = message.intuition.targetDB;

  const DATABASE_ID = DB_MAP[targetDB];
  const SCHEMA = DB_SCHEMA[targetDB];

  if (!DATABASE_ID || !SCHEMA) {
    console.error("❌ Invalid target DB:", targetDB);
    return;
  }

  /* -------------------------------------------
      1. Get Active Tab Info
     ------------------------------------------- */
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return console.error("❌ Cannot read active tab");

  const pageUrl = tab.url;
  const pageTitle = cleanTitle(tab.title);

  /* -------------------------------------------
      2. Optional: Extract LeetCode metadata 
     ------------------------------------------- */
  let difficulty = null;
  let tags = [];

  // ONLY scrape if the database schema contains these properties
  if (SCHEMA.difficultyProp || SCHEMA.tagsProp) {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeLeetCodeMeta
    });
    difficulty = result.difficulty;
    tags = result.tags;
  }

  /* -------------------------------------------
      3. Search for existing page by titleProp
     ------------------------------------------- */
  const searchRes = await fetch(
    `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
    {
      method: "POST",
      headers: notionJSONHeaders,
      body: JSON.stringify({
        filter: {
          property: SCHEMA.titleProp,   // ← dynamic
          title: { equals: pageTitle }
        }
      })
    }
  );

  const searchData = await searchRes.json();
  let finalPageId = searchData?.results?.[0]?.id || null;

  /* -------------------------------------------
      4. Build dynamic properties for ANY DB
     ------------------------------------------- */
  const baseData = {
    title: pageTitle,
    url: pageUrl,
    isSolved,
    pointer,
    difficulty,
    tags
  };

  const properties = buildProperties(SCHEMA, baseData);

  /* -------------------------------------------
      5. Create or Update Page
     ------------------------------------------- */
  if (finalPageId) {
    // Update existing
    await fetch(`https://api.notion.com/v1/pages/${finalPageId}`, {
      method: "PATCH",
      headers: notionJSONHeaders,
      body: JSON.stringify({ properties })
    });

    console.log("🔁 Updated existing page:", finalPageId);
  } else {
    // Create new
    const createRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: notionJSONHeaders,
      body: JSON.stringify({
        parent: { database_id: DATABASE_ID },
        properties
      })
    });

    
    const created = await createRes.json();
    console.log("Create page response:", created);   // ⬅️ ADD THIS

    finalPageId = created.id;

    console.log("🆕 Created new page:", finalPageId);
  }

  /* -------------------------------------------
      6. Append Text Blocks + Upload Images
     ------------------------------------------- */
  await appendBlocks(finalPageId, blocks);
}

/* ===========================================================
   🔹 Clean Page Title for non-LeetCode DBs
   =========================================================== */
function cleanTitle(title) {
  return title.replace(" - LeetCode", "").trim();
}

/* ===========================================================
   🔹 LeetCode Scraper (runs ONLY when needed)
   =========================================================== */
function scrapeLeetCodeMeta() {
  const diffNode = document.querySelector('div[class*="text-difficulty-"]');
  const tagContainer = document.querySelector("div.flex.flex-wrap.gap-1.pl-7");

  return {
    difficulty: diffNode ? diffNode.innerText.trim() : null,
    tags: tagContainer
      ? [...tagContainer.querySelectorAll("a")].map(a => a.innerText.trim())
      : []
  };
}

/* ===========================================================
   🔹 Build Notion Properties Dynamically (FUTURE-PROOF)
   =========================================================== */
function buildProperties(schema, data) {
  const p = {};

  if (schema.titleProp) {
    p[schema.titleProp] = {
      title: [{ text: { content: data.title } }]
    };
  }

  if (schema.linkProp) {
    p[schema.linkProp] = { url: data.url };
  }

  if (schema.statusProp) {
    p[schema.statusProp] = {
      select: {
        name: data.isSolved
          ? schema.solvedValues?.solved || "Solved"
          : schema.solvedValues?.unsolved || "Unsolved"
      }
    };
  }

  if (schema.pointerProp) {
    p[schema.pointerProp] = {
      rich_text: [{ text: { content: data.pointer }}]
    };
  }

  if (schema.difficultyProp && data.difficulty) {
    p[schema.difficultyProp] = {
      select: { name: data.difficulty }
    };
  }

  if (schema.tagsProp && data.tags?.length > 0) {
    p[schema.tagsProp] = {
      multi_select: data.tags.map(t => ({ name: t }))
    };
  }

  if (schema.timestampProp) {
    p[schema.timestampProp] = {
      date: { start: new Date().toISOString() }
    };
  }

  return p;
}

/* ===========================================================
   🔹 Append Text + Images (parallel upload)
   =========================================================== */
async function appendBlocks(pageId, blocks) {
  const textBlocks = [];
  const imgTasks = [];

  for (const b of blocks) {
    if (b.type === "text") {
      textBlocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: b.data }}]
        }
      });
    }

    if (b.type === "image") {
      imgTasks.push(uploadAndAttachImage(pageId, b.data));
    }
  }

  if (textBlocks.length > 0) {
    await notionAppend(pageId, textBlocks);
  }

  await Promise.all(imgTasks);
}

/* ===========================================================
   🔹 Notion helpers
   =========================================================== */
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

async function createUploadObject() {
  const res = await fetch("https://api.notion.com/v1/file_uploads", {
    method: "POST",
    headers: notionJSONHeaders,
    body: "{}"
  });
  return res.json();
}

async function uploadBytes(uploadUrl, file) {
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

  // Step 1
  const uploadObj = await createUploadObject();
  const uploadId = uploadObj.id;
  const uploadUrl = uploadObj.upload_url;

  // Step 2
  await uploadBytes(uploadUrl, file);

  // Step 3
  await attachUploadedFile(pageId, uploadId);
}

function base64ToFile(base64, filename = "note.png") {
  const [meta, data] = base64.split(",");
  const mime = meta.match(/:(.*?);/)[1];
  const bin = atob(data);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}
