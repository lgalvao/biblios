/* global process */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Custom plugin for real-time filesystem synchronization
const localDatabasePlugin = () => {
  const jsonPath = path.resolve(process.cwd(), 'src/data/data.json');
  const csvPath = path.resolve(process.cwd(), 'data.csv');
  const regionMappingPath = path.resolve(process.cwd(), 'src/data/region-mapping.json');
  const originalGeoschemePath = path.resolve(process.cwd(), 'un-geoscheme-subregions-countries.json');

  const initRegionMapping = () => {
    try {
      if (fs.existsSync(regionMappingPath)) return;
      
      let geoschemeData = {};
      if (fs.existsSync(originalGeoschemePath)) {
        geoschemeData = JSON.parse(fs.readFileSync(originalGeoschemePath, 'utf-8'));
      }
      
      const defaultAliases = {
        'usa': 'United States of America',
        'uk': 'United Kingdom of Great Britain and Northern Ireland',
        'england': 'United Kingdom of Great Britain and Northern Ireland',
        'scotland': 'United Kingdom of Great Britain and Northern Ireland',
        'wales': 'United Kingdom of Great Britain and Northern Ireland',
        'northern ireland': 'United Kingdom of Great Britain and Northern Ireland',
        'brazil': 'Brazil',
        'brasil': 'Brazil',
        'russia': 'Russian Federation',
        'south korea': 'Republic of Korea',
        'north korea': "Democratic People's Republic of Korea",
        'vietnam': 'Viet Nam',
        'iran': 'Iran (Islamic Republic of)',
        'venezuela': 'Venezuela (Bolivarian Republic of)',
        'bolivaria': 'Bolivia (Plurinational State of)',
        'taiwan': 'China',
        'tanzania': 'United Republic of Tanzania',
        'syria': 'Syrian Arab Republic',
        'macedonia': 'North Macedonia',
        'north macedonia': 'North Macedonia',
        'moldova': 'Republic of Moldova',
        'ivory coast': "Côte d'Ivoire",
        'turkmenistan': 'Turkmenistan',
        'uzbekistan': 'Uzbekistan',
        'czech republic': 'Czechia',
        'guinea bissau': 'Guinea-Bissau'
      };

      const initialContent = {
        geoscheme: geoschemeData,
        aliases: defaultAliases
      };

      const dir = path.dirname(regionMappingPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(regionMappingPath, JSON.stringify(initialContent, null, 2), 'utf-8');
      console.log(`[Vite] Initialized region-mapping.json at ${regionMappingPath}`);
    } catch (err) {
      console.error("[Vite] Failed to initialize region-mapping.json:", err);
    }
  };

  const escapeCSVField = (val) => {
    if (val === null || val === undefined) return '';
    let str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    }
    return str;
  };

  const parseCSV = (content) => {
    const lines = [];
    let row = [""];
    let inQuotes = false;
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push("");
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        if (row.length > 1 || row[0] !== "") lines.push(row);
        row = [""];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== "") lines.push(row);
    return lines;
  };

  const syncOnStart = () => {
    try {
      if (!fs.existsSync(csvPath)) return;
      
      const csvContent = fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, '');
      const rows = parseCSV(csvContent);
      if (rows.length < 2) return;

      const headers = rows[0].map(h => h.trim().toLowerCase());
      const mapping = {
        title: headers.indexOf('title'),
        author: headers.indexOf('author'),
        year: headers.indexOf('year'),
        country: headers.indexOf('country'),
        region: headers.indexOf('region'),
        continent: headers.indexOf('continent'),
        read: headers.indexOf('read'),
        lang: headers.indexOf('originallanguage'),
        pages: headers.indexOf('pages'),
        desc: headers.indexOf('description'),
        tags: headers.indexOf('tags')
      };

      const books = rows.slice(1).filter(row => row[mapping.title] && row[mapping.author]).map((row, idx) => ({
        id: idx + 1,
        title: row[mapping.title]?.trim() || '',
        author: row[mapping.author]?.trim() || '',
        year: mapping.year !== -1 ? row[mapping.year]?.trim() || '' : '',
        country: mapping.country !== -1 ? row[mapping.country]?.trim() || '' : '',
        region: mapping.region !== -1 ? row[mapping.region]?.trim() || '' : '',
        continent: mapping.continent !== -1 ? row[mapping.continent]?.trim() || '' : '',
        read: mapping.read !== -1 ? (row[mapping.read]?.trim() === '1' || row[mapping.read]?.toLowerCase() === 'true') : false,
        originalLanguage: mapping.lang !== -1 ? row[mapping.lang]?.trim() || 'English' : 'English',
        pages: mapping.pages !== -1 && row[mapping.pages] ? parseInt(row[mapping.pages], 10) || '' : '',
        description: mapping.desc !== -1 ? row[mapping.desc]?.trim() || '' : '',
        tags: mapping.tags !== -1 && row[mapping.tags] ? row[mapping.tags].split(';').map(t => t.trim()).filter(Boolean) : []
      }));

      fs.writeFileSync(jsonPath, JSON.stringify(books, null, 2), 'utf-8');
      console.log(`[Vite] Startup Sync: Loaded ${books.length} books from data.csv into data.json`);
    } catch (err) {
      console.error("[Vite] Failed to sync CSV on startup:", err);
    }
  };

  const requestHandler = (req, res, next) => {
    const urlPath = req.url.split('?')[0];
    if (urlPath === '/api/books' && req.method === 'GET') {
      fs.readFile(jsonPath, 'utf-8', (err, data) => {
        if (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Failed to read data.json' }));
        } else {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.end(data);
        }
      });
    } else if (urlPath === '/api/books/sync' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const books = JSON.parse(body);
          if (!Array.isArray(books)) {
            throw new Error('Data must be an array of books');
          }

          // 1. Overwrite data.json
          fs.writeFileSync(jsonPath, JSON.stringify(books, null, 2), 'utf-8');

          // 2. Overwrite data.csv (with UTF-8 BOM)
          const headers = ["Title", "Author", "Year", "Country", "Region", "Continent", "Read", "OriginalLanguage", "Pages", "Description", "Tags"];
          const csvRows = [headers.join(',')];
          
          books.forEach(b => {
            const row = [
              escapeCSVField(b.title),
              escapeCSVField(b.author),
              escapeCSVField(b.year),
              escapeCSVField(b.country),
              escapeCSVField(b.region),
              escapeCSVField(b.continent),
              b.read ? '1' : '',
              escapeCSVField(b.originalLanguage),
              escapeCSVField(b.pages),
              escapeCSVField(b.description),
              escapeCSVField(b.tags ? b.tags.join(';') : '')
            ];
            csvRows.push(row.join(','));
          });
          
          const csvContent = '\uFEFF' + csvRows.join('\r\n');
          fs.writeFileSync(csvPath, csvContent, 'utf-8');

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, count: books.length }));
        } catch (err) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    } else if (urlPath === '/api/regions' && req.method === 'GET') {
      initRegionMapping();
      fs.readFile(regionMappingPath, 'utf-8', (err, data) => {
        if (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Failed to read region-mapping.json' }));
        } else {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.end(data);
        }
      });
    } else if (urlPath === '/api/regions/sync' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const mappingData = JSON.parse(body);
          if (!mappingData || typeof mappingData !== 'object') {
            throw new Error('Data must be an object with geoscheme and aliases');
          }
          if (!mappingData.geoscheme || !mappingData.aliases) {
            throw new Error('Data must contain both geoscheme and aliases keys');
          }

          fs.writeFileSync(regionMappingPath, JSON.stringify(mappingData, null, 2), 'utf-8');

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    } else {
      next();
    }
  };

  return {
    name: 'vite-plugin-local-database',
    buildStart() {
      initRegionMapping();
      syncOnStart();
    },
    configureServer(server) {
      server.middlewares.use(requestHandler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(requestHandler);
    }
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localDatabasePlugin()],
  server: {
    host: true,
    port: 3000,
    watch: {
      ignored: ['**/src/data/data.json', '**/data.csv']
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('scheduler') || id.includes('prop-types')) {
              return 'vendor-react';
            }
            if (id.includes('recharts') || id.includes('d3') || id.includes('victory') || id.includes('internmap') || id.includes('lodash')) {
              return 'vendor-charts';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            return 'vendor';
          }
          if (id.includes('src/data/data.json')) {
            return 'initial-database';
          }
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  }
})

