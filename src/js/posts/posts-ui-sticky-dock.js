export function cleanupFilterDock(feedState) {
  const dock = feedState.filterDock;
  if (!dock) {
    return;
  }
  dock.toggleButton?.removeEventListener('click', dock.onToggleClick);
  dock.panel?.removeEventListener('input', dock.onPanelInput);
  dock.panel?.removeEventListener('change', dock.onPanelChange);
  window.removeEventListener('scroll', dock.onScroll);
  window.removeEventListener('keydown', dock.onKeyDown);
  document.removeEventListener('pointerdown', dock.onPointerDown);
  feedState.filterDock = null;
}

export function initializeStickyFilterDock(feedState) {
  const bar = document.querySelector('[data-feed-filter-bar]');
  const panel = document.querySelector('[data-feed-filter-panel]');
  const toggleButton = document.querySelector('[data-feed-compact-toggle]');
  if (!(bar instanceof HTMLElement) || !(panel instanceof HTMLElement) || !(toggleButton instanceof HTMLButtonElement)) {
    cleanupFilterDock(feedState);
    return;
  }
  if (feedState.filterDock?.bar === bar) {
    return;
  }
  cleanupFilterDock(feedState);
  const setPanelOpen = (isOpen) => {
    bar.classList.toggle('is-panel-open', isOpen);
    toggleButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  };
  const closePanel = () => {
    setPanelOpen(false);
  };
  const onPanelInput = () => {
    if (!bar.classList.contains('is-panel-open')) {
      return;
    }
    if (feedState.filterDock) {
      feedState.filterDock.shouldAutoCloseOnScroll = true;
    }
  };
  const onPanelChange = onPanelInput;
  const onScroll = () => {
    const dock = feedState.filterDock;
    if (!dock) {
      return;
    }
    const currentY = window.scrollY;
    const scrollingDown = currentY > (dock.lastScrollY + 4);
    dock.lastScrollY = currentY;
    if (!bar.classList.contains('is-panel-open')) {
      return;
    }
    if (!dock.shouldAutoCloseOnScroll || !scrollingDown) {
      return;
    }
    closePanel();
    dock.shouldAutoCloseOnScroll = false;
  };
  const onToggleClick = (event) => {
    event.preventDefault();
    const nextOpen = !bar.classList.contains('is-panel-open');
    setPanelOpen(nextOpen);
    if (feedState.filterDock) {
      feedState.filterDock.shouldAutoCloseOnScroll = false;
    }
  };
  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      closePanel();
    }
  };
  const onPointerDown = (event) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (bar.contains(target)) {
      return;
    }
    closePanel();
  };
  toggleButton.addEventListener('click', onToggleClick);
  panel.addEventListener('input', onPanelInput);
  panel.addEventListener('change', onPanelChange);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('keydown', onKeyDown);
  document.addEventListener('pointerdown', onPointerDown);
  setPanelOpen(false);
  feedState.filterDock = {
    bar,
    panel,
    toggleButton,
    lastScrollY: window.scrollY,
    shouldAutoCloseOnScroll: false,
    onToggleClick,
    onPanelInput,
    onPanelChange,
    onScroll,
    onKeyDown,
    onPointerDown
  };
}