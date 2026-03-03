export function validatePostEditInput(title, body, categoryId, categories) {
  if (!title || title.length < 3) {
    return 'Title must be at least 3 characters long.';
  }
  if (title.length > 120) {
    return 'Title must be 120 characters or less.';
  }
  if (!body || body.length < 10) {
    return 'Post content must be at least 10 characters long.';
  }
  if (body.length > 5000) {
    return 'Post content must be 5000 characters or less.';
  }
  if ((categories || []).length > 0 && !categoryId) {
    return 'Please select a category.';
  }
  return null;
}

export function getFilesFromInputs(...inputElements) {
  return inputElements.flatMap((inputElement) => {
    if (!(inputElement instanceof HTMLInputElement) || !inputElement.files?.length) {
      return [];
    }
    return [...inputElement.files];
  });
}

export function renderExistingModalImages(imageSection, imageList, photos) {
  if (!(imageSection instanceof HTMLElement) || !(imageList instanceof HTMLElement)) {
    return;
  }
  imageList.replaceChildren();
  if (!photos.length) {
    imageSection.classList.add('d-none');
    return;
  }
  const fragment = document.createDocumentFragment();
  photos.forEach((photo) => {
    const col = document.createElement('div');
    col.className = 'col-12 col-sm-6';
    const wrapper = document.createElement('div');
    wrapper.className = 'border rounded p-2 h-100';
    const image = document.createElement('img');
    image.src = photo.publicUrl;
    image.alt = 'Текуща снимка към публикацията';
    image.className = 'img-fluid rounded mb-2';
    image.style.maxHeight = '180px';
    image.style.objectFit = 'cover';
    const formCheck = document.createElement('div');
    formCheck.className = 'form-check';
    const checkbox = document.createElement('input');
    checkbox.className = 'form-check-input';
    checkbox.type = 'checkbox';
    checkbox.id = `modal-remove-photo-${photo.id}`;
    checkbox.dataset.removePhoto = 'true';
    checkbox.dataset.photoId = photo.id;
    checkbox.dataset.photoPath = photo.storagePath;
    const label = document.createElement('label');
    label.className = 'form-check-label';
    label.setAttribute('for', checkbox.id);
    label.textContent = 'Премахни тази снимка';
    formCheck.append(checkbox, label);
    wrapper.append(image, formCheck);
    col.append(wrapper);
    fragment.append(col);
  });
  imageList.append(fragment);
  imageSection.classList.remove('d-none');
}

export function getSelectedPhotosForRemoval(currentImageList) {
  if (!(currentImageList instanceof HTMLElement)) {
    return [];
  }
  const checkedInputs = currentImageList.querySelectorAll('[data-remove-photo="true"]:checked');
  return [...checkedInputs].map((input) => {
    if (!(input instanceof HTMLInputElement)) {
      return null;
    }
    const photoId = input.dataset.photoId;
    const storagePath = input.dataset.photoPath;
    if (!photoId || !storagePath) {
      return null;
    }
    return { id: photoId, storagePath };
  }).filter(Boolean);
}

export async function removePhoto(photo, deletePhotoRecord, deletePostImage) {
  await deletePhotoRecord(photo.id);
  await deletePostImage(photo.storagePath);
}

export async function uploadAndCreatePhoto(file, userId, postId, uploadPostImage, getPublicUrl, createPhotoRecord) {
  const storagePath = await uploadPostImage(file, userId, postId);
  const publicUrl = getPublicUrl(storagePath);
  const createdPhoto = await createPhotoRecord({ postId, userId, storagePath, publicUrl });
  return { ...createdPhoto, storagePath };
}

export async function rollbackPhoto(photo, deletePhotoRecord, deletePostImage) {
  if (!photo) {
    return;
  }
  if (photo.id) {
    try {
      await deletePhotoRecord(photo.id);
    } catch {
    }
  }
  if (photo.storagePath) {
    try {
      await deletePostImage(photo.storagePath);
    } catch {
    }
  }
}

export function forceCloseModal(modalElement) {
  if (!(modalElement instanceof HTMLElement)) {
    return;
  }
  modalElement.classList.remove('show');
  modalElement.style.display = 'none';
  modalElement.setAttribute('aria-hidden', 'true');
  modalElement.removeAttribute('aria-modal');
  modalElement.removeAttribute('role');
  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => backdrop.remove());
  document.body.classList.remove('modal-open');
  document.body.style.removeProperty('padding-right');
}