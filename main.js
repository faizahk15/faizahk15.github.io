// Page detection and initialization
document.addEventListener('DOMContentLoaded', () => {
  applyRoleUI();
  loadAllProfilePictures();
  loadMore();
  const path = window.location.pathname;
  console.log(path);

  if (path.endsWith('dashboard.html')) {
    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    if (user.role === "teacher") {
      initTeacherDashboard();
      loadTeacherStudents();
      showTeacherClassAndMapel();
    } else {
      generateLeaderboard();
      loadNewestLessons();
      loadActiveQuizzes();
    }
  }

  else if (path.endsWith('guru-materi.html')) {
    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    if (user.role === "teacher") {
      loadTeacherMateri();
      showTeacherClassAndMapel();
    }
  }

  else if (path.endsWith('forum.html')) {
    updateForumClassBadge();
    loadForumPosts();
    initForumNewPost();
  }

  else if (path.endsWith('forum-post.html')) {
    initForumPostPage(); // This line was missing!
  }

  else if (path.endsWith('materi-add.html')) {
    showTeacherClassAndMapel();
    initAddMateriPage();
  }

  else if (path.endsWith('materi-edit.html')) {
    showTeacherClassAndMapel();
    initEditMateriPage();
  }

  else if (path.endsWith("admin-users.html")) {
    initAdminPage();
    initAdminCreateForm();
    adminRoleSelect();
  }

  else if (path.endsWith('forum-admin.html')) {
    initAdminForum();
  }

  else if (path.endsWith('materi.html')) initMateriPageDB();
  else if (path.endsWith('materi-detail.html')) initMateriDetailDB();

  // else if (path.endsWith('kuis.html')) initKuisPage();
  // else if (path.endsWith('kuis-detail.html')) initKuisDetail();

  // In your existing DOMContentLoaded event listener in main.js, add:
  else if (path.endsWith('kuis.html')) {
    loadStudentQuizzes();
  }
  else if (path.endsWith('kuis-nilai.html')) {
    loadStudentGrades();
  }
  else if (path.endsWith('kuis-take.html')) {
    // Quiz taking page - handled by inline script
  }
  else if (path.endsWith('kuis-result.html')) {
    // Quiz result page - handled by inline script
  }
  else if (path.endsWith('nilai.html')) { // If you create a grades page
    loadStudentGrades();
  }

  else if (path.endsWith('guru-quiz.html')) {
    showTeacherClassAndMapel();
    loadTeacherQuizzes();
    setupCreateQuizForm();

    // Setup create quiz form
    const createForm = document.getElementById("createQuizForm");
    if (createForm) {
      createForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        // Implementation for quick create modal
      });
    }
  }

  else if (path.endsWith('guru-quiz-create.html')) {
    showTeacherClassAndMapel();
    setupQuizEditorForm(); // Replace the old function
    setupQuizFormValidation();

    // Check if we're editing an existing quiz or creating new
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");

    if (editId) {
      // Load existing quiz data
      loadQuizForEditing(editId);
    } else {
      // Load pending data from quick create
      const pendingData = loadPendingQuizData();
      if (!pendingData) {
        // If no pending data, redirect back to quiz list
        window.location.href = "guru-quiz.html";
      }
    }

    // Add initial question if none exists
    const questionsContainer = document.getElementById("questions-container");
    if (questionsContainer && questionsContainer.children.length === 0) {
      addQuestion();
    }
  }

  else if (path.endsWith('guru-quiz-results.html')) {
    loadQuizResults();
  }
  else if (path.endsWith('guru-quiz-attempt.html')) {
    loadQuizAttemptDetail();
    loadQuizAttemptForGrading();
  }
  else initLogin();
});
