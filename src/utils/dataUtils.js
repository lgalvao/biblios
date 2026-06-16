import geoscheme from '../../un-geoscheme-subregions-countries.json';

const NOVEL_EXCEPTIONS = new Set([
  'a hero of our time',
  'doctor glas',
  'therese desqueyroux',
  'therese desqueiroux',
  'the lonely londoners',
  'houseboy',
  'pinjar',
  'the kingdom of this world',
  'annie john',
  'butterfly burning',
  'shyness and dignity',
  'death in spring',
  'our sister, killjoy',
  'our sister killjoy',
  'crick crack, monkey',
  'crick crack monkey'
]);

export const isNovelException = (title) => {
  if (!title) return false;
  const normalized = title.toLowerCase().trim().replace(/[,']/g, '');
  return NOVEL_EXCEPTIONS.has(normalized) || NOVEL_EXCEPTIONS.has(title.toLowerCase().trim());
};

// Pré-processa o geoscheme para um mapa de busca rápida
export const countryToRegionMap = {};
export const countryAliases = {};
export const allCountries = [];
export const allRegions = [];
export const allContinents = [];

export const continentMap = {
  'AF': 'Africa',
  'SA': 'South America',
  'NA': 'North America',
  'AS': 'Asia',
  'EU': 'Europe',
  'OC': 'Oceania'
};

const defaultAliases = {
  'usa': 'USA',
  'united states of america': 'USA',
  'united states': 'USA',
  'uk': 'United Kingdom',
  'england': 'United Kingdom',
  'scotland': 'United Kingdom',
  'wales': 'United Kingdom',
  'northern ireland': 'United Kingdom',
  'brazil': 'Brazil',
  'brasil': 'Brazil',
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
  'macedonia': 'North Macedonia',
  'north macedonia': 'North Macedonia',
  'moldova': 'Republic of Moldova',
  'ivory coast': "Côte d'Ivoire",
  'turkmenistan': 'Turkmenistan',
  'uzbekistan': 'Uzbekistan',
  'czech republic': 'Czechia',
  'guinea bissau': 'Guinea-Bissau',
  'são tomé and príncipe': 'Sao Tome and Principe'
};

export const updateGeoschemeData = (customGeoscheme, customAliases) => {
  // Clear existing items keeping references
  Object.keys(countryToRegionMap).forEach(key => delete countryToRegionMap[key]);
  Object.keys(countryAliases).forEach(key => delete countryAliases[key]);
  allCountries.length = 0;
  allRegions.length = 0;
  allContinents.length = 0;

  if (customAliases) {
    Object.assign(countryAliases, customAliases);
  }

  if (customGeoscheme) {
    Object.entries(customGeoscheme).forEach(([continentCode, regions]) => {
      regions.forEach(regionObj => {
        Object.entries(regionObj).forEach(([regionName, countries]) => {
          countries.forEach(country => {
            let continent = regionName === 'Central America' ? 'Central America' : continentMap[continentCode];
            if (country.toLowerCase() === 'mexico') {
              continent = 'North America';
            }
            countryToRegionMap[country.toLowerCase()] = {
              region: regionName,
              continent: continent
            };
            if (!allCountries.includes(country)) {
              allCountries.push(country);
            }
            if (!allRegions.includes(regionName)) {
              allRegions.push(regionName);
            }
          });
        });
      });
      const continentName = continentMap[continentCode] || continentCode;
      if (!allContinents.includes(continentName)) {
        allContinents.push(continentName);
      }
    });

    if (!allContinents.includes('Central America')) {
      allContinents.push('Central America');
    }

    allCountries.sort();
    allRegions.sort();
    allContinents.sort();
  }
};

// Initialize default mapping dynamically
updateGeoschemeData(geoscheme, defaultAliases);


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
  'chinese': 'Mandarin',
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
  if (!lang) return '';
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
  if (!info && name.length >= 3) {
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
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
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
    desc: headers.indexOf('description'),
    tags: headers.indexOf('tags'),
    category: headers.indexOf('category')
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
        originalLanguage: mapping.lang !== -1 ? translateLanguageToEnglish(row[mapping.lang]) : '',
        pages: mapping.pages !== -1 && row[mapping.pages] ? parseInt(row[mapping.pages], 10) || '' : '',
        description: mapping.desc !== -1 ? row[mapping.desc]?.trim() || '' : '',
        tags: mapping.tags !== -1 && row[mapping.tags] ? row[mapping.tags].split(';').map(t => t.trim()).filter(Boolean) : [],
        category: mapping.category !== -1 && row[mapping.category] ? row[mapping.category].trim() : ''
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

    // Garantir que tags seja um array de strings
    if (b.tags === undefined || !Array.isArray(b.tags)) {
      updated.tags = [];
      isUpdated = true;
    }
    
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
    

    
    if (b.country === 'French Canada') {
      updated.country = 'Canada';
      isUpdated = true;
    }

    if (b.country === 'Czech Republic') {
      updated.country = 'Czechia';
      isUpdated = true;
    }

    if (b.country === 'Brasil') {
      updated.country = 'Brazil';
      isUpdated = true;
    }

    const trimmedCountry = (b.country || '').trim().toLowerCase();
    if (trimmedCountry === 'united states' || trimmedCountry === 'united states of america') {
      updated.country = 'USA';
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
      if (b.originalLanguage === undefined || b.originalLanguage === '' || b.originalLanguage === 'English') {
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
        updated.originalLanguage = '';
        isUpdated = true;
      }
      if (b.pages === undefined) {
        updated.pages = '';
        isUpdated = true;
      }
      if (b.description === undefined) {
        updated.description = `A book from ${b.country || 'world literature'}.`;
        isUpdated = true;
      }
    }

    if (updated.category === undefined) {
      updated.category = '';
      isUpdated = true;
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
 * Ordena uma lista de livros com base em uma coluna e direção.
 * Suporta ordenação numérica e de string, lidando com valores nulos.
 */
export const sortBooks = (books, sortColumn, sortDirection) => {
  if (!sortColumn) return books;
  
  const isEmptyValue = (val) => {
    if (val === null || val === undefined) return true;
    const str = String(val).trim();
    if (str === '' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'nan') return true;
    if (sortColumn === 'pages' && isNaN(Number(str))) return true;
    return false;
  };

  return [...books].sort((a, b) => {
    let aVal = a[sortColumn];
    let bVal = b[sortColumn];
    
    const isEmptyA = isEmptyValue(aVal);
    const isEmptyB = isEmptyValue(bVal);
    
    if (isEmptyA && isEmptyB) return 0;
    if (isEmptyA) return sortDirection === 'asc' ? 1 : -1;
    if (isEmptyB) return sortDirection === 'asc' ? -1 : 1;

    // Try parsing as numbers if both are numeric
    const numA = Number(aVal);
    const numB = Number(bVal);
    const isNumA = !isNaN(numA) && String(aVal).trim() !== '';
    const isNumB = !isNaN(numB) && String(bVal).trim() !== '';

    if (isNumA && isNumB) {
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    }

    // Default string-based sorting
    const strA = String(aVal).toLowerCase().trim();
    const strB = String(bVal).toLowerCase().trim();
    
    if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
    if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Formata e ordena uma lista de livros para exportação em Markdown.
 * Ordena por ano de forma crescente.
 * Formato por linha: - **Título** by Autor (País, Ano)
 */
export const formatMDExport = (books) => {
  const sorted = [...books].sort((a, b) => {
    const yearA = parseInt(a.year, 10) || 0;
    const yearB = parseInt(b.year, 10) || 0;
    return yearA - yearB;
  });
  return sorted
    .map(b => {
      const extra = [];
      if (b.pages) extra.push(`${b.pages} p`);
      if (b.originalLanguage) extra.push(b.originalLanguage);
      const extraStr = extra.length > 0 ? ` ${extra.join(', ')}` : '';
      return `- ${b.title} by ${b.author} (${b.country}, ${b.year})${extraStr}`;
    })
    .join('\n');
};

/**
 * Analisa o formato de texto em lote fornecido pelo usuário.
 * Formato: Title by Author (Year, Country), Pages p., Language
 */
export const parseBatchText = (text) => {
  if (!text) return [];
  
  const lines = text.split('\n').filter(line => line.trim() !== '');
  const books = [];
  const regex = /^(.+?)\s+by\s+(.+?)\s+\((\d{4}),\s+(.+?)\),\s+(\d+)\s*[pP]\.?,\s+(.+)$/;

  lines.forEach(line => {
    const match = line.trim().match(regex);
    if (match) {
      const [, title, author, year, country, pages, language] = match;
      const geo = getGeoInfo(country);
      books.push({
        title: title.trim(),
        author: normalizeToASCII(author.trim()),
        year: year.trim(),
        country: country.trim(),
        region: geo.region,
        continent: geo.continent,
        pages: parseInt(pages, 10),
        category: '',
        originalLanguage: translateLanguageToEnglish(language.trim()),
        read: false,
        description: `A book from ${country.trim()}.`,
        tags: []
      });
    }
  });

  return books;
};

// Listas para Autocomplete (now populated dynamically inside updateGeoschemeData)

const countryToCode = {
  'afghanistan': 'AF',
  'albania': 'AL',
  'algeria': 'DZ',
  'angola': 'AO',
  'antigua': 'AG',
  'antigua and barbuda': 'AG',
  'argentina': 'AR',
  'armenia': 'AM',
  'australia': 'AU',
  'austria': 'AT',
  'azerbaijan': 'AZ',
  'bangladesh': 'BD',
  'barbados': 'BB',
  'belarus': 'BY',
  'belgium': 'BE',
  'benin': 'BJ',
  'bolivia': 'BO',
  'bolivia (plurinational state of)': 'BO',
  'bosnia': 'BA',
  'bosnia and herzegovina': 'BA',
  'botswana': 'BW',
  'brazil': 'BR',
  'brasil': 'BR',
  'bulgaria': 'BG',
  'burkina faso': 'BF',
  'burma': 'MM',
  'burundi': 'BI',
  'cambodia': 'KH',
  'cameroon': 'CM',
  'canada': 'CA',
  'cape verde': 'CV',
  'cabo verde': 'CV',
  'chile': 'CL',
  'china': 'CN',
  'china, hong kong special administrative region': 'HK',
  'china, macao special administrative region': 'MO',
  'hong kong': 'HK',
  'macao': 'MO',
  'colombia': 'CO',
  'comoros': 'KM',
  'congo': 'CG',
  'congo drc': 'CD',
  'congo-brazzaville': 'CG',
  'democratic republic of the congo': 'CD',
  'costa rica': 'CR',
  'croatia': 'HR',
  'cuba': 'CU',
  'curacao': 'CW',
  'curaçao': 'CW',
  'cyprus': 'CY',
  'chad': 'TD',
  'czech republic': 'CZ',
  'czechia': 'CZ',
  'denmark': 'DK',
  'djibouti': 'DJ',
  'dominica': 'DM',
  'dominican republic': 'DO',
  'ecuador': 'EC',
  'egypt': 'EG',
  'el salvador': 'SV',
  'equatorial guinea': 'GQ',
  'eritrea': 'ER',
  'estonia': 'EE',
  'ethiopia': 'ET',
  'faroe islands': 'FO',
  'faeroe islands': 'FO',
  'fiji': 'FJ',
  'finland': 'FI',
  'france': 'FR',
  'french guyana': 'GF',
  'french guiana': 'GF',
  'french polynesia': 'PF',
  'gambia': 'GM',
  'gabon': 'GA',
  'central african republic': 'CF',
  'georgia': 'GE',
  'germany': 'DE',
  'ghana': 'GH',
  'greece': 'GR',
  'greenland': 'GL',
  'grenada': 'GD',
  'guadeloupe': 'GP',
  'guatemala': 'GT',
  'guernsey': 'GG',
  'guinea': 'GN',
  'guinea bissau': 'GW',
  'guinea-bissau': 'GW',
  'guyana': 'GY',
  'haiti': 'HT',
  'honduras': 'HN',
  'hungary': 'HU',
  'iceland': 'IS',
  'india': 'IN',
  'indonesia': 'ID',
  'iran': 'IR',
  'iran (islamic republic of)': 'IR',
  'iraq': 'IQ',
  'ireland': 'IE',
  'israel': 'IL',
  'italy': 'IT',
  'ivory coast': 'CI',
  'kuwait': 'KW',
  'liberia': 'LR',
  "cote d'ivoire": 'CI',
  "côte d'ivoire": 'CI',
  'jamaica': 'JM',
  'japan': 'JP',
  'jordan': 'JO',
  'kazakhstan': 'KZ',
  'kenya': 'KE',
  'korea': 'KR',
  'republic of korea': 'KR',
  "democratic people's republic of korea": 'KP',
  'north korea': 'KP',
  'south korea': 'KR',
  'kyrgyzstan': 'KG',
  'latvia': 'LV',
  'lebanon': 'LB',
  'lesotho': 'LS',
  'libya': 'LY',
  'lithuania': 'LT',
  'madagascar': 'MG',
  'malaysia': 'MY',
  'mali': 'ML',
  'malta': 'MT',
  'malawi': 'MW',
  'mauritania': 'MR',
  'marshall islands': 'MH',
  'martinique': 'MQ',
  'mauritius': 'MU',
  'mexico': 'MX',
  'moldova': 'MD',
  'republic of moldova': 'MD',
  'mongolia': 'MN',
  'montenegro': 'ME',
  'morocco': 'MA',
  'mozambique': 'MZ',
  'namibia': 'NA',
  'nepal': 'NP',
  'netherlands': 'NL',
  'new caledonia': 'NC',
  'new zealand': 'NZ',
  'nicaragua': 'NI',
  'niger': 'NE',
  'nigeria': 'NG',
  'norway': 'NO',
  'oman': 'OM',
  'pakistan': 'PK',
  'palestine': 'PS',
  'state of palestine': 'PS',
  'panama': 'PA',
  'papua new guinea': 'PG',
  'paraguay': 'PY',
  'peru': 'PE',
  'philippines': 'PH',
  'poland': 'PL',
  'portugal': 'PT',
  'puerto rico': 'PR',
  'qatar': 'QA',
  'reunion': 'RE',
  'réunion': 'RE',
  'romania': 'RO',
  'russia': 'RU',
  'russian federation': 'RU',
  'rwanda': 'RW',
  'samoa': 'WS',
  'saint kitts and nevis': 'KN',
  'saint lucia': 'LC',
  'sao tome and principe': 'ST',
  'são tomé and príncipe': 'ST',
  'saudi arabia': 'SA',
  'senegal': 'SN',
  'serbia': 'RS',
  'sierra leone': 'SL',
  'singapore': 'SG',
  'slovakia': 'SK',
  'slovenia': 'SI',
  'somalia': 'SO',
  'south africa': 'ZA',
  'south sudan': 'SS',
  'spain': 'ES',
  'sri lanka': 'LK',
  'sudan': 'SD',
  'suriname': 'SR',
  'sweden': 'SE',
  'switzerland': 'CH',
  'syria': 'SY',
  'syrian arab republic': 'SY',
  'tahiti': 'PF',
  'taiwan': 'TW',
  'tajikistan': 'TJ',
  'tanzania': 'TZ',
  'united republic of tanzania': 'TZ',
  'thailand': 'TH',
  'the former yugoslav republic of macedonia': 'MK',
  'macedonia': 'MK',
  'north macedonia': 'MK',
  'timor-leste': 'TL',
  'belize': 'BZ',
  'bhutan': 'BT',
  'togo': 'TG',
  'tonga': 'TO',
  'trinidad': 'TT',
  'trinidad and tobago': 'TT',
  'tunisia': 'TN',
  'turkey': 'TR',
  'united arab emirates': 'AE',
  'usa': 'US',
  'united states': 'US',
  'united states of america': 'US',
  'united kingdom': 'GB',
  'united kingdom of great britain and northern ireland': 'GB',
  'uk': 'GB',
  'uganda': 'UG',
  'ukraine': 'UA',
  'uruguay': 'UY',
  'uzbekistan': 'UZ',
  'venezuela': 'VE',
  'venezuela (bolivarian republic of)': 'VE',
  'vietnam': 'VN',
  'viet nam': 'VN',
  'yemen': 'YE',
  'zambia': 'ZM',
  'zimbabwe': 'ZW'
};

const specialFlags = {
  'england': 'gb-eng',
  'scotland': 'gb-sct',
  'wales': 'gb-wls',
  'northern ireland': 'gb-nir'
};

export const getCountryCode = (countryName) => {
  if (!countryName) return '';
  const cleanName = countryName.toLowerCase().trim();
  if (specialFlags[cleanName]) return specialFlags[cleanName];
  const normalizedName = (countryAliases[cleanName] || cleanName).toLowerCase();
  if (specialFlags[normalizedName]) return specialFlags[normalizedName];
  return countryToCode[normalizedName] || '';
};

export const getCountryFlag = (countryName) => {
  if (!countryName) return '';
  const cleanName = countryName.toLowerCase().trim();
  
  // Custom flags or overrides (emojis fallback)
  const specialEmojis = {
    'england': '🏴\u{DB40}\u{DC67}\u{DB40}\u{DC62}\u{DB40}\u{DC65}\u{DB40}\u{DC6E}\u{DB40}\u{DC67}\u{DB40}\u{DC7F}',
    'scotland': '🏴\u{DB40}\u{DC67}\u{DB40}\u{DC62}\u{DB40}\u{DC73}\u{DB40}\u{DC63}\u{DB40}\u{DC74}\u{DB40}\u{DC7F}',
    'wales': '🏴\u{DB40}\u{DC67}\u{DB40}\u{DC62}\u{DB40}\u{DC77}\u{DB40}\u{DC6C}\u{DB40}\u{DC73}\u{DB40}\u{DC7F}',
    'northern ireland': '🇬🇧'
  };
  
  if (specialEmojis[cleanName]) {
    return specialEmojis[cleanName];
  }

  const normalizedName = (countryAliases[cleanName] || cleanName).toLowerCase();
  
  if (specialEmojis[normalizedName]) {
    return specialEmojis[normalizedName];
  }
  
  const code = countryToCode[normalizedName];
  if (!code) return '';
  
  return code
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(char.charCodeAt(0) + 127397))
    .join('');
};