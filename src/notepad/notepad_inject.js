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
  overlay.style.background = 'rgba(30, 30, 40, 0.85)';
  overlay.style.backdropFilter = 'blur(20px) saturate(180%)';
  overlay.style.webkitBackdropFilter = 'blur(20px) saturate(180%)';
  overlay.style.boxShadow = '-4px 0 40px rgba(0, 245, 255, 0.15), inset 0 0 80px rgba(0, 245, 255, 0.03)';
  overlay.style.border = '1px solid rgba(0, 245, 255, 0.2)';
  overlay.style.borderRight = 'none';
  overlay.style.zIndex = '999999';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.justifyContent = 'space-between';
  overlay.style.padding = '32px 24px 24px 24px';
  overlay.style.fontFamily = 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
  overlay.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  overlay.style.resize = 'horizontal';
  overlay.style.overflow = 'auto';
  overlay.style.minWidth = '300px';
  overlay.style.maxWidth = '90vw';

  // Drag handle for repositioning
  const dragHandle = document.createElement('div');
  dragHandle.style.position = 'absolute';
  dragHandle.style.left = '0';
  dragHandle.style.top = '0';
  dragHandle.style.width = '8px';
  dragHandle.style.height = '100%';
  dragHandle.style.cursor = 'ew-resize';
  dragHandle.style.background = 'linear-gradient(90deg, rgba(0, 245, 255, 0.3), transparent)';
  dragHandle.style.transition = 'background 0.2s ease';
  
  dragHandle.onmouseenter = () => {
    dragHandle.style.background = 'linear-gradient(90deg, rgba(0, 245, 255, 0.6), transparent)';
  };
  dragHandle.onmouseleave = () => {
    dragHandle.style.background = 'linear-gradient(90deg, rgba(0, 245, 255, 0.3), transparent)';
  };

  // Make overlay draggable by left edge
  let isDragging = false;
  let startX, startWidth;

  dragHandle.onmousedown = (e) => {
    isDragging = true;
    startX = e.clientX;
    startWidth = overlay.offsetWidth;
    e.preventDefault();
  };

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const diff = startX - e.clientX;
    const newWidth = Math.max(300, Math.min(window.innerWidth * 0.9, startWidth + diff));
    overlay.style.width = newWidth + 'px';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  overlay.appendChild(dragHandle);

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '5px';
  header.style.paddingBottom = '12px';
  header.style.borderBottom = '1px solid rgba(0, 245, 255, 0.3)';
  header.style.position = 'relative';

  const title = document.createElement('div');
  title.textContent = 'Code Intuition';
  title.style.color = '#00f5ff';
  title.style.fontSize = '24px';
  title.style.fontWeight = '600';
  title.style.textShadow = '0 0 20px rgba(0, 245, 255, 0.6), 0 0 40px rgba(0, 245, 255, 0.3)';
  title.style.letterSpacing = '0.5px';
  title.style.display = 'flex';
  title.style.alignItems = 'center';

  // Final Pointer Toggle Button (small button next to title)
  const pointerToggleBtn = document.createElement('button');
  pointerToggleBtn.textContent = '+ Pointer';
  pointerToggleBtn.style.marginLeft = '12px';
  pointerToggleBtn.style.padding = '6px 12px';
  pointerToggleBtn.style.border = '1px solid rgba(0, 245, 255, 0.5)';
  pointerToggleBtn.style.borderRadius = '8px';
  pointerToggleBtn.style.background = 'rgba(0, 245, 255, 0.08)';
  pointerToggleBtn.style.color = '#00f5ff';
  pointerToggleBtn.style.fontSize = '13px';
  pointerToggleBtn.style.cursor = 'pointer';
  pointerToggleBtn.style.height = '32px';
  pointerToggleBtn.style.boxShadow = '0 0 8px rgba(0, 245, 255, 0.3) inset, 0 2px 8px rgba(0, 245, 255, 0.2)';
  pointerToggleBtn.style.transition = 'all 0.3s ease';
  pointerToggleBtn.style.fontWeight = '500';
  
  pointerToggleBtn.onmouseenter = () => {
    pointerToggleBtn.style.background = 'rgba(0, 245, 255, 0.15)';
    pointerToggleBtn.style.boxShadow = '0 0 12px rgba(0, 245, 255, 0.5) inset, 0 4px 12px rgba(0, 245, 255, 0.4)';
    pointerToggleBtn.style.transform = 'translateY(-1px)';
  };
  pointerToggleBtn.onmouseout = () => {
    pointerToggleBtn.style.background = 'rgba(0, 245, 255, 0.08)';
    pointerToggleBtn.style.boxShadow = '0 0 8px rgba(0, 245, 255, 0.3) inset, 0 2px 8px rgba(0, 245, 255, 0.2)';
    pointerToggleBtn.style.transform = 'translateY(0)';
  };

  title.appendChild(pointerToggleBtn);
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.background = 'rgba(255, 255, 255, 0.08)';
  closeBtn.style.backdropFilter = 'blur(10px)';
  closeBtn.style.border = '1px solid rgba(255, 255, 255, 0.2)';
  closeBtn.style.color = '#fff';
  closeBtn.style.borderRadius = '50%';
  closeBtn.style.width = '40px';
  closeBtn.style.height = '40px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '24px';
  closeBtn.style.display = 'flex';
  closeBtn.style.alignItems = 'center';
  closeBtn.style.justifyContent = 'center';
  closeBtn.style.transition = 'all 0.3s ease';
  closeBtn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
  
  closeBtn.onmouseenter = () => {
    closeBtn.style.background = 'rgba(255, 70, 70, 0.3)';
    closeBtn.style.borderColor = 'rgba(255, 70, 70, 0.5)';
    closeBtn.style.transform = 'rotate(90deg) scale(1.1)';
    closeBtn.style.boxShadow = '0 6px 20px rgba(255, 70, 70, 0.4)';
  };
  closeBtn.onmouseout = () => {
    closeBtn.style.background = 'rgba(255, 255, 255, 0.08)';
    closeBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    closeBtn.style.transform = 'rotate(0deg) scale(1)';
    closeBtn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
  };
  
  closeBtn.onclick = () => {
    overlay.style.transform = 'translateX(100%)';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
  };
  
  header.appendChild(closeBtn);
  overlay.appendChild(header);

  // Final Pointer Input (hidden initially)
  const pointerInput = document.createElement('input');
  pointerInput.type = 'text';
  pointerInput.placeholder = 'Write final pointer...';
  pointerInput.style.margin = '8px 0 12px 0';
  pointerInput.style.padding = '12px 16px';
  pointerInput.style.border = '1px solid rgba(0, 245, 255, 0.3)';
  pointerInput.style.borderRadius = '10px';
  pointerInput.style.background = 'rgba(255, 255, 255, 0.05)';
  pointerInput.style.backdropFilter = 'blur(10px)';
  pointerInput.style.color = '#fff';
  pointerInput.style.fontSize = '14px';
  pointerInput.style.outline = 'none';
  pointerInput.style.display = 'none';
  pointerInput.style.width = '100%';
  pointerInput.style.boxShadow = 'inset 0 2px 8px rgba(0, 0, 0, 0.2)';
  pointerInput.style.transition = 'all 0.3s ease';
  
  pointerInput.onfocus = () => {
    pointerInput.style.borderColor = 'rgba(0, 245, 255, 0.6)';
    pointerInput.style.boxShadow = 'inset 0 2px 8px rgba(0, 0, 0, 0.2), 0 0 15px rgba(0, 245, 255, 0.3)';
  };
  pointerInput.onblur = () => {
    pointerInput.style.borderColor = 'rgba(0, 245, 255, 0.3)';
    pointerInput.style.boxShadow = 'inset 0 2px 8px rgba(0, 0, 0, 0.2)';
  };

  overlay.appendChild(pointerInput);

  let pointerVisible = false;
  pointerToggleBtn.onclick = () => {
    pointerVisible = !pointerVisible;
    pointerInput.style.display = pointerVisible ? 'block' : 'none';
    pointerToggleBtn.textContent = pointerVisible ? '- Pointer' : '+ Pointer';
  };

  // 📝 Rich Text Editor with glassmorphism
  const editor = document.createElement('div');
  editor.id = 'leet-intuition-editor';
  editor.contentEditable = 'true';
  editor.style.width = '100%';
  editor.style.height = 'calc(100vh - 280px)';
  editor.style.borderRadius = '12px';
  editor.style.border = '1px solid rgba(0, 245, 255, 0.3)';
  editor.style.padding = '20px';
  editor.style.fontSize = '16px';
  editor.style.background = 'rgba(255, 255, 255, 0.03)';
  editor.style.backdropFilter = 'blur(10px)';
  editor.style.color = '#fff';
  editor.style.overflowY = 'auto';
  editor.style.outline = 'none';
  editor.style.fontFamily = 'Consolas, Monaco, monospace';
  editor.style.boxShadow = 'inset 0 2px 12px rgba(0, 0, 0, 0.3), 0 4px 20px rgba(0, 245, 255, 0.1)';
  editor.style.transition = 'all 0.3s ease';
  editor.style.lineHeight = '1.6';
  
  editor.onfocus = () => {
    editor.style.borderColor = 'rgba(0, 245, 255, 0.5)';
    editor.style.boxShadow = 'inset 0 2px 12px rgba(0, 0, 0, 0.3), 0 4px 25px rgba(0, 245, 255, 0.2)';
  };
  editor.onblur = () => {
    editor.style.borderColor = 'rgba(0, 245, 255, 0.3)';
    editor.style.boxShadow = 'inset 0 2px 12px rgba(0, 0, 0, 0.3), 0 4px 20px rgba(0, 245, 255, 0.1)';
  };

  // Custom scrollbar
  const style = document.createElement('style');
  style.textContent = `
    #leet-intuition-editor::-webkit-scrollbar {
      width: 8px;
    }
    #leet-intuition-editor::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
    }
    #leet-intuition-editor::-webkit-scrollbar-thumb {
      background: rgba(0, 245, 255, 0.4);
      border-radius: 10px;
      transition: all 0.3s ease;
    }
    #leet-intuition-editor::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 245, 255, 0.6);
    }
  `;
  document.head.appendChild(style);

  overlay.appendChild(editor);

  // --- Notepad persistence logic ---
  const storageKey = 'leet-notepad-' + normalizeLeetCodePath(location.pathname);
  const saved = localStorage.getItem(storageKey);
  if (saved) editor.innerText = saved;
  editor.addEventListener('input', () => {
    localStorage.setItem(storageKey, editor.innerText);
  });

  // Database Selector Row with glassmorphism
  const dbRow = document.createElement('div');
  dbRow.style.display = 'flex';
  dbRow.style.alignItems = 'center';
  dbRow.style.margin = '16px 0 10px 0';
  dbRow.style.color = '#00f5ff';
  dbRow.style.fontSize = '14px';
  dbRow.style.fontWeight = '500';

  const dbLabel = document.createElement('span');
  dbLabel.textContent = "Save to: ";
  dbLabel.style.marginRight = '12px';
  dbLabel.style.textShadow = '0 0 10px rgba(0, 245, 255, 0.5)';

  const dbSelect = document.createElement('select');
  dbSelect.id = 'leet-db-select';
  dbSelect.style.padding = '10px 14px';
  dbSelect.style.borderRadius = '8px';
  dbSelect.style.background = 'rgba(255, 255, 255, 0.08)';
  dbSelect.style.backdropFilter = 'blur(10px)';
  dbSelect.style.color = '#fff';
  dbSelect.style.border = '1px solid rgba(0, 245, 255, 0.4)';
  dbSelect.style.outline = 'none';
  dbSelect.style.cursor = 'pointer';
  dbSelect.style.transition = 'all 0.3s ease';
  dbSelect.style.boxShadow = '0 2px 8px rgba(0, 245, 255, 0.2)';
  
  dbSelect.onmouseenter = () => {
    dbSelect.style.background = 'rgba(255, 255, 255, 0.12)';
    dbSelect.style.borderColor = 'rgba(0, 245, 255, 0.6)';
    dbSelect.style.boxShadow = '0 4px 12px rgba(0, 245, 255, 0.3)';
  };
  dbSelect.onmouseleave = () => {
    dbSelect.style.background = 'rgba(255, 255, 255, 0.08)';
    dbSelect.style.borderColor = 'rgba(0, 245, 255, 0.4)';
    dbSelect.style.boxShadow = '0 2px 8px rgba(0, 245, 255, 0.2)';
  };

  dbSelect.innerHTML = `
    <option value="LEETCODE_DB">LeetCode Tracker</option>
    <option value="ML_DB">Machine Learning Notes</option>
  `;

  dbRow.appendChild(dbLabel);
  dbRow.appendChild(dbSelect);
  overlay.appendChild(dbRow);

  // Status checkbox and label with glassmorphism
  const statusRow = document.createElement('div');
  statusRow.style.display = 'flex';
  statusRow.style.alignItems = 'center';
  statusRow.style.justifyContent = 'flex-end';
  statusRow.style.marginTop = '12px';
  statusRow.style.marginBottom = '8px';
  statusRow.style.padding = '10px 16px';
  statusRow.style.background = 'rgba(255, 255, 255, 0.05)';
  statusRow.style.backdropFilter = 'blur(10px)';
  statusRow.style.borderRadius = '8px';
  statusRow.style.border = '1px solid rgba(0, 245, 255, 0.2)';
  statusRow.style.transition = 'all 0.3s ease';
  
  statusRow.onmouseenter = () => {
    statusRow.style.background = 'rgba(255, 255, 255, 0.08)';
    statusRow.style.borderColor = 'rgba(0, 245, 255, 0.4)';
  };
  statusRow.onmouseleave = () => {
    statusRow.style.background = 'rgba(255, 255, 255, 0.05)';
    statusRow.style.borderColor = 'rgba(0, 245, 255, 0.2)';
  };

  const statusCheckbox = document.createElement('input');
  statusCheckbox.type = 'checkbox';
  statusCheckbox.id = 'leet-status-checkbox';
  statusCheckbox.checked = true;
  statusCheckbox.style.marginRight = '10px';
  statusCheckbox.style.cursor = 'pointer';
  statusCheckbox.style.width = '18px';
  statusCheckbox.style.height = '18px';

  const statusLabel = document.createElement('label');
  statusLabel.htmlFor = 'leet-status-checkbox';
  statusLabel.textContent = 'Solved';
  statusLabel.style.color = '#00f5ff';
  statusLabel.style.fontWeight = 'bold';
  statusLabel.style.fontSize = '15px';
  statusLabel.style.cursor = 'pointer';
  statusLabel.style.textShadow = '0 0 10px rgba(0, 245, 255, 0.5)';
  statusLabel.style.transition = 'all 0.3s ease';
  
  statusLabel.onmouseenter = () => {
    statusLabel.style.textShadow = '0 0 15px rgba(0, 245, 255, 0.8)';
  };
  statusLabel.onmouseleave = () => {
    statusLabel.style.textShadow = '0 0 10px rgba(0, 245, 255, 0.5)';
  };

  statusRow.appendChild(statusCheckbox);
  statusRow.appendChild(statusLabel);
  overlay.appendChild(statusRow);

  // Send button with enhanced effects
  const sendBtn = document.createElement('button');
  sendBtn.textContent = 'Send to Notion';
  sendBtn.style.marginTop = '12px';
  sendBtn.style.padding = '16px 24px';
  sendBtn.style.border = 'none';
  sendBtn.style.borderRadius = '10px';
  sendBtn.style.background = 'linear-gradient(135deg, #00f5ff 0%, #0099cc 100%)';
  sendBtn.style.color = 'white';
  sendBtn.style.fontWeight = 'bold';
  sendBtn.style.cursor = 'pointer';
  sendBtn.style.width = '100%';
  sendBtn.style.fontSize = '15px';
  sendBtn.style.boxShadow = '0 6px 20px rgba(0, 245, 255, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.3)';
  sendBtn.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  sendBtn.style.letterSpacing = '0.5px';
  sendBtn.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
  
  sendBtn.onmouseenter = () => {
    sendBtn.style.transform = 'translateY(-2px)';
    sendBtn.style.boxShadow = '0 8px 30px rgba(0, 245, 255, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.3)';
    sendBtn.style.background = 'linear-gradient(135deg, #00ffff 0%, #00b3cc 100%)';
  };
  sendBtn.onmouseout = () => {
    sendBtn.style.transform = 'translateY(0)';
    sendBtn.style.boxShadow = '0 6px 20px rgba(0, 245, 255, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.3)';
    sendBtn.style.background = 'linear-gradient(135deg, #00f5ff 0%, #0099cc 100%)';
  };
  sendBtn.onmousedown = () => {
    sendBtn.style.transform = 'translateY(0) scale(0.98)';
  };
  sendBtn.onmouseup = () => {
    sendBtn.style.transform = 'translateY(-2px) scale(1)';
  };

  sendBtn.onclick = () => {
    const htmlContent = editor.innerHTML.trim();
    const blocks = parseNotepadHTML(htmlContent);
    const selectedDB = dbSelect.value;
    const isSolved = statusCheckbox.checked;
    const finalPointer = pointerInput.value?.trim() || "";

    window.dispatchEvent(new CustomEvent('leet-notepad-send', {
      detail: { blocks, pointer: finalPointer, solved: isSolved, targetDB: selectedDB }
    }));
    
    localStorage.removeItem(storageKey);
    overlay.style.transform = 'translateX(100%)';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
  };

  overlay.appendChild(sendBtn);
  
  // Entrance animation
  overlay.style.transform = 'translateX(100%)';
  overlay.style.opacity = '0';
  document.body.appendChild(overlay);
  
  setTimeout(() => {
    overlay.style.transform = 'translateX(0)';
    overlay.style.opacity = '1';
  }, 10);
})();

function parseNotepadHTML(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const blocks = [];

  function pushText(str) {
    if (!str) return;
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
      const src = node.src || node.getAttribute('src') || '';
      if (src) blocks.push({ type: 'image', data: src });
      return;
    }

    if (tag === 'BR') {
      pushText('\n');
      return;
    }

    node.childNodes.forEach(child => processNode(child));

    if (['P', 'DIV', 'LI', 'ARTICLE', 'SECTION', 'H1', 'H2', 'H3', 'H4'].includes(tag)) {
      pushText('\n');
    }
  }

  tpl.content.childNodes.forEach(child => processNode(child));

  return blocks
    .map(b => b.type === 'text' ? { ...b, data: b.data.replace(/\s*\n\s*/g, '\n').trim() } : b)
    .filter(b => (b.type === 'image' && b.data) || (b.type === 'text' && b.data.length > 0));
}

function normalizeLeetCodePath(path) {
  const parts = path.split('/');
  if (parts[1] === "problems" && parts[2]) {
    return `/problems/${parts[2]}/`;
  }
  return path;
}