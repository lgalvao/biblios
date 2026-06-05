import { jsPDF } from 'jspdf';
import { normalizeToASCII, getCountryFlag } from './dataUtils';

export const exportPDFReport = (books) => {
  if (!books || books.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  
  const colWidth = 58;
  const colGap = 5;
  let currentColumn = 0; // 0 = Left, 1 = Middle, 2 = Right column

  let y = margin;
  let pageNumber = 1;

  const getColX = () => margin + currentColumn * (colWidth + colGap);

  // Helper to print page header
  const printHeader = () => {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('BIBLIOS - PERSONAL LIBRARY REPORT', margin, 7);
    doc.text(`Page ${pageNumber}`, pageWidth - margin, 7, { align: 'right' });
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.2);
    doc.line(margin, 9, pageWidth - margin, 9);
  };

  let columnTopY = 30; // Starts below the title block on page 1

  // Helper to handle column switching and page breaks
  const checkPageBreak = (neededHeight) => {
    if (y + neededHeight > pageHeight - margin) {
      if (currentColumn < 2) {
        currentColumn++;
        y = columnTopY; // Reset Y to top of the next column
        return true;
      } else {
        doc.addPage();
        pageNumber++;
        currentColumn = 0;
        columnTopY = 15; // Standard top margin on subsequent pages
        y = columnTopY; // Reset Y to top of the first column on the new page
        printHeader();
        return true;
      }
    }
    return false;
  };

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    const str = String(text);
    return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
  };

  // Vector Icon Drawing Helpers
  const drawBookIcon = (x, y) => {
    doc.setDrawColor(13, 110, 253); // Blue
    doc.setLineWidth(0.25);
    // Draw two pages of open book
    doc.line(x, y + 0.4, x, y + 2.4); // Left edge
    doc.line(x + 3.6, y + 0.4, x + 3.6, y + 2.4); // Right edge
    doc.line(x + 1.8, y + 0.7, x + 1.8, y + 2.7); // Spine
    doc.line(x, y + 0.4, x + 1.8, y + 0.7); // Left top
    doc.line(x, y + 2.4, x + 1.8, y + 2.7); // Left bottom
    doc.line(x + 1.8, y + 0.7, x + 3.6, y + 0.4); // Right top
    doc.line(x + 1.8, y + 2.7, x + 3.6, y + 2.4); // Right bottom
  };

  const drawAuthorIcon = (x, y) => {
    doc.setDrawColor(164, 180, 200); // Subtle light gray-blue
    doc.setLineWidth(0.1);
    doc.circle(x + 1.0, y + 0.5, 0.45); // Head
    doc.line(x, y + 1.4, x + 2.0, y + 1.4); // Shoulder base
    doc.line(x, y + 1.4, x + 0.4, y + 0.9); // Left arm
    doc.line(x + 2.0, y + 1.4, x + 1.6, y + 0.9); // Right arm
  };

  const drawCalendarIcon = (x, y) => {
    doc.setDrawColor(164, 180, 200);
    doc.setLineWidth(0.1);
    doc.rect(x, y, 2.0, 2.0);
    doc.line(x, y + 0.6, x + 2.0, y + 0.6); // Header line
  };

  const drawPageIcon = (x, y) => {
    doc.setDrawColor(164, 180, 200);
    doc.setLineWidth(0.1);
    doc.rect(x, y, 1.5, 2.0);
    doc.line(x + 0.3, y + 0.6, x + 1.2, y + 0.6);
    doc.line(x + 0.3, y + 1.3, x + 1.2, y + 1.3);
  };

  const drawGlobeIcon = (x, y) => {
    doc.setDrawColor(164, 180, 200);
    doc.setLineWidth(0.1);
    doc.circle(x + 1.0, y + 1.0, 1.0);
    doc.line(x, y + 1.0, x + 2.0, y + 1.0); // Equator
    doc.line(x + 1.0, y, x + 1.0, y + 2.0); // Prime meridian
  };

  // Print first page header
  printHeader();
  y = 15;

  // Draw Report Title (spanning first page)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text('Library Report', margin, y);
  y += 5;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text(`Generated on ${new Date().toLocaleDateString()}  |  Total Books: ${books.length}`, margin, y);
  y = 30; // Initialize first page columns Y to start below the title block

  // Group books by Continent, then Country
  const grouped = {};
  books.forEach(b => {
    const cont = b.continent || 'Unspecified Continent';
    const ctry = b.country || 'Unspecified Country';
    if (!grouped[cont]) grouped[cont] = {};
    if (!grouped[cont][ctry]) grouped[cont][ctry] = [];
    grouped[cont][ctry].push(b);
  });

  const sortedContinents = Object.keys(grouped).sort();

  sortedContinents.forEach(continent => {
    // Check page break for Continent Header block
    checkPageBreak(15);
    const x = getColX();
    
    y += 1.5;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(13, 110, 253); // Primary Blue
    doc.text(normalizeToASCII(continent.toUpperCase()), x, y);
    
    // Draw line under continent header inside the column boundaries
    doc.setDrawColor(13, 110, 253);
    doc.setLineWidth(0.3);
    doc.line(x, y + 1.2, x + colWidth, y + 1.2);
    y += 4.5;

    const countries = grouped[continent];
    const sortedCountries = Object.keys(countries).sort();

    sortedCountries.forEach(country => {
      // Check page break for Country Header + first Book block
      const didBreak = checkPageBreak(22);
      const xCoord = getColX();

      if (didBreak) {
        y += 1.5; // Tighter padding at the top of a column
      } else {
        y += 4.0; // Generous separator space from the previous book
      }

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.0);
      doc.setTextColor(71, 85, 105); // Slate-600 (different color and size for distinction)
      
      const flagEmoji = getCountryFlag(country);
      const cleanCountry = normalizeToASCII(country);
      
      // Wrap country name to fit the column width minus flag offset
      const countryLines = doc.splitTextToSize(cleanCountry, colWidth - 6.2);
      let flagDrawn = false;

      if (flagEmoji && typeof document !== 'undefined') {
        try {
          const canvas = document.createElement('canvas');
          if (canvas && typeof canvas.getContext === 'function') {
            // 4:3 aspect ratio canvas with tight borders for the flag emoji
            canvas.width = 48;
            canvas.height = 36;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.font = '32px "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(flagEmoji, 24, 18);
              const flagDataUrl = canvas.toDataURL('image/png');
              
              // Larger flag: 5.2mm x 3.9mm, aligned precisely to the vertical center
              doc.addImage(flagDataUrl, 'PNG', xCoord, y - 3.0, 5.2, 3.9);
              flagDrawn = true;
            }
          }
        } catch (err) {
          console.error('Failed to render flag emoji to canvas:', err);
        }
      }

      const textXOffset = flagDrawn ? 6.2 : 0;
      countryLines.forEach((line, index) => {
        doc.text(line, xCoord + textXOffset, y + index * 3.0);
      });

      y += (countryLines.length - 1) * 3.0;
      y += 2.0; // Increased spacing before the first book title to separate sections clearly

      const countryBooks = countries[country];
      const sortedBooks = [...countryBooks].sort((a, b) => a.title.localeCompare(b.title));

      sortedBooks.forEach(book => {
        const cleanTitle = normalizeToASCII(book.title);
        const cleanAuthor = normalizeToASCII(book.author);
        const cleanLang = normalizeToASCII(book.originalLanguage || 'English');
        
        // Explicitly set font size before splitting to ensure correct width calculations
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        const titleLines = doc.splitTextToSize(cleanTitle, colWidth);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7);
        const authorLines = doc.splitTextToSize(cleanAuthor, colWidth - 3.2);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(6.5);
        const langLines = doc.splitTextToSize(cleanLang, colWidth - 31.2);
        
        const titleHeight = titleLines.length * 2.8;
        const authorHeight = authorLines.length * 2.6;
        const metaHeight = Math.max(1, langLines.length) * 2.4;
        
        // Calculate dynamic block height
        const blockHeight = 0.2 + titleHeight + 1.8 + authorHeight + 1.6 + metaHeight + 1.5 + 1.5;
        
        // Check page break for a single book block dynamically
        checkPageBreak(blockHeight);
        const bx = getColX();

        // 1. Draw Title (aligned to column start, no icon)
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59); // Slate-800
        titleLines.forEach((line, index) => {
          doc.text(line, bx, y + 2.2 + index * 2.8);
        });
        const titleEndY = y + 2.2 + (titleLines.length - 1) * 2.8;

        // 2. Draw Author & Author Icon
        const authorStartY = titleEndY + 1.8;
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105); // Slate-600
        drawAuthorIcon(bx, authorStartY + 0.2);
        authorLines.forEach((line, index) => {
          doc.text(line, bx + 3.2, authorStartY + 1.5 + index * 2.6);
        });
        const authorEndY = authorStartY + 1.5 + (authorLines.length - 1) * 2.6;

        // 3. Draw Inline Metadata (Year, Pages, Language)
        const metaStartY = authorEndY + 1.6;
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139); // Slate-500

        // Year metadata (with smaller subtle icons)
        drawCalendarIcon(bx, metaStartY);
        doc.text(normalizeToASCII(String(book.year || 'N/A')), bx + 2.8, metaStartY + 2.0);

        // Pages metadata
        drawPageIcon(bx + 14, metaStartY);
        doc.text(`${normalizeToASCII(String(book.pages || '-'))} p.`, bx + 16.4, metaStartY + 2.0);

        // Language metadata
        drawGlobeIcon(bx + 28.5, metaStartY);
        langLines.forEach((line, index) => {
          doc.text(line, bx + 31.2, metaStartY + 2.0 + index * 2.4);
        });

        const metaEndY = metaStartY + 2.0 + (langLines.length - 1) * 2.4;

        // Light bottom separator line for clean list divider
        doc.setDrawColor(241, 245, 249); // slate-100
        doc.setLineWidth(0.15);
        doc.line(bx, metaEndY + 1.5, bx + colWidth, metaEndY + 1.5);
        
        y = metaEndY + 3.0;
      });

      y += 1.5; // Spacing after country block
    });

    y += 2.5; // Spacing after continent block
  });

  doc.save('biblios_library_report.pdf');
};
