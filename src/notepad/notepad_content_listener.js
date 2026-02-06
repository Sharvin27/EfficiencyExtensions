if (!window._leetNotepadListenerAdded) {
window.addEventListener('leet-notepad-send', function(e) {
  if (chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage(
      {
        type: 'notepad-intuition',
        intuition: e.detail
      },
      () => {
        const err = chrome.runtime.lastError;
      
      }
    );
  }
})
window._leetNotepadListenerAdded = true;
};
