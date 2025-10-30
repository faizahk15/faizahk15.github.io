// main.js

// Login
function initLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return; // safety check in case the form doesn't exist

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const errorMsg = document.getElementById('error-msg');

        // Find user in dataSiswa
        const user = dataSiswa.find(s =>
            s.id === username || s.name.toLowerCase() === username.toLowerCase()
        );

        if (user && user.p === password) {
            // Successful login
            localStorage.setItem('loggedInUser', JSON.stringify(user));
            window.location.href = 'index.html';
        } else {
            // Invalid login
            errorMsg.style.display = 'block';
        }
    });
}
// Login message
window.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('loggedInUser'));
    if (user) {
        const msg = document.getElementById('welcome-msg');
        if (msg) msg.textContent = `Selamat datang, ${user.name}!`;
    }
});


// Leaderboard
function generateLeaderboard() {
    // Sort dataSiswa by score (descending)
    const sortedData = [...dataSiswa].sort((a, b) => b.score - a.score);

    // Find the tbody element
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = ''; // Clear existing rows

    // Generate rows
    sortedData.forEach((siswa, index) => {
        const tr = document.createElement('tr');

        // Optional: add a class for top ranks
        if (index === 0) tr.classList.add('rank-1');
        else if (index === 1) tr.classList.add('rank-2');
        else if (index === 2) tr.classList.add('rank-3');

        tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${siswa.name}</td>
      <td>${siswa.class}</td>
      <td>${siswa.score}</td>
    `;

        tbody.appendChild(tr);
    });
}


// Subject pages
function initMateriPage() {
    const buttons = document.querySelectorAll('.card.subject .btn');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const subject = btn.closest('.card').querySelector('h3').textContent.toLowerCase();

            // Match the key used in materiData
            let subjectKey;
            if (subject.includes('matematika')) subjectKey = 'matematika';
            else if (subject.includes('pengetahuan')) subjectKey = 'ipa';
            else if (subject.includes('indonesia')) subjectKey = 'bindo';

            // Navigate and pass the subject via query parameter
            if (subjectKey) {
                window.location.href = `materi-detail.html?subject=${subjectKey}`;
            }
        });
    });
}

// Open details on subject page
function initMateriDetail() {
    const params = new URLSearchParams(window.location.search);
    const subjectKey = params.get('subject');

    const data = materiData[subjectKey];
    if (!data) return;

    document.getElementById('subject-title').textContent = `Materi: ${data.name}`;
    document.getElementById('materi-name').textContent = data.name;
    document.getElementById('materi-desc').textContent = data.desc;

    const linksList = document.getElementById('materi-links');
    linksList.innerHTML = '';

    data.links.forEach(link => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${link.url}" target="_blank">${link.text}</a>`;
        linksList.appendChild(li);
    });
}






// Page detection and initialization
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.endsWith('index.html')) {
        generateLeaderboard();
    } else if (path.endsWith('login.html')) {
        initLogin();
    } else if (path.endsWith('materi.html')) {
        initMateriPage();
    } else if (path.endsWith('materi-detail.html')) {
        initMateriDetail();
    }
});
