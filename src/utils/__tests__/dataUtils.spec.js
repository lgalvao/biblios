import { describe, it, expect } from 'vitest';
import { 
  escapeCSVField, 
  parseCSVText, 
  repairBooksList,
  mapCsvToBooks,
  formatMDExport,
  normalizeForSearch,
  allCountries,
  allRegions,
  allContinents,
  getGeoInfo,
  getCountryFlag
} from '../dataUtils';


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

    it('should sync with reference data', () => {
      const books = [{ title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', year: '1950' }];
      const { repaired, needsRepair } = repairBooksList(books, mockReference);
      expect(repaired[0].year).toBe('1925');
      expect(repaired[0].pages).toBe(180);
      expect(needsRepair).toBe(true);
    });

    it('should translate originalLanguage to English', () => {
      const books = [{ title: 'Dom Casmurro', author: 'Machado de Assis', originalLanguage: 'portugues', country: 'Brazil' }];
      const { repaired, needsRepair } = repairBooksList(books, []);
      expect(repaired[0].originalLanguage).toBe('Portuguese');
      expect(needsRepair).toBe(true);
    });

    it('should normalize author name to ASCII', () => {
      const books = [{ title: 'Sanatorium Under the Sign of the Hourglass', author: 'Bruno Schulz (Ł)', originalLanguage: 'English', country: 'Poland' }];
      const { repaired, needsRepair } = repairBooksList(books, []);
      expect(repaired[0].author).toBe('Bruno Schulz (L)');
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
  });

  describe('formatMDExport', () => {
    it('should format books as markdown list items without bold titles', () => {
      const books = [
        { title: 'The Hobbit', author: 'J.R.R. Tolkien', country: 'United Kingdom', year: '1937' }
      ];
      const result = formatMDExport(books);
      expect(result).toBe('- The Hobbit by J.R.R. Tolkien (United Kingdom, 1937)');
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
      expect(allCountries).toContain('United States of America');
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
      // 'usa' maps to 'United States of America'
      expect(getGeoInfo('usa')).toEqual({ region: 'Northern America', continent: 'North America' });
      // 'england' maps to 'United Kingdom of Great Britain and Northern Ireland'
      expect(getGeoInfo('england')).toEqual({ region: 'Northern Europe', continent: 'Europe' });
    });

    it('should return correct information with partial matches', () => {
      expect(getGeoInfo('United States')).toEqual({ region: 'Northern America', continent: 'North America' });
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

});