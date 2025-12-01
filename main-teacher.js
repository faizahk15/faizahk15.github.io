/* ------------------------
    TEACHER PAGES
  ------------------------- */

// ===== TEACHER QUIZ MANAGEMENT =====

// Global variables
let currentEditingQuizId = null;

// Setup create quiz form in guru-quiz.html
function setupCreateQuizForm() {
  const createForm = document.getElementById("createQuizForm");
  if (!createForm) return;

  createForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!user) return;

    // Get form data - including proper date handling
    const quizData = {
      title: document.getElementById("quizTitle").value.trim(),
      description: document.getElementById("quizDescription").value.trim(),
      time_limit: parseInt(document.getElementById("quizTimeLimit").value) || 30,
      max_attempts: parseInt(document.getElementById("quizMaxAttempts").value) || 1,
      available_from: document.getElementById("quizAvailableFrom").value || null,
      available_until: document.getElementById("quizAvailableUntil").value || null,
      questions: []
    };

    // Validate required fields
    if (!quizData.title) {
      alert("Judul kuis harus diisi");
      return;
    }

    // Validate dates if both are provided
    if (quizData.available_from && quizData.available_until) {
      const fromDate = new Date(quizData.available_from);
      const untilDate = new Date(quizData.available_until);

      if (untilDate <= fromDate) {
        alert("Tanggal 'Tersedia Sampai' harus setelah tanggal 'Tersedia Dari'");
        return;
      }
    }

    try {
      // Show loading state
      const submitBtn = createForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Membuat...";
      submitBtn.disabled = true;

      // Create the quiz
      const result = await quickCreateQuiz(quizData);

      if (result.success) {
        alert("Kuis berhasil dibuat! Sekarang tambahkan pertanyaan.");
        closeCreateQuizModal();
        // Redirect to quiz editor to add questions
        window.location.href = `guru-quiz-create.html?edit=${result.id_quiz}`;
      } else {
        alert("Gagal membuat kuis: " + (result.error || "Unknown error"));
      }

      // Restore button state
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;

    } catch (error) {
      console.error("Error creating quiz:", error);
      alert("Error membuat kuis");

      // Restore button state
      const submitBtn = createForm.querySelector('button[type="submit"]');
      submitBtn.textContent = "Buat Kuis";
      submitBtn.disabled = false;
    }
  });
}


// Enhanced quickCreateQuiz function that preserves ALL data including dates
async function quickCreateQuiz(quizData) {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));

  try {
    // Get teacher's subject
    const resMapel = await fetch(`${API}/teacher/mapel/${user.id_user}`);
    const mapelData = await resMapel.json();

    if (!mapelData.success || !mapelData.mapel) {
      return { success: false, error: "Guru tidak memiliki mapel yang ditugaskan" };
    }

    const res = await fetch(`${API}/teacher/quiz/quick-create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...quizData,
        teacher_id: user.id_user,
        id_mapel: mapelData.mapel.id_mapel
      })
    });

    const data = await res.json();

    // Store COMPLETE quiz data in localStorage for the editor page
    if (data.success) {
      localStorage.setItem('pendingQuizData', JSON.stringify({
        ...quizData,
        id_quiz: data.id_quiz,
        // Ensure dates are preserved exactly as entered
        available_from: quizData.available_from,
        available_until: quizData.available_until
      }));
    }

    return data;
  } catch (error) {
    console.error("Error creating quiz:", error);
    return { success: false, error: "Gagal membuat kuis" };
  }
}


// Load pending quiz data in editor
function loadPendingQuizData() {
  const pendingData = localStorage.getItem('pendingQuizData');
  if (!pendingData) return null;

  const quizData = JSON.parse(pendingData);

  // Fill the form fields
  document.getElementById('quizId').value = quizData.id_quiz;
  document.getElementById('quizTitle').value = quizData.title;
  document.getElementById('quizDescription').value = quizData.description || '';
  document.getElementById('quizTimeLimit').value = quizData.time_limit || 30;
  document.getElementById('quizMaxAttempts').value = quizData.max_attempts || 1;

  // Properly handle dates - convert to datetime-local format
  if (quizData.available_from) {
    // Convert the date string to the format needed by datetime-local input
    const fromDate = new Date(quizData.available_from);
    document.getElementById('quizAvailableFrom').value = fromDate.toISOString().slice(0, 16);
  }

  if (quizData.available_until) {
    const untilDate = new Date(quizData.available_until);
    document.getElementById('quizAvailableUntil').value = untilDate.toISOString().slice(0, 16);
  }

  return quizData;
}

// Clear pending quiz data after successful save
function clearPendingQuizData() {
  localStorage.removeItem('pendingQuizData');
}



// Add date validation helper
function validateQuizDates() {
  const fromInput = document.getElementById('quizAvailableFrom');
  const untilInput = document.getElementById('quizAvailableUntil');

  if (fromInput.value && untilInput.value) {
    const fromDate = new Date(fromInput.value);
    const untilDate = new Date(untilInput.value);

    if (untilDate <= fromDate) {
      alert("⚠️ Peringatan: Tanggal 'Tersedia Sampai' harus setelah tanggal 'Tersedia Dari'");
      untilInput.focus();
      return false;
    }
  }
  return true;
}

// Add event listeners for date validation
function setupDateValidation() {
  const fromInput = document.getElementById('quizAvailableFrom');
  const untilInput = document.getElementById('quizAvailableUntil');

  if (fromInput && untilInput) {
    fromInput.addEventListener('change', validateQuizDates);
    untilInput.addEventListener('change', validateQuizDates);
  }
}


// Enhanced quiz form submission for guru-quiz-create.html
function setupQuizEditorForm() {
  const quizForm = document.getElementById("quizForm");
  if (!quizForm) return;

  // Load any pending quiz data first
  const pendingData = loadPendingQuizData();

  quizForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!user) return;

    // Collect all questions
    const questions = collectQuestions();

    if (questions.length === 0) {
      alert("Tambahkan setidaknya satu pertanyaan sebelum menyimpan!");
      return;
    }

    const quizData = {
      id_quiz: document.getElementById("quizId").value,
      title: document.getElementById("quizTitle").value.trim(),
      description: document.getElementById("quizDescription").value.trim(),
      time_limit: parseInt(document.getElementById("quizTimeLimit").value) || 30,
      max_attempts: parseInt(document.getElementById("quizMaxAttempts").value) || 1,
      available_from: document.getElementById("quizAvailableFrom").value || null,
      available_until: document.getElementById("quizAvailableUntil").value || null,
      questions: questions
    };

    try {
      // Show loading state
      const submitBtn = quizForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Menyimpan...";
      submitBtn.disabled = true;

      // Save the quiz with questions
      const result = await saveQuizWithQuestions(quizData);

      if (result.success) {
        alert("Kuis berhasil disimpan dengan " + questions.length + " pertanyaan!");
        clearPendingQuizData(); // Clear the stored data
        // Redirect back to main quiz page
        window.location.href = "guru-quiz.html";
      } else {
        alert("Gagal menyimpan kuis: " + (result.error || "Unknown error"));
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }

    } catch (error) {
      console.error("Error saving quiz:", error);
      alert("Error menyimpan kuis");

      const submitBtn = quizForm.querySelector('button[type="submit"]');
      submitBtn.textContent = "Simpan Kuis";
      submitBtn.disabled = false;
    }
  });
}

// Collect all questions from the form
function collectQuestions() {
  const questions = [];
  const questionCards = document.querySelectorAll('.question-card');

  questionCards.forEach((card, index) => {
    const questionText = card.querySelector('.question-text').value.trim();
    const questionType = card.querySelector('.question-type').value;
    const points = parseInt(card.querySelector('.question-points').value) || 1;

    if (!questionText) return; // Skip empty questions

    const question = {
      question_text: questionText,
      question_type: questionType,
      points: points,
      sort_order: index,
      options: []
    };

    // Collect options for multiple choice questions
    if (questionType !== 'essay') {
      const optionInputs = card.querySelectorAll('.option-text');
      const correctRadios = card.querySelectorAll('.correct-option');

      optionInputs.forEach((input, optIndex) => {
        const optionText = input.value.trim();
        if (!optionText) return; // Skip empty options

        const isCorrect = correctRadios[optIndex]?.checked || false;

        question.options.push({
          option_text: optionText,
          is_correct: isCorrect,
          sort_order: optIndex
        });
      });

      // Validate that at least one option is marked correct for multiple choice
      if (questionType === 'multiple_choice' && !question.options.some(opt => opt.is_correct)) {
        alert(`Pertanyaan "${questionText.substring(0, 50)}..." harus memiliki jawaban yang benar!`);
        throw new Error("No correct answer selected");
      }
    }

    questions.push(question);
  });

  return questions;
}

// Save quiz with questions
async function saveQuizWithQuestions(quizData) {
  try {
    const res = await fetch(`${API}/teacher/quiz/save-with-questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quizData)
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error saving quiz with questions:", error);
    return { success: false, error: "Gagal menyimpan kuis" };
  }
}

// Function to load existing quiz for editing
async function loadQuizForEditing(quizId) {
  try {
    const res = await fetch(`${API}/teacher/quiz/${quizId}`);
    const data = await res.json();

    if (data.success) {
      // Fill basic quiz info
      document.getElementById('quizId').value = data.quiz.id_quiz;
      document.getElementById('quizTitle').value = data.quiz.title;
      document.getElementById('quizDescription').value = data.quiz.description || '';
      document.getElementById('quizTimeLimit').value = data.quiz.time_limit;
      document.getElementById('quizMaxAttempts').value = data.quiz.max_attempts;

      if (data.quiz.available_from) {
        document.getElementById('quizAvailableFrom').value = data.quiz.available_from.replace(' ', 'T');
      }
      if (data.quiz.available_until) {
        document.getElementById('quizAvailableUntil').value = data.quiz.available_until.replace(' ', 'T');
      }

      // Clear existing questions and load new ones
      const questionsContainer = document.getElementById("questions-container");
      questionsContainer.innerHTML = '';

      data.questions.forEach(question => {
        addQuestion(question);
      });
    }
  } catch (error) {
    console.error("Error loading quiz for editing:", error);
  }
}

// Helper function to escape HTML (add to main.js)
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Load teacher's quizzes
async function loadTeacherQuizzes() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user || user.role !== "teacher") return;

  try {
    const res = await fetch(`${API}/teacher/quizzes/${user.id_user}`);
    const data = await res.json();

    const quizList = document.getElementById("quiz-list");
    if (!quizList) return;

    if (!data.success || data.quizzes.length === 0) {
      quizList.innerHTML = '<p>Belum ada kuis. Buat kuis pertama Anda!</p>';
      return;
    }

    quizList.innerHTML = '';
    data.quizzes.forEach(quiz => {
      const quizDiv = document.createElement("div");
      quizDiv.className = "card";
      quizDiv.style.marginBottom = "15px";

      const attemptsText = quiz.total_attempts > 0 ?
        `• ${quiz.total_attempts} attempt` :
        '• Belum ada percobaan';

      quizDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div>
            <h3 style="margin: 0 0 8px 0;">${quiz.title}</h3>
            <p style="margin: 0 0 8px 0; opacity: 0.8;">${quiz.description || 'Tidak ada deskripsi'}</p>
            <p style="margin: 0; font-size: 0.9em; opacity: 0.7;">
              ${quiz.subject_name} • ${quiz.time_limit} menit • ${quiz.max_attempts} percobaan maksimal
              ${attemptsText}
            </p>
            <p style="margin: 8px 0 0 0; font-size: 0.9em;">
              ${quiz.available_from ? `Tersedia: ${new Date(quiz.available_from).toLocaleString('id-ID')}` : ''}
              ${quiz.available_until ? `Sampai: ${new Date(quiz.available_until).toLocaleString('id-ID')}` : ''}
            </p>
          </div>
          <div style="display: flex; gap: 8px; flex-direction: column;">
            <button class="btn small" onclick="editQuiz(${quiz.id_quiz})">Edit</button>
            <button class="btn small" onclick="viewQuizResults(${quiz.id_quiz})">Lihat Hasil</button>
            <button class="btn small danger" onclick="deleteQuiz(${quiz.id_quiz}, '${escapeHtml(quiz.title)}')">Hapus</button>
          </div>
        </div>
      `;

      quizList.appendChild(quizDiv);
    });

  } catch (error) {
    console.error("Error loading quizzes:", error);
    document.getElementById("quiz-list").innerHTML = '<p>Error memuat kuis.</p>';
  }
}

// Enhanced createNewQuiz function
async function createNewQuiz(quizData) {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));

  try {
    const res = await fetch(`${API}/teacher/quiz/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...quizData,
        teacher_id: user.id_user
      })
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error creating quiz:", error);
    return { success: false, error: "Gagal membuat kuis" };
  }
}

// Add question to quiz form
function addQuestion(questionData = null) {
  const container = document.getElementById("questions-container");
  const questionId = Date.now(); // Temporary ID

  const questionDiv = document.createElement("div");
  questionDiv.className = "question-card";
  questionDiv.style.border = "1px solid #ddd";
  questionDiv.style.padding = "15px";
  questionDiv.style.marginBottom = "15px";
  questionDiv.style.borderRadius = "8px";

  questionDiv.innerHTML = `
    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
      <h4 style="margin: 0;">Pertanyaan</h4>
      <button type="button" class="btn small danger" onclick="this.parentElement.parentElement.remove()">
        Hapus
      </button>
    </div>
    
    <label>Teks Pertanyaan:</label>
    <textarea class="question-text" rows="3" required 
      placeholder="Masukkan pertanyaan...">${questionData?.question_text || ''}</textarea>
    
    <label>Tipe Pertanyaan:</label>
    <select class="question-type" onchange="toggleQuestionOptions(this)">
      <option value="multiple_choice" ${(questionData?.question_type || 'multiple_choice') === 'multiple_choice' ? 'selected' : ''}>
        Pilihan Ganda
      </option>
      <option value="true_false" ${questionData?.question_type === 'true_false' ? 'selected' : ''}>
        Benar/Salah
      </option>
      <option value="essay" ${questionData?.question_type === 'essay' ? 'selected' : ''}>
        Essay
      </option>
    </select>
    
    <label>Poin:</label>
    <input type="number" class="question-points" value="${questionData?.points || 10}" min="1">
    
    <div class="options-container" style="margin-top: 15px; ${questionData?.question_type === 'essay' ? 'display: none;' : ''}">
      <label>Pilihan Jawaban:</label>
      <div class="options-list">
        ${renderOptions(questionData?.options || [])}
      </div>
      <button type="button" class="btn small" onclick="addOption(this)" style="margin-top: 8px;">
        + Tambah Pilihan
      </button>
    </div>
  `;

  container.appendChild(questionDiv);

  // Initialize the question type properly
  const questionTypeSelect = questionDiv.querySelector('.question-type');
  toggleQuestionOptions(questionTypeSelect);

  // If it's a new multiple choice question (not loaded from data), create 4 default options
  if (!questionData && questionTypeSelect.value === 'multiple_choice') {
    createDefaultOptions(questionDiv);
  }
}

// Create 4 default options for new multiple choice questions
function createDefaultOptions(questionDiv) {
  const optionsList = questionDiv.querySelector('.options-list');
  const optionLabels = ['A', 'B', 'C', 'D'];

  optionsList.innerHTML = ''; // Clear any existing options

  optionLabels.forEach((label, index) => {
    const optionRow = document.createElement("div");
    optionRow.className = "option-row";
    optionRow.style.marginBottom = "8px";

    optionRow.innerHTML = `
      <input type="text" class="option-text" placeholder="Pilihan ${label}" value="" required>
      <label style="display: inline-flex; align-items: center; margin-left: 10px;">
        <input type="radio" class="correct-option" name="correct_${Date.now()}" value="${index}" ${index === 0 ? 'checked' : ''}>
        <span style="margin-left: 5px;">Benar</span>
      </label>
      ${index > 0 ? `<button type="button" class="btn small danger" onclick="removeOption(this)" style="margin-left: 10px;">Hapus</button>` : ''}
    `;

    optionsList.appendChild(optionRow);
  });
}

// Update the renderOptions function to handle required attribute
function renderOptions(options) {
  // If we have existing options from loaded data, render them
  if (options.length > 0) {
    return options.map((option, index) => `
      <div class="option-row">
        <input type="text" class="option-text" value="${option.option_text}" ${index < 2 ? 'required' : ''}>
        <label style="display: inline-flex; align-items: center; margin-left: 10px;">
          <input type="radio" class="correct-option" name="correct_${Date.now()}" value="${index}" 
            ${option.is_correct ? 'checked' : ''}>
          <span style="margin-left: 5px;">Benar</span>
        </label>
        ${index > 0 ? `<button type="button" class="btn small danger" onclick="removeOption(this)" style="margin-left: 10px;">Hapus</button>` : ''}
      </div>
    `).join('');
  }

  // If no options provided (new question), return empty - the createDefaultOptions will handle it
  return '';
}

// Add this function to prevent form validation on hidden fields
function setupQuizFormValidation() {
  const quizForm = document.getElementById("quizForm");
  if (quizForm) {
    quizForm.addEventListener('submit', function (e) {
      // Remove required attribute from hidden option inputs before validation
      const hiddenOptionInputs = document.querySelectorAll('.options-container[style*="display: none"] .option-text[required]');
      hiddenOptionInputs.forEach(input => {
        input.removeAttribute('required');
      });

      // The form will now validate normally
    });
  }
}

// Add option to question
function addOption(button) {
  const optionsList = button.previousElementSibling;
  const optionRow = document.createElement("div");
  optionRow.className = "option-row";
  optionRow.style.marginBottom = "8px";

  optionRow.innerHTML = `
    <input type="text" class="option-text" placeholder="Pilihan baru" required>
    <label style="display: inline-flex; align-items: center; margin-left: 10px;">
      <input type="radio" class="correct-option" name="${button.closest('.question-card').querySelector('.correct-option').name}" value="${optionsList.children.length}">
      <span style="margin-left: 5px;">Benar</span>
    </label>
    <button type="button" class="btn small danger" onclick="removeOption(this)" style="margin-left: 10px;">Hapus</button>
  `;

  optionsList.appendChild(optionRow);
}

// Remove option
function removeOption(button) {
  button.closest('.option-row').remove();
}

// Toggle options based on question type
function toggleQuestionOptions(select) {
  const questionCard = select.closest('.question-card');
  const optionsContainer = questionCard.querySelector('.options-container');

  if (select.value === 'essay') {
    optionsContainer.style.display = 'none';
    // Remove required attribute from option inputs for essay questions
    const optionInputs = questionCard.querySelectorAll('.option-text');
    optionInputs.forEach(input => {
      input.removeAttribute('required');
    });
  } else {
    optionsContainer.style.display = 'block';
    // Add required attribute back for multiple choice/true false questions
    const optionInputs = questionCard.querySelectorAll('.option-text');
    optionInputs.forEach(input => {
      input.setAttribute('required', 'required');
    });

    // If it's a new multiple choice question and no options exist yet, create default options
    const optionsList = questionCard.querySelector('.options-list');
    if (select.value === 'multiple_choice' && optionsList.children.length === 0) {
      createDefaultOptions(questionCard);
    }

    // For true/false questions, ensure we have exactly 2 options
    if (select.value === 'true_false' && optionsList.children.length === 0) {
      createTrueFalseOptions(questionCard);
    }
  }
}

// Create default true/false options
function createTrueFalseOptions(questionDiv) {
  const optionsList = questionDiv.querySelector('.options-list');
  const trueFalseOptions = [
    { text: 'Benar', correct: true },
    { text: 'Salah', correct: false }
  ];

  optionsList.innerHTML = '';

  trueFalseOptions.forEach((option, index) => {
    const optionRow = document.createElement("div");
    optionRow.className = "option-row";
    optionRow.style.marginBottom = "8px";

    optionRow.innerHTML = `
      <input type="text" class="option-text" value="${option.text}" required>
      <label style="display: inline-flex; align-items: center; margin-left: 10px;">
        <input type="radio" class="correct-option" name="correct_${Date.now()}" value="${index}" ${option.correct ? 'checked' : ''}>
        <span style="margin-left: 5px;">Benar</span>
      </label>
      ${index > 0 ? `<button type="button" class="btn small danger" onclick="removeOption(this)" style="margin-left: 10px;">Hapus</button>` : ''}
    `;

    optionsList.appendChild(optionRow);
  });
}

// Open create quiz modal
function openCreateQuizModal() {
  document.getElementById("createQuizModal").classList.remove("hidden");
}

// Close create quiz modal
function closeCreateQuizModal() {
  document.getElementById("createQuizModal").classList.add("hidden");
  document.getElementById("createQuizForm").reset();
}

// Edit quiz
function editQuiz(quizId) {
  window.location.href = `guru-quiz-create.html?edit=${quizId}`;
}

// View quiz results
function viewQuizResults(quizId) {
  window.location.href = `guru-quiz-results.html?id=${quizId}`;
}

// Enhanced delete quiz function
async function deleteQuiz(quizId, quizTitle = '') {
  try {
    // Show basic confirmation first
    const basicConfirm = confirm(`Hapus kuis "${quizTitle}"?`);
    if (!basicConfirm) return;

    // Show loading state immediately
    const deleteBtn = event.target;
    const originalText = deleteBtn.textContent;
    deleteBtn.textContent = "Mengecek...";
    deleteBtn.disabled = true;

    // Get statistics for detailed confirmation
    let statsData;
    try {
      const statsRes = await fetch(`${API}/teacher/quiz/statistics/${quizId}`);
      statsData = await statsRes.json();
    } catch (statsError) {
      console.warn("Could not fetch statistics:", statsError);
      // Continue with deletion even if stats fail
    }

    // If we have statistics and there are attempts, show detailed confirmation
    if (statsData && statsData.success && statsData.statistics.total_attempts > 0) {
      const stats = statsData.statistics;

      const detailedMessage =
        `HAPUS KUIS: "${stats.title}"\n\n` +
        `📊 STATISTIK:\n` +
        `• ${stats.total_attempts} total percobaan\n` +
        `• ${stats.total_students} siswa telah mengerjakan\n` +
        `• Nilai rata-rata: ${stats.average_score}%\n` +
        `• Nilai tertinggi: ${stats.highest_score}%\n\n` +
        `⚠️  PERINGATAN:\n` +
        `• Semua data percobaan akan dihapus permanen\n` +
        `• Nilai siswa untuk kuis ini akan hilang\n` +
        `• Tindakan ini TIDAK DAPAT DIBATALKAN\n\n` +
        `Yakin ingin menghapus?`;

      deleteBtn.textContent = "Menunggu...";

      if (!confirm(detailedMessage)) {
        deleteBtn.textContent = originalText;
        deleteBtn.disabled = false;
        return;
      }
    }

    // Proceed with deletion
    deleteBtn.textContent = "Menghapus...";

    const res = await fetch(`${API}/teacher/quiz/delete/${quizId}`, {
      method: "DELETE"
    });

    const data = await res.json();

    if (data.success) {
      let successMessage = `✅ Kuis "${quizTitle}" berhasil dihapus.`;

      if (data.deleted) {
        const d = data.deleted;
        if (d.attempts > 0) {
          successMessage += `\n\nData yang dihapus:\n` +
            `• ${d.attempts} percobaan siswa\n` +
            `• ${d.questions} pertanyaan\n` +
            `• ${d.answers} jawaban siswa`;
        }
      }

      alert(successMessage);
      loadTeacherQuizzes();
    } else {
      alert("❌ Gagal menghapus kuis: " + data.error);
      deleteBtn.textContent = originalText;
      deleteBtn.disabled = false;
    }

  } catch (error) {
    console.error("Error deleting quiz:", error);
    alert("❌ Error menghapus kuis. Silakan coba lagi.");

    const deleteBtn = event.target;
    deleteBtn.textContent = "Hapus";
    deleteBtn.disabled = false;
  }
}

// Load quiz results
async function loadQuizResults() {
  const params = new URLSearchParams(window.location.search);
  const quizId = params.get("id");

  if (!quizId) {
    window.location.href = "guru-quiz.html";
    return;
  }

  try {
    const res = await fetch(`${API}/teacher/quiz/results/${quizId}`);
    const data = await res.json();

    if (!data.success) {
      alert("Gagal memuat hasil kuis: " + data.error);
      return;
    }

    // Display quiz info
    document.getElementById("quiz-title").textContent = data.quiz.title;
    document.getElementById("quiz-info").textContent =
      `${data.quiz.subject_name} • ${data.statistics.total_attempts} percobaan • Rata-rata: ${data.statistics.average_score || 0}%`;

    // Display analytics
    const analyticsDiv = document.getElementById("quiz-analytics");
    analyticsDiv.innerHTML = `
      <p><strong>Total Percobaan:</strong> ${data.statistics.total_attempts}</p>
      <p><strong>Skor Tertinggi:</strong> ${data.statistics.highest_score || 0}%</p>
      <p><strong>Skor Terendah:</strong> ${data.statistics.lowest_score || 0}%</p>
      <p><strong>Rata-rata Skor:</strong> ${data.statistics.average_score || 0}%</p>
    `;

    // Display results table
    const resultsTable = document.getElementById("results-table");
    resultsTable.innerHTML = '';

    if (data.attempts.length === 0) {
      resultsTable.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 20px;">
            Belum ada siswa yang mengerjakan kuis ini.
          </td>
        </tr>
      `;
      return;
    }

    data.attempts.forEach(attempt => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${attempt.real_name}</td>
        <td>${attempt.class}</td>
        <td>${attempt.attempt_number}</td>
        <td>${attempt.score}/${attempt.max_score}</td>
        <td>${attempt.percentage}%</td>
        <td>${new Date(attempt.submitted_at).toLocaleString('id-ID')}</td>
        <td>
          <button class="btn small" onclick="viewAttemptDetails(${attempt.id_attempt})">
            Detail
          </button>
        </td>
      `;
      resultsTable.appendChild(row);
    });

  } catch (error) {
    console.error("Error loading quiz results:", error);
    alert("Error memuat hasil kuis");
  }
}

// View attempt details
function viewAttemptDetails(attemptId) {
  window.location.href = `guru-quiz-attempt.html?id=${attemptId}`;
}



// ===== TEACHER QUIZ GRADING =====

// Load quiz attempt for grading
async function loadQuizAttemptForGrading() {
  const params = new URLSearchParams(window.location.search);
  const attemptId = params.get("id");

  if (!attemptId) {
    window.location.href = "guru-quiz-results.html";
    return;
  }

  const container = document.getElementById("attempt-detail");
  const attemptTitle = document.getElementById("attempt-title");
  const attemptHeader = document.getElementById("attempt-header");

  if (!container) return;

  try {
    container.innerHTML = "<p>Memuat detail percobaan...</p>";

    const res = await fetch(`${API}/teacher/quiz/attempt/${attemptId}`);
    const data = await res.json();

    if (!data.success) {
      container.innerHTML = `<p>Error: ${data.error}</p>`;
      return;
    }

    const attempt = data.attempt;
    const answers = data.answers;

    // Display attempt header
    attemptTitle.textContent = `Detail Percobaan: ${attempt.quiz_title}`;
    attemptHeader.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
        <div class="info-card">
          <strong>Siswa:</strong><br>
          ${attempt.real_name} (${attempt.class})
        </div>
        <div class="info-card">
          <strong>Percobaan Ke:</strong><br>
          ${attempt.attempt_number}
        </div>
        <div class="info-card">
          <strong>Skor Otomatis:</strong><br>
          ${attempt.score}/${attempt.max_score} (${Math.round((attempt.score / attempt.max_score) * 100)}%)
        </div>
        <div class="info-card">
          <strong>Submit:</strong><br>
          ${new Date(attempt.submitted_at).toLocaleString('id-ID')}
        </div>
      </div>
    `;

    // Display grading form
    container.innerHTML = `
      <form id="grading-form">
        <h3>Penilaian Jawaban (${answers.length} pertanyaan)</h3>
        <div id="answers-list"></div>
        
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
          <h4>Ringkasan Nilai</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 10px 0;">
            <div>
              <label><strong>Skor Otomatis:</strong></label>
              <input type="number" id="auto-score" value="${attempt.score}" readonly style="width: 100%; padding: 5px;">
            </div>
            <div>
              <label><strong>Skor Manual (Essay):</strong></label>
              <input type="number" id="manual-score" value="0" min="0" max="${attempt.max_score - attempt.score}" 
                     style="width: 100%; padding: 5px;" onchange="updateTotalScore()">
            </div>
            <div>
              <label><strong>Total Skor:</strong></label>
              <input type="number" id="total-score" value="${attempt.score}" readonly 
                     style="width: 100%; padding: 5px; font-weight: bold; background: #e8f5e8;">
            </div>
            <div>
              <label><strong>Nilai Akhir:</strong></label>
              <input type="text" id="final-grade" value="${Math.round((attempt.score / attempt.max_score) * 100)}%" 
                     readonly style="width: 100%; padding: 5px; font-weight: bold;">
            </div>
          </div>
          
          <div style="margin-top: 15px;">
            <label><strong>Komentar untuk Siswa (Opsional):</strong></label>
            <textarea id="teacher-comment" rows="3" placeholder="Berikan komentar atau masukan untuk siswa..." 
                      style="width: 100%; padding: 8px; margin-top: 5px;"></textarea>
          </div>
          
          <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
            <button type="button" class="btn" onclick="submitGrading(${attemptId})">
              💾 Simpan Nilai
            </button>
            <button type="button" class="btn" onclick="useAutoScore()">
              ✅ Gunakan Skor Otomatis
            </button>
            <button type="button" class="btn cancel" onclick="window.history.back()">
              ↩️ Kembali
            </button>
          </div>
        </div>
      </form>
      <div id="grading-status" style="margin-top: 15px;"></div>
    `;

    const answersList = document.getElementById("answers-list");

    if (answers.length === 0) {
      answersList.innerHTML = "<p>Tidak ada jawaban yang tersimpan.</p>";
      return;
    }

    // Display each answer for grading
    answers.forEach((answer, index) => {
      const answerCard = document.createElement("div");
      answerCard.className = "answer-card";
      answerCard.style.border = "1px solid #ddd";
      answerCard.style.borderRadius = "8px";
      answerCard.style.padding = "15px";
      answerCard.style.marginBottom = "15px";
      answerCard.style.backgroundColor = answer.points_earned > 0 ? "#f8fff8" : "#fff8f8";

      let answerHtml = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
          <h4 style="margin: 0; flex: 1;">Pertanyaan ${index + 1}</h4>
          <div style="text-align: right;">
            <span style="color: ${answer.points_earned > 0 ? 'green' : 'red'}; font-weight: bold;">
              ${answer.points_earned > 0 ? '✓ Benar' : '✗ Salah'}
            </span>
            <br>
            <small>${answer.points_earned}/${answer.max_points} poin</small>
          </div>
        </div>
        <p><strong>Pertanyaan:</strong> ${answer.question_text}</p>
        <p><strong>Tipe:</strong> ${answer.question_type}</p>
      `;

      if (answer.question_type === 'essay') {
        answerHtml += `
          <div style="margin: 10px 0;">
            <label><strong>Jawaban Essay Siswa:</strong></label>
            <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; margin: 5px 0; min-height: 80px;">
              ${answer.answer_text || '<em style="color: #888;">Tidak ada jawaban</em>'}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
            <label><strong>Penilaian Manual:</strong></label>
            <input type="number" class="essay-points" data-question-id="${answer.id_question}" 
                   value="0" min="0" max="${answer.max_points}" 
                   style="width: 80px; padding: 5px;" onchange="updateManualScore()">
            <span>/ ${answer.max_points} poin</span>
          </div>
          <div style="margin-top: 8px;">
            <label><strong>Komentar (Opsional):</strong></label>
            <input type="text" class="essay-comment" data-question-id="${answer.id_question}" 
                   placeholder="Komentar untuk jawaban ini..." 
                   style="width: 100%; padding: 5px; margin-top: 5px;">
          </div>
        `;
      } else {
        answerHtml += `
          <p><strong>Jawaban Dipilih:</strong> 
            <span style="color: ${answer.points_earned > 0 ? 'green' : 'red'};">
              ${answer.selected_option_text || '<em>Tidak ada pilihan</em>'}
            </span>
          </p>
        `;

        if (answer.correct_option_text) {
          answerHtml += `
            <p><strong>Jawaban Benar:</strong> 
              <span style="color: green;">${answer.correct_option_text}</span>
            </p>
          `;
        }

        answerHtml += `<p><em>Nilai untuk pertanyaan ini sudah otomatis.</em></p>`;
      }

      answerCard.innerHTML = answerHtml;
      answersList.appendChild(answerCard);
    });

  } catch (error) {
    console.error("Error loading attempt for grading:", error);
    container.innerHTML = "<p>Error memuat detail percobaan.</p>";
  }
}

// Update manual score calculation
function updateManualScore() {
  const essayInputs = document.querySelectorAll('.essay-points');
  let manualScore = 0;

  essayInputs.forEach(input => {
    manualScore += parseInt(input.value) || 0;
  });

  document.getElementById('manual-score').value = manualScore;
  updateTotalScore();
}

// Update total score display
function updateTotalScore() {
  const autoScore = parseInt(document.getElementById('auto-score').value) || 0;
  const manualScore = parseInt(document.getElementById('manual-score').value) || 0;
  const totalScore = autoScore + manualScore;

  document.getElementById('total-score').value = totalScore;

  // Calculate percentage
  const maxScoreElement = document.querySelector('.info-card:nth-child(3)');
  const maxScoreText = maxScoreElement ? maxScoreElement.textContent.split('/')[1] : '100';
  const maxScore = parseInt(maxScoreText) || 100;
  const percentage = Math.round((totalScore / maxScore) * 100);

  document.getElementById('final-grade').value = `${percentage}%`;
}

// Use auto score only
function useAutoScore() {
  const essayInputs = document.querySelectorAll('.essay-points');
  essayInputs.forEach(input => {
    input.value = 0;
  });

  document.getElementById('manual-score').value = 0;
  document.getElementById('teacher-comment').value = '';

  const commentInputs = document.querySelectorAll('.essay-comment');
  commentInputs.forEach(input => {
    input.value = '';
  });

  updateTotalScore();
}

// Submit grading to server
async function submitGrading(attemptId) {
  const totalScore = parseInt(document.getElementById('total-score').value) || 0;
  const teacherComment = document.getElementById('teacher-comment').value;
  const statusDiv = document.getElementById('grading-status');

  // Collect essay grades and comments
  const essayGrades = [];
  const essayPointsInputs = document.querySelectorAll('.essay-points');
  const essayCommentInputs = document.querySelectorAll('.essay-comment');

  essayPointsInputs.forEach(input => {
    const points = parseInt(input.value) || 0;
    if (points > 0) {
      const questionId = input.dataset.questionId;
      const commentInput = Array.from(essayCommentInputs).find(
        c => c.dataset.questionId === questionId
      );
      const comment = commentInput ? commentInput.value : '';

      essayGrades.push({
        id_question: questionId,
        points_earned: points,
        teacher_comment: comment
      });
    }
  });

  try {
    statusDiv.innerHTML = '<p style="color: blue;">Menyimpan nilai...</p>';

    const res = await fetch(`${API}/teacher/quiz/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_attempt: attemptId,
        final_score: totalScore,
        teacher_comment: teacherComment,
        essay_grades: essayGrades
      })
    });

    const data = await res.json();

    if (data.success) {
      statusDiv.innerHTML = '<p style="color: green;">✅ Nilai berhasil disimpan!</p>';
      setTimeout(() => {
        window.history.back();
      }, 1500);
    } else {
      statusDiv.innerHTML = `<p style="color: red;">❌ Gagal menyimpan: ${data.error}</p>`;
    }
  } catch (error) {
    console.error("Error submitting grade:", error);
    statusDiv.innerHTML = '<p style="color: red;">❌ Error menyimpan nilai</p>';
  }
}

// View detailed essay results for a specific quiz
async function viewDetailedResults(quizId) {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));

  try {
    // Fetch detailed results for this quiz
    const res = await fetch(`${API}/quiz/detailed-results/${quizId}?user_id=${user.id_user}`);
    const data = await res.json();

    if (data.success) {
      // Create a modal or new page to show detailed results
      showDetailedResultsModal(data.detailedResults);
    } else {
      alert("Tidak dapat memuat detail penilaian: " + data.error);
    }
  } catch (error) {
    console.error("Error loading detailed results:", error);
    alert("Error memuat detail penilaian");
  }
}

// Show modal with detailed essay results
function showDetailedResultsModal(detailedResults) {
  // Create modal element
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.display = "flex";

  modal.innerHTML = `
    <div class="modal-box" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
      <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 20px;">
        <h2>📝 Detail Penilaian Essay</h2>
        <button class="btn small danger" onclick="this.closest('.modal').remove()">✕ Tutup</button>
      </div>
      
      ${detailedResults.map(attempt => `
        <div class="card" style="margin-bottom: 15px;">
          <h3>Percobaan ${attempt.attempt_number} - ${new Date(attempt.submitted_at).toLocaleString('id-ID')}</h3>
          
          ${attempt.essay_answers && attempt.essay_answers.length > 0 ? `
            <div style="margin-top: 15px;">
              <h4>Jawaban Essay:</h4>
              ${attempt.essay_answers.map((essay, index) => `
                <div class="essay-answer" style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px;">
                  <h5>Pertanyaan ${index + 1}:</h5>
                  <p><strong>Pertanyaan:</strong> ${essay.question_text}</p>
                  <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; margin: 10px 0;">
                    <strong>Jawaban Anda:</strong><br>
                    ${essay.answer_text || '<em>Tidak ada jawaban</em>'}
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <strong>Nilai:</strong> ${essay.points_earned}/${essay.max_points} poin
                    </div>
                    ${essay.teacher_comment ? `
                      <div style="color: #666; font-style: italic;">
                        "${essay.teacher_comment}"
                      </div>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <p style="color: #666; text-align: center;">Tidak ada pertanyaan essay dalam kuis ini.</p>
          `}
        </div>
      `).join('')}
    </div>
  `;

  document.body.appendChild(modal);

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Enhanced function to get color based on score percentage
function getScoreColor(percentage) {
  if (percentage >= 90) return "score-excellent";
  if (percentage >= 80) return "score-excellent";
  if (percentage >= 70) return "score-good";
  if (percentage >= 60) return "score-average";
  return "score-poor";
}



// teacher dashboard
async function initTeacherDashboard() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user || user.role !== "teacher") return;

  // Load teacher classes
  const resClass = await fetch(`${API}/teacher/classes/${user.id_user}`);
  const dataClass = await resClass.json();

  const classList = document.getElementById("teacher-classes");
  if (classList) {
    classList.innerHTML = "";
    dataClass.classes.forEach(c => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${c.class}</strong> - ${c.name}`;
      classList.appendChild(li);
    });
  }

  // Use the reusable function
  await loadTeacherMateri();

  // Load teacher students
  await loadTeacherStudents();
  await showTeacherClassAndMapel();

  // Load activity
  const activity = document.getElementById("teacher-activity");
  if (activity) {
    // You might want to fetch actual activity data here
    activity.innerHTML = "Aktivitas terbaru akan ditampilkan di sini.";
  }
}

// get teacher mapel
function getTeacherMapel(row) {
  if (row.grade_math === 1) return { id_mapel: 1, name: "Matematika" };
  if (row.grade_science === 1) return { id_mapel: 2, name: "Ilmu Pengetahuan Alam" };
  if (row.grade_indonesia === 1) return { id_mapel: 3, name: "Bahasa Indonesia" };
  return null;
}

// show teacher class and mapel
async function showTeacherClassAndMapel() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user || user.role !== "teacher") return;

  const classInfoEl = document.getElementById("teacher-class-info") ||
    document.getElementById("materi-info");
  if (!classInfoEl) return;

  const res = await fetch(`${API}/teacher/mapel/${user.id_user}`);
  const data = await res.json();

  if (!data.success) return;

  const mapel = data.mapel.name;
  const className = user.class;

  classInfoEl.textContent = `Kelas: ${className} · Mapel: ${mapel}`;
}


// laod teacher students
async function loadTeacherStudents() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user || user.role !== "teacher") return;

  const tbody = document.getElementById("teacher-students");
  if (!tbody) return;

  const res = await fetch(`${API}/teacher/students/${user.id_user}`);
  const data = await res.json();

  tbody.innerHTML = "";

  if (!data.students.length) {
    tbody.innerHTML = `
      <tr><td colspan="2" style="text-align:center;">Tidak ada siswa.</td></tr>
    `;
    return;
  }

  data.students.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.real_name}</td>
      <td>${s.username}</td>
    `;
    tbody.appendChild(tr);
  });
}

// load teacher materi
async function loadTeacherMateri() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user || user.role !== "teacher") return;

  const resMat = await fetch(`${API}/teacher/materi/${user.id_user}`);
  const dataMat = await resMat.json();

  const materiContainer = document.getElementById("teacher-materi");
  if (!materiContainer) return;

  materiContainer.innerHTML = "";

  if (dataMat.materi && dataMat.materi.length > 0) {
    dataMat.materi.forEach(m => {
      const div = document.createElement("div");
      div.style.marginBottom = "15px";
      div.style.padding = "10px";
      div.style.border = "1px solid #ddd";
      div.style.borderRadius = "5px";

      div.innerHTML = `
        <p><strong>${m.title}</strong> — ${m.class}</p>
        <p>${m.description || 'Tidak ada deskripsi'}</p>
        <div style="margin-top: 10px;">
          <a href="${m.file_url}" target="_blank" class="btn small">Lihat File</a>
          <button class="btn small" onclick="editMateri(${m.id_materi})">Edit</button>
          <button class="btn small danger" onclick="deleteMateri(${m.id_materi})">Hapus</button>
        </div>
      `;
      materiContainer.appendChild(div);
    });
  } else {
    materiContainer.innerHTML = "<p>Belum ada materi. Tambahkan materi pertama Anda!</p>";
  }
}


// materi-add.html
async function initAddMateriPage() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user || user.role !== "teacher") return;

  // Get this teacher's mapel automatically
  const resMapel = await fetch(`${API}/teacher/mapel/${user.id_user}`);
  const { mapel } = await resMapel.json();

  const form = document.getElementById("addMateriForm");
  const status = document.getElementById("add-status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem("loggedInUser"));

    // 1. Get teacher's mapel
    const resMapel = await fetch(`${API}/teacher/mapel/${user.id_user}`);
    const mapelData = await resMapel.json();

    if (!mapelData.success || !mapelData.mapel) {
      alert("Gagal menemukan mapel yang diajar guru ini.");
      return;
    }

    const mapel = mapelData.mapel;   // <-- contains id_mapel

    // 2. Build payload
    const payload = {
      id_mapel: mapel.id_mapel,
      teacher_id: user.id_user,
      title: document.getElementById("title").value,
      description: document.getElementById("description").value,
      file_url: document.getElementById("file_url").value || "",
      visible_to_class: user.class,
      sort_order: document.getElementById("sort_order").value,
    };

    // 3. Submit to backend
    const res = await fetch(`${API}/materi/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      alert("Materi berhasil ditambahkan");
      window.location.href = "guru-materi.html";
    } else {
      alert("Error: " + data.error);
    }
  });

}

// edit materi
function editMateri(id) {
  window.location.href = `materi-edit.html?id=${id}`;
}

async function initEditMateriPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const status = document.getElementById("edit-status");
  const user = JSON.parse(localStorage.getItem("loggedInUser"));

  // Load materi
  const res = await fetch(`${API}/materi/get/${id}`);
  const data = await res.json();
  const m = data.materi;

  document.getElementById("title").value = m.title;
  document.getElementById("description").value = m.description;
  document.getElementById("file_url").value = m.file_url;
  document.getElementById("sort_order").value = m.sort_order;

  document.getElementById("editMateriForm").addEventListener("submit", async e => {
    e.preventDefault();

    const payload = {
      title: document.getElementById("title").value,
      description: document.getElementById("description").value,
      file_url: document.getElementById("file_url").value || "",
      visible_to_class: user.class,
      sort_order: document.getElementById("sort_order").value,
    };

    const res = await fetch(`${API}/materi/edit/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });


    const r = await res.json();
    status.textContent = r.message;

    if (r.success) {
      setTimeout(() => window.location.href = "dashboard.html", 1000);
    }
  });
}


// delete materi
async function deleteMateri(id) {
  if (!confirm("Hapus materi ini?")) return;

  const res = await fetch(`${API}/materi/delete/${id}`, { method: "DELETE" });
  const data = await res.json();

  alert(data.message);
  location.reload();
}
