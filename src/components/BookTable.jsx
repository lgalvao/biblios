import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Edit2, Trash2, ChevronUp, ChevronDown, ArrowUpDown, X, Download, FileText, Calendar, Copy } from 'lucide-react';
import { escapeCSVField, formatMDExport, normalizeForSearch, sortBooks } from '../utils/dataUtils';
import { exportPDFReport } from '../utils/pdfGenerator';
import CountryFlag from './CountryFlag';

export default function BookTable({ 
  books, 
  onToggleRead, 
  onEditBook, 
  onDeleteBook, 
  search, 
  onSearchChange,
  selectedCountry,
  onCountryFilterChange,
  selectedLanguage,
  onLanguageFilterChange,
  onShowToast
}) {
  const [filterRead, setFilterRead] = useState('all');
  const [filterContinent, setFilterContinent] = useState('all');
  const [filterRegion, setFilterRegion] = useState('all');

  const [sortColumn, setSortColumn] = useState('title');
  const [sortDirection, setSortDirection] = useState('asc');
  const [expandedBookId, setExpandedBookId] = useState(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const [visibleCount, setVisibleCount] = useState(50);
  const [deletingId, setDeletingId] = useState(null);
  const sentinelRef = useRef(null);
  const dropdownRef = useRef(null);
  const deleteTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    };
  }, []);

  const handleDeleteClick = (e, bookId) => {
    e.stopPropagation();
    if (deletingId === bookId) {
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
      onDeleteBook(bookId);
      setDeletingId(null);
    } else {
      setDeletingId(bookId);
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = setTimeout(() => {
        setDeletingId(null);
      }, 3000);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      const s = normalizeForSearch(search);
      const matchesSearch = !s || 
        normalizeForSearch(b.title).includes(s) || 
        normalizeForSearch(b.author).includes(s) || 
        normalizeForSearch(b.country).includes(s) ||
        normalizeForSearch(b.originalLanguage).includes(s);

      const matchesRead = filterRead === 'all' || (filterRead === 'read' ? b.read : !b.read);
      const matchesContinent = filterContinent === 'all' || b.continent === filterContinent;
      const matchesRegion = filterRegion === 'all' || b.region === filterRegion;
      const matchesFilterCountry = !selectedCountry || b.country.toLowerCase() === selectedCountry.toLowerCase();
      const matchesFilterLang = !selectedLanguage || b.originalLanguage.toLowerCase() === selectedLanguage.toLowerCase();

      return matchesSearch && matchesRead && matchesContinent && matchesRegion && matchesFilterCountry && matchesFilterLang;
    });
  }, [books, search, filterRead, filterContinent, filterRegion, selectedCountry, selectedLanguage]);

  const exportCSV = () => {
    const headers = ['Title', 'Author', 'Year', 'Country', 'Region', 'Continent', 'Read', 'OriginalLanguage', 'Pages', 'Description'];
    const csvRows = [headers.join(',')];
    
    filteredBooks.forEach(b => {
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
    link.setAttribute('download', 'library_filtered.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportDropdown(false);
  };

  const exportMD = () => {
    const mdString = formatMDExport(filteredBooks);
    const blob = new Blob([mdString], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'library_filtered.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportDropdown(false);
  };

  const copyMDToClipboard = () => {
    const mdString = formatMDExport(filteredBooks);
    
    const showSuccess = () => {
      if (onShowToast) {
        onShowToast("Markdown copied to clipboard!", "success");
      }
    };
    
    const showFailure = (err) => {
      console.error('Failed to copy Markdown: ', err);
      if (onShowToast) {
        onShowToast("Failed to copy Markdown.", "danger");
      }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(mdString)
        .then(showSuccess)
        .catch(showFailure);
    } else {
      // Fallback method for insecure contexts
      try {
        const textArea = document.createElement("textarea");
        textArea.value = mdString;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          showSuccess();
        } else {
          showFailure("execCommand returned false");
        }
      } catch (err) {
        showFailure(err);
      }
    }
    setShowExportDropdown(false);
  };

  const exportPDF = () => {
    exportPDFReport(filteredBooks);
    setShowExportDropdown(false);
  };

  const sortedBooks = useMemo(() => {
    return sortBooks(filteredBooks, sortColumn, sortDirection);
  }, [filteredBooks, sortColumn, sortDirection]);

  const visibleBooks = sortedBooks.slice(0, visibleCount);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && visibleCount < sortedBooks.length) {
        setVisibleCount(prev => prev + 50);
      }
    });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [sortedBooks.length, visibleCount]);

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
          <div className="col-6 col-md-2 d-flex align-items-center justify-content-end gap-2">
            <div className="position-relative" ref={dropdownRef}>
              <button 
                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                title="Export"
              >
                <Download size={14} />
                <span className="d-none d-lg-inline">Export</span>
              </button>
              {showExportDropdown && (
                <ul className="dropdown-menu show position-absolute end-0 mt-1 shadow-sm" style={{ zIndex: 1000, minWidth: '120px' }}>
                  <li>
                    <button className="dropdown-item d-flex align-items-center gap-2" onClick={exportCSV}>
                      <FileText size={14} className="text-secondary" />
                      <span>CSV</span>
                    </button>
                  </li>
                  <li>
                    <button className="dropdown-item d-flex align-items-center gap-2" onClick={exportMD}>
                      <FileText size={14} className="text-secondary" />
                      <span>MD (Download)</span>
                    </button>
                  </li>
                  <li>
                    <button className="dropdown-item d-flex align-items-center gap-2" onClick={copyMDToClipboard}>
                      <Copy size={14} className="text-secondary" />
                      <span>Copy MD</span>
                    </button>
                  </li>
                  <li>
                    <button className="dropdown-item d-flex align-items-center gap-2" onClick={exportPDF}>
                      <FileText size={14} className="text-secondary" />
                      <span>PDF</span>
                    </button>
                  </li>
                </ul>
              )}
            </div>
            <span className="badge bg-primary rounded-pill">{filteredBooks.length} Books</span>
          </div>
        </div>

        {/* Mobile-only Sort Bar */}
        <div className="d-flex d-md-none align-items-center gap-2 mt-3 pt-2 border-top">
          <span className="small text-muted fw-bold text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Sort:</span>
          <select 
            className="form-select form-select-sm bg-light py-1" 
            style={{ fontSize: '0.75rem', width: 'auto', border: '1px solid var(--bs-border-color)' }}
            value={sortColumn} 
            onChange={(e) => setSortColumn(e.target.value)}
          >
            <option value="title">Title</option>
            <option value="author">Author</option>
            <option value="year">Year</option>
            <option value="country">Country</option>
            <option value="pages">Pages</option>
            <option value="region">Region</option>
          </select>
          <button 
            className="btn btn-sm btn-outline-secondary py-1 px-2 d-flex align-items-center gap-1"
            style={{ fontSize: '0.7rem' }}
            onClick={() => setSortDirection(dir => dir === 'asc' ? 'desc' : 'asc')}
          >
            {sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            <span className="text-uppercase" style={{ fontSize: '0.6rem', fontWeight: 600 }}>
              {sortDirection}
            </span>
          </button>
        </div>

        {/* Active Filters Bar */}
        {(selectedCountry || selectedLanguage || filterRead !== 'all' || filterContinent !== 'all' || filterRegion !== 'all') && (
          <div className="d-flex flex-wrap gap-2 mt-3 animate-fade align-items-center">
            <span className="small text-muted fw-bold text-uppercase d-flex align-items-center me-1" style={{ fontSize: '0.6rem', letterSpacing: '0.05em' }}>Active Filters:</span>
            
            {selectedCountry && (
              <span className="badge border border-primary text-primary d-flex align-items-center gap-2 py-2 px-3">
                COUNTRY: <CountryFlag countryName={selectedCountry} /> {selectedCountry}
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
      <div className="table-responsive" style={{ maxHeight: 'calc(100vh - 280px)', minHeight: '400px', overflowY: 'auto' }}>
        <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
          <thead className="table-light sticky-top" style={{ zIndex: 10 }}>
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
                <tr 
                  className={expandedBookId === b.id ? 'table-active' : ''}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpandedBookId(expandedBookId === b.id ? null : b.id)}
                >
                  <td className="ps-3" onClick={(e) => e.stopPropagation()} style={{ cursor: 'default' }}>
                    <input 
                      type="checkbox" 
                      className="form-check-input cursor-pointer" 
                      checked={b.read} 
                      onChange={() => onToggleRead(b.id)} 
                    />
                  </td>
                  <td className="fw-bold">
                    {b.title}
                    <div className="d-block d-md-none text-muted fw-normal small mt-1">
                      <div className="mb-1">
                        <span 
                          className="country-link" 
                          onClick={(e) => { e.stopPropagation(); onCountryFilterChange(b.country); }}
                        >
                          <CountryFlag countryName={b.country} /> {b.country}
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-3 text-secondary opacity-75">
                        <span className="d-inline-flex align-items-center gap-1">
                          <FileText size={11} className="opacity-50" />
                          <span>{b.pages}</span>
                        </span>
                        {b.year && (
                          <span className="d-inline-flex align-items-center gap-1">
                            <Calendar size={11} className="opacity-50" />
                            <span>{b.year}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-muted">{b.author}</td>
                  <td className="d-none d-lg-table-cell">{b.year}</td>
                  <td className="d-none d-md-table-cell" onClick={(e) => e.stopPropagation()}>
                    <span className="country-link" onClick={() => onCountryFilterChange(b.country)}>
                      <CountryFlag countryName={b.country} /> {b.country}
                    </span>
                  </td>
                  <td className="d-none d-lg-table-cell text-muted">{b.pages}</td>
                  <td className="d-none d-xl-table-cell text-muted">{b.region}</td>
                  <td className="text-end pe-3" onClick={(e) => e.stopPropagation()}>
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
                        className={`btn border-0 transition-all ${deletingId === b.id ? 'btn-danger text-white px-2 fw-bold' : 'btn-outline-secondary text-danger'}`} 
                        style={{ padding: '0.4rem', fontSize: deletingId === b.id ? '0.7rem' : 'inherit' }} 
                        onClick={(e) => handleDeleteClick(e, b.id)}
                        title={deletingId === b.id ? "Confirm delete" : "Delete"}
                      >
                        {deletingId === b.id ? "Sure?" : <Trash2 size={14} />}
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
                            <p className="mb-0" style={{ lineHeight: '1.6', textAlign: 'left' }}>
                              {b.description || 'No description available for this work.'}
                            </p>
                          </div>
                          <div className="col-12 col-md-4 border-start">
                            <h6 className="fw-bold text-uppercase small text-muted mb-2">Detailed Info</h6>
                            <ul className="list-unstyled small mb-0 d-flex flex-column gap-1">
                              <li><strong>Volume:</strong> {b.pages} pages</li>
                              <li><strong>Original Language:</strong> {b.originalLanguage}</li>
                              <li><strong>Geographic Origin:</strong> <CountryFlag countryName={b.country} /> {b.country} ({b.region})</li>
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
              <td colSpan={8} className="text-center p-2 text-muted small border-0">
                {visibleCount < sortedBooks.length ? 'Loading more...' : ''}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
