// notepad.js - moved from inline script in notepad.html

let problems = [
    {
        id: 1,
        title: "Contains Duplicate",
        link: "https://leetcode.com/problems/contains-duplicate/",
        status: "Solved",
        difficulty: "Easy",
        pointers: "Should Use HashSet Instead of HashMap",
        tags: ["Array", "Hash Table", "Sorting"],
        timestamp: "July 6, 2025 9:16 AM",
        comments: "",
        intuition: "Lets try to do it by sets where repetitive elements are removed and compare the lengths of the two lists.",
        code: `class Solution:\n    def containsDuplicate(self, nums):\n        return len(nums) != len(set(nums))`
    },
    {
        id: 2,
        title: "Valid Anagram",
        link: "https://leetcode.com/problems/valid-anagram/",
        status: "Solved",
        difficulty: "Easy",
        pointers: "",
        tags: ["Hash Table", "String", "Sorting"],
        timestamp: "July 6, 2025 10:30 AM",
        comments: "",
        intuition: "Compare character frequencies using hash maps or sort both strings.",
        code: `class Solution:\n    def isAnagram(self, s, t):\n        return sorted(s) == sorted(t)`
    }
];

function renderTable() {
    const tbody = document.getElementById('problemsTableBody');
    tbody.innerHTML = '';
    problems.forEach(problem => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <span class="problem-title" data-id="${problem.id}">${problem.title}</span>
            </td>
            <td>
                <a href="${problem.link}" target="_blank" class="link">${problem.link}</a>
            </td>
            <td>
                <span class="status-badge ${problem.status.toLowerCase().replace(' ', '-')}">${problem.status}</span>
            </td>
            <td>${problem.pointers}</td>
            <td>
                ${problem.tags.map(tag => `<span class="tag tag-${tag.toLowerCase().replace(' ', '-')}">${tag}</span>`).join('')}
            </td>
            <td>
                <div class="row-actions">
                    <button class="action-btn open-btn" data-id="${problem.id}">Open</button>
                    <button class="action-btn delete-btn" data-id="${problem.id}">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Event delegation for table actions
const problemsTableBody = document.getElementById('problemsTableBody');
problemsTableBody.addEventListener('click', function(e) {
    if (e.target.classList.contains('open-btn')) {
        const problemId = Number(e.target.getAttribute('data-id'));
        openDetailsPanel(problemId);
    } else if (e.target.classList.contains('delete-btn')) {
        const problemId = Number(e.target.getAttribute('data-id'));
        deleteProblem(problemId);
    }
});

function openDetailsPanel(problemId) {
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;
    document.getElementById('detailsTitle').textContent = problem.title;
    document.getElementById('detailsDifficulty').textContent = problem.difficulty;
    document.getElementById('detailsLink').href = problem.link;
    document.getElementById('detailsLink').textContent = problem.link;
    document.getElementById('detailsStatus').innerHTML = `<span class="status-badge ${problem.status.toLowerCase().replace(' ', '-')}">${problem.status}</span>`;
    document.getElementById('detailsTags').innerHTML = problem.tags.map(tag => `<span class="tag tag-${tag.toLowerCase().replace(' ', '-')}">${tag}</span>`).join('');
    document.getElementById('detailsTimestamp').textContent = problem.timestamp;
    document.getElementById('commentsInput').value = problem.comments;
    document.getElementById('intuitionInput').value = problem.intuition;
    document.getElementById('codeInput').value = problem.code;
    document.getElementById('detailsPanel').classList.add('open');
    document.getElementById('overlay').classList.add('show');
}

function closeDetailsPanel() {
    document.getElementById('detailsPanel').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
}

function toggleAddForm() {
    const form = document.getElementById('addForm');
    form.classList.toggle('hidden');
}

// Attach event listeners for static buttons
const newBtn = document.getElementById('newBtn');
if (newBtn) newBtn.addEventListener('click', toggleAddForm);
const shareBtn = document.getElementById('shareBtn');
if (shareBtn) shareBtn.addEventListener('click', function() {
    // Add share logic here
});
const addProblemBtn = document.getElementById('addProblemBtn');
if (addProblemBtn) addProblemBtn.addEventListener('click', addProblem);
const cancelBtn = document.getElementById('cancelBtn');
if (cancelBtn) cancelBtn.addEventListener('click', toggleAddForm);
const newPageBtn = document.getElementById('newPageBtn');
if (newPageBtn) newPageBtn.addEventListener('click', toggleAddForm);

function addProblem() {
    const title = document.getElementById('problemTitle').value;
    const link = document.getElementById('problemLink').value;
    const status = document.getElementById('problemStatus').value;
    const difficulty = document.getElementById('problemDifficulty').value;
    const tags = document.getElementById('problemTags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
    if (!title || !link) {
        alert('Please fill in the required fields');
        return;
    }
    const newProblem = {
        id: Date.now(),
        title: title,
        link: link,
        status: status,
        difficulty: difficulty,
        pointers: "",
        tags: tags,
        timestamp: new Date().toLocaleString(),
        comments: "",
        intuition: "",
        code: ""
    };
    problems.unshift(newProblem);
    renderTable();
    document.getElementById('problemTitle').value = '';
    document.getElementById('problemLink').value = '';
    document.getElementById('problemStatus').value = 'To Do';
    document.getElementById('problemDifficulty').value = 'Easy';
    document.getElementById('problemTags').value = '';
    toggleAddForm();
}

function deleteProblem(problemId) {
    if (confirm('Are you sure you want to delete this problem?')) {
        problems = problems.filter(p => p.id !== problemId);
        renderTable();
    }
}

document.addEventListener('input', function(e) {
    if (e.target.tagName === 'TEXTAREA') {
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    }
});

document.getElementById('commentsInput').addEventListener('input', function(e) {
    const currentProblem = problems.find(p => p.title === document.getElementById('detailsTitle').textContent);
    if (currentProblem) {
        currentProblem.comments = e.target.value;
    }
});

document.getElementById('intuitionInput').addEventListener('input', function(e) {
    const currentProblem = problems.find(p => p.title === document.getElementById('detailsTitle').textContent);
    if (currentProblem) {
        currentProblem.intuition = e.target.value;
    }
});

document.getElementById('codeInput').addEventListener('input', function(e) {
    const currentProblem = problems.find(p => p.title === document.getElementById('detailsTitle').textContent);
    if (currentProblem) {
        currentProblem.code = e.target.value;
    }
});

renderTable();
