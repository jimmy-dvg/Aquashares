const NAVBAR_SHELL = `
<div class="container">
  <a class="navbar-brand fw-semibold" href="/index.html">Aquashares</a>
  <button
    class="navbar-toggler"
    type="button"
    data-bs-toggle="collapse"
    data-bs-target="#mainNavbar"
    aria-controls="mainNavbar"
    aria-expanded="false"
    aria-label="Превключи навигацията"
  >
    <span class="navbar-toggler-icon"></span>
  </button>

  <div class="collapse navbar-collapse" id="mainNavbar">
    <ul class="navbar-nav align-items-lg-center gap-lg-1 mb-2 mb-lg-0 aqua-nav-pages">
      <li class="nav-item dropdown aqua-nav-categories" data-nav-forum>
        <button
          type="button"
          class="nav-link btn btn-link dropdown-toggle"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          data-nav-forum-toggle
        >
          Форум
        </button>
        <ul class="dropdown-menu" data-nav-forum-menu>
          <li><a class="dropdown-item" href="/index.html">Всички теми</a></li>
        </ul>
      </li>
      <li class="nav-item dropdown aqua-nav-categories" data-nav-giveaway>
        <button
          type="button"
          class="nav-link btn btn-link dropdown-toggle"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          data-nav-giveaway-toggle
        >
          Подарявам
        </button>
        <ul class="dropdown-menu" data-nav-giveaway-menu>
          <li><a class="dropdown-item" href="/giveaway.html">Всички в Подарявам</a></li>
        </ul>
      </li>
      <li class="nav-item dropdown aqua-nav-categories" data-nav-exchange>
        <button
          type="button"
          class="nav-link btn btn-link dropdown-toggle"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          data-nav-exchange-toggle
        >
          Разменям
        </button>
        <ul class="dropdown-menu" data-nav-exchange-menu>
          <li><a class="dropdown-item" href="/exchange.html">Всички в Разменям</a></li>
        </ul>
      </li>
      <li class="nav-item dropdown aqua-nav-categories" data-nav-wanted>
        <button
          type="button"
          class="nav-link btn btn-link dropdown-toggle"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          data-nav-wanted-toggle
        >
          Търся
        </button>
        <ul class="dropdown-menu" data-nav-wanted-menu>
          <li><a class="dropdown-item" href="/wanted.html">Всички в Търся</a></li>
        </ul>
      </li>

      <li class="nav-item d-none" data-nav-auth><a class="nav-link" href="/post-create.html">Нова публикация</a></li>
      <li class="nav-item d-none" data-nav-auth><a class="nav-link" href="/chat.html">Чат</a></li>
      <li class="nav-item d-none" data-nav-auth><a class="nav-link" href="/profile.html">Профил</a></li>
      <li class="nav-item d-none" data-nav-admin><a class="nav-link" href="/admin.html">Админ</a></li>
    </ul>

    <form class="aqua-nav-search my-2 my-lg-0 mx-lg-3" role="search" data-nav-search-form>
      <div class="input-group input-group-sm">
        <span class="input-group-text"><i class="bi bi-search" aria-hidden="true"></i></span>
        <input
          type="search"
          class="form-control"
          name="q"
          placeholder="Търси публикации..."
          aria-label="Търси публикации"
          data-nav-search-input
        />
      </div>
    </form>

    <div class="d-flex flex-column flex-lg-row align-items-lg-center gap-2 ms-lg-auto aqua-nav-account">
      <div class="d-flex align-items-center gap-2 d-none" data-nav-auth>
        <div class="dropdown" data-notifications-dropdown>
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm position-relative aqua-nav-icon-btn"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            aria-label="Известия"
          >
            <i class="bi bi-bell-fill" aria-hidden="true"></i>
            <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" data-notifications-badge>0</span>
          </button>
          <div class="dropdown-menu dropdown-menu-end p-0 aqua-notifications-menu">
            <div class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
              <strong class="small">Известия</strong>
              <button type="button" class="btn btn-link btn-sm p-0" data-notifications-mark-all>Маркирай всички</button>
            </div>
            <div class="list-group list-group-flush" data-notifications-list></div>
            <div class="px-3 py-2 text-secondary small" data-notifications-empty>Няма известия.</div>
          </div>
        </div>

        <div class="dropdown">
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm dropdown-toggle aqua-nav-user-trigger"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            data-nav-user-button
          >
            <i class="bi bi-person-circle" aria-hidden="true"></i>
            <span data-nav-status>Потребител</span>
            <span class="badge text-bg-warning d-none" data-nav-user-role>Админ</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li><a class="dropdown-item" href="/profile.html">Профил</a></li>
            <li class="d-none" data-nav-admin><a class="dropdown-item" href="/admin.html">Админ панел</a></li>
            <li><hr class="dropdown-divider" /></li>
            <li><button type="button" class="dropdown-item text-danger" data-nav-logout>Изход</button></li>
          </ul>
        </div>
      </div>

      <div class="d-flex align-items-center gap-2" data-nav-guest>
        <a class="btn btn-outline-secondary btn-sm" href="/login.html">Вход</a>
        <a class="btn btn-primary btn-sm" href="/register.html">Регистрация</a>
      </div>
    </div>
  </div>
</div>
`;

export function hydrateNavbarShell() {
  const navbar = document.querySelector('nav.navbar');
  if (!(navbar instanceof HTMLElement)) {
    return;
  }

  if (navbar.dataset.aquaShellHydrated === 'true') {
    return;
  }

  navbar.innerHTML = NAVBAR_SHELL;
  navbar.dataset.aquaShellHydrated = 'true';
}
