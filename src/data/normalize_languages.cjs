const fs = require('fs');
const dataPath = 'C:/Projetos/biblios/src/data/data.json';

const langMap = {
  'portugues': 'Portuguese',
  'ingles': 'English',
  'frances': 'French',
  'alemao': 'German',
  'espanhol': 'Spanish',
  'italiano': 'Italian',
  'russo': 'Russian',
  'japones': 'Japanese',
  'chines': 'Mandarin',
  'arabe': 'Arabic',
  'grego': 'Greek',
  'holandes': 'Dutch',
  'polones': 'Polish',
  'turco': 'Turkish',
  'sueco': 'Swedish',
  'dinamarques': 'Danish',
  'noruegues': 'Norwegian',
  'coreano': 'Korean',
  'vietnamita': 'Vietnamese',
  'tcheco': 'Czech',
  'hungaro': 'Hungarian',
  'finlandes': 'Finnish',
  'romeno': 'Romanian',
  'bengali': 'Bengali',
  'persa': 'Persian',
  'hebraico': 'Hebrew',
  'hindi': 'Hindi',
  'urdu': 'Urdu',
  'swahili': 'Swahili',
  'islandes': 'Icelandic',
  'irlandes': 'Irish',
  'latim': 'Latin',
  'ingles (antigo)': 'Old English',
  'frances (antigo)': 'Old French',
  'castelhano': 'Spanish'
};

function normalizeText(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

console.log('--- STARTING LANGUAGE NORMALIZATION ---');

try {
  let books = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  let fixedCount = 0;

  books.forEach(b => {
    const original = b.originalLanguage || '';
    const normalized = normalizeText(original);
    
    if (langMap[normalized]) {
      const translated = langMap[normalized];
      if (original !== translated) {
        b.originalLanguage = translated;
        fixedCount++;
        if (fixedCount < 20) console.log(`[FIXED] "${original}" -> "${translated}"`);
      }
    }
  });

  fs.writeFileSync(dataPath, JSON.stringify(books, null, 2), 'utf8');
  console.log(`--- FINISHED: Normalized ${fixedCount} language entries ---`);
} catch (err) {
  console.error('Error:', err);
}
