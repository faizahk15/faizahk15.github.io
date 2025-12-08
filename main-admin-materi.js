/* ------------------------
   ADMIN MATERIAL MANAGEMENT
  ------------------------- */

let allMaterials = [];
let allSubjects = [];
let currentEditId = null;
let currentDeleteId = null;
let searchTimeout = null;

// Initialize admin material page
async function initAdminMaterialPage() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user || user.role !== "admin") return;

  // Load subjects for filter
  await loadSubjectsForFilter();
  
  // Load initial materials
  await loadMaterials();
  
  // Setup modal event listeners
  setupModalListeners();
  
  // Setup welcome message
  const msg = document.getElementById('welcome-msg');
  if (msg) msg.textContent = `Selamat datang, ${user.real_name}!`;
}

// Load subjects for filter dropdown
async function loadSubjectsForFilter() {
  try {
    const res = await fetch(`${API}/admin/subjects`);
    const data = await res.json();
    
    const subjectSelect = document.getElementById('filterSubject');
    if (!subjectSelect) return;
    
    if (data.success && data.subjects.length > 0) {
      allSubjects = data.subjects;
      
      // Clear existing options except the first one
      subjectSelect.innerHTML = '<option value="">Semua Mapel</option>';
      
      // Group subjects by class for better organization
      const subjectsByClass = {};
      allSubjects.forEach(subject => {
        if (!subjectsByClass[subject.class]) {
          subjectsByClass[subject.class] = [];
        }
        subjectsByClass[subject.class].push(subject);
      });
      
      // Add optgroups for each class
      Object.keys(subjectsByClass).sort().forEach(className => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = `Kelas ${className}`;
        
        subjectsByClass[className].forEach(subject => {
          const option = document.createElement('option');
          option.value = subject.id_mapel;
          option.textContent = subject.name;
          optgroup.appendChild(option);
        });
        
        subjectSelect.appendChild(optgroup);
      });
      
    } else {
      subjectSelect.innerHTML = '<option value="">Tidak ada mapel tersedia</option>';
    }
  } catch (error) {
    console.error("Error loading subjects:", error);
    const subjectSelect = document.getElementById('filterSubject');
    if (subjectSelect) {
      subjectSelect.innerHTML = '<option value="">Error memuat mapel</option>';
    }
  }
}

// Load materials with filters
async function loadMaterials() {
  const tbody = document.getElementById('materialsBody');
  if (!tbody) return;
  
  try {
    tbody.innerHTML = '<tr><td colspan="7">Memuat data...</td></tr>';
    
    const res = await fetch(`${API}/admin/materials`);
    const data = await res.json();
    
    if (!data.success) {
      tbody.innerHTML = '<tr><td colspan="7">Gagal memuat data materi.</td></tr>';
      return;
    }
    
    allMaterials = data.materials;
    
    // Apply filters
    const filteredMaterials = applyFilters(allMaterials);
    
    // Display materials
    displayMaterials(filteredMaterials);
    
  } catch (error) {
    console.error("Error loading materials:", error);
    tbody.innerHTML = '<tr><td colspan="7">Error memuat data materi.</td></tr>';
  }
}

// Apply filters to materials
function applyFilters(materials) {
  const filterClass = document.getElementById('filterClass').value;
  const filterSubject = document.getElementById('filterSubject').value;
  const searchTerm = document.getElementById('searchMaterial').value.toLowerCase();
  
  return materials.filter(material => {
    // Filter by class (check if material.class starts with filterClass)
    if (filterClass && !material.class.startsWith(filterClass)) {
      return false;
    }
    
    // Filter by subject (convert both to string for comparison)
    if (filterSubject) {
      // Convert both to string for comparison
      const materialSubjectId = String(material.id_mapel);
      const filterSubjectId = String(filterSubject);
      
      if (materialSubjectId !== filterSubjectId) {
        return false;
      }
    }
    
    // Filter by search term
    if (searchTerm) {
      const searchInTitle = material.title.toLowerCase().includes(searchTerm);
      const searchInDesc = material.description ? 
        material.description.toLowerCase().includes(searchTerm) : false;
      const searchInTeacher = material.teacher_name.toLowerCase().includes(searchTerm);
      const searchInSubject = material.subject_name.toLowerCase().includes(searchTerm);
      
      if (!(searchInTitle || searchInDesc || searchInTeacher || searchInSubject)) {
        return false;
      }
    }
    
    return true;
  });
}

// Display materials in table
function displayMaterials(materials) {
  const tbody = document.getElementById('materialsBody');
  if (!tbody) return;
  
  if (materials.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 30px; color: #666;">
          <div style="margin-bottom: 10px;">
            📭 Tidak ada materi yang ditemukan
          </div>
          <small>Coba ubah filter atau kata kunci pencarian</small>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = '';
  
  materials.forEach(material => {
    const tr = document.createElement('tr');
    
    // Format date
    const createdDate = new Date(material.created_at);
    const formattedDate = createdDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    
    // Format description preview
    let descriptionPreview = '-';
    if (material.description) {
      descriptionPreview = material.description.length > 50 ? 
        material.description.substring(0, 50) + '...' : material.description;
    }
    
    tr.innerHTML = `
      <td>
        <div style="font-weight: bold; margin-bottom: 3px;">${material.title}</div>
        ${material.file_url ? 
          `<small style="color: #0066cc;">
            <a href="${material.file_url}" target="_blank" style="color: inherit; text-decoration: none;">
              📎 ${material.file_url.substring(0, 30)}${material.file_url.length > 30 ? '...' : ''}
            </a>
          </small>` : 
          `<small style="color: #999;">Tidak ada file</small>`}
      </td>
      <td>${descriptionPreview}</td>
      <td>
        <div style="font-weight: 500;">${material.subject_name}</div>
        <small style="color: #666;">ID: ${material.id_mapel}</small>
      </td>
      <td>
        <span class="class-badge" style="background: #e3f2fd; color: #1976d2; padding: 3px 8px; border-radius: 12px; font-size: 0.85em;">
          ${material.class}
        </span>
      </td>
      <td>${material.teacher_name}</td>
      <td>
        <div>${formattedDate}</div>
        <small style="color: #666; font-size: 0.85em;">
          ${createdDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </small>
      </td>
      <td class="actions">
        ${material.file_url ? 
          `<button class="btn small" onclick="openViewMaterial('${material.file_url.replace(/'/g, "\\'")}')" title="Lihat file">
            Lihat
          </button>` : 
          `<button class="btn small" disabled title="Tidak ada file">
            Lihat
          </button>`}
        <button class="btn small" onclick="openEditModal(${material.id_materi})" title="Edit materi">
          Edit
        </button>
        <button class="btn small danger" onclick="openDeleteModal(${material.id_materi}, '${material.title.replace(/'/g, "\\'")}')" title="Hapus materi">
          Hapus
        </button>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
}

// Open material in new tab
function openViewMaterial(fileUrl) {
  if (fileUrl && fileUrl.trim() !== '') {
    window.open(fileUrl, '_blank');
  } else {
    alert('Tidak ada URL file yang tersedia');
  }
}

// Setup modal event listeners
function setupModalListeners() {
  // Edit form submission
  const editForm = document.getElementById('editMaterialForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveMaterialEdit();
    });
  }
  
  // Delete confirmation
  const confirmDelete = document.getElementById('confirmDelete');
  const cancelDelete = document.getElementById('cancelDelete');
  const deleteModal = document.getElementById('deleteModal');
  
  if (confirmDelete) {
    confirmDelete.addEventListener('click', async () => {
      if (currentDeleteId) {
        await deleteMaterial(currentDeleteId);
      }
    });
  }
  
  if (cancelDelete) {
    cancelDelete.addEventListener('click', () => {
      deleteModal.classList.add('hidden');
      currentDeleteId = null;
    });
  }
  
  // Class filter change should update subject filter options
  const classFilter = document.getElementById('filterClass');
  if (classFilter) {
    classFilter.addEventListener('change', updateSubjectFilterOptions);
  }
}

// Update subject filter options based on selected class
function updateSubjectFilterOptions() {
  const selectedClass = document.getElementById('filterClass').value;
  const subjectSelect = document.getElementById('filterSubject');
  
  if (!subjectSelect || allSubjects.length === 0) return;
  
  // Clear all options
  subjectSelect.innerHTML = '<option value="">Semua Mapel</option>';
  
  // If no class selected, show all subjects
  if (!selectedClass) {
    // Group subjects by class
    const subjectsByClass = {};
    allSubjects.forEach(subject => {
      if (!subjectsByClass[subject.class]) {
        subjectsByClass[subject.class] = [];
      }
      subjectsByClass[subject.class].push(subject);
    });
    
    // Add optgroups for each class
    Object.keys(subjectsByClass).sort().forEach(className => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = `Kelas ${className}`;
      
      subjectsByClass[className].forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.id_mapel;
        option.textContent = subject.name;
        optgroup.appendChild(option);
      });
      
      subjectSelect.appendChild(optgroup);
    });
  } else {
    // Filter subjects by selected class
    const filteredSubjects = allSubjects.filter(subject => 
      subject.class.startsWith(selectedClass)
    );
    
    if (filteredSubjects.length > 0) {
      filteredSubjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.id_mapel;
        option.textContent = subject.name;
        subjectSelect.appendChild(option);
      });
    } else {
      subjectSelect.innerHTML = '<option value="">Tidak ada mapel untuk kelas ini</option>';
    }
  }
  
  // Apply filters after updating subject options
  const filteredMaterials = applyFilters(allMaterials);
  displayMaterials(filteredMaterials);
}

// Open edit modal
async function openEditModal(materialId) {
  currentEditId = materialId;
  
  try {
    // Find the material in our loaded data
    const material = allMaterials.find(m => m.id_materi == materialId);
    
    if (!material) {
      alert('Materi tidak ditemukan');
      return;
    }
    
    // Fill form with material data
    document.getElementById('editId').value = material.id_materi;
    document.getElementById('editTitle').value = material.title;
    document.getElementById('editDescription').value = material.description || '';
    document.getElementById('editFileUrl').value = material.file_url || '';
    document.getElementById('editSortOrder').value = material.sort_order || 0;
    
    // Set visible class - use the material's class if available
    const visibleClassSelect = document.getElementById('editVisibleClass');
    if (visibleClassSelect) {
      visibleClassSelect.value = material.visible_to_class || material.class + 'A';
    }
    
    // Clear status
    document.getElementById('editStatus').innerHTML = '';
    
    // Show modal
    document.getElementById('editModal').classList.remove('hidden');
    
  } catch (error) {
    console.error('Error opening edit modal:', error);
    alert('Gagal memuat data materi');
  }
}

// Close edit modal
function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
  currentEditId = null;
}

// Save material edit
async function saveMaterialEdit() {
  const statusDiv = document.getElementById('editStatus');
  const materialId = document.getElementById('editId').value;
  
  if (!materialId) {
    statusDiv.innerHTML = '<span style="color: red;">Error: ID materi tidak valid</span>';
    return;
  }
  
  try {
    statusDiv.innerHTML = '<span style="color: blue;">Menyimpan perubahan...</span>';
    
    const payload = {
      title: document.getElementById('editTitle').value,
      description: document.getElementById('editDescription').value,
      file_url: document.getElementById('editFileUrl').value || '',
      sort_order: parseInt(document.getElementById('editSortOrder').value) || 0,
      visible_to_class: document.getElementById('editVisibleClass').value
    };
    
    // Use the existing endpoint (same as teacher edit)
    const res = await fetch(`${API}/materi/edit/${materialId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    
    if (data.success) {
      statusDiv.innerHTML = '<span style="color: green;">✅ Perubahan berhasil disimpan!</span>';
      
      // Reload materials after a short delay
      setTimeout(() => {
        loadMaterials();
        closeEditModal();
      }, 1500);
      
    } else {
      statusDiv.innerHTML = `<span style="color: red;">❌ Gagal menyimpan: ${data.error || data.message}</span>`;
    }
    
  } catch (error) {
    console.error('Error saving material edit:', error);
    statusDiv.innerHTML = '<span style="color: red;">❌ Error menyimpan perubahan</span>';
  }
}

// Open delete confirmation modal
function openDeleteModal(materialId, materialTitle) {
  currentDeleteId = materialId;
  const deleteModal = document.getElementById('deleteModal');
  const deleteModalText = document.getElementById('deleteModalText');
  
  if (deleteModal && deleteModalText) {
    deleteModalText.textContent = `Apakah Anda yakin ingin menghapus materi "${materialTitle}"? Tindakan ini tidak dapat dibatalkan.`;
    document.getElementById('deleteStatus').innerHTML = '';
    deleteModal.classList.remove('hidden');
  }
}

// Delete material
async function deleteMaterial(materialId) {
  const statusDiv = document.getElementById('deleteStatus');
  const deleteModal = document.getElementById('deleteModal');
  
  try {
    statusDiv.innerHTML = '<span style="color: blue;">Menghapus materi...</span>';
    
    const res = await fetch(`${API}/admin/materi/delete/${materialId}`, {
      method: 'DELETE'
    });
    
    const data = await res.json();
    
    if (data.success) {
      statusDiv.innerHTML = '<span style="color: green;">✅ Materi berhasil dihapus!</span>';
      
      // Close modal and reload after delay
      setTimeout(() => {
        deleteModal.classList.add('hidden');
        currentDeleteId = null;
        loadMaterials();
      }, 1000);
      
    } else {
      statusDiv.innerHTML = `<span style="color: red;">❌ Gagal menghapus: ${data.error || data.message}</span>`;
    }
    
  } catch (error) {
    console.error('Error deleting material:', error);
    statusDiv.innerHTML = '<span style="color: red;">❌ Error menghapus materi</span>';
  }
}

// Debounced search function
function debouncedSearch() {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  searchTimeout = setTimeout(() => {
    const filteredMaterials = applyFilters(allMaterials);
    displayMaterials(filteredMaterials);
  }, 300);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  initAdminMaterialPage();
  
  // Update nav for admin
  const user = JSON.parse(localStorage.getItem('loggedInUser'));
  if (user && user.role === 'admin') {
    const nav = document.getElementById('nav-bar');
    if (nav) {
      nav.innerHTML = `
        <a href="dashboard.html">Dashboard</a>
        <a href="admin-users.html">Kelola Pengguna</a>
        <a href="admin-materi.html" class="select">Kelola Materi</a>
        <a href="forum-admin.html">Kelola Forum</a>
        <a href="profil.html">Profil</a>
      `;
    }
  }
});