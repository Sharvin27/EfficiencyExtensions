// Injected notepad overlay for LeetCode Notion extension
(function() {
  if (document.getElementById('leet-notepad-overlay')) return;

  // Overlay background
  const overlay = document.createElement('div');
  overlay.id = 'leet-notepad-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.right = '0';
  overlay.style.width = '50vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'linear-gradient(135deg, #222 0%, #333 100%)';
  overlay.style.boxShadow = '-2px 0 24px rgba(0,0,0,0.3)';
  overlay.style.zIndex = '999999';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.justifyContent = 'space-between';
  overlay.style.padding = '32px 24px 24px 24px';
  overlay.style.fontFamily = 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif';

  // Header
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '20px';
  header.style.paddingBottom = '15px';
  header.style.borderBottom = '1px solid #00f5ff44';

  const title = document.createElement('div');
  title.textContent = 'Code Intuition';
  title.style.color = '#00f5ff';
  title.style.fontSize = '24px';
  title.style.fontWeight = '600';
  title.style.textShadow = '0 0 10px #00f5ff88';
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.background = 'rgba(255,255,255,0.1)';
  closeBtn.style.border = '1px solid rgba(255,255,255,0.2)';
  closeBtn.style.color = '#fff';
  closeBtn.style.borderRadius = '50%';
  closeBtn.style.width = '40px';
  closeBtn.style.height = '40px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '18px';
  closeBtn.style.display = 'flex';
  closeBtn.style.alignItems = 'center';
  closeBtn.style.justifyContent = 'center';
  closeBtn.style.transition = 'all 0.3s ease';
  closeBtn.onclick = () => overlay.remove();
  header.appendChild(closeBtn);

  overlay.appendChild(header);

  // Textarea
  const textarea = document.createElement('textarea');
  textarea.id = 'leet-intuition-input';
  textarea.placeholder = 'Write your problem-solving intuition here...\n\n// Example:\n// 1. Understand the problem\n// 2. Identify patterns\n// 3. Choose data structure\n// 4. Write pseudocode\n// 5. Implement solution';
  textarea.style.width = '100%';
  textarea.style.height = 'calc(100vh - 220px)';
  textarea.style.resize = 'none';
  textarea.style.borderRadius = '12px';
  textarea.style.border = '1px solid #00f5ff44';
  textarea.style.padding = '20px';
  textarea.style.fontSize = '16px';
  textarea.style.background = 'rgba(255,255,255,0.05)';
  textarea.style.color = '#fff';
  textarea.style.outline = 'none';
  textarea.style.fontFamily = 'Consolas, Monaco, monospace';
  textarea.style.lineHeight = '1.6';
  overlay.appendChild(textarea);

  // Send button
  const sendBtn = document.createElement('button');
  sendBtn.textContent = 'Send to Notion';
  sendBtn.style.marginTop = '20px';
  sendBtn.style.padding = '15px 20px';
  sendBtn.style.border = 'none';
  sendBtn.style.borderRadius = '8px';
  sendBtn.style.background = 'linear-gradient(135deg, #00f5ff 0%, #0099cc 100%)';
  sendBtn.style.color = 'white';
  sendBtn.style.fontWeight = 'bold';
  sendBtn.style.cursor = 'pointer';
  sendBtn.style.width = '100%';
  sendBtn.style.fontSize = '14px';
  sendBtn.style.boxShadow = '0 4px 15px #00f5ff55';
  sendBtn.onclick = () => {
    window.dispatchEvent(new CustomEvent('leet-notepad-send', { detail: textarea.value }));
    overlay.remove();
  };
  overlay.appendChild(sendBtn);

  document.body.appendChild(overlay);
})();
