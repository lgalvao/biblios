import { describe, it, expect } from 'vitest';
import { 
  escapeCSVField, 
  parseCSVText, 
  repairBooksList,
  mapCsvToBooks,
  sortBooks,
  formatMDExport,
  parseBatchText,
  normalizeForSearch,
  allCountries,
  allRegions,
  allContinents,
  getGeoInfo,
  getCountryCode,
  getCountryFlag,
  updateGeoschemeData
} from '../dataUtils';
import originalGeoscheme from '../../../un-geoscheme-subregions-countries.json';


describe('Data Utilities', () => {
  
  describe('escapeCSVField', () => {
    it('should escape fields with commas', () => {
      expect(escapeCSVField('Hello, World')).toBe('"Hello, World"');
    });

    it('should escape fields with quotes', () => {
      expect(escapeCSVField('He said "Hello"')).toBe('"He said ""Hello"""');
    });

    it('should return empty string for null or undefined', () => {
      expect(escapeCSVField(null)).toBe('');
      expect(escapeCSVField(undefined)).toBe('');
    });

    it('should return the same string if no special characters', () => {
      expect(escapeCSVField('NormalText')).toBe('NormalText');
    });
  });

  describe('parseCSVText', () => {
    it('should parse simple CSV', () => {
      const csv = 'Title,Author\nBook1,Author1\nBook2,Author2';
      const rows = parseCSVText(csv);
      expect(rows).toHaveLength(3);
      expect(rows[0]).toEqual(['Title', 'Author']);
      expect(rows[1]).toEqual(['Book1', 'Author1']);
    });

    it('should handle Windows style line endings \r\n', () => {
      const csv = 'Title,Author\r\nBook1,Author1\r\nBook2,Author2';
      const rows = parseCSVText(csv);
      expect(rows).toHaveLength(3);
      expect(rows[1]).toEqual(['Book1', 'Author1']);
    });

    it('should handle quoted fields with commas', () => {
      const csv = 'Title,Author\n"Book, One",Author1';
      const rows = parseCSVText(csv);
      expect(rows[1][0]).toBe('Book, One');
    });

    it('should handle escaped quotes', () => {
      const csv = 'Title,Author\n"Book ""Name""",Author1';
      const rows = parseCSVText(csv);
      expect(rows[1][0]).toBe('Book "Name"');
    });
  });

  describe('repairBooksList', () => {
    const mockReference = [
      { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', pages: 180, originalLanguage: 'English', description: 'Classic', year: '1925' }
    ];

    it('should fix continent for Ireland', () => {
      const books = [{ title: 'Ulysses', author: 'James Joyce', continent: 'Ireland', country: 'Ireland' }];
      const { repaired } = repairBooksList(books, []);
      expect(repaired[0].continent).toBe('Europe');
    });

    it('should fix continent for India and Japan', () => {
      const books = [
        { title: 'Book India', author: 'A', continent: 'India', country: 'India' },
        { title: 'Book Japan', author: 'B', continent: 'Japan', country: 'Japan' }
      ];
      const { repaired } = repairBooksList(books, []);
      expect(repaired[0].continent).toBe('Asia');
      expect(repaired[1].continent).toBe('Asia');
    });

    it('should fix continent for Central American countries', () => {
      const books = [
        { title: 'Popol Vuh', author: 'Anonymous', continent: 'South America', country: 'Guatemala' },
        { title: 'Book Nicaragua', author: 'C', continent: 'North America', country: 'Nicaragua' }
      ];
      const { repaired } = repairBooksList(books, []);
      expect(repaired[0].continent).toBe('Central America');
      expect(repaired[0].region).toBe('Central America');
      expect(repaired[1].continent).toBe('Central America');
      expect(repaired[1].region).toBe('Central America');
    });

    it('should fix country for French Canada', () => {
      const books = [{ title: 'Book Canada', author: 'D', country: 'French Canada' }];
      const { repaired } = repairBooksList(books, []);
      expect(repaired[0].country).toBe('Canada');
    });

    it('should fix country for Czech Republic', () => {
      const books = [{ title: 'Book Czech', author: 'E', country: 'Czech Republic' }];
      const { repaired } = repairBooksList(books, []);
      expect(repaired[0].country).toBe('Czechia');
    });

    it('should fix country for Brasil, United States, and United States of America', () => {
      const books = [
        { title: 'Book 1', author: 'A', country: 'Brasil' },
        { title: 'Book 2', author: 'B', country: 'united states' },
        { title: 'Book 3', author: 'C', country: 'United States of America' }
      ];
      const { repaired } = repairBooksList(books, []);
      expect(repaired[0].country).toBe('Brazil');
      expect(repaired[1].country).toBe('USA');
      expect(repaired[2].country).toBe('USA');
    });

    it('should sync with reference data', () => {
      const books = [
        { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', year: '1950' },
        { title: 'Book X', author: 'Author X' }
      ];
      const { repaired, needsRepair } = repairBooksList(books, mockReference);
      expect(repaired[0].year).toBe('1925');
      expect(repaired[0].pages).toBe(180);
      expect(repaired[1].description).toBe('A book from world literature.');
      expect(needsRepair).toBe(true);
    });

    it('should translate originalLanguage to English', () => {
      const books = [{ title: 'Dom Casmurro', author: 'Machado de Assis', originalLanguage: 'portugues', country: 'Brazil' }];
      const { repaired, needsRepair } = repairBooksList(books, []);
      expect(repaired[0].originalLanguage).toBe('Portuguese');
      expect(needsRepair).toBe(true);
    });

    it('should handle unknown languages gracefully', () => {
      const books = [{ title: 'Unknown Lang', author: 'A', originalLanguage: 'Unknown' }];
      const { repaired } = repairBooksList(books, []);
      expect(repaired[0].originalLanguage).toBe('Unknown');
    });

    it('should normalize author name to ASCII', () => {
      const books = [{ title: 'Special Chars', author: 'ø Ø ı İ Ł ł', originalLanguage: 'English', country: 'Poland' }];
      const { repaired, needsRepair } = repairBooksList(books, []);
      expect(repaired[0].author).toBe('o O i I L l');
      expect(needsRepair).toBe(true);
    });

    it('should initialize missing tags field as empty array', () => {
      const books = [{ title: 'No Tags Book', author: 'Author Name' }];
      const { repaired } = repairBooksList(books, []);
      expect(repaired[0].tags).toEqual([]);
    });

    it('should repair empty description and year 1950 from fresh source', () => {
      const mockRef = [
        { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', description: 'New Description', year: '1925' }
      ];
      const books = [
        { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', description: '', year: '1950' }
      ];
      const { repaired, needsRepair } = repairBooksList(books, mockRef);
      expect(repaired[0].description).toBe('New Description');
      expect(repaired[0].year).toBe('1925');
      expect(needsRepair).toBe(true);
    });

    it('should set default description if missing and no reference found', () => {
      const books = [{ title: 'Unknown Book', author: 'Unknown Author', country: 'Brazil' }];
      // remove description completely
      delete books[0].description;
      const { repaired, needsRepair } = repairBooksList(books, []);
      expect(repaired[0].description).toBe('A book from Brazil.');
      expect(needsRepair).toBe(true);
    });

    it('should set default description with world literature if missing, no reference, and no country', () => {
      const books = [{ title: 'Unknown Book', author: 'Unknown Author', country: '' }];
      delete books[0].description;
      const { repaired, needsRepair } = repairBooksList(books, []);
      expect(repaired[0].description).toBe('A book from world literature.');
      expect(needsRepair).toBe(true);
    });
  });

  describe('mapCsvToBooks', () => {
    it('should map valid CSV rows to book objects', () => {
      const rows = [
        ['Title', 'Author', 'Year', 'Country', 'Continent', 'Read', 'OriginalLanguage', 'Pages', 'Description'],
        ['1984', 'George Orwell', '1949', 'England', 'Europe', '1', 'English', '328', 'Dystopian']
      ];
      const books = mapCsvToBooks(rows);
      expect(books).toHaveLength(1);
      expect(books[0]).toMatchObject({
        title: '1984',
        author: 'George Orwell',
        read: true,
        pages: 328
      });
    });

    it('should handle read column with true string', () => {
      const rows = [
        ['Title', 'Author', 'Read'],
        ['1984', 'George Orwell', 'true']
      ];
      const books = mapCsvToBooks(rows);
      expect(books[0].read).toBe(true);
    });

    it('should skip rows without title or author', () => {
      const rows = [
        ['Title', 'Author'],
        ['', 'Author Only'],
        ['Title Only', ''],
        ['Valid', 'Author']
      ];
      const books = mapCsvToBooks(rows);
      expect(books).toHaveLength(1);
      expect(books[0].title).toBe('Valid');
    });

    it('should parse semicolon-separated tags if present', () => {
      const rows = [
        ['Title', 'Author', 'Tags'],
        ['1984', 'George Orwell', 'classic;dystopian;political']
      ];
      const books = mapCsvToBooks(rows);
      expect(books).toHaveLength(1);
      expect(books[0].tags).toEqual(['classic', 'dystopian', 'political']);
    });

    it('should return empty array if less than 2 rows', () => {
      expect(mapCsvToBooks([])).toEqual([]);
      expect(mapCsvToBooks([['Header']])).toEqual([]);
    });
  });

  describe('sortBooks', () => {
    const books = [
      { title: 'C', year: '1900', pages: 100 },
      { title: 'A', year: '2000', pages: 50 },
      { title: 'B', year: '1950', pages: 200 },
      { title: 'Empty', year: '', pages: '' },
      { title: 'Null', year: null, pages: null },
      { title: 'NaN', year: 'NaN', pages: 'abc' }
    ];

    it('should return books as is if no sortColumn', () => {
      expect(sortBooks(books, null, 'asc')).toEqual(books);
    });

    it('should sort by title asc', () => {
      const sorted = sortBooks(books, 'title', 'asc');
      expect(sorted[0].title).toBe('A');
      expect(sorted[1].title).toBe('B');
      expect(sorted[2].title).toBe('C');
    });

    it('should sort by title desc', () => {
      const sorted = sortBooks(books, 'title', 'desc');
      expect(sorted[0].title).toBe('Null'); // N comes after E
      expect(sorted[1].title).toBe('NaN');
      expect(sorted[2].title).toBe('Empty');
      // String comparison: Null, NaN, Empty, C, B, A
    });

    it('should sort by year asc and handle empty values', () => {
      const sorted = sortBooks(books, 'year', 'asc');
      // Numeric: 1900, 1950, 2000
      // Empty: '', null, 'NaN' at the end
      expect(sorted[0].year).toBe('1900');
      expect(sorted[1].year).toBe('1950');
      expect(sorted[2].year).toBe('2000');
      expect(sorted[3].title).toBe('Empty');
    });

    it('should sort by year desc and handle empty values', () => {
      const sorted = sortBooks(books, 'year', 'desc');
      // Current implementation puts empty values at the beginning for descending
      expect(sorted[0].title).toBe('Empty');
      expect(sorted[1].title).toBe('Null');
      expect(sorted[2].title).toBe('NaN');
      expect(sorted[3].year).toBe('2000');
      expect(sorted[4].year).toBe('1950');
      expect(sorted[5].year).toBe('1900');
    });

    it('should handle numeric sort for pages', () => {
      const sorted = sortBooks(books, 'pages', 'asc');
      expect(sorted[0].pages).toBe(50);
      expect(sorted[1].pages).toBe(100);
      expect(sorted[2].pages).toBe(200);
    });

    it('should handle mixed numeric and string values in sort', () => {
      const mixedBooks = [
        { title: 'Num 10', year: '10' },
        { title: 'Alpha', year: 'abc' },
        { title: 'Num 2', year: '2' }
      ];
      const sorted = sortBooks(mixedBooks, 'year', 'asc');
      // '10' and '2' are both numeric, so they compare as numbers: 2 < 10
      // 'abc' is string, so compared with numbers it follows alphabetical order if fallback
      // Current implementation: if both are numbers, numeric compare. 
      // So 2, 10, then 'abc'
      expect(sorted[0].year).toBe('2');
      expect(sorted[1].year).toBe('10');
      expect(sorted[2].year).toBe('abc');
    });

    it('should handle sorting pages with NaN values as empty', () => {
      const pageBooks = [
        { title: 'Valid', pages: 100 },
        { title: 'Invalid', pages: 'not a number' }
      ];
      const sorted = sortBooks(pageBooks, 'pages', 'asc');
      expect(sorted[0].title).toBe('Valid');
      expect(sorted[1].title).toBe('Invalid');
    });
  });

  describe('getGeoInfo', () => {
    it('should return info for an alias', () => {
      const info = getGeoInfo('brasil');
      expect(info.region).toBe('South America');
      expect(info.continent).toBe('South America');
    });

    it('should return empty info for unknown country', () => {
      const info = getGeoInfo('UnknownLand');
      expect(info.region).toBe('');
      expect(info.continent).toBe('');
    });
  });

  describe('getCountryCode', () => {
    it('should return correct country code for standard countries', () => {
      expect(getCountryCode('Brazil')).toBe('BR');
      expect(getCountryCode('France')).toBe('FR');
      expect(getCountryCode('USA')).toBe('US');
    });

    it('should handle special flags for UK regions', () => {
      expect(getCountryCode('England')).toBe('gb-eng');
      expect(getCountryCode('Scotland')).toBe('gb-sct');
      expect(getCountryCode('Wales')).toBe('gb-wls');
      expect(getCountryCode('Northern Ireland')).toBe('gb-nir');
    });

    it('should return empty string for unknown countries or empty values', () => {
      expect(getCountryCode(null)).toBe('');
      expect(getCountryCode('')).toBe('');
      expect(getCountryCode('Atlantis')).toBe('');
    });
  });

  describe('getCountryFlag', () => {
    it('should return empty string for unknown country', () => {
      expect(getCountryFlag('UnknownLand')).toBe('');
    });

    it('should return emoji for known country', () => {
      expect(getCountryFlag('Brazil')).toBe('🇧🇷');
    });
  });

  describe('formatMDExport', () => {
    it('should format books as markdown list items without bold titles', () => {
      const books = [
        { title: 'The Hobbit', author: 'J.R.R. Tolkien', country: 'United Kingdom', year: '1937' }
      ];
      const result = formatMDExport(books);
      expect(result).toBe('- The Hobbit by J.R.R. Tolkien (United Kingdom, 1937)');
    });

    it('should include pages and original language in formatted output if present', () => {
      const books = [
        { title: 'The Immoralist', author: 'Andre Gide', country: 'France', year: '1902', pages: 400, originalLanguage: 'French' }
      ];
      const result = formatMDExport(books);
      expect(result).toBe('- The Immoralist by Andre Gide (France, 1902) 400 p, French');
    });

    it('should not include tags in the formatted output even if present', () => {
      const books = [
        { title: 'The Immoralist', author: 'Andre Gide', country: 'France', year: '1902', pages: 400, originalLanguage: 'French', tags: ['classic', 'existentialism'] }
      ];
      const result = formatMDExport(books);
      expect(result).toBe('- The Immoralist by Andre Gide (France, 1902) 400 p, French');
    });

    it('should sort books ascendingly by year', () => {
      const books = [
        { title: '1984', author: 'George Orwell', country: 'England', year: '1949' },
        { title: 'The Hobbit', author: 'J.R.R. Tolkien', country: 'United Kingdom', year: '1937' },
        { title: 'Hamlet', author: 'William Shakespeare', country: 'England', year: '1603' }
      ];
      const result = formatMDExport(books);
      const expected = [
        '- Hamlet by William Shakespeare (England, 1603)',
        '- The Hobbit by J.R.R. Tolkien (United Kingdom, 1937)',
        '- 1984 by George Orwell (England, 1949)'
      ].join('\n');
      expect(result).toBe(expected);
    });

    it('should handle missing or invalid years gracefully', () => {
      const books = [
        { title: 'Book A', author: 'Author A', country: 'Country A', year: '1950' },
        { title: 'Book B', author: 'Author B', country: 'Country B', year: '' },
        { title: 'Book C', author: 'Author C', country: 'Country C', year: '1800' }
      ];
      const result = formatMDExport(books);
      const expected = [
        '- Book B by Author B (Country B, )',
        '- Book C by Author C (Country C, 1800)',
        '- Book A by Author A (Country A, 1950)'
      ].join('\n');
      expect(result).toBe(expected);
    });
  });

  describe('parseBatchText', () => {
    it('should parse batch text format correctly', () => {
      const text = `The Crying of Lot 49 by Thomas Pynchon (1966, USA), 152 p., English
Farabeuf by Salvador Elizondo (1965, Mexico), 176 p., Spanish`;
      const result = parseBatchText(text);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        title: 'The Crying of Lot 49',
        author: 'Thomas Pynchon',
        year: '1966',
        country: 'USA',
        pages: 152,
        originalLanguage: 'English'
      });
      expect(result[1]).toMatchObject({
        title: 'Farabeuf',
        author: 'Salvador Elizondo',
        year: '1965',
        country: 'Mexico',
        pages: 176,
        originalLanguage: 'Spanish'
      });
    });

    it('should support flexible page formats (xxx p, xxxp, xxxp.)', () => {
      const text = `Book One by Author A (2000, USA), 150 p, English
Book Two by Author B (2001, Spain), 200p, Spanish
Book Three by Author C (2002, France), 250p., French`;
      const result = parseBatchText(text);
      expect(result).toHaveLength(3);
      expect(result[0].pages).toBe(150);
      expect(result[1].pages).toBe(200);
      expect(result[2].pages).toBe(250);
    });

    it('should return empty array for empty input', () => {
      expect(parseBatchText('')).toEqual([]);
      expect(parseBatchText(null)).toEqual([]);
    });
  });

  describe('normalizeForSearch', () => {
    it('should ignore accents and convert to lowercase', () => {
      expect(normalizeForSearch('São Paulo')).toBe('sao paulo');
      expect(normalizeForSearch('Brazil ')).toBe('brazil');
      expect(normalizeForSearch(' Café ')).toBe('cafe');
    });

    it('should handle empty or null values', () => {
      expect(normalizeForSearch('')).toBe('');
      expect(normalizeForSearch(null)).toBe('');
      expect(normalizeForSearch(undefined)).toBe('');
    });
  });

  describe('Autocomplete Lists', () => {
    it('should have a sorted list of countries containing Brazil', () => {
      expect(allCountries).toContain('Brazil');
      expect(allCountries).toContain('USA');
      expect(allCountries.length).toBeGreaterThan(150);
      expect(allCountries).toEqual([...allCountries].sort());
    });

    it('should have a sorted list of regions containing Eastern Europe', () => {
      expect(allRegions).toContain('Eastern Europe');
      expect(allRegions).toContain('South America');
      expect(allRegions.length).toBeGreaterThan(10);
      expect(allRegions).toEqual([...allRegions].sort());
    });

    it('should have a sorted list of continents containing South America and Central America', () => {
      expect(allContinents).toContain('South America');
      expect(allContinents).toContain('Central America');
      expect(allContinents).toContain('Europe');
      expect(allContinents).toEqual([...allContinents].sort());
    });
  });

  describe('getGeoInfo', () => {
    it('should return empty region and continent for empty or invalid country name', () => {
      expect(getGeoInfo(null)).toEqual({ region: '', continent: '' });
      expect(getGeoInfo(undefined)).toEqual({ region: '', continent: '' });
      expect(getGeoInfo('')).toEqual({ region: '', continent: '' });
      expect(getGeoInfo('UnknownCountryX')).toEqual({ region: '', continent: '' });
    });

    it('should return correct information for exact match country name', () => {
      expect(getGeoInfo('Brazil')).toEqual({ region: 'South America', continent: 'South America' });
      expect(getGeoInfo('France')).toEqual({ region: 'Western Europe', continent: 'Europe' });
    });

    it('should return correct information for country alias', () => {
      // 'usa' maps to 'USA' (or is the key itself now)
      expect(getGeoInfo('usa')).toEqual({ region: 'North America', continent: 'North America' });
      // 'england' maps to 'United Kingdom' (or similar)
      expect(getGeoInfo('england')).toEqual({ region: 'Western Europe', continent: 'Europe' });
    });

    it('should return correct information with partial matches', () => {
      // "USA" should be found even if we search for "USA" or similar. 
      // If the user cleaned it up, "United States" might not match "USA".
      // Let's test with a partial that should work, like "Canad" for "Canada"
      expect(getGeoInfo('Canad')).toEqual({ region: 'North America', continent: 'North America' });
    });
  });

  describe('getCountryFlag', () => {
    it('should return correct flag emoji for standard countries', () => {
      expect(getCountryFlag('Brazil')).toBe('🇧🇷');
      expect(getCountryFlag('France')).toBe('🇫🇷');
      expect(getCountryFlag('USA')).toBe('🇺🇸');
      expect(getCountryFlag('united states of america')).toBe('🇺🇸');
    });

    it('should handle custom flags for UK regions', () => {
      expect(getCountryFlag('England')).toBe('🏴󠁧󠁢󠁥󠁮󠁧󠁿');
      expect(getCountryFlag('Scotland')).toBe('🏴󠁧󠁢󠁳󠁣󠁴󠁿');
      expect(getCountryFlag('Wales')).toBe('🏴󠁧󠁢󠁷󠁬󠁳󠁿');
      expect(getCountryFlag('Northern Ireland')).toBe('🇬🇧');
    });

    it('should return empty string for unknown countries or empty values', () => {
      expect(getCountryFlag(null)).toBe('');
      expect(getCountryFlag('')).toBe('');
      expect(getCountryFlag('Atlantis')).toBe('');
    });
  });

  describe('updateGeoschemeData', () => {
    it('should dynamically update countries, regions, continents, and getGeoInfo mappings', () => {
      const customGeoscheme = {
        "EU": [
          {
            "Fictional Region": ["Fictional Land", "Second Fantasy Land"]
          }
        ]
      };
      const customAliases = {
        "fl": "Fictional Land"
      };

      updateGeoschemeData(customGeoscheme, customAliases);

      expect(allCountries).toContain('Fictional Land');
      expect(allCountries).toContain('Second Fantasy Land');
      expect(allCountries).not.toContain('Brazil'); // Cleared!
      expect(allRegions).toContain('Fictional Region');
      expect(allContinents).toContain('Europe');

      expect(getGeoInfo('Fictional Land')).toEqual({ region: 'Fictional Region', continent: 'Europe' });
      expect(getGeoInfo('fl')).toEqual({ region: 'Fictional Region', continent: 'Europe' });
      expect(getGeoInfo('Brazil')).toEqual({ region: '', continent: '' });

      // Restore original state
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
        'guinea bissau': 'Guinea-Bissau'
      };
      updateGeoschemeData(originalGeoscheme, defaultAliases);
    });
  });

});