import geoscheme from '../../un-geoscheme-subregions-countries.json';

// Pré-processa o geoscheme para um mapa de busca rápida
const countryToRegionMap = {};
const continentMap = {
  'AF': 'Africa',
  'SA': 'South America',
  'NA': 'North America',
  'AS': 'Asia',
  'EU': 'Europe',
  'OC': 'Oceania'
};

Object.entries(geoscheme).forEach(([continentCode, regions]) => {
  regions.forEach(regionObj => {
    Object.entries(regionObj).forEach(([regionName, countries]) => {
      countries.forEach(country => {
        countryToRegionMap[country.toLowerCase()] = {
          region: regionName,
          continent: continentMap[continentCode]
        };
      });
    });
  });
});

// Aliases comuns para países
const countryAliases = {
  'usa': 'United States of America',
  'uk': 'United Kingdom of Great Britain and Northern Ireland',
  'england': 'United Kingdom of Great Britain and Northern Ireland',
  'scotland': 'United Kingdom of Great Britain and Northern Ireland',
  'wales': 'United Kingdom of Great Britain and Northern Ireland',
  'northern ireland': 'United Kingdom of Great Britain and Northern Ireland',
  'brazil': 'Brazil',
  'russia': 'Russian Federation',
  'south korea': 'Republic of Korea',
  'north korea': "Democratic People's Republic of Korea",
  'vietnam': 'Viet Nam',
  'iran': 'Iran (Islamic Republic of)',
  'venezuela': 'Venezuela (Bolivarian Republic of)',
  'bolivaria': 'Bolivia (Plurinational State of)',
  'taiwan': 'China',
  'tanzania': 'United Republic of Tanzania',
  'syria': 'Syrian Arab Republic',
  'macedonia': 'The former Yugoslav Republic of Macedonia',
  'moldova': 'Republic of Moldova',
  'ivory coast': "Côte d'Ivoire",
  'turkmenistan': 'Turkmenistan',
  'uzbekistan': 'Uzbekistan',
  'guinea bissau': 'Guinea-Bissau'
};

const langMap = {
  'portugues': 'Portuguese',
  'ingles': 'English',
  'frances': 'French',
  'alemao': 'German',
  'espanhol': 'Spanish',
  'italiano': 'Italian',
  'russo': 'Russian',
  'japones': 'Japanese',
  'chines': 'Chinese',
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

export const translateLanguageToEnglish = (lang) => {
  if (!lang) return 'English';
  const normalized = lang.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  return langMap[normalized] || lang.trim();
};

export const getGeoInfo = (countryName) => {
  if (!countryName) return { region: '', continent: '' };
  const name = countryName.toLowerCase().trim();
  const normalizedName = countryAliases[name] || name;
  
  // Tenta encontrar pelo nome normalizado
  let info = countryToRegionMap[normalizedName.toLowerCase()];
  
  // Se não encontrar, tenta busca parcial (ex: "United States" em "United States of America")
  if (!info) {
    const entry = Object.entries(countryToRegionMap).find(([c]) => 
      c.includes(name) || name.includes(c)
    );
    if (entry) info = entry[1];
  }

  return info || { region: '', continent: '' };
};

/**
 * Normaliza uma string para o padrão ASCII (remove acentos).
 */
export const normalizeToASCII = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .replace(/ø/g, 'o')
    .replace(/Ø/g, 'O')
    .trim();
};

/**
 * Normaliza uma string para comparações de busca (remove acentos, converte para minúsculas e remove espaços).
 */
export const normalizeForSearch = (str) => {
  if (!str) return '';
  return normalizeToASCII(str).toLowerCase().trim();
};

/**
 * Escapa um campo para o formato CSV.
 */
export const escapeCSVField = (val) => {
  if (val === null || val === undefined) return '';
  let str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }
  return str;
};

/**
 * Parser de CSV robusto que lida com aspas e quebras de linha.
 */
export const parseCSVText = (text) => {
  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push("");
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      if (row.length > 1 || row[0] !== "") {
        lines.push(row);
      }
      row = [""];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }
  return lines;
};

/**
 * Mapeia linhas de CSV para objetos de livros.
 */
export const mapCsvToBooks = (rows) => {
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const mapping = {
    title: headers.indexOf('title'),
    author: headers.indexOf('author'),
    year: headers.indexOf('year'),
    country: headers.indexOf('country'),
    region: headers.indexOf('region'),
    continent: headers.indexOf('continent'),
    read: headers.indexOf('read'),
    lang: headers.indexOf('originallanguage'),
    pages: headers.indexOf('pages'),
    desc: headers.indexOf('description')
  };

  return rows.slice(1)
    .filter(row => row[mapping.title] && row[mapping.title].trim() && row[mapping.author] && row[mapping.author].trim())
    .map((row, idx) => {
      const country = row[mapping.country]?.trim() || '';
      const geo = getGeoInfo(country);
      
      return {
        id: idx + 1,
        title: row[mapping.title]?.trim() || '',
        author: normalizeToASCII(row[mapping.author]?.trim() || ''),
        year: mapping.year !== -1 ? row[mapping.year]?.trim() || '' : '',
        country: country,
        region: mapping.region !== -1 && row[mapping.region] ? row[mapping.region].trim() : geo.region,
        continent: mapping.continent !== -1 && row[mapping.continent] ? row[mapping.continent].trim() : geo.continent,
        read: mapping.read !== -1 ? (row[mapping.read]?.trim() === '1' || row[mapping.read]?.toLowerCase() === 'true') : false,
        originalLanguage: mapping.lang !== -1 ? translateLanguageToEnglish(row[mapping.lang]) : 'English',
        pages: mapping.pages !== -1 ? parseInt(row[mapping.pages], 10) || 250 : 250,
        description: mapping.desc !== -1 ? row[mapping.desc]?.trim() || '' : ''
      };
    });
};

/**
 * Corrige inconsistências históricas nos dados.
 */
export const repairBooksList = (loadedBooks, referenceData) => {
  let needsRepair = false;
  const repaired = loadedBooks.map(b => {
    let isUpdated = false;
    const updated = { ...b };
    
    // Novidade: Garantir que a região e continente estejam corretos via Geoscheme
    const geo = getGeoInfo(b.country);
    if (geo.region && (!b.region || b.region !== geo.region)) {
      updated.region = geo.region;
      isUpdated = true;
    }
    if (geo.continent && (!b.continent || b.continent !== geo.continent)) {
      updated.continent = geo.continent;
      isUpdated = true;
    }

    if (b.continent === 'Ireland') {
      updated.continent = 'Europe';
      isUpdated = true;
    } else if (b.continent === 'India') {
      updated.continent = 'Asia';
      isUpdated = true;
    } else if (b.continent === 'Japan') {
      updated.continent = 'Asia';
      isUpdated = true;
    }
    
    if (['Nicaragua', 'El Salvador', 'Guatemala'].includes(b.country) && b.continent !== 'Central America') {
      // Nota: O Geoscheme UN coloca estes em Central America (NA)
      updated.continent = 'North America'; 
      updated.region = 'Central America';
      isUpdated = true;
    }
    
    if (b.country === 'French Canada') {
      updated.country = 'Canada';
      isUpdated = true;
    }

    const freshSource = referenceData.find(item => 
      item.title.toLowerCase().trim() === b.title.toLowerCase().trim() && 
      item.author.toLowerCase().trim() === b.author.toLowerCase().trim()
    );

    if (freshSource) {
      if (b.pages === undefined || parseInt(b.pages, 10) !== parseInt(freshSource.pages, 10)) {
        updated.pages = freshSource.pages;
        isUpdated = true;
      }
      if (b.originalLanguage === undefined || b.originalLanguage === 'English') {
        if (b.originalLanguage !== freshSource.originalLanguage) {
          updated.originalLanguage = translateLanguageToEnglish(freshSource.originalLanguage);
          isUpdated = true;
        }
      }
      if (b.description === undefined || b.description === '' || b.description !== freshSource.description) {
        updated.description = freshSource.description;
        isUpdated = true;
      }
      if ((b.year === '1950' || b.year === 1950) && freshSource.year !== '1950') {
        updated.year = freshSource.year;
        isUpdated = true;
      }
    } else {
      if (b.originalLanguage === undefined) {
        updated.originalLanguage = 'English';
        isUpdated = true;
      }
      if (b.pages === undefined) {
        updated.pages = 250;
        isUpdated = true;
      }
      if (b.description === undefined) {
        updated.description = `A book from ${b.country || 'world literature'}.`;
        isUpdated = true;
      }
    }

    if (isUpdated) {
      needsRepair = true;
    }

    // Traduzir idioma para inglês em todos os casos
    const finalLang = translateLanguageToEnglish(updated.originalLanguage);
    if (updated.originalLanguage !== finalLang) {
      updated.originalLanguage = finalLang;
      needsRepair = true;
    }

    // Garantir normalização ASCII para o autor em todos os casos
    const finalAuthor = normalizeToASCII(updated.author);
    if (updated.author !== finalAuthor) {
      updated.author = finalAuthor;
      needsRepair = true;
    }

    return updated;
  });

  return { repaired, needsRepair };
};

/**
 * Formata e ordena uma lista de livros para exportação em Markdown.
 * Ordena por ano de forma crescente.
 * Formato por linha: - **Título**, Autor (País, Ano)
 */
export const formatMDExport = (books) => {
  const sorted = [...books].sort((a, b) => {
    const yearA = parseInt(a.year, 10) || 0;
    const yearB = parseInt(b.year, 10) || 0;
    return yearA - yearB;
  });
  return sorted
    .map(b => `- **${b.title}**, ${b.author} (${b.country}, ${b.year})`)
    .join('\n');
};

// Listas para Autocomplete
export const allCountries = Object.values(geoscheme)
  .flatMap(regions => regions.flatMap(regionObj => Object.values(regionObj).flat()))
  .filter((v, i, a) => a.indexOf(v) === i)
  .sort();

export const allRegions = Object.values(geoscheme)
  .flatMap(regions => regions.flatMap(regionObj => Object.keys(regionObj)))
  .filter((v, i, a) => a.indexOf(v) === i)
  .sort();

export const allContinents = [
  ...Object.keys(geoscheme).map(code => continentMap[code] || code),
  'Central America'
]
  .filter((v, i, a) => a.indexOf(v) === i)
  .sort();