export function showConfirmModal(options = {}) {
  const message = options.message || 'Confirm action?';
  const title = options.title || 'Please confirm';
  const confirmLabel = options.confirmLabel || 'Confirm';
  const cancelLabel = options.cancelLabel || 'Cancel';
  const confirmButtonClass = options.confirmButtonClass || 'btn-danger';
  const hideCancel = options.hideCancel === true;

  if (!window.bootstrap?.Modal) {
    return new Promise((resolve) => {
      const backdrop = document.createElement('div');
      backdrop.className = 'position-fixed top-0 start-0 w-100 h-100 bg-dark';
      backdrop.style.opacity = '0.5';
      backdrop.style.zIndex = '1050';

      const host = document.createElement('div');
      host.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3';
      host.style.zIndex = '1055';

      const card = document.createElement('div');
      card.className = 'bg-body border rounded shadow-sm w-100';
      card.style.maxWidth = '420px';

      const header = document.createElement('div');
      header.className = 'p-3 border-bottom fw-semibold';
      header.textContent = title;

      const body = document.createElement('div');
      body.className = 'p-3';
      body.textContent = message;

      const footer = document.createElement('div');
      footer.className = 'p-3 border-top d-flex justify-content-end gap-2';

      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'btn btn-outline-secondary';
      cancelButton.textContent = cancelLabel;

      const confirmButton = document.createElement('button');
      confirmButton.type = 'button';
      confirmButton.className = `btn ${confirmButtonClass}`;
      confirmButton.textContent = confirmLabel;

      const handleKeyDown = (event) => {
        if (event.key === 'Escape' && !hideCancel) {
          event.preventDefault();
          cleanup(false);
          return;
        }

        if (event.key === 'Enter') {
          const target = event.target;
          if (target instanceof HTMLTextAreaElement) {
            return;
          }

          event.preventDefault();
          cleanup(true);
        }
      };

      const cleanup = (confirmed) => {
        document.removeEventListener('keydown', handleKeyDown);
        backdrop.remove();
        host.remove();
        resolve(confirmed);
      };

      if (!hideCancel) {
        footer.append(cancelButton);
      }

      footer.append(confirmButton);
      card.append(header, body, footer);
      host.append(card);
      document.body.append(backdrop, host);

      cancelButton.addEventListener('click', () => cleanup(false));
      confirmButton.addEventListener('click', () => cleanup(true));

      backdrop.addEventListener('click', () => {
        if (hideCancel) {
          return;
        }

        cleanup(false);
      });

      document.addEventListener('keydown', handleKeyDown);
      confirmButton.focus();
    });
  }

  return new Promise((resolve) => {
    const modalElement = document.createElement('div');
    modalElement.className = 'modal fade';
    modalElement.tabIndex = -1;
    modalElement.setAttribute('aria-hidden', 'true');

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog modal-dialog-centered';

    const content = document.createElement('div');
    content.className = 'modal-content';

    const header = document.createElement('div');
    header.className = 'modal-header';

    const heading = document.createElement('h5');
    heading.className = 'modal-title';
    heading.textContent = title;

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close';
    closeButton.setAttribute('data-bs-dismiss', 'modal');
    closeButton.setAttribute('aria-label', 'Close');

    header.append(heading, closeButton);

    const body = document.createElement('div');
    body.className = 'modal-body';

    const bodyText = document.createElement('p');
    bodyText.className = 'mb-0';
    bodyText.textContent = message;
    body.append(bodyText);

    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'btn btn-outline-secondary';
    cancelButton.setAttribute('data-bs-dismiss', 'modal');
    cancelButton.textContent = cancelLabel;

    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = `btn ${confirmButtonClass}`;
    confirmButton.textContent = confirmLabel;

    if (!hideCancel) {
      footer.append(cancelButton);
    }

    footer.append(confirmButton);
    content.append(header, body, footer);
    dialog.append(content);
    modalElement.append(dialog);

    document.body.append(modalElement);

    const modal = new window.bootstrap.Modal(modalElement);
    let confirmed = false;

    confirmButton.addEventListener('click', () => {
      confirmed = true;
      modal.hide();
    });

    modalElement.addEventListener('hidden.bs.modal', () => {
      modal.dispose();
      modalElement.remove();
      resolve(confirmed);
    }, { once: true });

    modal.show();
  });
}
