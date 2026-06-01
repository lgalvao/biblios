import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, ChevronUp, ChevronDown, ArrowUpDown, X, CheckCircle2, HelpCircle } from 'lucide-react';

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
  const [filterRead, setFilterRead] = useState('all');
  const [filterContinent, setFilterContinent] = useState('all');
  const [filterRegion, setFilterRegion] = useState('all');

  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [expandedBookId, setExpandedBookId] = useState(null);

  const [visibleCount, setVisibleCount] = useState(50);
  const sentinelRef = useRef(null);

  const handleSort = (col) => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const s = search.toLowerCase();
      const matchesSearch = !search || 
        b.title.toLowerCase().includes(s) || 
        b.author.toLowerCase().includes(s) || 
        b.country.toLowerCase().includes(s) ||
        b.originalLanguage.toLowerCase().includes(s);

      const matchesRead = filterRead === 'all' || (filterRead === 'read' ? b.read : !b.read);
      const matchesContinent = filterContinent === 'all' || b.continent === filterContinent;
      const matchesRegion = filterRegion === 'all' || b.region === filterRegion;
      const matchesFilterCountry = !selectedCountry || b.country.toLowerCase() === selectedCountry.toLowerCase();
      const matchesFilterLang = !selectedLanguage || b.originalLanguage.toLowerCase() === selectedLanguage.toLowerCase();

      return matchesSearch && matchesRead && matchesContinent && matchesRegion && matchesFilterCountry && matchesFilterLang;
    });
  }, [books, search, filterRead, filterContinent, filterRegion, selectedCountry, selectedLanguage]);

  const sortedBooks = useMemo(() => {
    if (!sortColumn) return filteredBooks;
    return [...filteredBooks].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredBooks, sortColumn, sortDirection]);

  const visibleBooks = sortedBooks.slice(0, visibleCount);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => prev + 50);
      }
    });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [sortedBooks.length]);

  const continents = useMemo(() => [...new Set(books.map(b => b.continent))].filter(Boolean).sort(), [books]);
  const regions = useMemo(() => [...new Set(books.map(b => b.region))].filter(Boolean).sort(), [books]);

  const renderSortIcon = (col) => {
    if (sortColumn !== col) return <ArrowUpDown size={12} className="ms-1 opacity-50" />;
    return sortDirection === 'asc' ? <ChevronUp size={12} className="ms-1" /> : <ChevronDown size={12} className="ms-1" />;
  };

  return (
    <div className="card shadow-sm border-0 rounded-3 overflow-hidden">
      
      {/* Controls */}
      <div className="card-header bg-white border-bottom p-3">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-4">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-end-0 text-muted">
                <Search size={14} />
              </span>
              <input 
                type="text" 
                className="form-control border-start-0 bg-light" 
                placeholder="Search library..." 
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              {search && (
                <button className="btn btn-outline-secondary border-start-0" onClick={() => onSearchChange('')}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="col-6 col-md-2">
            <select className="form-select form-select-sm bg-light" value={filterRead} onChange={(e) => setFilterRead(e.target.value)}>
              <option value="all">All Reading</option>
              <option value="read">Read</option>
              <option value="unread">Unread</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <select className="form-select form-select-sm bg-light" value={filterContinent} onChange={(e) => setFilterContinent(e.target.value)}>
              <option value="all">All Continents</option>
              {continents.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <select className="form-select form-select-sm bg-light" value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
              <option value="all">All Regions</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-2 text-end">
            <span className="badge bg-primary rounded-pill">{filteredBooks.length} Books</span>
          </div>
        </div>

        {/* Active Filters Bar */}
        {(selectedCountry || selectedLanguage || filterRead !== 'all' || filterContinent !== 'all' || filterRegion !== 'all') && (
          <div className="d-flex flex-wrap gap-2 mt-3 animate-fade align-items-center">
            <span className="small text-muted fw-bold text-uppercase d-flex align-items-center me-1" style={{ fontSize: '0.6rem', letterSpacing: '0.05em' }}>Active Filters:</span>
            
            {selectedCountry && (
              <span className="badge border border-primary text-primary d-flex align-items-center gap-2 py-2 px-3">
                COUNTRY: {selectedCountry}
                <X size={14} className="cursor-pointer text-danger" onClick={() => onCountryFilterChange('')} />
              </span>
            )}

            {selectedLanguage && (
              <span className="badge border border-info text-info d-flex align-items-center gap-2 py-2 px-3">
                LANGUAGE: {selectedLanguage}
                <X size={14} className="cursor-pointer text-danger" onClick={() => onLanguageFilterChange('')} />
              </span>
            )}

            {filterRead !== 'all' && (
              <span className="badge border border-success text-success d-flex align-items-center gap-2 py-2 px-3">
                STATUS: {filterRead === 'read' ? 'READ' : 'UNREAD'}
                <X size={14} className="cursor-pointer text-danger" onClick={() => setFilterRead('all')} />
              </span>
            )}

            <button className="btn btn-sm btn-link text-primary text-decoration-none fw-bold small p-0 ms-auto text-uppercase" style={{ fontSize: '0.7rem' }} onClick={() => {
              onCountryFilterChange('');
              onLanguageFilterChange('');
              setFilterRead('all');
              setFilterContinent('all');
              setFilterRegion('all');
              onSearchChange('');
            }}>
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
          <thead className="table-light">
            <tr>
              <th className="ps-3" style={{ width: '40px' }}></th>
              <th className="cursor-pointer py-3" onClick={() => handleSort('title')}>
                TITLE {renderSortIcon('title')}
              </th>
              <th className="cursor-pointer py-3" onClick={() => handleSort('author')}>
                AUTHOR {renderSortIcon('author')}
              </th>
              <th className="cursor-pointer py-3 d-none d-lg-table-cell" onClick={() => handleSort('year')}>
                YEAR {renderSortIcon('year')}
              </th>
              <th className="cursor-pointer py-3 d-none d-md-table-cell" onClick={() => handleSort('country')}>
                COUNTRY {renderSortIcon('country')}
              </th>
              <th className="cursor-pointer py-3 d-none d-lg-table-cell" onClick={() => handleSort('pages')}>
                PAGES {renderSortIcon('pages')}
              </th>
              <th className="cursor-pointer py-3 d-none d-xl-table-cell" onClick={() => handleSort('region')}>
                REGION {renderSortIcon('region')}
              </th>
              <th className="text-end pe-3 py-3">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {visibleBooks.map(b => (
              <React.Fragment key={b.id}>
                <tr className={expandedBookId === b.id ? 'table-primary' : ''}>
                  <td className="ps-3">
                    <input 
                      type="checkbox" 
                      className="form-check-input" 
                      checked={b.read} 
                      onChange={() => onToggleRead(b.id)} 
                    />
                  </td>
                  <td className="fw-bold cursor-pointer" onClick={() => setExpandedBookId(expandedBookId === b.id ? null : b.id)}>
                    {b.title}
                  </td>
                  <td className="text-muted">{b.author}</td>
                  <td className="d-none d-lg-table-cell">{b.year}</td>
                  <td className="d-none d-md-table-cell">
                    <span className="badge border border-secondary text-secondary badge-interactive" onClick={() => onCountryFilterChange(b.country)}>
                      {b.country}
                    </span>
                  </td>
                  <td className="d-none d-lg-table-cell text-muted">{b.pages}</td>
                  <td className="d-none d-xl-table-cell text-muted">{b.region}</td>
                  <td className="text-end pe-3">
                    <div className="btn-group btn-group-sm">
                      <button 
                        className="btn btn-outline-secondary border-0" 
                        style={{ padding: '0.4rem' }} 
                        onClick={() => onEditBook(b)}
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="btn btn-outline-secondary border-0" 
                        style={{ padding: '0.4rem' }} 
                        onClick={() => onDeleteBook(b.id)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedBookId === b.id && (
                  <tr key={`${b.id}-expanded`} className="animate-fade">
                    <td colSpan={8} className="p-0 border-0">
                      <div className="p-4 border-bottom" style={{ background: 'var(--bs-tertiary-bg)' }}>
                        <div className="row g-4">
                          <div className="col-12 col-md-8">
                            <h6 className="fw-bold text-uppercase small text-muted mb-2">Description</h6>
                            <p className="mb-0" style={{ lineHeight: '1.6', textAlign: 'justify' }}>
                              {b.description || 'No description available for this work.'}
                            </p>
                          </div>
                          <div className="col-12 col-md-4 border-start">
                            <h6 className="fw-bold text-uppercase small text-muted mb-2">Detailed Info</h6>
                            <ul className="list-unstyled small mb-0 d-flex flex-column gap-1">
                              <li><strong>Volume:</strong> {b.pages} pages</li>
                              <li><strong>Original Language:</strong> {b.originalLanguage}</li>
                              <li><strong>Geographic Origin:</strong> {b.country} ({b.region})</li>
                              <li><strong>Continent:</strong> {b.continent}</li>
                              <li className="mt-2">
                                <span className={`badge ${b.read ? 'bg-success-subtle text-success border border-success' : 'bg-warning-subtle text-warning border border-warning'}`}>
                                  {b.read ? '✓ Completed' : '○ To Read'}
                                </span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            <tr ref={sentinelRef}>
              <td colSpan={8} className="text-center p-4 text-muted small">
                {visibleCount < sortedBooks.length ? 'Loading more...' : 'End of collection'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
