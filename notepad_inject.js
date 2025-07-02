// Injected notepad overlay for LeetCode Notion extension
(function() {
  if (document.getElementById('leet-notepad-overlay')) return;

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

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '5px';
  header.style.paddingBottom = '3px';
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
  closeBtn.onclick = () => overlay.remove();
  header.appendChild(closeBtn);

  overlay.appendChild(header);

  // 📝 Rich Text Editor with fixed template text
  const editor = document.createElement('div');
  editor.id = 'leet-intuition-editor';
  editor.contentEditable = 'true';
  editor.style.width = '100%';
  editor.style.height = 'calc(100vh - 140px)'; // Increased height
  editor.style.borderRadius = '12px';
  editor.style.border = '1px solid #00f5ff44';
  editor.style.padding = '20px';
  editor.style.fontSize = '16px';
  editor.style.background = 'rgba(255,255,255,0.05)';
  editor.style.color = '#fff';
  editor.style.overflowY = 'auto';
  editor.style.outline = 'none';
  editor.style.fontFamily = 'Consolas, Monaco, monospace';
//   editor.innerHTML = `
//     <div style="color:#ccc;font-size:120%;font-weight:bold;margin-bottom:24px;pointer-events:none;user-select:none;">Intuition:</div>
//     <div><br></div>
//     <div style="color:#ccc;font-size:120%;font-weight:bold;margin-bottom:24px;pointer-events:none;user-select:none;">Your Code:</div>
//     <div><br></div>
//     <div style="color:#ccc;font-size:120%;font-weight:bold;margin-bottom:24px;pointer-events:none;user-select:none;">Time & Space Complexity</div>
//     <div style="pointer-events:none;user-select:none;">- Time: <br>- Space:</div>
//   `;
  overlay.appendChild(editor);

  // Status checkbox and label
  const statusRow = document.createElement('div');
  statusRow.style.display = 'flex';
  statusRow.style.alignItems = 'center';
  statusRow.style.justifyContent = 'flex-end';
  statusRow.style.marginTop = '18px';
  statusRow.style.marginBottom = '8px';

  const statusCheckbox = document.createElement('input');
  statusCheckbox.type = 'checkbox';
  statusCheckbox.id = 'leet-status-checkbox';
  statusCheckbox.checked = true;
  statusCheckbox.style.marginRight = '8px';

  const statusLabel = document.createElement('label');
  statusLabel.htmlFor = 'leet-status-checkbox';
  statusLabel.textContent = 'Solved';
  statusLabel.style.color = '#00f5ff';
  statusLabel.style.fontWeight = 'bold';
  statusLabel.style.fontSize = '15px';

  statusRow.appendChild(statusCheckbox);
  statusRow.appendChild(statusLabel);
  overlay.appendChild(statusRow);

  // Send button
  const sendBtn = document.createElement('button');
  sendBtn.textContent = 'Send to Notion';
  sendBtn.style.marginTop = '10px';
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
    const rawHtml = editor.innerHTML;
    const plainText = editor.innerText.trim();
    const isSolved = statusCheckbox.checked;
    window.dispatchEvent(new CustomEvent('leet-notepad-send', {
      detail: { text: plainText, solved: isSolved }
    }));
    overlay.remove();
  };

  overlay.appendChild(sendBtn);
  document.body.appendChild(overlay);
})();
