const BG_TRANSLATIONS = new Map([
  ['Aquashares - Feed', 'Aquashares - Начало'],
  ['Aquashares - Login', 'Aquashares - Вход'],
  ['Aquashares - Register', 'Aquashares - Регистрация'],
  ['Aquashares - Create Post', 'Aquashares - Създай публикация'],
  ['Aquashares - Chat', 'Aquashares - Чат'],
  ['Aquashares - Post Detail', 'Aquashares - Детайли на публикация'],
  ['Aquashares - Profile', 'Aquashares - Профил'],
  ['Aquashares - Admin', 'Aquashares - Админ'],
  ['Feed', 'Начало'],
  ['Categories', 'Категории'],
  ['All Categories', 'Всички категории'],
  ['Create Post', 'Създай публикация'],
  ['Chat', 'Чат'],
  ['Profile', 'Профил'],
  ['Admin', 'Админ'],
  ['Search posts...', 'Търси публикации...'],
  ['Search posts', 'Търси публикации'],
  ['Notifications', 'Известия'],
  ['Mark all read', 'Маркирай всички като прочетени'],
  ['No notifications yet.', 'Няма известия.'],
  ['Admin Panel', 'Админ панел'],
  ['Logout', 'Изход'],
  ['Login', 'Вход'],
  ['Register', 'Регистрация'],
  ['Community Feed', 'Общностен поток'],
  ['Search', 'Търсене'],
  ['Search by title, text, category, author...', 'Търси по заглавие, текст, категория, автор...'],
  ['Search feed posts', 'Търси в потока'],
  ['Category', 'Категория'],
  ['Clear', 'Изчисти'],
  ['New Post', 'Нова публикация'],
  ['Loading feed...', 'Зареждане на публикациите...'],
  ['Create account', 'Създай акаунт'],
  ['Create account', 'Създай акаунт'],
  ['Already have an account', 'Вече имаш акаунт'],
  ['Title', 'Заглавие'],
  ['Content', 'Съдържание'],
  ['Loading categories...', 'Зареждане на категориите...'],
  ['Publish Post', 'Публикувай публикация'],
  ['Saving post...', 'Запазване на публикацията...'],
  ['Post Title', 'Заглавие на публикацията'],
  ['Post Detail', 'Детайли на публикацията'],
  ['Role', 'Роля'],
  ['All Roles', 'Всички роли'],
  ['Search users', 'Търси потребители'],
  ['Search by username, display name or email...', 'Търси по потребителско име, име или имейл...'],
  ['Search by username...', 'Търси по потребителско име...'],
  ['Start a direct conversation', 'Започни директен разговор'],
  ['Profile Details', 'Детайли на профила'],
  ['Max 5MB image.', 'Максимален размер на снимка: 5MB.'],
  ['Public profile', 'Публичен профил'],
  ['Create Post', 'Създай публикация'],
  ['Profile', 'Профил'],
  ['Admin', 'Админ'],
  ['Admin Panel', 'Админ панел'],
  ['User', 'Потребител'],
  ['Open detail page', 'Отвори детайлната страница'],
  ['No image', 'Няма изображение'],
  ['Description', 'Описание'],
  ['By', 'От'],
  ['Close', 'Затвори'],
  ['Save changes', 'Запази промените'],
  ['Loading post...', 'Зареждане на публикацията...'],
  ['Loading profile...', 'Зареждане на профила...'],
  ['Loading users...', 'Зареждане на потребителите...'],
  ['Loading posts...', 'Зареждане на публикациите...'],
  ['Loading comments...', 'Зареждане на коментарите...'],
  ['Search notifications...', 'Търси известия...'],
  ['Search admin notifications', 'Търси админ известия'],
  ['All Statuses', 'Всички статуси'],
  ['All Severities', 'Всички нива'],
  ['Open', 'Отворен'],
  ['Resolved', 'Решен'],
  ['Critical', 'Критичен'],
  ['High', 'Висок'],
  ['Medium', 'Среден'],
  ['Low', 'Нисък'],
  ['Email', 'Имейл'],
  ['Password', 'Парола'],
  ['Username', 'Потребителско име'],
  ['Already have an account', 'Вече имаш акаунт'],
  ['Publish Post', 'Публикувай'],
  ['Saving post...', 'Запазване на публикацията...'],
  ['Post Images', 'Снимки към публикацията'],
  ['Optional. You can upload multiple images. Maximum file size per image: 5MB.', 'По избор. Можеш да качиш няколко снимки. Максимален размер на снимка: 5MB.'],
  ['Current Images', 'Текущи снимки'],
  ['Cancel', 'Отказ'],
  ['Messages', 'Съобщения'],
  ['Loading chat...', 'Зареждане на чата...'],
  ['Start new chat', 'Започни нов чат'],
  ['Search by username...', 'Търси по потребителско име...'],
  ['Conversations', 'Разговори'],
  ['Select a chat', 'Избери чат'],
  ['Search users to start messaging.', 'Търси потребители, за да започнеш разговор.'],
  ['Type a message...', 'Напиши съобщение...'],
  ['Back to Feed', 'Назад към началото'],
  ['Loading post...', 'Зареждане на публикацията...'],
  ['Post actions', 'Действия за публикацията'],
  ['Edit Post', 'Редактирай'],
  ['Delete Post', 'Изтрий'],
  ['Uncategorized', 'Без категория'],
  ['Description', 'Описание'],
  ['No image', 'Няма снимка'],
  ['My Profile', 'Моят профил'],
  ['Loading profile...', 'Зареждане на профила...'],
  ['Posts', 'Публикации'],
  ['Comments', 'Коментари'],
  ['Change avatar', 'Смени аватар'],
  ['Max 5MB image.', 'Максимум 5MB снимка.'],
  ['Profile Details', 'Детайли на профила'],
  ['Display name', 'Показвано име'],
  ['Bio', 'Биография'],
  ['Location', 'Локация'],
  ['Website', 'Уебсайт'],
  ['Public profile', 'Публичен профил'],
  ['Save Profile', 'Запази профила'],
  ['My Posts', 'Моите публикации'],
  ['My Comments', 'Моите коментари'],
  ['Preferences', 'Предпочитания'],
  ['Notify on comments', 'Известявай за коментари'],
  ['Notify on replies', 'Известявай за отговори'],
  ['Notify on moderation', 'Известявай за модерация'],
  ['Show email on profile', 'Показвай имейла в профила'],
  ['Show activity publicly', 'Показвай активността публично'],
  ['Save Preferences', 'Запази предпочитанията'],
  ['Start a direct conversation', 'Започни директен разговор'],
  ['Last updated: —', 'Последно обновяване: —'],
  ['Users', 'Потребители'],
  ['Search notifications...', 'Търси известия...'],
  ['Search admin notifications', 'Търси админ известия'],
  ['Status', 'Статус'],
  ['All Statuses', 'Всички статуси'],
  ['Open', 'Отворени'],
  ['Resolved', 'Решени'],
  ['Severity', 'Приоритет'],
  ['All Severities', 'Всички нива'],
  ['Critical', 'Критичен'],
  ['High', 'Висок'],
  ['Medium', 'Среден'],
  ['Low', 'Нисък'],
  ['Loading admin notifications...', 'Зареждане на админ известия...'],
  ['No admin notifications yet.', 'Все още няма админ известия.'],
  ['Loading users...', 'Зареждане на потребители...'],
  ['No users available.', 'Няма налични потребители.'],
  ['Loading posts...', 'Зареждане на публикации...'],
  ['No posts available.', 'Няма налични публикации.'],
  ['Loading comments...', 'Зареждане на коментари...'],
  ['No comments available.', 'Няма налични коментари.'],
  ['Confirm action', 'Потвърди действие'],
  ['Are you sure?', 'Сигурен ли си?'],
  ['Close', 'Затвори'],
  ['Confirm', 'Потвърди'],
  ['Post Preview', 'Преглед на публикацията'],
  ['Post preview', 'Преглед на публикацията'],
  ['Fish', 'Риби'],
  ['Plants', 'Растения'],
  ['Inhabitants', 'Обитатели'],
  ['Equipment', 'Оборудване'],
  ['Other', 'Други'],
  ['Open detail page', 'Отвори детайлната страница'],
  ['Edit post', 'Редактирай публикацията'],
  ['Edit', 'Редактирай'],
  ['Delete', 'Изтрий'],
  ['Save', 'Запази'],
  ['Delete Comment', 'Изтрий коментар'],
  ['Edit Comment', 'Редактирай коментар'],
  ['Are you sure you want to delete this comment? This action cannot be undone.', 'Сигурен ли си, че искаш да изтриеш този коментар? Действието е необратимо.'],
  ['Update your comment text:', 'Актуализирай текста на коментара:'],
  ['Write your updated comment...', 'Напиши обновения си коментар...'],
  ['Unable to update comment.', 'Неуспешно обновяване на коментара.'],
  ['Unable to delete comment.', 'Неуспешно изтриване на коментара.'],
  ['Unable to load comments.', 'Неуспешно зареждане на коментарите.'],
  ['Comment cannot be empty.', 'Коментарът не може да бъде празен.'],
  ['Unable to post comment.', 'Неуспешно публикуване на коментар.'],
  ['No comments yet.', 'Все още няма коментари.'],
  ['Post Comment', 'Публикувай коментар'],
  ['Posting...', 'Публикуване...'],
  ['Log in to add a comment.', 'Влез, за да добавиш коментар.'],
  ['Unable to update like.', 'Неуспешно обновяване на харесване.'],
  ['Unable to open chat.', 'Неуспешно отваряне на чата.'],
  ['Unable to save preferences.', 'Неуспешно запазване на предпочитанията.'],
  ['Unable to load profile.', 'Неуспешно зареждане на профила.'],
  ['Preferences saved.', 'Предпочитанията са запазени.'],
  ['Toggle navigation', 'Превключи навигацията'],
  ['Account menu for User', 'Меню на акаунта за Потребител'],
  ['Guest', 'Гост'],
  ['User', 'Потребител']
]);

function translateValue(value) {
  const direct = BG_TRANSLATIONS.get(value);

  if (direct) {
    return direct;
  }

  let translated = value;

  translated = translated.replace(/^By\s+/, 'От ');
  translated = translated.replace(/^(\d+)\s+likes$/i, '$1 харесвания');
  translated = translated.replace(/^(\d+)\s+comments$/i, '$1 коментара');
  translated = translated.replace(/^Last updated:\s*/i, 'Последно обновяване: ');
  translated = translated.replace(/^Filtering by\s*/i, 'Филтриране по ');
  translated = translated.replace(/^category:\s*/i, 'категория: ');
  translated = translated.replace(/^search:\s*/i, 'търсене: ');
  translated = translated.replace(/^Account menu for\s*/i, 'Меню на акаунта за ');

  return translated;
}

function translateTextNode(node) {
  if (!(node instanceof Text)) {
    return;
  }

  const raw = node.textContent || '';
  const trimmed = raw.trim();

  if (!trimmed) {
    return;
  }

  const translated = translateValue(trimmed);
  if (translated === trimmed) {
    return;
  }

  const leading = raw.match(/^\s*/)?.[0] || '';
  const trailing = raw.match(/\s*$/)?.[0] || '';
  node.textContent = `${leading}${translated}${trailing}`;
}

function translateElementAttributes(element) {
  ['placeholder', 'aria-label', 'title'].forEach((attributeName) => {
    if (!element.hasAttribute(attributeName)) {
      return;
    }

    const original = element.getAttribute(attributeName) || '';
    const translated = translateValue(original);

    if (translated !== original) {
      element.setAttribute(attributeName, translated);
    }
  });
}

function translateTree(rootNode) {
  if (rootNode instanceof Text) {
    translateTextNode(rootNode);
    return;
  }

  if (!(rootNode instanceof Element)) {
    return;
  }

  translateElementAttributes(rootNode);

  const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let currentNode = walker.currentNode;

  while (currentNode) {
    if (currentNode instanceof Text) {
      translateTextNode(currentNode);
    } else if (currentNode instanceof Element) {
      translateElementAttributes(currentNode);
    }

    currentNode = walker.nextNode();
  }
}

export function initializeBulgarianLocalization() {
  document.documentElement.lang = 'bg';
  document.title = translateValue(document.title || '');
  translateTree(document.body);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData') {
        translateTree(mutation.target);
        return;
      }

      mutation.addedNodes.forEach((addedNode) => {
        translateTree(addedNode);
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}
