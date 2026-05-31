import { useState, useEffect, useRef } from 'react';
import initialData from './data/initialData.json';
import Dashboard from './components/Dashboard';
import BookTable from './components/BookTable';
import BookModal from './components/BookModal';
import Reports from './components/Reports';
import MapView from './components/MapView';
import './App.css';

import { 
  Sun, 
  Moon, 
  Upload, 
  Download, 
  Plus, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  Layers,
  BarChart3,
  List,
  Globe
} from 'lucide-react';

// Auto-repair any historical bad data (e.g. continent === country) and sync with initial data source
function repairBooksList(loadedBooks, referenceData) {
  let needsRepair = false;
  const repaired = loadedBooks.map(b => {
    let isUpdated = false;
    const updated = { ...b };
    
    if (b.continent === 'Ireland') {
      updated.continent = 'Europe';
      isUpdated = true;
    } else if (b.continent === 'India') {
      updated.continent = 'Asia';
      isUpdated = true;
    } else if (b.continent === 'Japan') {
      updated.continent = 'Asia';
      isUpdated = true;
    }
    
    if (['Nicaragua', 'El Salvador', 'Guatemala'].includes(b.country) && b.continent !== 'Central America') {
      updated.continent = 'Central America';
      isUpdated = true;
    }
    
    if (b.country === 'French Canada') {
      updated.country = 'Canada';
      isUpdated = true;
    }

    // Sync browser cache entries with authentic referenceData values for new fields
    const freshSource = referenceData.find(item => 
      item.title.toLowerCase().trim() === b.title.toLowerCase().trim() && 
      item.author.toLowerCase().trim() === b.author.toLowerCase().trim()
    );

    if (freshSource) {
      // Force sync pages to the authentic database values if they differ
      if (b.pages === undefined || parseInt(b.pages, 10) !== parseInt(freshSource.pages, 10)) {
        updated.pages = freshSource.pages;
        isUpdated = true;
      }
      if (b.originalLanguage === undefined || b.originalLanguage === 'English') {
        if (b.originalLanguage !== freshSource.originalLanguage) {
          updated.originalLanguage = freshSource.originalLanguage;
          isUpdated = true;
        }
      }
      // Force sync descriptions to the new highly-diverse hashed templates if they differ
      if (b.description === undefined || b.description === '' || b.description !== freshSource.description) {
        updated.description = freshSource.description;
        isUpdated = true;
      }
      // Force sync publication year if the cache has the 1950 default placeholder but the source has the true year
      if ((b.year === '1950' || b.year === 1950) && freshSource.year !== '1950') {
        updated.year = freshSource.year;
        isUpdated = true;
      }
    } else {
      // Safe fallbacks for user's custom-added books
      if (b.originalLanguage === undefined) {
        updated.originalLanguage = 'English';
        isUpdated = true;
      }
      if (b.pages === undefined) {
        updated.pages = 250;
        isUpdated = true;
      }
      if (b.description === undefined) {
        updated.description = `A book from ${b.country || 'world literature'}.`;
        isUpdated = true;
      }
    }

    if (isUpdated) {
      needsRepair = true;
    }
    return updated;
  });

  return { repaired, needsRepair };
}

function App() {
  const [books, setBooks] = useState(() => {
    const saved = localStorage.getItem('books_library_master');
    let loadedBooks = initialData;
    if (saved) {
      try {
        loadedBooks = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load books from localStorage, fallback to initialData", e);
      }
    }
    
    const { repaired } = repairBooksList(loadedBooks, initialData);
    return repaired;
  });

  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'saving', 'error'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');

  const handleFilterByText = (text) => {
    setSelectedCountry(prev => prev.trim().toLowerCase() === text.trim().toLowerCase() ? '' : text);
    setActiveTab('list');
  };

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('books_library_theme') || 'dark';
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  const [lastDeletedBook, setLastDeletedBook] = useState(null);

  // Custom Toast helper
  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Sync theme to root element
  useEffect(() => {
    document.documentElement.setAttribute('theme', theme);
    localStorage.setItem('books_library_theme', theme);
  }, [theme]);

  // Disk persistence sync post request
  const postSync = (updatedBooks) => {
    setSyncStatus('saving');
    fetch('/api/books/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedBooks)
    })
      .then(res => {
        if (!res.ok) throw new Error('Sync failed');
        return res.json();
      })
      .then(() => {
        setSyncStatus('synced');
      })
      .catch(err => {
        console.error("Failed to sync books to filesystem:", err);
        setSyncStatus('error');
        showToast("Disk sync failed. Saving locally in browser.", "info");
      });
  };

  // Unified mutator that updates React state, localStorage, and triggers backend sync
  const updateBooksAndSync = (updatedBooks) => {
    setBooks(prevBooks => {
      const nextBooks = typeof updatedBooks === 'function' ? updatedBooks(prevBooks) : updatedBooks;
      localStorage.setItem('books_library_master', JSON.stringify(nextBooks));
      postSync(nextBooks);
      return nextBooks;
    });
  };

  // Sync with filesystem on mount
  useEffect(() => {
    // Fail-safe check: If localStorage has outdated 1950 year placeholders, force repair it immediately
    const saved = localStorage.getItem('books_library_master');
    if (saved) {
      try {
        const loadedBooks = JSON.parse(saved);
        const { repaired, needsRepair } = repairBooksList(loadedBooks, initialData);
        if (needsRepair) {
          localStorage.setItem('books_library_master', JSON.stringify(repaired));
        }
      } catch (e) {
        console.error("Failed to repair initial localStorage state:", e);
      }
    }

    fetch('/api/books')
      .then(res => {
        if (!res.ok) throw new Error('Server returned non-200 status');
        return res.json();
      })
      .then(serverBooks => {
        const { repaired, needsRepair } = repairBooksList(serverBooks, serverBooks);
        setBooks(repaired);
        localStorage.setItem('books_library_master', JSON.stringify(repaired));
        if (needsRepair) {
          postSync(repaired);
        }
        setSyncStatus('synced');
      })
      .catch(err => {
        console.warn("Failed to fetch latest books from server, using local state:", err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1. Toggle Read Checklist Column
  const handleToggleRead = (id) => {
    updateBooksAndSync(prevBooks => {
      const updated = prevBooks.map(b => {
        if (b.id === id) {
          const nextRead = !b.read;
          showToast(
            nextRead ? `"${b.title}" marked as read! Keep it up! 📖` : `"${b.title}" marked as unread.`,
            nextRead ? 'success' : 'info'
          );
          return { ...b, read: nextRead };
        }
        return b;
      });
      return updated;
    });
  };

  // 2. Add / Edit Save Handler
  const handleSaveBook = (savedBook) => {
    if (savedBook.id) {
      // Edit existing
      updateBooksAndSync(prevBooks => 
        prevBooks.map(b => b.id === savedBook.id ? savedBook : b)
      );
      showToast(`Successfully updated "${savedBook.title}" in the library catalog.`);
    } else {
      // Add new
      const nextId = books.length > 0 ? Math.max(...books.map(b => b.id)) + 1 : 1;
      const newBook = { ...savedBook, id: nextId };
      updateBooksAndSync(prevBooks => [newBook, ...prevBooks]);
      showToast(`Added "${newBook.title}" as a new masterwork! ✨`);
    }
    setIsModalOpen(false);
    setEditingBook(null);
  };

  // 3. Delete Book Handler
  const handleDeleteBook = (id) => {
    const targetBook = books.find(b => b.id === id);
    if (!targetBook) return;

    setLastDeletedBook(targetBook);
    updateBooksAndSync(prevBooks => prevBooks.filter(b => b.id !== id));
    
    // Toast with custom action string (we will render an inline undo button)
    showToast(`Deleted "${targetBook.title}".`, 'danger');
  };

  // Undo Delete action
  const handleUndoDelete = () => {
    if (lastDeletedBook) {
      const restoredBook = lastDeletedBook;
      updateBooksAndSync(prevBooks => [restoredBook, ...prevBooks]);
      setLastDeletedBook(null);
      showToast(`Restored "${restoredBook.title}" back to library catalog!`, 'success');
    }
  };

  // 4. Export CSV Utility
  const handleExportCSV = (bookList = books, filename = 'books_library_master.csv') => {
    const headers = ['Title', 'Author', 'Year', 'Country', 'Continent', 'Read', 'OriginalLanguage', 'Pages', 'Description'];
    
    const escapeCSVField = (val) => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        str = str.replace(/"/g, '""');
        return `"${str}"`;
      }
      return str;
    };

    const csvRows = [headers.join(',')];
    
    bookList.forEach(b => {
      const row = [
        escapeCSVField(b.title),
        escapeCSVField(b.author),
        escapeCSVField(b.year),
        escapeCSVField(b.country),
        escapeCSVField(b.continent),
        b.read ? '1' : '', // match user checked standard ("1" or empty)
        escapeCSVField(b.originalLanguage),
        escapeCSVField(b.pages),
        escapeCSVField(b.description)
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\r\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvString], { type: 'text/csv;charset=utf-8;' }); // includes BOM for Excel compatibility
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast(`Successfully downloaded "${filename}" containing ${bookList.length} items.`, 'success');
  };

  // 5. Import CSV Utility & Parsing Engine
  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      
      // Parse CSV logic
      try {
        const rows = parseCSVText(text);
        if (rows.length < 2) {
          showToast('Invalid CSV format. File is empty or lacks data rows.', 'danger');
          return;
        }

        const headers = rows[0].map(h => h.trim().toLowerCase());
        const titleIndex = headers.indexOf('title');
        const authorIndex = headers.indexOf('author');
        const yearIndex = headers.indexOf('year');
        const countryIndex = headers.indexOf('country');
        const continentIndex = headers.indexOf('continent');
        const readIndex = headers.indexOf('read');
        const langIndex = headers.indexOf('originallanguage');
        const pagesIndex = headers.indexOf('pages');
        const descIndex = headers.indexOf('description');

        if (titleIndex === -1 || authorIndex === -1) {
          showToast('Failed to import. Missing required columns: "Title" and "Author".', 'danger');
          return;
        }

        const parsedBooks = [];
        let indexId = 1;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          // Skip empty lines
          if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

          const title = row[titleIndex] || '';
          const author = row[authorIndex] || '';
          if (!title.trim() || !author.trim()) continue; // skip records lacking basic details

          const year = yearIndex !== -1 ? row[yearIndex] || '' : '';
          const country = countryIndex !== -1 ? row[countryIndex] || '' : '';
          const continent = continentIndex !== -1 ? row[continentIndex] || '' : '';
          
          let read = false;
          if (readIndex !== -1 && row[readIndex]) {
            const val = row[readIndex].trim();
            read = val === '1' || val.toLowerCase() === 'true';
          }

          const originalLanguage = langIndex !== -1 ? row[langIndex] || '' : '';
          const pages = pagesIndex !== -1 ? parseInt(row[pagesIndex], 10) || 250 : 250;
          const description = descIndex !== -1 ? row[descIndex] || '' : '';

          parsedBooks.push({
            id: indexId++,
            title: title.trim(),
            author: author.trim(),
            year: year.trim(),
            country: country.trim(),
            continent: continent.trim(),
            read: read,
            originalLanguage: originalLanguage.trim() || 'English',
            pages: pages,
            description: description.trim() || `A book from ${country || 'world literature'}.`
          });
        }

        if (parsedBooks.length === 0) {
          showToast('No valid book entries could be parsed from the CSV file.', 'danger');
          return;
        }

        updateBooksAndSync(parsedBooks);
        showToast(`Successfully loaded library catalog with ${parsedBooks.length} items from CSV!`, 'success');
        // Reset file input
        e.target.value = null;
      } catch (err) {
        console.error("Import processing error:", err);
        showToast('Error parsing file. Ensure it is a standard comma-separated CSV.', 'danger');
      }
    };
    reader.readAsText(file);
  };

  // Robust CSV parser supporting quotes and escaped quotes
  const parseCSVText = (text) => {
    const lines = [];
    let row = [""];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          row[row.length - 1] += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push("");
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n
        }
        lines.push(row);
        row = [""];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }
    return lines;
  };

  return (
    <div className="app-container container-xl py-4">
      
      {/* 1. Glassmorphic Navigation Sticky Header */}
      <header className="navbar navbar-expand-lg glass-card p-3 mb-4 d-flex justify-content-between align-items-center">
        
        {/* Brand Label */}
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div className="brand-icon p-2 rounded-3 text-white" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' }}>
            <BookOpen size={24} />
          </div>
          <div className="brand-title">
            <h1 className="h4 m-0 fw-extrabold" style={{ background: 'linear-gradient(90deg, var(--text-main) 0%, var(--primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Bibliophile
            </h1>
            <p className="small text-muted m-0 fw-semibold text-uppercase tracking-wider" style={{ fontSize: '0.65rem' }}>
              Library Index & tracker
            </p>
          </div>
          
          {/* Sync Status Badge */}
          <div className={`sync-status-badge sync-${syncStatus} ms-md-2`} title="Local Database Synchronization Status">
            <div className="sync-dot"></div>
            <span>
              {syncStatus === 'synced' && 'Filesystem Synced'}
              {syncStatus === 'saving' && 'Saving...'}
              {syncStatus === 'error' && 'Offline (Saved Locally)'}
            </span>
          </div>
        </div>

        {/* Global Catalog Controls */}
        <div className="d-flex align-items-center gap-2 flex-wrap mt-3 mt-lg-0">
          
          {/* CSV Import */}
          <label className="btn btn-outline-secondary d-inline-flex align-items-center gap-2 file-import-label" title="Import an external CSV book backup">
            <Upload size={16} />
            <span>Import Backup CSV</span>
            <input 
              type="file" 
              accept=".csv" 
              className="file-import-input" 
              onChange={handleImportCSV} 
            />
          </label>

          {/* CSV Export */}
          <button className="btn btn-outline-secondary d-inline-flex align-items-center gap-2" onClick={() => handleExportCSV(books, 'books_library_master.csv')} title="Backup your current book directory as a CSV file">
            <Download size={16} />
            <span>Backup as CSV</span>
          </button>

          {/* Add Book shortcut */}
          <button className="btn btn-primary d-inline-flex align-items-center gap-2" onClick={() => { setEditingBook(null); setIsModalOpen(true); }}>
            <Plus size={16} />
            <span>Add Book</span>
          </button>

          {/* Theme switcher */}
          <button 
            className="btn btn-outline-secondary rounded-circle p-2 d-inline-flex align-items-center justify-content-center"
            style={{ width: '38px', height: '38px' }}
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            title="Toggle Visual Theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

        </div>

      </header>

      {/* 2. Visual Navigation Tabs bar */}
      <div className="nav nav-pills gap-2 p-2 rounded mb-4 bg-dark bg-opacity-10 border border-secondary border-opacity-10">
        <button 
          className={`nav-link d-inline-flex align-items-center gap-2 ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <BarChart3 size={16} />
          Analytics Dashboard
        </button>
        <button 
          className={`nav-link d-inline-flex align-items-center gap-2 ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          <List size={16} />
          Book Directory
        </button>
        <button 
          className={`nav-link d-inline-flex align-items-center gap-2 ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <Globe size={16} />
          Interactive Atlas
        </button>
        <button 
          className={`nav-link d-inline-flex align-items-center gap-2 ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <Layers size={16} />
          Curation & Reports
        </button>
      </div>

      {/* 3. Main Dynamic Content Window */}
      <main className="tab-content" style={{ minHeight: '400px' }}>
        {books.length === 0 ? (
          <div className="card glass-card empty-library p-5 text-center d-flex flex-column align-items-center gap-3">
            <div className="empty-library-icon p-4 rounded-circle bg-opacity-10 bg-secondary text-secondary">
              <BookOpen size={48} />
            </div>
            <h2 className="fw-bold mt-2">Your Book Library is Empty</h2>
            <p className="text-muted" style={{ maxWidth: '450px' }}>
              Add a book manually, import your standard CSV database file, or reset back to default.
            </p>
            <div className="d-flex gap-2">
              <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => updateBooksAndSync(initialData)}>
                Restore Default Catalog
              </button>
              <label className="btn btn-outline-secondary d-flex align-items-center gap-2 file-import-label">
                <Upload size={16} />
                Upload CSV File
                <input 
                  type="file" 
                  accept=".csv" 
                  className="file-import-input" 
                  onChange={handleImportCSV} 
                />
              </label>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <Dashboard books={books} />}
            {activeTab === 'list' && (
              <BookTable 
                books={books} 
                onToggleRead={handleToggleRead}
                onEditBook={(book) => { setEditingBook(book); setIsModalOpen(true); }}
                onDeleteBook={handleDeleteBook}
                onAddClick={() => { setEditingBook(null); setIsModalOpen(true); }}
                search={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCountry={selectedCountry}
                onCountryFilterChange={setSelectedCountry}
                selectedLanguage={selectedLanguage}
                onLanguageFilterChange={setSelectedLanguage}
              />
            )}
            {activeTab === 'map' && (
              <MapView 
                books={books}
                onToggleRead={handleToggleRead}
                onExportFilteredCSV={handleExportCSV}
              />
            )}
            {activeTab === 'reports' && (
              <Reports 
                books={books} 
                onToggleRead={handleToggleRead}
                onExportFilteredCSV={handleExportCSV}
                onFilterByText={handleFilterByText}
              />
            )}
          </>
        )}
      </main>

      {/* 4. Sliding Glassmorphic Modal Form */}
      {isModalOpen && (
        <BookModal 
          key={editingBook ? editingBook.id : 'new'}
          book={editingBook} 
          onSave={handleSaveBook} 
          onClose={() => { setIsModalOpen(false); setEditingBook(null); }} 
        />
      )}

      {/* 5. Fluid Micro-Animated Toast Notification */}
      {toast && (
        <div className={`toast-notification toast-${toast.type} d-flex align-items-center gap-2 p-3 border rounded shadow`}>
          {toast.type === 'success' && <CheckCircle2 size={18} className="text-success" />}
          {toast.type === 'danger' && <AlertCircle size={18} className="text-danger" />}
          {toast.type === 'info' && <Info size={18} className="text-info" />}
          
          <span className="fw-semibold small flex-grow-1">
            {toast.message}
          </span>

          {toast.type === 'danger' && lastDeletedBook && (
            <button 
              onClick={handleUndoDelete} 
              className="btn btn-link text-primary fw-bold p-0 text-decoration-underline ms-2"
              style={{ fontSize: '0.85rem' }}
            >
              Undo
            </button>
          )}
        </div>
      )}

    </div>
  );
}

export default App;
