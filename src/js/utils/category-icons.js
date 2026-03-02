const CATEGORY_EMOJI_MAP = {
  fish: '🐟',
  plants: '🌿',
  inhabitants: '🪸',
  equipment: '🧰',
  foods: '🧪',
  giveaway: '🎁',
  exchange: '🔄',
  other: '📦'
};

const CATEGORY_BG_NAME_MAP = {
  fish: 'Риби',
  plants: 'Растения',
  inhabitants: 'Обитатели',
  equipment: 'Оборудване',
  foods: 'Храни и препарати',
  giveaway: 'Подарявам',
  exchange: 'Разменям',
  other: 'Други'
};

const CATEGORY_SECTION_BG_LABEL_MAP = {
  forum: 'Форум',
  giveaway: 'Подарявам',
  exchange: 'Разменям'
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

export function getScopedCategoryDisplayName(categoryName, categorySlug, categorySection) {
  const section = (categorySection || 'forum').trim().toLowerCase();
  const sectionLabel = CATEGORY_SECTION_BG_LABEL_MAP[section] || 'Форум';
  const categoryLabel = getCategoryDisplayName(categoryName, categorySlug);
  return `${sectionLabel} • ${categoryLabel}`;
}

export function getAllCategoriesLabel(section = '') {
  const normalizedSection = (section || '').trim().toLowerCase();

  if (normalizedSection === 'forum') {
    return '🗂️ Всички теми';
  }

  if (normalizedSection === 'giveaway') {
    return '🗂️ Всичко в Подарявам';
  }

  if (normalizedSection === 'exchange') {
    return '🗂️ Всичко в Разменям';
  }

  return '🗂️ Всички категории';
}
