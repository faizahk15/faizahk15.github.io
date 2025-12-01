// ===== PROFILE PICTURES =====

// Enhanced upload function using the ImageProcessor
async function uploadProfilePicture(userId, file, options = {}) {
  const statusDiv = document.getElementById("upload-status");

  try {
    // Show processing status
    if (statusDiv) {
      statusDiv.innerHTML = '<span style="color: blue;">Memproses gambar...</span>';
    }

    // Check if image needs processing
    const processingInfo = await imageProcessor.needsProcessing(file);

    if (processingInfo.needsCrop || processingInfo.needsResize) {
      if (statusDiv) {
        statusDiv.innerHTML = '<span style="color: blue;">Mengoptimalkan gambar...</span>';
      }
    }

    // Process the image with auto-crop and resize
    const processed = await imageProcessor.processProfileImage(file, {
      cropToSquare: true,
      maxSize: 400,
      quality: 0.85,
      ...options // Allow overriding defaults
    });

    if (statusDiv) {
      statusDiv.innerHTML = '<span style="color: blue;">Mengupload...</span>';
    }

    // Convert processed blob to base64
    const processedBase64 = await imageProcessor.blobToBase64(processed.blob);
    const matches = processedBase64.match(/^data:(.+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
      throw new Error('Failed to process image');
    }

    const imageType = matches[1];
    const imageData = matches[2];

    const res = await fetch(`${API}/user/profile-picture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_user: userId,
        image_data: imageData,
        image_type: imageType
      })
    });

    const result = await res.json();

    // Clear cache after successful upload
    if (result.success) {
      clearProfilePictureCache(userId);
    }

    return result;

  } catch (error) {
    console.error("Image processing/upload error:", error);
    throw error;
  }
}

// Enhanced profile picture upload handler
async function handleProfilePictureUpload(event) {
  const file = event.target.files[0];
  const statusDiv = document.getElementById("upload-status");
  const user = JSON.parse(localStorage.getItem("loggedInUser"));

  if (!file) return;

  // Validate file size (2MB)
  if (file.size > 2 * 1024 * 1024) {
    statusDiv.innerHTML = '<span style="color: red;">File terlalu besar. Maksimal 2MB.</span>';
    return;
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    statusDiv.innerHTML = '<span style="color: red;">Format tidak didukung. Gunakan JPG, PNG, GIF, atau WebP.</span>';
    return;
  }

  try {
    // Get image info
    const dimensions = await imageProcessor.getImageDimensions(file);
    const processingInfo = await imageProcessor.needsProcessing(file);

    let statusMessage = `Memproses gambar ${dimensions.width}×${dimensions.height}...`;
    if (processingInfo.needsCrop) {
      statusMessage += " (akan dipotong persegi)";
    }
    if (processingInfo.needsResize) {
      statusMessage += " (akan diperkecil)";
    }

    statusDiv.innerHTML = `<span style="color: blue;">${statusMessage}</span>`;

    // Upload with processing
    const result = await uploadProfilePicture(user.id_user, file);

    if (result.success) {
      let successMessage = '✓ Foto profil berhasil diupdate!';
      if (processingInfo.needsCrop) {
        successMessage += ' (Otomatis dipotong persegi)';
      }
      if (processingInfo.needsResize) {
        successMessage += ' (Otomatis diperkecil)';
      }

      statusDiv.innerHTML = `<span style="color: green;">${successMessage}</span>`;

      // Reload the profile picture
      const profileImg = document.getElementById("profile-picture");
      await loadProfilePicture(user.id_user, profileImg);

      // Clear status after 3 seconds
      setTimeout(() => {
        statusDiv.innerHTML = '';
      }, 3000);
    } else {
      statusDiv.innerHTML = `<span style="color: red;">Error: ${result.error}</span>`;
    }
  } catch (error) {
    console.error("Upload error:", error);

    let errorMessage = "Error mengupload foto. ";
    if (error.message.includes('Failed to load image')) {
      errorMessage += "File gambar mungkin rusak.";
    } else if (error.message.includes('Failed to process image')) {
      errorMessage += "Gagal memproses gambar.";
    } else {
      errorMessage += "Silakan coba lagi.";
    }

    statusDiv.innerHTML = `<span style="color: red;">${errorMessage}</span>`;
  }

  // Reset file input
  event.target.value = '';
}

// Preview function using ImageProcessor
async function showCropPreview(file) {
  const previewDiv = document.getElementById("crop-preview");
  const previewImg = document.getElementById("preview-image");

  if (!previewDiv || !previewImg) return;

  try {
    const processed = await imageProcessor.processProfileImage(file, {
      cropToSquare: true,
      maxSize: 200, // Smaller for preview
      quality: 0.7
    });

    previewImg.src = URL.createObjectURL(processed.blob);
    previewDiv.style.display = 'block';

    // Clean up object URL when done
    previewImg.onload = () => URL.revokeObjectURL(previewImg.src);
  } catch (error) {
    console.error("Preview error:", error);
    previewDiv.style.display = 'none';
  }
}

// Get profile picture URL
function getProfilePictureUrl(userId) {
  return `${API}/user/profile-picture/${userId}?t=${Date.now()}`; // Cache busting
}

// Load and display profile picture with proper error handling
async function loadProfilePicture(userId, imgElement) {
  try {
    const response = await fetch(`${API}/user/profile-picture/${userId}`);
    const data = await response.json();

    if (data.success && data.exists) {
      // Convert base64 back to image
      const base64Data = `data:${data.image_type};base64,${data.image_data}`;
      imgElement.src = base64Data;

      imgElement.onerror = () => {
        // Fallback if the base64 data is corrupted
        console.warn("Failed to load profile picture, using default");
        imgElement.src = "assets/profile.png";
      };
    } else {
      // No profile picture exists, use default
      imgElement.src = "assets/profile.png";
    }
  } catch (error) {
    console.error("Error loading profile picture:", error);
    // Use default avatar on any error
    imgElement.src = "assets/profile.png";
  }
}

// Enhanced version with caching
const profilePictureCache = new Map();

async function loadProfilePicture(userId, imgElement) {
  const cacheKey = `profile-${userId}`;

  // Check cache first
  if (profilePictureCache.has(cacheKey)) {
    const cached = profilePictureCache.get(cacheKey);
    imgElement.src = cached;
    return;
  }

  try {
    const response = await fetch(`${API}/user/profile-picture/${userId}`);
    const data = await response.json();

    if (data.success && data.exists) {
      const base64Data = `data:${data.image_type};base64,${data.image_data}`;

      // Cache the result
      profilePictureCache.set(cacheKey, base64Data);
      imgElement.src = base64Data;

      imgElement.onerror = () => {
        // Remove from cache if invalid
        profilePictureCache.delete(cacheKey);
        imgElement.src = "assets/profile.png";
      };
    } else {
      // Cache the default image
      profilePictureCache.set(cacheKey, "assets/profile.png");
      imgElement.src = "assets/profile.png";
    }
  } catch (error) {
    console.error("Error loading profile picture:", error);
    profilePictureCache.set(cacheKey, "assets/profile.png");
    imgElement.src = "assets/profile.png";
  }
}

// Clear cache when profile picture changes
function clearProfilePictureCache(userId) {
  const cacheKey = `profile-${userId}`;
  profilePictureCache.delete(cacheKey);
}

// Function to load profile pictures in headers and other places
function loadAllProfilePictures() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) return;

  // Load profile picture in header
  const headerProfileImg = document.querySelector('.headerProfile .thumb');
  if (headerProfileImg) {
    loadProfilePicture(user.id_user, headerProfileImg);
  }

  // Load profile picture in profile page
  const profilePageImg = document.getElementById('profile-picture');
  if (profilePageImg) {
    loadProfilePicture(user.id_user, profilePageImg);
  }

  // Load any other profile pictures on the page
  const allProfileImgs = document.querySelectorAll('.thumb.profilePic, [data-profile-picture]');
  allProfileImgs.forEach(img => {
    if (img !== headerProfileImg && img !== profilePageImg) {
      loadProfilePicture(user.id_user, img);
    }
  });
}
