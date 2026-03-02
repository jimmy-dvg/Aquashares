const CATEGORY_EMOJI_MAP = {
  fish: '🐟',
  plants: '🌿',
  inhabitants: '🪸',
  equipment: '🧰',
  giveaway: '🎁',
  exchange: '🔄',
  other: '📦'
};

export function getCategoryEmoji(categorySlug) {
  const slug = (categorySlug || '').trim().toLowerCase();
  return CATEGORY_EMOJI_MAP[slug] || '🏷️';
}

export function getCategoryLabelWithEmoji(categoryName, categorySlug) {
  return `${getCategoryEmoji(categorySlug)} ${categoryName}`;
}

export function getAllCategoriesLabel() {
  return '🗂️ All Categories';
}
