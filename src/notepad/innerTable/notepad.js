let problems = [];

// Load from chrome.storage
function loadProblemsFromStorage() {
    chrome.storage.local.get(['problems'], (result) => {
        if (result.problems && Array.isArray(result.problems)) {
            problems = result.problems;
            renderTable();
        }
    });
}

// Save to chrome.storage
function saveProblemsToStorage() {
    chrome.storage.local.set({ problems });
}

// Render table to UI
function renderTable() {
    const tbody = document.getElementById('problemsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    problems.forEach(problem => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="problem-title" data-id="${problem.id}">${problem.title}</span></td>
            <td><a href="${problem.link}" target="_blank" class="link">${problem.link}</a></td>
            <td><span class="status-badge ${problem.status.toLowerCase().replace(' ', '-')}">${problem.status}</span></td>
            <td>${problem.pointers}</td>
            <td>${problem.tags.map(tag => `<span class="tag tag-${tag.toLowerCase().replace(' ', '-')}">${tag}</span>`).join('')}</td>
            <td>${problem.difficulty}</td>
            <td>${problem.timestamp}</td>
            <td>
                <div class="row-actions">
                    <button class="action-btn delete-btn" data-id="${problem.id}">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Open sidebar with details
function openDetailsPanel(problemId) {
    const p = problems.find(pr => pr.id === problemId);
    if (!p) return;

    // Format intuition with "Code:" bolded if present
    let formattedIntuition = p.intuition || "";
    if (formattedIntuition.includes("Code")) {
    formattedIntuition = formattedIntuition.replace(/(Code[^:]*:)/g, "<strong>$1</strong>");
    }


    document.getElementById('detailsTitle').textContent = p.title;
    document.getElementById('detailsDifficulty').textContent = p.difficulty;
    document.getElementById('detailsLink').href = p.link;
    document.getElementById('detailsLink').textContent = p.link;
    document.getElementById('detailsStatus').innerHTML = `<span class="status-badge ${p.status.toLowerCase().replace(' ', '-')}">${p.status}</span>`;
    document.getElementById('detailsTags').innerHTML = p.tags.map(tag => `<span class="tag tag-${tag.toLowerCase().replace(' ', '-')}">${tag}</span>`).join('');
    document.getElementById('detailsTimestamp').textContent = p.timestamp;
    document.getElementById('commentsInput').value = p.comments;
    document.getElementById("intuitionInput").innerHTML = formattedIntuition;

    ['commentsInput', 'intuitionInput', 'codeInput'].forEach(id => {
        const el = document.getElementById(id);
        el && autoResizeTextarea(el);
    });

    document.getElementById('detailsPanel').classList.add('open');
    document.getElementById('overlay').classList.add('show');
}

// Close sidebar
function closeDetailsPanel() {
    document.getElementById('detailsPanel').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
}

// Resize textarea dynamically
function autoResizeTextarea(el) {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
}

// Add a new problem manually
function addProblem() {
    const title = document.getElementById('problemTitle').value.trim();
    const link = document.getElementById('problemLink').value.trim();
    const status = document.getElementById('problemStatus').value;
    const difficulty = document.getElementById('problemDifficulty').value;
    const tags = document.getElementById('problemTags').value.split(',').map(t => t.trim()).filter(Boolean);

    if (!title || !link) {
        alert('Please fill in required fields');
        return;
    }

    const newProblem = {
        id: Date.now(),
        title,
        link,
        status,
        difficulty,
        pointers: "",
        tags,
        timestamp: new Date().toLocaleString(),
        comments: "",
        intuition: "",
        code: ""
    };

    const exists = problems.some(p => p.title === newProblem.title);
    if (!exists) {
        problems.unshift(newProblem);
        saveProblemsToStorage();
        renderTable();
    }

    // Reset form
    ['problemTitle', 'problemLink', 'problemTags'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('problemStatus').value = 'To Do';
    document.getElementById('problemDifficulty').value = 'Easy';

    toggleAddForm();
}

// Delete problem
function deleteProblem(problemId) {
    if (confirm('Are you sure you want to delete this problem?')) {
        problems = problems.filter(p => p.id !== problemId);
        saveProblemsToStorage();
        renderTable();
    }
}

// Update problem when editing side panel
function handleTextareaInput(field, value) {
    const currentTitle = document.getElementById('detailsTitle').textContent;
    const problem = problems.find(p => p.title === currentTitle);
    if (problem) {
        problem[field] = value;
        saveProblemsToStorage();
    }
}

// Toggle add form
function toggleAddForm() {
    const form = document.getElementById('addForm');
    if (form) form.classList.toggle('hidden');
}

// Setup all events
function setupEventListeners() {
    document.getElementById('newBtn')?.addEventListener('click', toggleAddForm);
    document.getElementById('shareBtn')?.addEventListener('click', () => alert("🚧 Share feature coming soon!"));
    document.getElementById('addProblemBtn')?.addEventListener('click', addProblem);
    document.getElementById('cancelBtn')?.addEventListener('click', toggleAddForm);
    document.getElementById('newPageBtn')?.addEventListener('click', toggleAddForm);
    document.getElementById('overlay')?.addEventListener('click', closeDetailsPanel);
    document.getElementById('closeDetailsBtn')?.addEventListener('click', closeDetailsPanel);

    document.getElementById('commentsInput')?.addEventListener('input', e => {
        handleTextareaInput('comments', e.target.value);
        autoResizeTextarea(e.target);
    });
   
    document.getElementById('intuitionInput').addEventListener('input', function (e) {
    const currentProblem = problems.find(p => p.title === document.getElementById('detailsTitle').textContent);
    if (currentProblem) {
        currentProblem.intuition = e.target.innerText; // store plain text only
        saveProblemsToStorage();
    }
    });

    document.getElementById('codeInput')?.addEventListener('input', e => {
        handleTextareaInput('code', e.target.value);
        autoResizeTextarea(e.target);
    });

    document.getElementById('problemsTableBody')?.addEventListener('click', e => {
        const id = Number(e.target.getAttribute('data-id'));
        if (e.target.classList.contains('problem-title')) {
            openDetailsPanel(id);
        } else if (e.target.classList.contains('delete-btn')) {
            deleteProblem(id);
        }
    });
}

// Listen to background messages (from background.js)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "add-problem-to-notepad") {
        const newProblem = message.data;
        const exists = problems.some(p => p.title === newProblem.title);
        if (!exists) {
            problems.unshift(newProblem);
            saveProblemsToStorage();
            renderTable();
            console.log("✅ Problem added from background.");
        } else {
            console.log("⚠️ Problem already exists.");
        }
    }
});

// Sync with chrome.storage changes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.problems) {
        problems = changes.problems.newValue || [];
        renderTable();
        console.log("🔁 Synced problems from chrome.storage.local");
    }
});

// Init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadProblemsFromStorage();
});
