import { describe, it, expect } from 'vitest';
import { 
  escapeCSVField, 
  parseCSVText, 
  repairBooksList,
  mapCsvToBooks 
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
      expect(repaired[0].continent).toBe('North America');
      expect(repaired[0].region).toBe('Central America');
      expect(repaired[1].continent).toBe('North America');
      expect(repaired[1].region).toBe('Central America');
    });

    it('should fix country for French Canada', () => {
      const books = [{ title: 'Book Canada', author: 'D', country: 'French Canada' }];
      const { repaired } = repairBooksList(books, []);
      expect(repaired[0].country).toBe('Canada');
    });

    it('should sync with reference data', () => {
      const books = [{ title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', year: '1950' }];
      const { repaired, needsRepair } = repairBooksList(books, mockReference);
      expect(repaired[0].year).toBe('1925');
      expect(repaired[0].pages).toBe(180);
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

});