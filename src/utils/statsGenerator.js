import { jsPDF } from 'jspdf';
import { normalizeToASCII, parseYear } from './dataUtils';

// Converte número de século para numeral romano em Inglês
const seculoParaRomano = (num) => {
  const romanos = {
    21: 'XXI',
    20: 'XX',
    19: 'XIX',
    18: 'XVIII',
    17: 'XVII',
    16: 'XVI',
    15: 'XV',
    14: 'XIV',
    13: 'XIII',
    12: 'XII',
    11: 'XI',
    10: 'X',
    9: 'IX',
    8: 'VIII',
    7: 'VII',
    6: 'VI',
    5: 'V',
    4: 'IV',
    3: 'III',
    2: 'II',
    1: 'I'
  };
  return romanos[num] ? `${romanos[num]} Century` : `${num} Century`;
};

// Extrai o século a partir da string do ano
const obterSeculoDoAno = (anoStr) => {
  const yr = parseYear(anoStr);
  if (yr === null || yr === 0) return 'Unknown Century';
  
  const isBc = yr < 0;
  const absYr = Math.abs(yr);
  const seculo = Math.floor((absYr - 1) / 100) + 1;
  const romano = seculoParaRomano(seculo);
  
  return isBc ? `${romano} BC` : romano;
};

/**
 * Calcula as estatísticas dos livros fornecidos.
 */
export const calculateStats = (books) => {
  if (!books) return null;
  const totalBooks = books.length;
  const contagemContinente = {};
  const contagemPais = {};
  const contagemIdioma = {};
  const contagemSeculo = {};
  const contagemAutor = {};
  const contagemCategoria = {};

  books.forEach(b => {
    // Categoria
    const cat = b.category || 'Unknown';
    contagemCategoria[cat] = (contagemCategoria[cat] || 0) + 1;

    // Continente
    let cont = b.continent ? b.continent.trim() : 'Unknown Continent';
    if (cont === 'Asia' || cont === 'Oceania') {
      cont = 'Asia and Oceania';
    }
    contagemContinente[cont] = (contagemContinente[cont] || 0) + 1;

    // País
    const pais = b.country ? b.country.trim() : 'Unknown Country';
    contagemPais[pais] = (contagemPais[pais] || 0) + 1;

    // Idioma Original
    const idioma = b.originalLanguage ? b.originalLanguage.trim() : 'Unknown Language';
    contagemIdioma[idioma] = (contagemIdioma[idioma] || 0) + 1;

    // Século
    const seculo = obterSeculoDoAno(b.year);
    contagemSeculo[seculo] = (contagemSeculo[seculo] || 0) + 1;

    // Autor
    const autor = b.author ? b.author.trim() : 'Unknown Author';
    contagemAutor[autor] = (contagemAutor[autor] || 0) + 1;
  });

  const ordenarEstatísticas = (objetoContagem) => {
    return Object.entries(objetoContagem)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count; // Contagem decrescente
        }
        return a.label.localeCompare(b.label); // Ordem alfabética crescente
      });
  };

  const byContinent = ordenarEstatísticas(contagemContinente);
  const byCountry = ordenarEstatísticas(contagemPais);
  const byLanguage = ordenarEstatísticas(contagemIdioma);
  const byCentury = ordenarEstatísticas(contagemSeculo);
  const byCategory = ordenarEstatísticas(contagemCategoria);

  // Apenas autores com mais de 1 livro
  const byAuthorFiltered = Object.entries(contagemAutor)
    .filter(([, count]) => count > 1)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.label.localeCompare(b.label);
    });

  return {
    totalBooks,
    byContinent,
    byCountry,
    byLanguage,
    byCentury,
    byCategory,
    byAuthor: byAuthorFiltered
  };
};

/**
 * Gera o conteúdo do relatório de estatísticas no formato Markdown.
 */
export const generateStatsMarkdown = (books, stats) => {
  const s = stats || calculateStats(books);
  if (!s) return '';

  let md = `# Library Statistics Report\n\n`;
  md += `**Total Books**: ${s.totalBooks}\n\n`;

  md += `## Books by Continent\n`;
  if (s.byContinent.length === 0) {
    md += `- No data available\n`;
  } else {
    s.byContinent.forEach(item => {
      md += `- ${item.label}: ${item.count}\n`;
    });
  }
  md += `\n`;

  md += `## Books by Category\n`;
  if (s.byCategory.length === 0) {
    md += `- No data available\n`;
  } else {
    s.byCategory.forEach(item => {
      md += `- ${item.label}: ${item.count}\n`;
    });
  }
  md += `\n`;

  md += `## Books by Century\n`;
  if (s.byCentury.length === 0) {
    md += `- No data available\n`;
  } else {
    s.byCentury.forEach(item => {
      md += `- ${item.label}: ${item.count}\n`;
    });
  }
  md += `\n`;

  md += `## Books by Original Language\n`;
  if (s.byLanguage.length === 0) {
    md += `- No data available\n`;
  } else {
    s.byLanguage.forEach(item => {
      md += `- ${item.label}: ${item.count}\n`;
    });
  }
  md += `\n`;

  md += `## Books by Country\n`;
  if (s.byCountry.length === 0) {
    md += `- No data available\n`;
  } else {
    s.byCountry.forEach(item => {
      md += `- ${item.label}: ${item.count}\n`;
    });
  }
  md += `\n`;

  md += `## Books by Author (Only if the author has more than one)\n`;
  if (s.byAuthor.length === 0) {
    md += `- No author with more than one book registered\n`;
  } else {
    s.byAuthor.forEach(item => {
      md += `- ${item.label}: ${item.count}\n`;
    });
  }

  return md;
};

/**
 * Exporta o relatório de estatísticas em formato PDF e inicia o download.
 */
export const exportStatsPDF = (books, stats) => {
  const s = stats || calculateStats(books);
  if (!s || s.totalBooks === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  let y = margin;
  let pageNumber = 1;

  const printHeader = () => {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('BIBLIOS - LIBRARY STATISTICS REPORT', margin, 10);
    doc.text(`Page ${pageNumber}`, pageWidth - margin, 10, { align: 'right' });
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.2);
    doc.line(margin, 12, pageWidth - margin, 12);
  };

  const checkPageBreak = (neededHeight) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      pageNumber++;
      y = margin + 5;
      printHeader();
      return true;
    }
    return false;
  };

  // Primeira página cabeçalho
  printHeader();
  y = 20;

  // Título do Relatório
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text('Statistics Report', margin, y);
  y += 6;

  // Subtítulo / Data
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate-600
  const dataGeracao = new Date().toLocaleDateString('en-US');
  doc.text(`Generated on ${dataGeracao}  |  Total Books: ${s.totalBooks}`, margin, y);
  y += 10;

  const renderSection = (titulo, items, emptyMessage = 'No data available') => {
    checkPageBreak(15);
    
    // Título da Seção
    y += 2;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(13, 110, 253); // Azul Primário
    doc.text(normalizeToASCII(titulo.toUpperCase()), margin, y);

    // Linha divisória da Seção
    doc.setDrawColor(13, 110, 253);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 1.5, pageWidth - margin, y + 1.5);
    y += 5.5;

    if (items.length === 0) {
      checkPageBreak(6);
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(normalizeToASCII(emptyMessage), margin, y);
      y += 6;
      return;
    }

    items.forEach(item => {
      checkPageBreak(6);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59); // Slate-800
      doc.text(normalizeToASCII(item.label), margin, y);

      // Quantidade alinhada à direita
      doc.setFont('Helvetica', 'bold');
      doc.text(String(item.count), pageWidth - margin, y, { align: 'right' });

      // Linha pontilhada / sutil entre itens
      doc.setDrawColor(241, 245, 249); // Slate-100
      doc.setLineWidth(0.15);
      doc.line(margin, y + 1.8, pageWidth - margin, y + 1.8);

      y += 5.5;
    });

    y += 3; // Espaçamento extra após a seção
  };

  renderSection('Books by Continent', s.byContinent);
  renderSection('Books by Category', s.byCategory);
  renderSection('Books by Century', s.byCentury);
  renderSection('Books by Original Language', s.byLanguage);
  renderSection('Books by Country', s.byCountry);
  renderSection('Books by Author (Only if the author has more than one)', s.byAuthor, 'No author with more than one book registered');

  doc.save('library_statistics_report.pdf');
};
