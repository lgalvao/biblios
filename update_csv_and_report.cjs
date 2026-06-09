const fs = require('fs');
const path = require('path');

const cachePath = path.resolve(__dirname, 'fetched_pages_cache.json');
const csvPath = path.resolve(__dirname, 'data.csv');
const jsonPath = path.resolve(__dirname, 'src/data/data.json');
const missingReportPath = path.resolve(__dirname, 'missing_pages_report.md');

function parseCSVLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && line[i + 1] === '"') {
            cur += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(cur);
            cur = '';
        } else {
            cur += char;
        }
    }
    result.push(cur);
    return result;
}

function formatCSVLine(parts) {
    return parts.map(p => {
        if (p.includes(',') || p.includes('"') || p.includes('\n')) {
            return `"${p.replace(/"/g, '""')}"`;
        }
        return p;
    }).join(',');
}

async function run() {
    if (!fs.existsSync(cachePath)) {
        console.error('Cache não encontrado.');
        return;
    }

    const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    
    // Update CSV
    if (fs.existsSync(csvPath)) {
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.split(/\r?\n/);
        const header = lines[0];
        const dataLines = lines.slice(1).filter(l => l.trim() !== '');

        const updatedDataLines = dataLines.map((line, index) => {
            const id = (index + 1).toString();
            const bookCache = cache[id];
            const parts = parseCSVLine(line);

            if (bookCache && bookCache.pages) {
                parts[8] = bookCache.pages.toString();
            }
            return formatCSVLine(parts);
        });

        fs.writeFileSync(csvPath, [header, ...updatedDataLines].join('\n') + '\n', 'utf-8');
        console.log('data.csv atualizado.');
    }

    // Update JSON
    if (fs.existsSync(jsonPath)) {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        jsonData.forEach(book => {
            const bookCache = cache[book.id.toString()];
            if (bookCache && bookCache.pages) {
                book.pages = bookCache.pages;
            }
        });
        fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
        console.log('src/data/data.json atualizado.');
    }

    // Generate Missing Report
    const missing = Object.keys(cache)
        .filter(id => !cache[id].pages)
        .map(id => ({ id, ...cache[id] }))
        .sort((a, b) => parseInt(a.id) - parseInt(b.id));

    let markdown = `# Livros com Páginas Não Encontradas\n\nTotal: ${missing.length} livros\n\n| ID | Título | Autor | Status |\n| :-- | :--- | :--- | :--- |\n`;
    missing.forEach(m => {
        markdown += `| ${m.id} | ${m.title} | ${m.author} | ${m.source} |\n`;
    });
    fs.writeFileSync(missingReportPath, markdown, 'utf-8');
    console.log(`Relatório de ausências gerado: ${missingReportPath}`);
}

run().catch(console.error);