import { describe, it, expect, vi } from 'vitest';
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
    vi.clearAllMocks();

    exportPDFReport([]);
    exportPDFReport(null);

    expect(jsPDF).not.toHaveBeenCalled();
  });
});
