const toggleSwitch = document.getElementById('toggleSwitch');

// Load saved state
chrome.storage.sync.get('extensionEnabled', (data) => {
  toggleSwitch.checked = data.extensionEnabled ?? false; // default to false
});

// Save toggle state
toggleSwitch.addEventListener('change', () => {
  chrome.storage.sync.set({ extensionEnabled: toggleSwitch.checked });
});

