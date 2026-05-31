/* global process */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Custom plugin for real-time filesystem synchronization
const localDatabasePlugin = () => {
  const jsonPath = path.resolve(process.cwd(), 'src/data/initialData.json');
  const csvPath = path.resolve(process.cwd(), 'list.csv');

  const escapeCSVField = (val) => {
    if (val === null || val === undefined) return '';
    let str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    }
    return str;
  };

  return {
    name: 'vite-plugin-local-database',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/books' && req.method === 'GET') {
          fs.readFile(jsonPath, 'utf-8', (err, data) => {
            if (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to read initialData.json' }));
            } else {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(data);
            }
          });
        } else if (req.url === '/api/books/sync' && req.method === 'POST') {
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

              // 1. Overwrite initialData.json
              fs.writeFileSync(jsonPath, JSON.stringify(books, null, 2), 'utf-8');

              // 2. Overwrite list.csv (with UTF-8 BOM)
              const headers = ["Title", "Author", "Year", "Country", "Continent", "Read", "OriginalLanguage", "Pages", "Description"];
              const csvRows = [headers.join(',')];
              
              books.forEach(b => {
                const row = [
                  escapeCSVField(b.title),
                  escapeCSVField(b.author),
                  escapeCSVField(b.year),
                  escapeCSVField(b.country),
                  escapeCSVField(b.continent),
                  b.read ? '1' : '', // '1' matches read status checked standard, empty if unread
                  escapeCSVField(b.originalLanguage),
                  escapeCSVField(b.pages),
                  escapeCSVField(b.description)
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
        } else {
          next();
        }
      });
    }
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localDatabasePlugin()],
  server: {
    host: true
  }
})

