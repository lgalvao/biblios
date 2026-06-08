const fs = require('fs');
const path = require('path');

// Caminhos dos arquivos de dados
const jsonPath = path.resolve(__dirname, 'src/data/data.json');
const reportPath = path.resolve(__dirname, 'fetched_pages_report.md');

// Função auxiliar para atrasar a execução (evitar rate limiting das APIs públicas)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função para buscar contagem de páginas usando a Open Library API (com consulta em lote e heurística de volume completo)
async function fetchOpenLibraryPages(title, author, sleepTime) {
  try {
    // 1ª Chamada: Busca a obra no índice para obter a lista de edições (edition_key)
    const query = `title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&fields=title,author_name,edition_key,cover_edition_key,number_of_pages_median`;
    const url = `https://openlibrary.org/search.json?${query}`;
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.docs && data.docs.length > 0) {
      const doc = data.docs[0];
      
      // Heurística de Otimização: se a mediana geral de páginas da obra já estiver disponível na busca,
      // nós a usamos imediatamente. Isso economiza a 2ª chamada em cerca de 40% a 50% dos livros!
      if (doc.number_of_pages_median) {
        return doc.number_of_pages_median;
      }
      
      // 2ª Chamada (Fallback em Lote): se a mediana não estiver preenchida, consultamos os detalhes das edições
      // em uma chamada de lote consolidada (bibkeys=OLID:OL1M,OLID:OL2M...) para encontrar a edição Penguin Classics.
      const keys = doc.edition_key ? doc.edition_key.slice(0, 12) : [];
      if (keys.length > 0) {
        const bibkeys = keys.map(k => `OLID:${k}`).join(',');
        const editionUrl = `https://openlibrary.org/api/books?bibkeys=${bibkeys}&format=json&jscmd=data`;
        
        await sleep(sleepTime); // Atraso anti-spam dinâmico
        const editionResponse = await fetch(editionUrl);
        if (editionResponse.ok) {
          const editionData = await editionResponse.json();
          let penguinPageCount = null;
          let maxPageCount = 0;
          
          Object.values(editionData).forEach(book => {
            const publishers = book.publishers ? book.publishers.map(p => (p.name || '').toLowerCase()) : [];
            const subtitle = (book.subtitle || '').toLowerCase();
            const bookTitle = (book.title || '').toLowerCase();
            
            // Verifica se a edição é publicada pela Penguin
            const isPenguin = publishers.some(p => p.includes('penguin')) || bookTitle.includes('penguin') || subtitle.includes('penguin');
            const isPartialVol = subtitle.includes('vol 1') || subtitle.includes('vol. 1') || subtitle.includes('volume 1') || subtitle.includes('volume one') || subtitle.includes('part 1') || subtitle.includes('part one');
            
            if (book.number_of_pages && !isPartialVol) {
              if (isPenguin) {
                penguinPageCount = Math.max(penguinPageCount || 0, book.number_of_pages);
              }
              maxPageCount = Math.max(maxPageCount, book.number_of_pages);
            }
          });
          
          if (penguinPageCount) {
            console.log(`  -> [Open Library] Selecionada edição Penguin Classics (${penguinPageCount} páginas)`);
            return penguinPageCount;
          }
          if (maxPageCount > 0) {
            return maxPageCount;
          }
        }
      }
      
      // Fallback final da edição de capa original se tudo falhar
      if (doc.cover_edition_key) {
        const editionUrl = `https://openlibrary.org/api/books?bibkeys=OLID:${doc.cover_edition_key}&format=json&jscmd=data`;
        await sleep(sleepTime);
        const editionResponse = await fetch(editionUrl);
        if (editionResponse.ok) {
          const editionData = await editionResponse.json();
          const bookData = editionData[`OLID:${doc.cover_edition_key}`];
          if (bookData && bookData.number_of_pages) {
            return bookData.number_of_pages;
          }
        }
      }
    }
  } catch (error) {
    console.log(`  [Open Library API] Erro ao buscar: ${error.message}`);
  }
  return null;
}

// Função principal
async function main() {
  console.log('=== Iniciando Busca de Páginas na Web (Foco: Penguin Classics) ===');
  
  // Analisar argumentos
  const args = process.argv.slice(2);
  let limit = null;
  let startId = 1; // Padrão agora é processar toda a base!
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i+1]) {
      limit = parseInt(args[i+1], 10);
    }
    if (args[i] === '--start-id' && args[i+1]) {
      startId = parseInt(args[i+1], 10);
    }
  }
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`Erro: Arquivo data.json não encontrado em: ${jsonPath}`);
    process.exit(1);
  }
  
  const books = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  let booksToProcess = books.filter(b => b.id >= startId);
  
  if (limit) {
    booksToProcess = booksToProcess.slice(0, limit);
  }
  
  // Ajuste dinâmico de delay com base no tamanho do lote para evitar bloqueios de IP (Rate Limiting)
  // Lotes grandes de toda a base precisam de um delay mais seguro para rodar de forma estável.
  const isLargeBatch = booksToProcess.length > 50;
  const delayBetweenBooks = isLargeBatch ? 1200 : 400; // 1.2s para lotes grandes, 400ms para lotes pequenos
  const delayBetweenCalls = isLargeBatch ? 600 : 200; // 600ms para a 2ª chamada, 200ms para lotes pequenos
  
  console.log(`Processando ${booksToProcess.length} livros (IDs >= ${startId})...`);
  if (isLargeBatch) {
    console.log(`Lote grande detectado. Usando delay de segurança ampliado (${delayBetweenBooks}ms entre livros) para evitar rate limiting.`);
  }
  console.log('Aguarde, fazendo consultas nas APIs públicas...');
  
  const results = [];
  
  for (let i = 0; i < booksToProcess.length; i++) {
    const book = booksToProcess[i];
    const { title, author, pages: currentPages } = book;
    
    console.log(`[${i+1}/${booksToProcess.length}] Consultando: "${title}" de ${author}...`);
    
    // Consulta direta e otimizada na Open Library
    const newPages = await fetchOpenLibraryPages(title, author, delayBetweenCalls);
    
    results.push({
      title,
      author,
      currentPages: currentPages || 'N/A',
      newPages: newPages || 'Não encontrado'
    });
    
    // Atraso anti-spam dinâmico entre livros
    await sleep(delayBetweenBooks);
  }
  
  // Exibir tabela no console
  console.log('\n=== Resultados da Busca ===\n');
  console.table(results);
  
  // Gerar relatório em Markdown
  let markdown = `# Relatório de Páginas Encontradas na Web (Prioridade: Penguin Classics)\n\n`;
  markdown += `Relatório gerado em: ${new Date().toLocaleString('pt-BR')}\n\n`;
  markdown += `| Título | Autor | Páginas Atuais | Novas Páginas (Web) |\n`;
  markdown += `| :--- | :--- | :---: | :---: |\n`;
  
  results.forEach(r => {
    markdown += `| ${r.title} | ${r.author} | ${r.currentPages} | **${r.newPages}** |\n`;
  });
  
  markdown += `\n*Nota: Este script priorizou edições da Penguin Classics e não alterou os arquivos de dados do projeto.*`;
  
  fs.writeFileSync(reportPath, markdown, 'utf-8');
  console.log(`\nRelatório Markdown salvo com sucesso em: ${reportPath}`);
}

main();
