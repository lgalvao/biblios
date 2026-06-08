import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import data from './data/data.json';
import { 
  repairBooksList, 
  parseCSVText, 
  escapeCSVField,
  mapCsvToBooks,
  updateGeoschemeData
} from './utils/dataUtils';

const Dashboard = lazy(() => import('./components/Dashboard'));
const BookTable = lazy(() => import('./components/BookTable'));
const BookModal = lazy(() => import('./components/BookModal'));
const MapView = lazy(() => import('./components/MapView'));
const MappingsEditor = lazy(() => import('./components/MappingsEditor'));
const StatsReportModal = lazy(() => import('./components/StatsReportModal'));
import './App.css';

import { 
  Sun, 
  Moon, 
  Upload, 
  Download, 
  Plus, 
  BookOpen
} from 'lucide-react';

function App() {
  const [books, setBooks] = useState(() => {
    const saved = localStorage.getItem('books_library_master');
    let loadedBooks = data;
    if (saved) {
      try {
        loadedBooks = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load books from localStorage, fallback to data", e);
      }
    }
    
    const { repaired } = repairBooksList(loadedBooks, data);
    return repaired;
  });

  const uniqueAuthors = useMemo(() => {
    return [...new Set(books.map(b => b.author))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [books]);

  const uniqueLanguages = useMemo(() => {
    return [...new Set(books.map(b => b.originalLanguage))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [books]);

  const uniqueTags = useMemo(() => {
    return [...new Set(books.flatMap(b => b.tags || []))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [books]);

  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'saving', 'error'
  const [activeTab, setActiveTab] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState('');

  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [statsBooksList, setStatsBooksList] = useState([]);

  const handleOpenStatsModal = (booksToReport) => {
    setStatsBooksList(booksToReport || books);
    setIsStatsModalOpen(true);
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

  // Sync theme to root element using Bootstrap 5.3+ standard attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
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
    // 1. Initial quick repair of localStorage cache using statically compiled data
    const saved = localStorage.getItem('books_library_master');
    if (saved) {
      try {
        const loadedBooks = JSON.parse(saved);
        const { repaired, needsRepair } = repairBooksList(loadedBooks, data);
        if (needsRepair) {
          localStorage.setItem('books_library_master', JSON.stringify(repaired));
        }
      } catch (e) {
        console.error("Failed to repair initial localStorage state:", e);
      }
    }

    // 2. Fetch custom regions and latest books from server in parallel
    Promise.all([
      fetch('/api/regions')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch custom region mappings');
          return res.json();
        })
        .catch(err => {
          console.warn("Using default geoscheme mappings:", err);
          return null;
        }),
      fetch(`/api/books?t=${Date.now()}`)
        .then(res => {
          if (!res.ok) throw new Error('Server returned non-200 status for books');
          return res.json();
        })
        .catch(err => {
          console.warn("Failed to fetch latest books from server, using local state:", err);
          return null;
        })
    ]).then(([regionData, serverBooks]) => {
      // If we loaded custom mappings, update the utility module
      if (regionData && regionData.geoscheme) {
        updateGeoschemeData(regionData.geoscheme, regionData.aliases);
      }

      // Determine the authoritative books list
      let initialBooks = serverBooks;
      if (!initialBooks) {
        const localSaved = localStorage.getItem('books_library_master');
        if (localSaved) {
          try {
            initialBooks = JSON.parse(localSaved);
          } catch (e) {
            console.error(e);
          }
        }
      }
      if (!initialBooks) {
        initialBooks = data;
      }

      // Repair books using the latest (possibly customized) region mapping
      const { repaired, needsRepair } = repairBooksList(initialBooks, initialBooks);
      setBooks(repaired);
      localStorage.setItem('books_library_master', JSON.stringify(repaired));
      
      if (needsRepair && serverBooks) {
        postSync(repaired);
      }
      setSyncStatus('synced');
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
            nextRead ? `"${b.title}" marked as read!` : `"${b.title}" marked as unread.`,
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
      showToast(`Updated "${savedBook.title}".`);
    } else {
      // Add new
      const nextId = books.length > 0 ? Math.max(...books.map(b => b.id)) + 1 : 1;
      const newBook = { ...savedBook, id: nextId };
      updateBooksAndSync(prevBooks => [newBook, ...prevBooks]);
      showToast(`Added "${newBook.title}".`);
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
    showToast(`Deleted "${targetBook.title}".`, 'danger');
  };

  // Undo Delete action
  const handleUndoDelete = () => {
    if (lastDeletedBook) {
      const restoredBook = lastDeletedBook;
      updateBooksAndSync(prevBooks => [restoredBook, ...prevBooks]);
      setLastDeletedBook(null);
      showToast(`Restored "${restoredBook.title}".`, 'success');
    }
  };

  // 4. Export CSV Utility
  const handleExportCSV = (bookList = books, filename = 'data.csv') => {
    const headers = ['Title', 'Author', 'Year', 'Country', 'Region', 'Continent', 'Read', 'OriginalLanguage', 'Pages', 'Description'];
    const csvRows = [headers.join(',')];
    
    bookList.forEach(b => {
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
        escapeCSVField(b.description)
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\r\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvString], { type: 'text/csv;charset=utf-8;' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 5. Import CSV Utility
  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      try {
        const rows = parseCSVText(text);
        const parsedBooks = mapCsvToBooks(rows);
        if (parsedBooks.length === 0) {
          showToast('No valid book entries found.', 'danger');
          return;
        }
        updateBooksAndSync(parsedBooks);
        showToast(`Loaded ${parsedBooks.length} books.`, 'success');
        e.target.value = null;
      } catch {
        showToast('Error parsing file.', 'danger');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="app-container container-xl py-4">
      
      {/* Header Area */}
      <header className="navbar border rounded shadow-sm p-3 mb-4 d-flex justify-content-between align-items-center bg-light">
        <div className="d-flex align-items-center gap-3">
          <div className="text-primary">
            <BookOpen size={28} />
          </div>
          <div>
            <h1 className="h4 m-0 fw-bold">Biblios</h1>
            <p className="small text-muted m-0 text-uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.1em' }}>Library Tracker</p>
          </div>
          {syncStatus !== 'synced' && (
            <div className={`sync-status-badge sync-${syncStatus} ms-2`}>
              <div className="sync-dot"></div>
              <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                {syncStatus === 'saving' ? 'SAVING...' : 'OFFLINE'}
              </span>
            </div>
          )}
        </div>

        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-sm btn-primary d-flex align-items-center gap-2" onClick={() => { setEditingBook(null); setIsModalOpen(true); }}>
            <Plus size={14} />
            <span>Add Book</span>
          </button>

          <label className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2 m-0 cursor-pointer">
            <Upload size={14} />
            <span className="d-none d-md-inline">Import</span>
            <input type="file" accept=".csv" className="file-import-input" onChange={handleImportCSV} />
          </label>

          <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2" onClick={() => handleExportCSV(books, 'data.csv')}>
            <Download size={14} />
            <span className="d-none d-md-inline">Backup</span>
          </button>

          <button 
            className="btn btn-sm text-secondary border-0 p-1"
            style={{ width: '32px', height: '32px' }}
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Navigation Pills */}
      <ul className="nav nav-pills mb-4 gap-2 bg-light p-1 rounded border shadow-sm">
        {['list', 'dashboard', 'map', 'mappings'].map(tab => (
          <li key={tab} className="nav-item">
            <button 
              className={`nav-link text-uppercase fw-bold px-3 py-2 ${activeTab === tab ? 'active' : 'text-muted'}`}
              style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}
              onClick={() => {
                setActiveTab(tab);
              }}
            >
              {tab === 'list' ? 'Library' : tab === 'map' ? 'Atlas' : tab === 'dashboard' ? 'Dashboard' : 'Atlas Editor'}
            </button>
          </li>
        ))}
      </ul>

      {/* Main Content Area */}
      <main className="animate-fade">
        <Suspense fallback={
          <div className="card shadow-sm p-5 text-center border-0 bg-glass text-muted animate-fade">
            <div className="spinner-border text-primary mx-auto mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mb-0 small fw-medium text-uppercase tracking-wider">Loading Panel...</p>
          </div>
        }>
          {books.length === 0 ? (
            <div className="card shadow-sm p-5 text-center border-0">
              <div className="mb-3 text-muted opacity-25">
                <BookOpen size={64} />
              </div>
              <h2 className="h4 fw-bold">Library is Empty</h2>
              <p className="text-muted mx-auto mb-4" style={{ maxWidth: '400px' }}>
                Your collection is currently empty. You can restore the default catalog or import a CSV file.
              </p>
              <div className="d-flex justify-content-center gap-2">
                <button className="btn btn-primary" onClick={() => updateBooksAndSync(data)}>
                  Restore Default Catalog
                </button>
              </div>
            </div>
          ) : (
            <div>
              {activeTab === 'dashboard' && <Dashboard books={books} onOpenStatsReport={handleOpenStatsModal} />}
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
                  selectedAuthor={selectedAuthor}
                  onAuthorFilterChange={setSelectedAuthor}
                  onShowToast={showToast}
                  onOpenStatsReport={handleOpenStatsModal}
                />
              )}
              {activeTab === 'map' && <MapView books={books} onToggleRead={handleToggleRead} onExportFilteredCSV={handleExportCSV} />}
              {activeTab === 'mappings' && (
                <MappingsEditor 
                  onSyncSuccess={() => showToast("Region mappings saved and synced successfully!", "success")}
                  onSyncError={() => showToast("Failed to save region mappings to disk.", "danger")}
                  onUpdateBooks={updateBooksAndSync}
                />
              )}
            </div>
          )}
        </Suspense>
      </main>

      {/* Modal Overlay */}
      {isModalOpen && (
        <Suspense fallback={
          <div className="modal-backdrop fade show d-flex align-items-center justify-content-center" style={{ zIndex: 1050 }}>
            <div className="spinner-border text-light" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        }>
          <BookModal 
            key={editingBook ? editingBook.id : 'new'}
            book={editingBook} 
            books={books}
            authors={uniqueAuthors}
            languages={uniqueLanguages}
            tags={uniqueTags}
            onSave={handleSaveBook} 
            onClose={() => { setIsModalOpen(false); setEditingBook(null); }} 
          />
        </Suspense>
      )}

      {/* Stats Report Modal */}
      {isStatsModalOpen && (
        <Suspense fallback={
          <div className="modal-backdrop fade show d-flex align-items-center justify-content-center" style={{ zIndex: 1050 }}>
            <div className="spinner-border text-light" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        }>
          <StatsReportModal 
            books={statsBooksList}
            onClose={() => setIsStatsModalOpen(false)}
            onShowToast={showToast}
          />
        </Suspense>
      )}

      {/* Toast Notifications */}
      {toast && (
        <div 
          className={`toast-notification alert alert-${toast.type === 'danger' ? 'danger' : 'primary'} shadow border-0 d-flex align-items-center justify-content-between p-3 rounded-3`}
        >
          <div className="d-flex align-items-center gap-2">
            <span className="small fw-bold text-uppercase">{toast.message}</span>
          </div>
          {toast.type === 'danger' && lastDeletedBook && (
            <button onClick={handleUndoDelete} className="btn btn-sm btn-link text-decoration-none fw-bold p-0 ms-3 text-uppercase" style={{ fontSize: '0.7rem' }}>Undo</button>
          )}
        </div>
      )}

    </div>
  );
}

export default App;