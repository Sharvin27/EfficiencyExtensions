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

  // Final Pointer Toggle Button (small button next to title)
  const pointerToggleBtn = document.createElement('button');
  pointerToggleBtn.textContent = '+ Pointer';
  pointerToggleBtn.style.marginLeft = '12px';
  pointerToggleBtn.style.padding = '4px 10px';
  pointerToggleBtn.style.border = '1px solid #00f5ff77';
  pointerToggleBtn.style.borderRadius = '6px';
  pointerToggleBtn.style.background = 'transparent';
  pointerToggleBtn.style.color = '#00f5ff';
  pointerToggleBtn.style.fontSize = '13px';
  pointerToggleBtn.style.cursor = 'pointer';
  pointerToggleBtn.style.height = '28px';
  pointerToggleBtn.style.boxShadow = '0 0 6px #00f5ff44 inset, 0 0 6px #00f5ff44';
  pointerToggleBtn.style.transition = 'all 0.2s ease';
  pointerToggleBtn.onmouseover = () => {
    pointerToggleBtn.style.background = 'rgba(0, 245, 255, 0.08)';
  };
  pointerToggleBtn.onmouseout = () => {
    pointerToggleBtn.style.background = 'transparent';
  };


  title.appendChild(pointerToggleBtn);  // 👈 Add button to the title

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

  // Final Pointer Input (hidden initially)
  const pointerInput = document.createElement('input');
  pointerInput.type = 'text';
  pointerInput.placeholder = 'Write final pointer...';
  pointerInput.style.margin = '4px 0 12px 0';
  pointerInput.style.padding = '10px 14px';
  pointerInput.style.border = '1px solid #00f5ff33';
  pointerInput.style.borderRadius = '8px';
  pointerInput.style.background = 'rgba(255,255,255,0.04)';
  pointerInput.style.color = '#fff';
  pointerInput.style.fontSize = '14px';
  pointerInput.style.outline = 'none';
  pointerInput.style.display = 'none';  // Hidden initially
  pointerInput.style.width = '100%';

  overlay.appendChild(pointerInput);

  let pointerVisible = false;
  pointerToggleBtn.onclick = () => {
    pointerVisible = !pointerVisible;
    pointerInput.style.display = pointerVisible ? 'block' : 'none';
  };


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

  overlay.appendChild(editor);

  // --- Notepad persistence logic ---
  // Key for localStorage (unique per problem page)

  const storageKey = 'leet-notepad-' + normalizeLeetCodePath(location.pathname);

  // Load saved content
  const saved = localStorage.getItem(storageKey);
  if (saved) editor.innerText = saved;
  // Save on every change
  editor.addEventListener('input', () => {
    localStorage.setItem(storageKey, editor.innerText);
  });
  // --- End persistence logic ---

  // Database Selector Row
  const dbRow = document.createElement('div');
  dbRow.style.display = 'flex';
  dbRow.style.alignItems = 'center';
  dbRow.style.margin = '10px 0';
  dbRow.style.color = '#00f5ff';
  dbRow.style.fontSize = '14px';

  const dbLabel = document.createElement('span');
  dbLabel.textContent = "Save to: ";
  dbLabel.style.marginRight = '10px';

  const dbSelect = document.createElement('select');
  dbSelect.id = 'leet-db-select';
  dbSelect.style.padding = '8px';
  dbSelect.style.borderRadius = '6px';
  dbSelect.style.background = 'rgba(255,255,255,0.05)';
  dbSelect.style.color = '#fff';
  dbSelect.style.border = '1px solid #00f5ff55';
  dbSelect.style.outline = 'none';

  // Add options (you will fill your actual DB names & IDs)
  dbSelect.innerHTML = `
    <option value="LEETCODE_DB">LeetCode Tracker</option>
    <option value="ML_DB">Machine Learning Notes</option>
  `;

  dbRow.appendChild(dbLabel);
  dbRow.appendChild(dbSelect);
  overlay.appendChild(dbRow);


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
    // const plainText = editor.innerText.trim();
    const htmlContent = editor.innerHTML.trim();
    const blocks = parseNotepadHTML(htmlContent);
    const selectedDB = dbSelect.value;
    const isSolved = statusCheckbox.checked;
    const finalPointer = pointerInput.value?.trim() || "";  // Always fallback to empty string


    window.dispatchEvent(new CustomEvent('leet-notepad-send', {
      // detail: { text: plainText, pointer: finalPointer, solved: isSolved }
      detail: { blocks, pointer: finalPointer, solved: isSolved, targetDB: selectedDB }

    }));
    // Clear saved content after sending (optional)
    localStorage.removeItem(storageKey);
    overlay.remove();
  };

  overlay.appendChild(sendBtn);
  document.body.appendChild(overlay);
})();

function parseNotepadHTML(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const blocks = [];

  function pushText(str) {
    if (!str) return;
    // Collapse whitespace
    const text = str.replace(/\s+/g, ' ').trim();
    if (!text) return;
    const last = blocks[blocks.length - 1];
    if (last && last.type === 'text') {
      last.data += ' ' + text;
    } else {
      blocks.push({ type: 'text', data: text });
    }
  }

  function processNode(node) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      pushText(node.textContent);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName.toUpperCase();

    if (tag === 'IMG') {
      // Prefer resolved `src` if available, otherwise use attribute
      const src = node.src || node.getAttribute('src') || '';
      if (src) blocks.push({ type: 'image', data: src });
      return;
    }

    if (tag === 'BR') {
      pushText('\n');
      return;
    }

    // Recurse into children in DOM order
    node.childNodes.forEach(child => processNode(child));

    // For block-level tags, normalize a paragraph break
    if (['P', 'DIV', 'LI', 'ARTICLE', 'SECTION', 'H1', 'H2', 'H3', 'H4'].includes(tag)) {
      pushText('\n');
    }
  }

  tpl.content.childNodes.forEach(child => processNode(child));

  // Final cleanup: trim text blocks' leading/trailing whitespace and remove empty entries
  return blocks
    .map(b => b.type === 'text' ? { ...b, data: b.data.replace(/\s*\n\s*/g, '\n').trim() } : b)
    .filter(b => (b.type === 'image' && b.data) || (b.type === 'text' && b.data.length > 0));
}


function normalizeLeetCodePath(path) {
  const parts = path.split('/');

  // We keep: ["", "problems", "<slug>", ""]
  if (parts[1] === "problems" && parts[2]) {
    return `/problems/${parts[2]}/`;
  }

  return path; // fallback
}