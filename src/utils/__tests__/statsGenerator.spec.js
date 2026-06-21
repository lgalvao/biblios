import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateStats, generateStatsMarkdown, exportStatsPDF } from '../statsGenerator';

// Mock jsPDF library
vi.mock('jspdf', () => {
  const mockDoc = {
    internal: {
      pageSize: {
        getWidth: vi.fn(() => 210),
        getHeight: vi.fn(() => 297)
      }
    },
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    addPage: vi.fn(),
    save: vi.fn()
  };
  return {
    jsPDF: vi.fn(function() {
      return mockDoc;
    })
  };
});

describe('statsGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const testBooks = [
    {
      title: 'Dom Casmurro',
      author: 'Machado de Assis',
      year: '1899',
      pages: 256,
      originalLanguage: 'Portuguese',
      read: true,
      country: 'Brazil',
      continent: 'South America'
    },
    {
      title: 'Memórias Póstumas de Brás Cubas',
      author: 'Machado de Assis',
      year: '1881',
      pages: 224,
      originalLanguage: 'Portuguese',
      read: true,
      country: 'Brazil',
      continent: 'South America'
    },
    {
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      year: '1925',
      pages: 180,
      originalLanguage: 'English',
      read: false,
      country: 'USA',
      continent: 'North America'
    },
    {
      title: 'Don Quixote',
      author: 'Miguel de Cervantes',
      year: '1605',
      pages: 863,
      originalLanguage: 'Spanish',
      read: true,
      country: 'Spain',
      continent: 'Europe'
    },
    {
      title: 'Hamlet',
      author: 'William Shakespeare',
      year: 'c. 1603',
      pages: 150,
      originalLanguage: 'English',
      read: false,
      country: 'UK',
      continent: 'Europe'
    },
    {
      title: 'Book without year',
      author: 'Unknown Author',
      year: '',
      pages: 100,
      originalLanguage: 'English',
      country: 'UK',
      continent: 'Europe'
    },
    {
      title: 'Snow',
      author: 'Orhan Pamuk',
      year: '2002',
      pages: 463,
      originalLanguage: 'Turkish',
      read: false,
      country: 'Turkey',
      continent: 'Asia'
    },
    {
      title: 'The Tree of Man',
      author: 'Patrick White',
      year: '1955',
      pages: 480,
      originalLanguage: 'English',
      read: false,
      country: 'Australia',
      continent: 'Oceania'
    }
  ];

  describe('calculateStats', () => {
    it('should calculate total books correctly', () => {
      const stats = calculateStats(testBooks);
      expect(stats.totalBooks).toBe(8);
    });

    it('should group and sort by continent correctly', () => {
      const stats = calculateStats(testBooks);
      expect(stats.byContinent).toEqual([
        { label: 'Europe', count: 3 },
        { label: 'Asia and Oceania', count: 2 },
        { label: 'South America', count: 2 },
        { label: 'North America', count: 1 }
      ]);
    });

    it('should group and sort by country correctly', () => {
      const stats = calculateStats(testBooks);
      expect(stats.byCountry).toEqual([
        { label: 'Brazil', count: 2 },
        { label: 'UK', count: 2 },
        { label: 'Australia', count: 1 },
        { label: 'Spain', count: 1 },
        { label: 'Turkey', count: 1 },
        { label: 'USA', count: 1 }
      ]);
    });

    it('should group and sort by original language correctly', () => {
      const stats = calculateStats(testBooks);
      expect(stats.byLanguage).toEqual([
        { label: 'English', count: 4 },
        { label: 'Portuguese', count: 2 },
        { label: 'Spanish', count: 1 },
        { label: 'Turkish', count: 1 }
      ]);
    });

    it('should calculate and group by century correctly, converting to roman numerals', () => {
      const stats = calculateStats(testBooks);
      // 1899 and 1881 are 19th century -> XIX Century
      // 1925 and 1955 are 20th century -> XX Century
      // 1605 and 1603 are 17th century -> XVII Century
      // 2002 is 21st century -> XXI Century
      // Empty year is Unknown Century
      expect(stats.byCentury).toEqual([
        { label: 'XIX Century', count: 2 },
        { label: 'XVII Century', count: 2 },
        { label: 'XX Century', count: 2 },
        { label: 'Unknown Century', count: 1 },
        { label: 'XXI Century', count: 1 }
      ]);
    });

    it('should handle BC years correctly and group them as Roman numerals with BC suffix', () => {
      const bcBooks = [
        { year: '370 BC' },
        { year: '300 BC' },
        { year: '45 BC' }
      ];
      const stats = calculateStats(bcBooks);
      expect(stats.byCentury).toEqual([
        { label: 'I Century BC', count: 1 },
        { label: 'III Century BC', count: 1 },
        { label: 'IV Century BC', count: 1 }
      ]);
    });

    it('should group by author and only include authors with more than one book', () => {
      const stats = calculateStats(testBooks);
      // Machado de Assis has 2 books. Other authors have 1 book, so they should be excluded.
      expect(stats.byAuthor).toEqual([
        { label: 'Machado de Assis', count: 2 }
      ]);
    });

    it('should handle empty or null inputs gracefully', () => {
      expect(calculateStats(null)).toBeNull();
      expect(calculateStats([])).toEqual({
        totalBooks: 0,
        byContinent: [],
        byCountry: [],
        byLanguage: [],
        byCentury: [],
        byCategory: [],
        byAuthor: []
      });
    });
  });

  describe('generateStatsMarkdown', () => {
    it('should format stats into correct markdown format', () => {
      const markdown = generateStatsMarkdown(testBooks);
      
      expect(markdown).toContain('# Library Statistics Report');
      expect(markdown).toContain('**Total Books**: 8');
      expect(markdown).toContain('## Books by Continent');
      expect(markdown).toContain('- Europe: 3');
      expect(markdown).toContain('- Asia and Oceania: 2');
      expect(markdown).toContain('- Machado de Assis: 2');
    });

    it('should show empty messages when no data is present', () => {
      const markdown = generateStatsMarkdown([]);
      expect(markdown).toContain('- No data available');
      expect(markdown).toContain('- No author with more than one book registered');
    });
  });

  describe('exportStatsPDF', () => {
    it('should call jsPDF and save PDF with correct filename', async () => {
      exportStatsPDF(testBooks);

      const { jsPDF } = await import('jspdf');
      expect(jsPDF).toHaveBeenCalled();

      const mockDoc = jsPDF.mock.results[0].value;
      expect(mockDoc.save).toHaveBeenCalledWith('library_statistics_report.pdf');
      expect(mockDoc.text).toHaveBeenCalledWith('Statistics Report', 15, 20);
    });

    it('should early return if books list is empty', async () => {
      const { jsPDF } = await import('jspdf');
      exportStatsPDF([]);
      expect(jsPDF).not.toHaveBeenCalled();
    });
  });
});
