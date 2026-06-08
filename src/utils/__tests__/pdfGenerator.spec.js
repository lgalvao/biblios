import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportPDFReport } from '../pdfGenerator';

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
    circle: vi.fn(),
    rect: vi.fn(),
    addPage: vi.fn(),
    save: vi.fn(),
    splitTextToSize: vi.fn((text) => [text]),
    addImage: vi.fn()
  };
  return {
    jsPDF: vi.fn(function() {
      return mockDoc;
    })
  };
});

describe('pdfGenerator', () => {
  let originalCreateElement;

  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof document !== 'undefined') {
      originalCreateElement = document.createElement;
      document.createElement = vi.fn((tagName) => {
        if (tagName === 'canvas') {
          return {
            getContext: vi.fn(() => ({
              fillText: vi.fn(),
              measureText: vi.fn(() => ({ width: 10 })),
            })),
            toDataURL: vi.fn(() => 'data:image/png;base64,abc'),
            width: 0,
            height: 0
          };
        }
        return originalCreateElement.call(document, tagName);
      });
    }
  });

  afterEach(() => {
    if (typeof document !== 'undefined' && originalCreateElement) {
      document.createElement = originalCreateElement;
    }
  });

  it('should initialize jsPDF and call save with the library report filename', async () => {
    const books = [
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
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        year: '1925',
        pages: 180,
        originalLanguage: 'English',
        read: false,
        country: 'United States of America',
        continent: 'North America'
      }
    ];

    exportPDFReport(books);

    const { jsPDF } = await import('jspdf');
    expect(jsPDF).toHaveBeenCalled();

    const mockDoc = jsPDF.mock.results[0].value;
    expect(mockDoc.save).toHaveBeenCalledWith('biblios_library_report.pdf');

    // Should render the report title
    expect(mockDoc.text).toHaveBeenCalledWith('Library Report', 10, 15);

    // Should render the grouped continent titles
    expect(mockDoc.text).toHaveBeenCalledWith('SOUTH AMERICA', 10, expect.any(Number));
  });

  it('should early return and do nothing if the books list is empty or null', async () => {
    const { jsPDF } = await import('jspdf');
    exportPDFReport([]);
    exportPDFReport(null);

    expect(jsPDF).not.toHaveBeenCalled();
  });

  it('should handle missing metadata gracefully', async () => {
    const books = [
      {
        title: 'Book Without Meta',
        author: 'No Author',
        country: 'Brazil',
        continent: 'South America',
        year: '',
        pages: '',
        originalLanguage: ''
      }
    ];

    exportPDFReport(books);

    const { jsPDF } = await import('jspdf');
    const mockDoc = jsPDF.mock.results[0].value;
    expect(mockDoc.save).toHaveBeenCalled();
  });

  it('should handle canvas context failure gracefully', () => {
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tagName) => {
      if (tagName === 'canvas') {
        return {
          getContext: vi.fn(() => null),
          width: 0,
          height: 0
        };
      }
      return originalCreateElement.call(document, tagName);
    });

    const books = [{ title: 'T', author: 'A', country: 'Brazil', continent: 'South America' }];
    exportPDFReport(books);
    
    document.createElement = originalCreateElement;
  });

  it('should handle error during flag rendering', () => {
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tagName) => {
      if (tagName === 'canvas') {
        throw new Error('Canvas error');
      }
      return originalCreateElement.call(document, tagName);
    });

    const books = [{ title: 'T', author: 'A', country: 'Brazil', continent: 'South America' }];
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    exportPDFReport(books);
    
    expect(consoleSpy).toHaveBeenCalledWith('Failed to render flag emoji to canvas:', expect.any(Error));
    
    document.createElement = originalCreateElement;
    consoleSpy.mockRestore();
  });

  it('should trigger page breaks within country loop for large catalogs', async () => {
    // Generate enough books in the SAME country to force a page break within the country block
    const largeBooks = Array.from({ length: 150 }, (_, i) => ({
      title: `Long Book Title ${i}`,
      author: `Author ${i}`,
      year: '2000',
      pages: 100,
      originalLanguage: 'English',
      country: 'Brazil',
      continent: 'South America'
    }));

    exportPDFReport(largeBooks);
    const { jsPDF } = await import('jspdf');
    const mockDoc = jsPDF.mock.results[0].value;
    
    // We expect addPage to be called multiple times due to the large amount of data in one country
    expect(mockDoc.addPage).toHaveBeenCalled();
  });
});
