import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, ArrowUpDown, ChevronUp, ChevronDown, Loader2, X, CheckCircle2, HelpCircle } from 'lucide-react';

const MIN_WIDTHS = {
  read: 55,
  title: 120,
  author: 120,
  year: 70,
  country: 90,
  pages: 80,
  originalLanguage: 90,
  actions: 100
};

export default function BookTable({ 
  books, 
  onToggleRead, 
  onEditBook, 
  onDeleteBook, 
  onAddClick, 
  search, 
  onSearchChange,
  selectedCountry,
  onCountryFilterChange,
  selectedLanguage,
  onLanguageFilterChange
}) {
  const [filterRead, setFilterRead] = useState('all'); // 'all', 'read', 'unread'
  const [filterContinent, setFilterContinent] = useState('all');

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sorting State
  const [sortColumn, setSortColumn] = useState(null); // 'read', 'title', 'author', 'year', 'country', 'pages', 'originalLanguage'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

  // Expandable Row State
  const [expandedBookId, setExpandedBookId] = useState(null);

  // Column Resizing State
  const [columnWidths, setColumnWidths] = useState({
    read: 80,
    title: 250,
    author: 200,
    year: 100,
    country: 140,
    pages: 110,
    originalLanguage: 130,
    actions: 120
  });

  const [isResizing, setIsResizing] = useState(false);
  const activeResizeCol = useRef(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleResizeStart = (colKey, e) => {
    e.preventDefault();
    e.stopPropagation();
    activeResizeCol.current = colKey;
    startX.current = e.clientX;
    startWidth.current = columnWidths[colKey];
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleResizeMove = (e) => {
      const colKey = activeResizeCol.current;
      if (!colKey) return;
      const deltaX = e.clientX - startX.current;
      const newWidth = Math.max(MIN_WIDTHS[colKey], startWidth.current + deltaX);
      
      setColumnWidths(prev => ({
        ...prev,
        [colKey]: newWidth
      }));
    };

    const handleResizeEnd = () => {
      activeResizeCol.current = null;
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing]);

  // Calculate total table width to keep layout aligned
  const totalTableWidth = useMemo(() => {
    return Object.values(columnWidths).reduce((sum, w) => sum + w, 0);
  }, [columnWidths]);

  // Infinite Scroll State
  const [visibleCount, setVisibleCount] = useState(30);
  const sentinelRef = useRef(null);

  const handleSort = (column) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setVisibleCount(30); // Reset visibleCount on sort change
  };

  const handleSearchChange = (val) => {
    onSearchChange(val);
    setVisibleCount(30); // Reset visibleCount on search
    setExpandedBookId(null);
  };

  const handleCountryFilterChange = (val) => {
    onCountryFilterChange(val);
    setVisibleCount(30);
    setExpandedBookId(null);
  };

  const handleLanguageFilterChange = (val) => {
    onLanguageFilterChange(val);
    setVisibleCount(30);
    setExpandedBookId(null);
  };

  const handleReadFilterChange = (val) => {
    setFilterRead(val);
    setVisibleCount(30); // Reset visibleCount on read filter change
    setExpandedBookId(null);
  };

  const handleContinentFilterChange = (val) => {
    setFilterContinent(val);
    setVisibleCount(30); // Reset visibleCount on continent filter change
    setExpandedBookId(null);
  };

  const handleRowClick = (bookId, e) => {
    // Prevent expanding if clicking on checkmarks, badges, buttons, or drag handles
    if (
      e.target.closest('input') || 
      e.target.closest('button') || 
      e.target.closest('a') || 
      e.target.closest('.badge') ||
      e.target.closest('.resizer-handle')
    ) {
      return;
    }
    setExpandedBookId(prev => prev === bookId ? null : bookId);
  };

  // 1. Gather all unique continents for our filter dropdown
  const continents = useMemo(() => {
    const set = new Set();
    books.forEach(b => {
      if (b.continent) set.add(b.continent);
    });
    return Array.from(set).sort();
  }, [books]);

  // 2. Filter & Search Logic (now includes searching by Original Language)
  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      // Search text match
      const text = search.toLowerCase();
      const matchesSearch = 
        b.title.toLowerCase().includes(text) ||
        b.author.toLowerCase().includes(text) ||
        (b.country && b.country.toLowerCase().includes(text)) ||
        (b.originalLanguage && b.originalLanguage.toLowerCase().includes(text));

      // Explicit Country Filter (exact match, case-insensitive)
      if (selectedCountry && b.country.trim().toLowerCase() !== selectedCountry.trim().toLowerCase()) {
        return false;
      }

      // Explicit Language Filter (exact match, case-insensitive)
      if (selectedLanguage && b.originalLanguage.trim().toLowerCase() !== selectedLanguage.trim().toLowerCase()) {
        return false;
      }

      // Read status filter
      let matchesRead = true;
      if (filterRead === 'read') matchesRead = b.read;
      if (filterRead === 'unread') matchesRead = !b.read;

      // Continent filter
      let matchesContinent = true;
      if (filterContinent !== 'all') matchesContinent = b.continent === filterContinent;

      return matchesSearch && matchesRead && matchesContinent;
    });
  }, [books, search, selectedCountry, selectedLanguage, filterRead, filterContinent]);

  // 2.5 Sorting Logic (handles numbers for pages, strings for language)
  const sortedBooks = useMemo(() => {
    if (!sortColumn) return filteredBooks;

    return [...filteredBooks].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (sortColumn === 'read') {
        aVal = a.read ? 1 : 0;
        bVal = b.read ? 1 : 0;
      } else if (sortColumn === 'year') {
        const aNum = parseInt(aVal, 10);
        const bNum = parseInt(bVal, 10);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          aVal = aNum;
          bVal = bNum;
        }
      } else if (sortColumn === 'pages') {
        aVal = parseInt(aVal, 10) || 0;
        bVal = parseInt(bVal, 10) || 0;
      } else {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredBooks, sortColumn, sortDirection]);

  // 3. Infinite Scroll Slice
  const visibleBooks = useMemo(() => {
    return sortedBooks.slice(0, visibleCount);
  }, [sortedBooks, visibleCount]);

  // Intersection Observer to trigger loading next batch of books
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((prev) => Math.min(prev + 30, sortedBooks.length));
      }
    }, {
      rootMargin: '200px', // Trigger load 200px before reaching the exact bottom
    });

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [sortedBooks.length, visibleCount]);

  const renderHeader = (label, colKey) => {
    const isSorted = sortColumn === colKey;
    const width = columnWidths[colKey];
    return (
      <th 
        style={{ 
          padding: '1rem 1.25rem', 
          width: `${width}px`, 
          fontWeight: 600, 
          color: isSorted ? 'var(--text-main)' : 'var(--text-muted)', 
          fontSize: '0.85rem',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'color 0.2s, background-color 0.2s',
          position: 'relative'
        }}
        onClick={(e) => {
          if (e.target.closest('.resizer-handle')) return;
          handleSort(colKey);
        }}
        className="sortable-header"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          <span style={{ display: 'inline-flex', opacity: isSorted ? 1 : 0.35, transition: 'opacity 0.2s', color: isSorted ? 'var(--accent)' : 'inherit', flexShrink: 0 }}>
            {isSorted ? (
              sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
            ) : (
              <ArrowUpDown size={12} />
            )}
          </span>
        </div>

        {/* Column resize boundary handle */}
        <div
          className="resizer-handle"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '6px',
            cursor: 'col-resize',
            zIndex: 10,
            background: 'transparent',
            transition: 'background 0.2s'
          }}
          onMouseDown={(e) => handleResizeStart(colKey, e)}
          title="Drag to resize column"
        />
      </th>
    );
  };

  return (
    <div className="table-wrapper animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {isResizing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            cursor: 'col-resize',
            userSelect: 'none',
            pointerEvents: 'auto',
            background: 'transparent'
          }}
        />
      )}
      
      {/* 4. Controls Header */}
      <div className="controls-header d-flex flex-column gap-2 mb-3">
        <div className="row g-3 align-items-center">
          
          {/* Search & Filters */}
          <div className="col-12 col-lg-9 d-flex flex-wrap gap-2 align-items-center">
            
            {/* Search bar */}
            <div className="input-group flex-grow-1" style={{ minWidth: '280px' }}>
              <span className="input-group-text bg-transparent border-end-0 text-muted">
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Search title, author, country, or language..."
                className="form-control border-start-0 ps-0"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="btn btn-outline-secondary border-start-0 text-muted d-flex align-items-center"
                  type="button"
                  title="Clear search filter"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Read/Unread dropdown */}
            <select 
              className="form-select flex-shrink-0" 
              style={{ width: '140px', cursor: 'pointer' }}
              value={filterRead}
              onChange={(e) => handleReadFilterChange(e.target.value)}
            >
              <option value="all">All Reading</option>
              <option value="read">Read</option>
              <option value="unread">Unread</option>
            </select>

            {/* Continent Dropdown */}
            <select 
              className="form-select flex-shrink-0" 
              style={{ width: '160px', cursor: 'pointer' }}
              value={filterContinent}
              onChange={(e) => handleContinentFilterChange(e.target.value)}
            >
              <option value="all">All Continents</option>
              {continents.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

          </div>

          {/* Add Book Button */}
          <div className="col-12 col-lg-3 text-lg-end">
            <button className="btn btn-primary d-inline-flex align-items-center gap-2 w-100 w-lg-auto justify-content-center" onClick={onAddClick}>
              <Plus size={18} />
              <span>Add Book</span>
            </button>
          </div>
        </div>

        {/* Active Explicit Filters row */}
        {(selectedCountry || selectedLanguage) && (
          <div className="d-flex flex-wrap gap-2 align-items-center mt-2 animate-fade">
            <span className="small fw-bold text-muted">Active Filters:</span>
            {selectedCountry && (
              <span className="badge bg-primary d-inline-flex align-items-center gap-1 p-2" style={{ textTransform: 'capitalize' }}>
                📍 Country: {selectedCountry}
                <X 
                  size={12} 
                  style={{ cursor: 'pointer', opacity: 0.8 }} 
                  onClick={() => handleCountryFilterChange('')} 
                />
              </span>
            )}
            {selectedLanguage && (
              <span className="badge bg-secondary d-inline-flex align-items-center gap-1 p-2" style={{ textTransform: 'capitalize' }}>
                🗣️ Language: {selectedLanguage}
                <X 
                  size={12} 
                  style={{ cursor: 'pointer', opacity: 0.8 }} 
                  onClick={() => handleLanguageFilterChange('')} 
                />
              </span>
            )}
            <button 
              onClick={() => { handleCountryFilterChange(''); handleLanguageFilterChange(''); }}
              className="btn btn-link text-danger fw-bold p-0 ms-2 text-decoration-underline"
              style={{ fontSize: '0.75rem' }}
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* 5. The Book Grid Card */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          {visibleBooks.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No books matched your criteria. Try adjusting your filters.
            </div>
          ) : (
            visibleBooks.map((b) => {
              const isEnriched = b.description && !b.description.trim().startsWith("A celebrated work of") && !b.description.trim().startsWith("A masterpiece from") && !b.description.trim().startsWith("A book from");
              const isExpanded = expandedBookId === b.id;
              
              return (
                <div 
                  key={b.id} 
                  className={`glass-card book-card-mobile ${isExpanded ? 'active-card' : ''}`}
                  onClick={(e) => handleRowClick(b.id, e)}
                  style={{
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    cursor: 'pointer',
                    background: b.read ? 'hsla(142, 70%, 45%, 0.02)' : 'var(--card-bg)',
                    border: isExpanded ? '1px solid var(--primary)' : '1px solid var(--card-border)',
                    transition: 'all 0.2s ease',
                    borderRadius: '1rem',
                    position: 'relative',
                    boxShadow: isExpanded ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' : 'var(--shadow-sm)'
                  }}
                >
                  {/* Header: Checkbox + Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    {/* Read toggle */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        className="checkbox-custom"
                        checked={b.read}
                        onChange={() => onToggleRead(b.id)}
                      />
                      <span>{b.read ? 'Read' : 'Mark as Read'}</span>
                    </label>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.35rem 0.65rem', minWidth: 'auto' }}
                        onClick={() => onEditBook(b)}
                        title="Edit Book Details"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '0.35rem 0.65rem', minWidth: 'auto' }}
                        onClick={() => onDeleteBook(b.id)}
                        title="Delete Book"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Title & Author */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: '1.3' }}>
                        {b.title}
                      </h4>
                      {isEnriched ? (
                        <CheckCircle2 
                          size={14} 
                          style={{ color: '#10b981', flexShrink: 0, marginTop: '0.15rem' }} 
                          title="Verified Authentic Metadata"
                        />
                      ) : (
                        <HelpCircle 
                          size={14} 
                          style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '0.15rem', opacity: 0.45 }} 
                          title="Basic Placeholder Metadata"
                        />
                      )}
                    </div>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {b.author}
                    </p>
                  </div>

                  {/* Book Metadata Badge Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.5rem',
                    fontSize: '0.8rem',
                    background: 'rgba(148, 163, 184, 0.03)',
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--border-light)'
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Published</span>
                      <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>📅 {b.year}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Length</span>
                      <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>📖 {b.pages} pages</span>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Region / Country</span>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span 
                          className={`badge bg-primary badge-interactive ${selectedCountry && selectedCountry.trim().toLowerCase() === b.country.trim().toLowerCase() ? 'active-badge' : ''}`} 
                          style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          onClick={() => handleCountryFilterChange(selectedCountry && selectedCountry.trim().toLowerCase() === b.country.trim().toLowerCase() ? '' : b.country)}
                        >
                          📍 {b.country}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({b.continent})</span>
                      </div>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Original Language</span>
                      <span 
                        className={`badge bg-secondary badge-interactive ${selectedLanguage && selectedLanguage.trim().toLowerCase() === b.originalLanguage.trim().toLowerCase() ? 'active-badge' : ''}`} 
                        style={{ textTransform: 'capitalize', display: 'inline-block' }}
                        onClick={() => handleLanguageFilterChange(selectedLanguage && selectedLanguage.trim().toLowerCase() === b.originalLanguage.trim().toLowerCase() ? '' : b.originalLanguage)}
                      >
                        🗣️ {b.originalLanguage}
                      </span>
                    </div>
                  </div>

                  {/* Tap to expand summary hint */}
                  {!isExpanded && b.description && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center', marginTop: '0.25rem', opacity: 0.85 }}>
                      <span>✨ Tap card to read literary summary</span>
                    </div>
                  )}

                  {/* Collapsible summary drawer inside card */}
                  {isExpanded && (
                    <div 
                      style={{ 
                        marginTop: '0.25rem',
                        padding: '1rem', 
                        background: 'var(--card-bg)', 
                        border: '1px solid var(--card-border)', 
                        borderRadius: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                        animation: 'expandSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h5 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Literary Summary
                        </h5>
                      </div>
                      <p style={{ 
                        fontSize: '0.85rem', 
                        color: 'var(--text-main)', 
                        lineHeight: '1.5', 
                        margin: 0, 
                        fontStyle: 'italic', 
                        borderLeft: '3px solid var(--primary)', 
                        paddingLeft: '0.85rem' 
                      }}>
                        "{b.description || 'No summary or blurb preloaded for this literary work.'}"
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Sentinel for mobile infinite scroll */}
          {visibleCount < sortedBooks.length && (
            <div ref={sentinelRef} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" size={18} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Loading more books...</span>
              </div>
            </div>
          )}

          {/* Status Footer */}
          <div style={{ 
            padding: '1rem 1.25rem', 
            display: 'flex', 
            flexDirection: 'column',
            gap: '0.5rem',
            alignItems: 'center', 
            borderTop: '1px solid var(--border-light)', 
            background: 'rgba(148, 163, 184, 0.02)',
            borderRadius: '1rem'
          }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Showing {Math.min(visibleCount, sortedBooks.length)} of {sortedBooks.length} books
            </span>

            {visibleCount >= sortedBooks.length && sortedBooks.length > 0 ? (
              <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                ✓ All {sortedBooks.length} books fully loaded
              </span>
            ) : sortedBooks.length > 0 ? (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Scroll down to discover more
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="table table-hover align-middle m-0 border-0" style={{ width: `${totalTableWidth}px`, tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: 'rgba(148, 163, 184, 0.04)', borderBottom: '1px solid var(--border-light)' }}>
                  {renderHeader('Read', 'read')}
                  {renderHeader('Title', 'title')}
                  {renderHeader('Author', 'author')}
                  {renderHeader('Year', 'year')}
                  {renderHeader('Country', 'country')}
                  {renderHeader('Pages', 'pages')}
                  {renderHeader('Language', 'originalLanguage')}
                  <th 
                    style={{ 
                      padding: '1rem 1.25rem', 
                      width: `${columnWidths.actions}px`, 
                      fontWeight: 600, 
                      color: 'var(--text-muted)', 
                      fontSize: '0.85rem', 
                      textAlign: 'left',
                      position: 'relative'
                    }}
                  >
                    <span>Actions</span>
                    <div
                      className="resizer-handle"
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: '6px',
                        cursor: 'col-resize',
                        zIndex: 10,
                        background: 'transparent',
                        transition: 'background 0.2s'
                      }}
                      onMouseDown={(e) => handleResizeStart('actions', e)}
                      title="Drag to resize column"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleBooks.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', width: `${totalTableWidth}px` }}>
                      No books matched your criteria. Try adjusting your filters.
                    </td>
                  </tr>
                ) : (
                  visibleBooks.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td colSpan={8} style={{ padding: 0 }}>
                        {/* Row Header */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                          <tbody>
                            <tr 
                              style={{ 
                                background: b.read ? 'hsla(142, 70%, 45%, 0.01)' : 'transparent',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                              }}
                              className={`book-row ${expandedBookId === b.id ? 'active-row' : ''}`}
                              onClick={(e) => handleRowClick(b.id, e)}
                            >
                              {/* Read Checkbox */}
                              <td style={{ padding: '0.85rem 1.25rem', width: `${columnWidths.read}px`, verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <input
                                  type="checkbox"
                                  className="checkbox-custom"
                                  checked={b.read}
                                  onChange={() => onToggleRead(b.id)}
                                />
                              </td>
                              
                              {/* Title */}
                              <td style={{ padding: '0.85rem 1.25rem', width: `${columnWidths.title}px`, fontWeight: 600, color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', width: '100%' }}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{b.title}</span>
                                  {(() => {
                                    const isEnriched = b.description && !b.description.trim().startsWith("A celebrated work of") && !b.description.trim().startsWith("A masterpiece from") && !b.description.trim().startsWith("A book from");
                                    return isEnriched ? (
                                      <CheckCircle2 
                                        size={13} 
                                        style={{ color: '#10b981', flexShrink: 0, opacity: 0.85 }} 
                                        title="Verified Authentic Metadata (enriched from local Calibre database or online sources)"
                                      />
                                    ) : (
                                      <HelpCircle 
                                        size={13} 
                                        style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.45 }} 
                                        title="Basic Placeholder Metadata (enrichment API download pending)"
                                      />
                                    );
                                  })()}
                                </div>
                              </td>
                              
                              {/* Author */}
                              <td style={{ padding: '0.85rem 1.25rem', width: `${columnWidths.author}px`, color: 'var(--text-muted)', fontWeight: 500, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {b.author}
                              </td>
                              
                              {/* Year */}
                              <td style={{ padding: '0.85rem 1.25rem', width: `${columnWidths.year}px`, color: 'var(--text-main)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {b.year}
                              </td>
                              
                              {/* Country Tag */}
                              <td style={{ padding: '0.85rem 1.25rem', width: `${columnWidths.country}px`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {(() => {
                                  const isCountryActive = selectedCountry && selectedCountry.trim().toLowerCase() === b.country.trim().toLowerCase();
                                  return (
                                    <span 
                                      className={`badge bg-primary badge-interactive ${isCountryActive ? 'active-badge' : ''}`} 
                                      style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                      onClick={() => handleCountryFilterChange(isCountryActive ? '' : b.country)}
                                      title={isCountryActive ? `Unfilter ${b.country}` : `Filter by Country: ${b.country}`}
                                    >
                                      {b.country}
                                    </span>
                                  );
                                })()}
                              </td>
  
                              {/* Pages */}
                              <td style={{ padding: '0.85rem 1.25rem', width: `${columnWidths.pages}px`, color: 'var(--text-main)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: 'rgba(148, 163, 184, 0.06)', borderRadius: '0.35rem', border: '1px solid var(--border-light)', whiteSpace: 'nowrap' }}>
                                  {b.pages}
                                </span>
                              </td>
  
                              {/* Original Language */}
                              <td style={{ padding: '0.85rem 1.25rem', width: `${columnWidths.originalLanguage}px`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {(() => {
                                  const isLangActive = selectedLanguage && selectedLanguage.trim().toLowerCase() === b.originalLanguage.trim().toLowerCase();
                                  return (
                                    <span 
                                      className={`badge bg-secondary badge-interactive ${isLangActive ? 'active-badge' : ''}`} 
                                      style={{ textTransform: 'capitalize', display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                      onClick={() => handleLanguageFilterChange(isLangActive ? '' : b.originalLanguage)}
                                      title={isLangActive ? `Unfilter ${b.originalLanguage}` : `Filter by Language: ${b.originalLanguage}`}
                                    >
                                      {b.originalLanguage}
                                    </span>
                                  );
                                })()}
                              </td>
                              
                              {/* Actions */}
                              <td style={{ padding: '0.85rem 1.25rem', width: `${columnWidths.actions}px`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button 
                                    className="btn btn-secondary" 
                                    style={{ padding: '0.35rem 0.65rem' }}
                                    onClick={() => onEditBook(b)}
                                    title="Edit Book Details"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button 
                                    className="btn btn-danger" 
                                    style={{ padding: '0.35rem 0.65rem' }}
                                    onClick={() => onDeleteBook(b.id)}
                                    title="Delete Book"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
  
                            {/* Expanded Content Drawer */}
                            {expandedBookId === b.id && (
                              <tr style={{ background: 'rgba(148, 163, 184, 0.015)' }}>
                                <td colSpan={8} style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-light)' }}>
                                  <div 
                                    className="glass-card" 
                                    style={{ 
                                      padding: '1.25rem 1.5rem', 
                                      background: 'var(--card-bg)', 
                                      border: '1px solid var(--card-border)', 
                                      borderRadius: '0.75rem',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '0.75rem',
                                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                                      animation: 'expandSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                                    }}
                                  >
                                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                      <h5 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Book Overview
                                      </h5>
                                      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        <span><strong>Volume Length:</strong> {b.pages} pages</span>
                                        <span>•</span>
                                        <span><strong>Original Language:</strong> {b.originalLanguage}</span>
                                        <span>•</span>
                                        <span><strong>Geographic Region:</strong> {b.continent}</span>
                                      </div>
                                    </div>
                                    
                                    <p style={{ 
                                      fontSize: '0.85rem', 
                                      color: 'var(--text-main)', 
                                      lineHeight: '1.5', 
                                      margin: 0, 
                                      fontStyle: 'italic', 
                                      borderLeft: '3px solid var(--primary)', 
                                      paddingLeft: '0.85rem' 
                                    }}>
                                      "{b.description || 'No summary or blurb preloaded for this literary work.'}"
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  ))
                )}
  
                {/* Sentinel indicator row for infinite scroll trigger */}
                {visibleCount < sortedBooks.length && (
                  <tr ref={sentinelRef}>
                    <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(148, 163, 184, 0.01)', width: `${totalTableWidth}px` }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', justifyContent: 'center' }}>
                        <Loader2 className="animate-spin" size={18} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Loading more books...</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
  
          {/* 6. Infinite Scroll Status Footer */}
          <div style={{ padding: '1rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', background: 'rgba(148, 163, 184, 0.02)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Showing {Math.min(visibleCount, sortedBooks.length)} of {sortedBooks.length} books
            </span>
  
            {visibleCount >= sortedBooks.length && sortedBooks.length > 0 ? (
              <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                ✓ All {sortedBooks.length} books fully loaded
              </span>
            ) : sortedBooks.length > 0 ? (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                Scroll down to discover more
              </span>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
}
