import { showConfirmModal } from '../utils/confirm-modal.js';

const modalState = {
  initialized: false,
  element: null,
  instance: null,
  title: null,
  message: null,
  inputWrap: null,
  input: null,
  error: null,
  cancelButton: null,
  confirmButton: null
};

function getBootstrapModalConstructor() {
  return window?.bootstrap?.Modal || null;
}

function ensureCommentActionModal() {
  if (modalState.initialized) {
    return modalState;
  }

  const modalElement = document.createElement('div');
  modalElement.className = 'modal fade';
  modalElement.tabIndex = -1;
  modalElement.setAttribute('aria-hidden', 'true');
  modalElement.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" data-comment-modal-title></h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Затвори"></button>
        </div>
        <div class="modal-body">
          <p class="mb-2" data-comment-modal-message></p>
          <div class="d-none" data-comment-modal-input-wrap>
            <textarea class="form-control" rows="4" maxlength="1000" data-comment-modal-input></textarea>
            <div class="text-danger small mt-2 d-none" data-comment-modal-error></div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" data-comment-modal-cancel>Отказ</button>
          <button type="button" class="btn btn-primary" data-comment-modal-confirm>Потвърди</button>
        </div>
      </div>
    </div>
  `;

  document.body.append(modalElement);

  const ModalConstructor = getBootstrapModalConstructor();
  if (!ModalConstructor) {
    return null;
  }

  modalState.initialized = true;
  modalState.element = modalElement;
  modalState.instance = new ModalConstructor(modalElement);
  modalState.title = modalElement.querySelector('[data-comment-modal-title]');
  modalState.message = modalElement.querySelector('[data-comment-modal-message]');
  modalState.inputWrap = modalElement.querySelector('[data-comment-modal-input-wrap]');
  modalState.input = modalElement.querySelector('[data-comment-modal-input]');
  modalState.error = modalElement.querySelector('[data-comment-modal-error]');
  modalState.cancelButton = modalElement.querySelector('[data-comment-modal-cancel]');
  modalState.confirmButton = modalElement.querySelector('[data-comment-modal-confirm]');

  return modalState;
}

function clearModalError(modal) {
  if (!modal?.error) {
    return;
  }

  modal.error.textContent = '';
  modal.error.classList.add('d-none');
}

function setModalError(modal, message) {
  if (!modal?.error) {
    return;
  }

  modal.error.textContent = message;
  modal.error.classList.remove('d-none');
}

export async function showCommentActionModal(config) {
  const modal = ensureCommentActionModal();

  if (!modal) {
    if (config.mode === 'confirm') {
      const confirmed = await showConfirmModal({
        title: config.title || 'Потвърждение',
        message: config.message || 'Потвърди действието?',
        confirmLabel: config.confirmLabel || 'Потвърди',
        cancelLabel: config.cancelLabel || 'Отказ',
        confirmButtonClass: config.confirmClass || 'btn-primary'
      });

      return {
        confirmed
      };
    }

    if (config.mode === 'input') {
      await showConfirmModal({
        title: config.title || 'Коментар',
        message: 'Редакторът за коментари е временно недостъпен. Обнови страницата и опитай отново.',
        confirmLabel: 'Затвори',
        confirmButtonClass: 'btn-secondary',
        hideCancel: true
      });

      return { confirmed: false, value: null };
    }

    await showConfirmModal({
      title: config.title || 'Действие с коментар',
      message: config.message || 'Операцията не беше успешна.',
      confirmLabel: 'Затвори',
      confirmButtonClass: 'btn-secondary',
      hideCancel: true
    });

    return { confirmed: true };
  }

  if (modal.title) {
    modal.title.textContent = config.title || 'Коментар';
  }

  if (modal.message) {
    modal.message.textContent = config.message || '';
  }

  if (modal.cancelButton) {
    modal.cancelButton.textContent = config.cancelLabel || 'Отказ';
    modal.cancelButton.classList.toggle('d-none', config.hideCancel === true);
  }

  if (modal.confirmButton) {
    modal.confirmButton.textContent = config.confirmLabel || 'Потвърди';
    modal.confirmButton.className = `btn ${config.confirmClass || 'btn-primary'}`;
  }

  clearModalError(modal);

  if (modal.inputWrap && modal.input) {
    if (config.mode === 'input') {
      modal.inputWrap.classList.remove('d-none');
      modal.input.value = config.initialValue || '';
      modal.input.placeholder = config.placeholder || '';
      window.setTimeout(() => {
        modal.input.focus();
        modal.input.setSelectionRange(modal.input.value.length, modal.input.value.length);
      }, 30);
    } else {
      modal.inputWrap.classList.add('d-none');
      modal.input.value = '';
    }
  }

  return await new Promise((resolve) => {
    let finished = false;

    const cleanup = () => {
      modal.element.removeEventListener('hidden.bs.modal', handleHidden);
      modal.confirmButton?.removeEventListener('click', handleConfirm);
    };

    const done = (result) => {
      if (finished) {
        return;
      }

      finished = true;
      cleanup();
      resolve(result);
    };

    const handleHidden = () => {
      done({ confirmed: false, value: null });
    };

    const handleConfirm = () => {
      if (config.mode === 'input' && modal.input) {
        const value = modal.input.value.trim();

        if (!value) {
          setModalError(modal, 'Коментарът не може да бъде празен.');
          return;
        }

        if (value.length > 1000) {
          setModalError(modal, 'Коментарът трябва да бъде до 1000 символа.');
          return;
        }

        modal.instance.hide();
        done({ confirmed: true, value });
        return;
      }

      modal.instance.hide();
      done({ confirmed: true, value: null });
    };

    modal.element.addEventListener('hidden.bs.modal', handleHidden);
    modal.confirmButton?.addEventListener('click', handleConfirm);
    modal.instance.show();
  });
}

export async function showCommentErrorDialog(message) {
  await showCommentActionModal({
    mode: 'info',
    title: 'Действие с коментар',
    message,
    confirmLabel: 'Затвори',
    confirmClass: 'btn-secondary',
    hideCancel: true
  });
}
