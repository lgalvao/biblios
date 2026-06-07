import { describe, it, expect } from 'vitest';
import { sortBooks, repairBooksList } from '../dataUtils';

describe('Regression Tests', () => {
  describe('sortBooks', () => {
    const mockBooks = [
      { id: 1, title: 'B', pages: 200, year: '1990' },
      { id: 2, title: 'a', pages: 50, year: '2010' },
      { id: 3, title: 'C', pages: 150, year: '1950' },
      { id: 4, title: null, pages: null, year: undefined }
    ];

    it('should sort strings case-insensitively (Title) and put empty at bottom', () => {
      const sorted = sortBooks(mockBooks, 'title', 'asc');
      expect(sorted[0].title).toBe('a');
      expect(sorted[1].title).toBe('B');
      expect(sorted[2].title).toBe('C');
      expect(sorted[3].title).toBe(null);
    });

    it('should sort numbers correctly (Pages) and put empty at bottom', () => {
      const sorted = sortBooks(mockBooks, 'pages', 'asc');
      expect(sorted[0].pages).toBe(50);
      expect(sorted[1].pages).toBe(150);
      expect(sorted[2].pages).toBe(200);
      expect(sorted[3].pages).toBe(null);
    });

    it('should handle numeric strings correctly (Year) and put empty at bottom', () => {
      const sorted = sortBooks(mockBooks, 'year', 'asc');
      expect(sorted[0].year).toBe('1950');
      expect(sorted[1].year).toBe('1990');
      expect(sorted[2].year).toBe('2010');
      expect(sorted[3].year).toBe(undefined);
    });

    it('should sort Pages descending and put empty at top', () => {
      const sorted = sortBooks(mockBooks, 'pages', 'desc');
      expect(sorted[0].pages).toBe(null);
      expect(sorted[1].pages).toBe(200);
      expect(sorted[2].pages).toBe(150);
      expect(sorted[3].pages).toBe(50);
    });

    it('should handle mixed page types (strings/numbers), whitespace, and NaN robustly', () => {
      const mixedBooks = [
        { id: 1, title: 'Book 1', pages: 300 },
        { id: 2, title: 'Book 2', pages: '50' }, // string number
        { id: 3, title: 'Book 3', pages: '   ' }, // empty spaces string
        { id: 4, title: 'Book 4', pages: 'NaN' }, // string NaN
        { id: 5, title: 'Book 5', pages: 150 },
        { id: 6, title: 'Book 6', pages: '' }    // empty string
      ];

      // Test ascending sort
      const sortedAsc = sortBooks(mixedBooks, 'pages', 'asc');
      // Numbers should be sorted numerically (50, 150, 300), empty-like values ('   ', 'NaN', '') should be at the bottom
      expect(sortedAsc[0].pages).toBe('50');
      expect(sortedAsc[1].pages).toBe(150);
      expect(sortedAsc[2].pages).toBe(300);
      
      const lastThree = sortedAsc.slice(3).map(b => String(b.pages).trim());
      expect(lastThree).toContain('');
      expect(lastThree).toContain('NaN');

      // Test descending sort
      const sortedDesc = sortBooks(mixedBooks, 'pages', 'desc');
      // Empty-like values ('   ', 'NaN', '') should be at the top, then numbers (300, 150, 50)
      const firstThree = sortedDesc.slice(0, 3).map(b => String(b.pages).trim());
      expect(firstThree).toContain('');
      expect(firstThree).toContain('NaN');
      
      expect(sortedDesc[3].pages).toBe(300);
      expect(sortedDesc[4].pages).toBe(150);
      expect(sortedDesc[5].pages).toBe('50');
    });

    it('should not crash with null values', () => {
      expect(() => sortBooks(mockBooks, 'title', 'asc')).not.toThrow();
      expect(() => sortBooks(mockBooks, 'pages', 'asc')).not.toThrow();
    });
  });

  describe('repairBooksList - Country Normalization', () => {
    it('should normalize "Brasil" to "Brazil"', () => {
      const books = [
        { title: 'O Alienista', author: 'Machado de Assis', country: 'Brasil' }
      ];
      const reference = [
        { title: 'O Alienista', author: 'Machado de Assis', country: 'Brazil', pages: '100', originalLanguage: 'Portuguese' }
      ];
      
      const { repaired } = repairBooksList(books, reference);
      expect(repaired[0].country).toBe('Brazil');
    });

    it('should normalize "Czech Republic" to "Czechia"', () => {
      const books = [{ title: 'The Trial', author: 'Franz Kafka', country: 'Czech Republic' }];
      const { repaired } = repairBooksList(books, []);
      expect(repaired[0].country).toBe('Czechia');
    });

    it('should normalize "United States" and "United States of America" to "USA"', () => {
      const books = [
        { title: 'Book A', author: 'Author A', country: 'United States' },
        { title: 'Book B', author: 'Author B', country: 'United States of America' }
      ];
      const { repaired } = repairBooksList(books, []);
      expect(repaired[0].country).toBe('USA');
      expect(repaired[1].country).toBe('USA');
    });

    it('should normalize "Chinese" to "Mandarin"', () => {
      const books = [
        { title: 'Book C', author: 'Author C', originalLanguage: 'Chinese' }
      ];
      const { repaired } = repairBooksList(books, []);
      expect(repaired[0].originalLanguage).toBe('Mandarin');
    });
  });
});
