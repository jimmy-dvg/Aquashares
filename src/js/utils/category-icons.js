const CATEGORY_EMOJI_MAP = {
  fish: '🐟',
  plants: '🌿',
  inhabitants: '🪸',
  equipment: '🧰',
  giveaway: '🎁',
  exchange: '🔄',
  other: '📦'
};

const CATEGORY_BG_NAME_MAP = {
  fish: 'Риби',
  plants: 'Растения',
  inhabitants: 'Обитатели',
  equipment: 'Оборудване',
  giveaway: 'Подарявам',
  exchange: 'Разменям',
  other: 'Други'
};

export function getCategoryEmoji(categorySlug) {
  const slug = (categorySlug || '').trim().toLowerCase();
  return CATEGORY_EMOJI_MAP[slug] || '🏷️';
}

export function getCategoryDisplayName(categoryName, categorySlug) {
  const normalizedName = (categoryName || '').trim();
  if (normalizedName) {
    return normalizedName;
  }

  const slug = (categorySlug || '').trim().toLowerCase();
  return CATEGORY_BG_NAME_MAP[slug] || 'Без категория';
}

export function getCategoryLabelWithEmoji(categoryName, categorySlug) {
  return `${getCategoryEmoji(categorySlug)} ${getCategoryDisplayName(categoryName, categorySlug)}`;
}

export function getAllCategoriesLabel() {
  return '🗂️ Всички категории';
}
