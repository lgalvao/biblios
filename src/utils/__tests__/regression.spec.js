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
  });
});
