import { NOTION_TOKEN, DATABASE_ID } from "../secrets.js";

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

// Notepad panel logic
const notepadBtn = document.getElementById('notepadBtn');
if (notepadBtn) {
  notepadBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;
    // Inject the notepad overlay
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/notepad/notepad_inject.js']
    });
    // Inject the content listener (only once per page, but safe to call again)
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/notepad/notepad_content_listener.js']
    });
    // Close the popup window
    window.close();
  });
}


