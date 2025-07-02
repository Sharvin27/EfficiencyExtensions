// Content script to listen for notepad send event and relay to background
window.addEventListener('leet-notepad-send', function(e) {
  chrome.runtime.sendMessage({
    type: 'notepad-intuition',
    intuition: e.detail
  });
});
