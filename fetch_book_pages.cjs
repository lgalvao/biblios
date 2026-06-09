const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve(__dirname, 'src/data/data.json');
const reportPath = path.resolve(__dirname, 'fetched_pages_report.md');
const cachePath = path.resolve(__dirname, 'fetched_pages_cache.json');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchOpenLibraryPages(title, author, sleepTime) {
  try {
    const query = `q=${encodeURIComponent(title + ' ' + author)}&fields=title,author_name,edition_key,cover_edition_key,number_of_pages_median`;
    const url = `https://openlibrary.org/search.json?${query}`;
    
    const response = await fetch(url);
    if (!response.ok) return { pages: null, source: `Erro API (${response.status})` };
    
    const data = await response.json();
    if (data.docs && data.docs.length > 0) {
      const doc = data.docs[0];
      if (doc.number_of_pages_median) return { pages: doc.number_of_pages_median, source: 'OL Median' };
      
      const keys = doc.edition_key ? doc.edition_key.slice(0, 40) : [];
      if (keys.length > 0) {
        const bibkeys = keys.map(k => `OLID:${k}`).join(',');
        const editionUrl = `https://openlibrary.org/api/books?bibkeys=${bibkeys}&format=json&jscmd=data`;
        await sleep(sleepTime); 
        const editionResponse = await fetch(editionUrl);
        if (editionResponse.ok) {
          const editionData = await editionResponse.json();
          let penguinPageCount = null;
          let maxPageCount = 0;
          Object.values(editionData).forEach(book => {
            const publishers = book.publishers ? book.publishers.map(p => (p.name || '').toLowerCase()) : [];
            const isPenguin = publishers.some(p => p.includes('penguin')) || (book.title || '').toLowerCase().includes('penguin');
            if (book.number_of_pages && !(book.subtitle || '').toLowerCase().includes('vol 1')) {
              if (isPenguin) penguinPageCount = Math.max(penguinPageCount || 0, book.number_of_pages);
              maxPageCount = Math.max(maxPageCount, book.number_of_pages);
            }
          });
          if (penguinPageCount) return { pages: penguinPageCount, source: 'Penguin Edition' };
          if (maxPageCount > 0) return { pages: maxPageCount, source: 'Best Match' };
        }
      }
    }
  } catch (error) {
    return { pages: null, source: `Erro: ${error.message}` };
  }
  return { pages: null, source: 'Não encontrado' };
}

async function main() {
  const args = process.argv.slice(2);
  let targetIds = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--ids' && args[i+1]) targetIds = args[i+1].split(',').map(id => parseInt(id, 10));
  }
  
  // Carregar cache
  let cache = {};
  if (fs.existsSync(cachePath)) {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  }

  const allBooks = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  let booksToProcess = targetIds ? allBooks.filter(b => targetIds.includes(b.id)) : allBooks;
  
  console.log(`=== Busca Incremental (Total Alvos: ${booksToProcess.length}) ===\n`);

  for (let i = 0; i < booksToProcess.length; i++) {
    const book = booksToProcess[i];
    
    // Pular se já estiver no cache e tiver sucesso ou se o usuário quiser forçar
    if (cache[book.id] && cache[book.id].pages) {
      console.log(`[${i+1}/${booksToProcess.length}] ID ${book.id}: "${book.title}" -> Usando CACHE (${cache[book.id].pages}p)`);
      continue;
    }

    process.stdout.write(`[${i+1}/${booksToProcess.length}] ID ${book.id}: "${book.title}" (${book.pages}p) -> `);
    
    const info = await fetchOpenLibraryPages(book.title, book.author, 1000);
    
    if (info.pages) {
      const diff = info.pages - book.pages;
      process.stdout.write(`ENCONTRADO: ${info.pages}p [${diff >= 0 ? '+' : ''}${diff}] via ${info.source}\n`);
    } else {
      process.stdout.write(`FALHA: ${info.source}\n`);
    }

    // Atualizar Cache IMEDIATAMENTE
    cache[book.id] = {
      title: book.title,
      author: book.author,
      current: book.pages,
      pages: info.pages,
      source: info.source,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
    
    await sleep(2000);
  }
  
  // Gerar Relatório Baseado no Cache Completo
  let markdown = `# Relatório de Páginas (Incremental)\n\n| ID | Título | Atual | Novo | Status | Fonte |\n| :-- | :--- | :---: | :---: | :---: | :--- |\n`;
  Object.keys(cache).sort((a,b) => a-b).forEach(id => {
    const r = cache[id];
    const status = (r.pages && r.pages !== r.current) ? 'ALTERADO' : (r.pages ? 'IGUAL' : 'N/A');
    markdown += `| ${id} | ${r.title} | ${r.current} | **${r.pages || '-'}** | ${status} | ${r.source} |\n`;
  });
  fs.writeFileSync(reportPath, markdown, 'utf-8');
  console.log(`\nRelatório atualizado e cache salvo em: ${cachePath}`);
}

main();
