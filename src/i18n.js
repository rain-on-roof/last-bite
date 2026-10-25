// English is the default; Russian and Ukrainian come from the browser.
const STRINGS = {
  en: {
    tagline: "Eat your sandwich. Don't get honked.",
    hold: 'HOLD TO EAT',
    hint: 'Let go when the goose stares',
    challenge: 'Your friend ate {n}. Beat it.',
    honk: 'HONK.',
    lines: ['The goose has your lunch now.', 'Greed got you.', 'Should have let go.', 'The goose sends its regards.'],
    best: 'Best {n}',
    newBest: 'New best!',
    won: '{n} beaten!',
    lost: '{d} short of {n}',
    again: 'Again',
    dare: 'Dare a friend',
    shareText: '{n} bites before the goose got me. Can you beat it? 🥪🪿',
    copied: 'Link copied',
    golden: 'GOLDEN GOOSE ×2',
    next: 'NEXT!',
    jk: 'jk',
    close: 'CLOSE CALL!',
    streak: '{n} DODGES IN A ROW',
    by: 'a game by',
    sound: 'Sound',
    ranks: { crumb: 'Crumb Collector', snack: 'Goose Snack', regular: 'Park Regular', legend: 'Bench Legend', whisperer: 'Goose Whisperer' },
    unit: ['bite', 'bites'],
  },
  ru: {
    tagline: 'Доешь бутерброд. Не попадись гусю.',
    hold: 'ЗАЖМИ, ЧТОБЫ ЕСТЬ',
    hint: 'Отпускай, когда гусь пялится',
    challenge: 'Друг съел {n}. Побей.',
    honk: 'ГА-ГА.',
    lines: ['Теперь это обед гуся.', 'Жадность сгубила.', 'Надо было отпустить.', 'Гусь передаёт привет.'],
    best: 'Рекорд {n}',
    newBest: 'Новый рекорд!',
    won: '{n} побит!',
    lost: 'Не хватило {d} до {n}',
    again: 'Ещё раз',
    dare: 'Вызвать друга',
    shareText: 'Мой счёт — {n}, потом пришёл гусь. Побьёшь? 🥪🪿',
    copied: 'Ссылка скопирована',
    golden: 'ЗОЛОТОЙ ГУСЬ ×2',
    next: 'ЕЩЁ!',
    jk: 'шучу',
    close: 'НА ВОЛОСКЕ!',
    streak: 'СЕРИЯ ×{n}',
    by: 'игра от',
    sound: 'Звук',
    ranks: { crumb: 'Собиратель крошек', snack: 'Гусиный перекус', regular: 'Завсегдатай парка', legend: 'Легенда скамейки', whisperer: 'Заклинатель гусей' },
    unit: ['укус', 'укуса', 'укусов'],
  },
  uk: {
    tagline: 'Доїж бутерброд. Не попадись гусакові.',
    hold: 'ЗАТИСНИ, ЩОБ ЇСТИ',
    hint: 'Відпускай, коли гусак витріщається',
    challenge: 'Друг з’їв {n}. Побий.',
    honk: 'ГА-ГА.',
    lines: ['Тепер це обід гусака.', 'Жадібність згубила.', 'Треба було відпустити.', 'Гусак передає привіт.'],
    best: 'Рекорд {n}',
    newBest: 'Новий рекорд!',
    won: '{n} побито!',
    lost: 'Бракувало {d} до {n}',
    again: 'Ще раз',
    dare: 'Кинути виклик',
    shareText: 'Мій рахунок — {n}, потім прийшов гусак. Поб’єш? 🥪🪿',
    copied: 'Посилання скопійовано',
    golden: 'ЗОЛОТИЙ ГУСАК ×2',
    next: 'ЩЕ!',
    jk: 'жартую',
    close: 'НА ВОЛОСИНІ!',
    streak: 'СЕРІЯ ×{n}',
    by: 'гра від',
    sound: 'Звук',
    ranks: { crumb: 'Збирач крихт', snack: 'Гусячий перекус', regular: 'Завсідник парку', legend: 'Легенда лавки', whisperer: 'Заклинач гусаків' },
    unit: ['укус', 'укуси', 'укусів'],
  },
};

export function pickLocale(languages = globalThis.navigator?.languages || [globalThis.navigator?.language || 'en']) {
  for (const lang of languages) {
    const code = String(lang).toLowerCase().slice(0, 2);
    if (STRINGS[code]) return code;
  }
  return 'en';
}

export function strings(locale) {
  return STRINGS[locale] || STRINGS.en;
}

export function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
}

// "bite/bites" in English, three forms in Russian and Ukrainian.
export function unit(locale, n) {
  const forms = strings(locale).unit;
  if (forms.length === 2) return n === 1 ? forms[0] : forms[1];
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
