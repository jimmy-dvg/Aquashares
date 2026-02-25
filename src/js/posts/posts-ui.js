function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(date);
}

function createPostCard(post) {
  const column = document.createElement('div');
  column.className = 'col-12 col-md-6 col-lg-4';

  const article = document.createElement('article');
  article.className = 'card h-100';

  const cardBody = document.createElement('div');
  cardBody.className = 'card-body d-flex flex-column';

  const title = document.createElement('h2');
  title.className = 'h5 card-title';
  title.textContent = post.title;

  const body = document.createElement('p');
  body.className = 'card-text text-secondary';
  body.textContent = post.body;

  const meta = document.createElement('small');
  meta.className = 'text-muted mt-auto';
  meta.textContent = formatDate(post.created_at);

  cardBody.append(title, body, meta);
  article.append(cardBody);
  column.append(article);

  return column;
}

export function renderFeedPosts(posts, container) {
  container.replaceChildren();

  if (!posts.length) {
    const emptyColumn = document.createElement('div');
    emptyColumn.className = 'col-12';

    const emptyCard = document.createElement('article');
    emptyCard.className = 'card';

    const emptyBody = document.createElement('div');
    emptyBody.className = 'card-body';

    const emptyTitle = document.createElement('h2');
    emptyTitle.className = 'h5 card-title';
    emptyTitle.textContent = 'No posts yet';

    const emptyText = document.createElement('p');
    emptyText.className = 'card-text text-secondary mb-0';
    emptyText.textContent = 'Be the first to create a post.';

    emptyBody.append(emptyTitle, emptyText);
    emptyCard.append(emptyBody);
    emptyColumn.append(emptyCard);
    container.append(emptyColumn);
    return;
  }

  const fragment = document.createDocumentFragment();
  posts.forEach((post) => {
    fragment.append(createPostCard(post));
  });

  container.append(fragment);
}
