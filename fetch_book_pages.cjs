const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve(__dirname, 'src/data/data.json');
const reportPath = path.resolve(__dirname, 'fetched_pages_report.md');
const cachePath = path.resolve(__dirname, 'fetched_pages_cache.json');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Função de fetch robusta com Retentativa Exponencial (Backoff)
 * Se receber 429, espera 1min, depois 2min, 4min... até 10min.
 */
async function fetchWithBackoff(url, options = {}) {
  let waitTime = 60000; // Começa com 1 minuto
  const maxWait = 600000; // Máximo de 10 minutos

  while (true) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        console.log(`\n⚠️  [429] Rate Limit atingido em ${url}. Aguardando ${waitTime/1000}s...`);
        await sleep(waitTime);
        waitTime = Math.min(waitTime * 2, maxWait); // Dobra o tempo
        continue; // Tenta novamente
      }
      
      return response;
    } catch (error) {
      console.log(`\n❌ Erro de rede: ${error.message}. Tentando novamente em 30s...`);
      await sleep(30000);
    }
  }
}

/**
 * Normaliza strings: remove acentos e converte aspas especiais.
 */
function normalizeString(str) {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .trim();
}

/**
 * Gera variações de busca para aumentar chances de sucesso.
 */
function getSearchQueries(title, author) {
  const queries = new Set();
  
  const cleanTitle = title.replace(/^(The|A|An)\s+/i, "").trim();
  const normTitle = normalizeString(title);
  const normCleanTitle = normalizeString(cleanTitle);
  const normAuthor = normalizeString(author);
  
  const authorWords = normAuthor.split(/[\s-]+/).filter(w => w.length > 2);
  const firstWord = authorWords[0] || "";
  const lastWord = authorWords[authorWords.length - 1] || "";

  // Estratégias de busca
  queries.add(`${title} ${author}`);
  queries.add(`${normTitle} ${normAuthor}`);
  if (cleanTitle !== title) {
    queries.add(`${cleanTitle} ${author}`);
    queries.add(`${normCleanTitle} ${normAuthor}`);
  }
  
  if (lastWord) {
    queries.add(`${normCleanTitle} ${lastWord}`);
    queries.add(`${cleanTitle} ${lastWord}`);
  }
  if (firstWord && firstWord !== lastWord) {
    queries.add(`${normCleanTitle} ${firstWord}`);
  }

  return Array.from(queries);
}

/**
 * Normaliza strings: remove acentos e caracteres não-alfanuméricos para comparação.
 */
function normalizeForComparison(str) {
  if (!str) return '';
  return normalizeString(str)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Verifica se o autor no documento da OL é compatível com o autor esperado.
 * Mais tolerante: aceita se houver match de prefixos significativos.
 */
function isAuthorMatch(docAuthors, targetAuthor) {
  if (!docAuthors || docAuthors.length === 0) return false;
  const targetNorm = normalizeForComparison(targetAuthor);
  const targetWords = targetAuthor.toLowerCase().split(/[\s-]+/).filter(w => w.length >= 3);

  for (const author of docAuthors) {
    const authorNorm = normalizeForComparison(author);
    if (authorNorm.includes(targetNorm) || targetNorm.includes(authorNorm)) return true;
    
    const authorWords = author.toLowerCase().split(/[\s-]+/).filter(w => w.length >= 3);
    
    // Verifica se pelo menos um nome significativo bate (prefixo de 3 letras)
    for (const tw of targetWords) {
      const tPrefix = tw.substring(0, 3);
      for (const aw of authorWords) {
        if (aw.startsWith(tPrefix)) return true;
      }
    }
  }
  return false;
}

async function fetchEditionPages(editionKeys, sleepTime) {
  if (!editionKeys || editionKeys.length === 0) return null;
  
  const keys = editionKeys.slice(0, 40);
  const bibkeys = keys.map(k => `OLID:${k}`).join(',');
  const editionUrl = `https://openlibrary.org/api/books?bibkeys=${bibkeys}&format=json&jscmd=data`;
  
  await sleep(sleepTime); 
  const editionResponse = await fetchWithBackoff(editionUrl);

  if (editionResponse.ok) {
    const editionData = await editionResponse.json();
    let penguinPageCount = null;
    let maxPageCount = 0;
    Object.values(editionData).forEach(book => {
      const publishers = (book.publishers || []).map(p => (p.name || '').toLowerCase());
      const isPenguin = publishers.some(p => p.includes('penguin')) || (book.title || '').toLowerCase().includes('penguin');
      if (book.number_of_pages && !(book.subtitle || '').toLowerCase().includes('vol 1')) {
        if (isPenguin) penguinPageCount = Math.max(penguinPageCount || 0, book.number_of_pages);
        maxPageCount = Math.max(maxPageCount, book.number_of_pages);
      }
    });
    if (penguinPageCount) return { pages: penguinPageCount, source: 'Penguin Edition' };
    if (maxPageCount > 0) return { pages: maxPageCount, source: 'Best Match' };
  }
  return null;
}

async function fetchOpenLibraryPages(title, author, sleepTime) {
  const queries = getSearchQueries(title, author);
  
  // 1. Tenta buscas combinadas (Título + Autor)
  for (const query of queries) {
    try {
      const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=title,author_name,edition_key,cover_edition_key,number_of_pages_median`;
      const response = await fetchWithBackoff(url);
      if (!response.ok) continue;
      
      const data = await response.json();
      if (data.docs && data.docs.length > 0) {
        const match = data.docs.slice(0, 5).find(d => isAuthorMatch(d.author_name, author));
        if (match) {
          if (match.number_of_pages_median) return { pages: match.number_of_pages_median, source: 'OL Median' };
          const result = await fetchEditionPages(match.edition_key, sleepTime);
          if (result) return result;
        }
      }
    } catch (error) {
      console.error(`\n❌ Erro na query "${query}": ${error.message}`);
    }
  }

  // 2. Fallback: Busca apenas pelo Título
  try {
    const cleanTitle = title.replace(/^(The|A|An)\s+/i, "").trim();
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(cleanTitle)}&fields=title,author_name,edition_key,number_of_pages_median`;
    const response = await fetchWithBackoff(url);
    if (response.ok) {
      const data = await response.json();
      if (data.docs) {
        const match = data.docs.slice(0, 15).find(doc => isAuthorMatch(doc.author_name, author));
        if (match) {
          if (match.number_of_pages_median) return { pages: match.number_of_pages_median, source: 'OL Title Search + Author Filter' };
          const result = await fetchEditionPages(match.edition_key, sleepTime);
          if (result) return { ...result, source: result.source + ' (Title Match)' };
        }
      }
    }
  } catch (error) {
    console.error(`\n❌ Erro no fallback de título para "${title}": ${error.message}`);
  }

  return { pages: null, source: 'Não encontrado' };
}

async function main() {
  let cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf-8')) : {};
  const allBooks = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  
  // Filtra apenas os livros que ainda não foram encontrados
  const missingBooks = allBooks.filter(book => !cache[book.id] || !cache[book.id].pages);
  
  if (missingBooks.length === 0) {
    console.log("✅ Todos os livros já possuem contagem de páginas no cache.");
    return;
  }

  console.log(`=== Busca Incremental Otimizada (Faltam: ${missingBooks.length} de ${allBooks.length}) ===\n`);

  for (let i = 0; i < missingBooks.length; i++) {
    const book = missingBooks[i];

    process.stdout.write(`[${i+1}/${missingBooks.length}] ID ${book.id}: "${book.title}"... `);
    
    const info = await fetchOpenLibraryPages(book.title, book.author, 1500);
    
    if (info.pages) {
      console.log(`ENCONTRADO: ${info.pages}p via ${info.source}`);
    } else {
      console.log(`FALHA: ${info.source}`);
    }

    // Salva no cache
    cache[book.id] = {
      title: book.title,
      author: book.author,
      current: book.pages,
      pages: info.pages,
      source: info.source,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
    
    await sleep(2500); // Intervalo base entre livros
  }
  
  // Relatório final
  let markdown = `# Relatório de Páginas (Completo)\n\n| ID | Título | Atual | Novo | Status | Fonte |\n| :-- | :--- | :---: | :---: | :---: | :--- |\n`;
  Object.keys(cache).sort((a,b) => a-b).forEach(id => {
    const r = cache[id];
    const status = (r.pages && r.pages !== r.current) ? 'ALTERADO' : (r.pages ? 'IGUAL' : 'N/A');
    markdown += `| ${id} | ${r.title} | ${r.current} | **${r.pages || '-'}** | ${status} | ${r.source} |\n`;
  });
  fs.writeFileSync(reportPath, markdown, 'utf-8');
  console.log(`\nFim do processamento. Relatório: ${reportPath}`);
}

main();
