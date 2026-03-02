export const BULGARIAN_LOCATION_SUGGESTIONS = [
  'София',
  'Пловдив',
  'Варна',
  'Бургас',
  'Русе',
  'Стара Загора',
  'Плевен',
  'Сливен',
  'Добрич',
  'Шумен',
  'Перник',
  'Хасково',
  'Ямбол',
  'Пазарджик',
  'Благоевград',
  'Велико Търново',
  'Враца',
  'Габрово',
  'Асеновград',
  'Казанлък',
  'Кюстендил',
  'Кърджали',
  'Монтана',
  'Търговище',
  'Ловеч',
  'Силистра',
  'Смолян',
  'Дупница',
  'Поморие',
  'Несебър',
  'Созопол',
  'Петрич'
];

function normalizeWhitespace(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function getKey(value) {
  return normalizeWhitespace(value).toLocaleLowerCase('bg');
}

export function sanitizeLocation(value) {
  return normalizeWhitespace(value);
}

export function mergeLocationSuggestions(baseLocations = [], dynamicLocations = [], limit = 80) {
  const merged = [];
  const seen = new Set();

  [...dynamicLocations, ...baseLocations].forEach((location) => {
    const normalized = normalizeWhitespace(location);
    if (!normalized) {
      return;
    }

    const key = getKey(normalized);
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    merged.push(normalized);
  });

  return merged.slice(0, limit);
}
