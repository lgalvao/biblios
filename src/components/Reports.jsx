import { useState, useMemo } from 'react';
import { Download, Globe, Calendar, Clock, Check } from 'lucide-react';

export default function Reports({ books, onToggleRead, onExportFilteredCSV, onFilterByText }) {
  const [selectedEra, setSelectedEra] = useState('1800-1899 (19th C)');

  // 1. Report: Top Unread Classics
  // Filter for unread books, sort by year ascending.
  // We need to parse the year properly. If it is negative or has "BC" or is old, we handle it.
  const unreadClassics = useMemo(() => {
    const unread = books.filter(b => !b.read);
    
    const getYearVal = (yearStr) => {
      const isBC = yearStr.toLowerCase().includes('bc') || yearStr.toLowerCase().includes('b.c.');
      const numMatch = yearStr.match(/\d+/);
      if (numMatch) {
        const val = parseInt(numMatch[0]);
        return isBC ? -val : val;
      }
      if (yearStr.toLowerCase().includes("century")) {
        const val = parseInt(yearStr);
        if (val) {
          const calculated = (val * 100) - 50; // midpoint
          return isBC ? -calculated : calculated;
        }
      }
      return 2050; // default for unknown / new
    };

    return [...unread]
      .sort((a, b) => getYearVal(a.year) - getYearVal(b.year))
      .slice(0, 12);
  }, [books]);

  // 2. Report: Most Prolific Countries & Their Reading Progress
  const prolificCountries = useMemo(() => {
    const countryData = {};
    books.forEach(b => {
      if (b.country) {
        if (!countryData[b.country]) {
          countryData[b.country] = { count: 0, read: 0, continent: b.continent };
        }
        countryData[b.country].count++;
        if (b.read) {
          countryData[b.country].read++;
        }
      }
    });

    return Object.entries(countryData)
      .map(([name, data]) => ({
        name,
        count: data.count,
        read: data.read,
        continent: data.continent,
        percentRead: data.count > 0 ? Math.round((data.read / data.count) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [books]);

  // Eras options
  const eraOptions = [
    { label: 'Ancient & Pre-1800', value: 'Pre-1800' },
    { label: '19th Century (1800-1899)', value: '1800-1899 (19th C)' },
    { label: 'Early 20th Century (1900-1949)', value: '1900-1949' },
    { label: 'Mid-Century Modern (1950-1979)', value: '1950-1979' },
    { label: 'Late 20th Century (1980-1999)', value: '1980-1999' },
    { label: '21st Century (2000-Present)', value: '2000-Present' }
  ];

  // 3. Report: Era Time-Capsules
  const eraBooks = useMemo(() => {
    return books.filter(b => {
      const yearStr = b.year;
      const numMatch = yearStr.match(/\d+/);
      let era = '2000-Present';

      if (numMatch) {
        const yr = parseInt(numMatch[0]);
        if (yr < 1800) era = 'Pre-1800';
        else if (yr < 1900) era = '1800-1899 (19th C)';
        else if (yr < 1950) era = '1900-1949';
        else if (yr < 1980) era = '1950-1979';
        else if (yr < 2000) era = '1980-1999';
        else era = '2000-Present';
      } else if (yearStr.toLowerCase().includes("17th") || yearStr.toLowerCase().includes("13th") || yearStr.toLowerCase().includes("2nd") || yearStr.toLowerCase().includes("bc")) {
        era = 'Pre-1800';
      }

      return era === selectedEra;
    });
  }, [books, selectedEra]);

  // Export handlers
  const handleExportUnread = () => {
    // Generate filtered list
    const unread = books.filter(b => !b.read);
    onExportFilteredCSV(unread, 'top_unread_classics.csv');
  };

  const handleExportEra = () => {
    onExportFilteredCSV(eraBooks, `classics_era_${selectedEra.replace(/\s+/g, '_').toLowerCase()}.csv`);
  };

  return (
    <div className="container-fluid px-0 animate-fade">
      
      {/* Upper Grid: Classics & Countries */}
      <div className="row g-4 mb-4">
        
        {/* Card 1: Top Unread Classics */}
        <div className="col-12 col-xl-6">
          <div className="card glass-card border-0 p-4 h-100 d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-2">
                <div className="p-2 rounded bg-opacity-10 bg-warning text-warning d-flex">
                  <Clock size={20} />
                </div>
                <div>
                  <h4 className="h5 mb-0 fw-bold">Top Unread Classics</h4>
                  <p className="small text-muted mb-0">Oldest books still waiting on your list</p>
                </div>
              </div>
              <button 
                className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
                onClick={handleExportUnread}
              >
                <Download size={14} />
                <span>Export Unread</span>
              </button>
            </div>

            <div className="flex-grow-1 overflow-auto pe-1" style={{ maxHeight: '420px' }}>
              <div className="list-group gap-2">
                {unreadClassics.map((b) => (
                  <div 
                    key={b.id} 
                    className="list-group-item d-flex align-items-center justify-content-between p-3 border-0 bg-opacity-10 bg-secondary rounded-3 book-row"
                  >
                    <div className="d-flex align-items-center gap-3 min-w-0 flex-grow-1">
                      <input
                        type="checkbox"
                        className="form-check-input checkbox-custom m-0 flex-shrink-0"
                        checked={b.read}
                        onChange={() => onToggleRead(b.id)}
                      />
                      <div className="min-w-0">
                        <p className="mb-0 fw-bold text-truncate text-main" style={{ fontSize: '0.9rem' }}>
                          {b.title}
                        </p>
                        <p className="mb-0 small text-muted text-truncate">
                          {b.author} • {b.country}
                        </p>
                      </div>
                    </div>
                    <span className="badge bg-secondary ms-2 flex-shrink-0">
                      {b.year}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Most Prolific Countries & Reading Progress */}
        <div className="col-12 col-xl-6">
          <div className="card glass-card border-0 p-4 h-100 d-flex flex-column">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="p-2 rounded bg-opacity-10 bg-info text-info d-flex">
                <Globe size={20} />
              </div>
              <div>
                <h4 className="h5 mb-0 fw-bold">Prolific Literary Countries</h4>
                <p className="small text-muted mb-0">Nations with the most masterworks & your read ratio</p>
              </div>
            </div>

            <div className="flex-grow-1 d-flex flex-column gap-3">
              {prolificCountries.map((c) => (
                <div key={c.name} className="d-flex flex-column gap-1">
                  <div className="d-flex justify-content-between align-items-center small">
                    <div className="d-flex align-items-center gap-2">
                      <span className="fw-bold text-main">{c.name}</span>
                      <span className="badge bg-primary bg-opacity-70" style={{ fontSize: '0.65rem' }}>{c.continent}</span>
                    </div>
                    <div className="text-muted">
                      <span className="fw-bold text-main">{c.read}</span> / {c.count} read
                      <span className="ms-2 text-success fw-bold">{c.percentRead}%</span>
                    </div>
                  </div>
                  {/* Visual Progress Bar */}
                  <div style={{ height: '7px', background: 'var(--border-light)', borderRadius: '99px', overflow: 'hidden', position: 'relative' }}>
                    {/* Total Count Scale (background blue) */}
                    <div style={{ 
                      position: 'absolute', 
                      left: 0, 
                      top: 0, 
                      bottom: 0, 
                      width: `${Math.min((c.count / prolificCountries[0].count) * 100, 100)}%`, 
                      background: 'var(--border-light)', 
                      borderRadius: '99px' 
                    }}></div>
                    {/* Read Count Fill (foreground green) */}
                    <div style={{ 
                      position: 'absolute', 
                      left: 0, 
                      top: 0, 
                      bottom: 0, 
                      width: `${Math.min((c.read / prolificCountries[0].count) * 100, 100)}%`, 
                      background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)', 
                      borderRadius: '99px',
                      transition: 'width 0.8s ease'
                    }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Lower Section: Era Time-Capsule Report */}
      <div className="card glass-card border-0 p-4 mt-4">
        
        {/* Era Header & Controls */}
        <div className="d-flex flex-wrap gap-3 justify-content-between align-items-center pb-3 mb-4 border-bottom border-secondary border-opacity-10">
          <div className="d-flex align-items-center gap-2">
            <div className="p-2 rounded bg-opacity-10 bg-primary text-primary d-flex">
              <Calendar size={20} />
            </div>
            <div>
              <h4 className="h5 mb-0 fw-bold">Era Time-Capsules</h4>
              <p className="small text-muted mb-0">Curation of literature segmented by historical eras</p>
            </div>
          </div>

          <div className="d-flex gap-2 align-items-center flex-wrap">
            {/* Era Selector */}
            <select 
              className="form-select w-auto" 
              style={{ minWidth: '240px', cursor: 'pointer' }}
              value={selectedEra}
              onChange={(e) => setSelectedEra(e.target.value)}
            >
              {eraOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <button className="btn btn-outline-secondary d-inline-flex align-items-center gap-2" onClick={handleExportEra}>
              <Download size={16} />
              <span>Export Era CSV ({eraBooks.length})</span>
            </button>
          </div>
        </div>

        {/* Curation view */}
        <div className="row g-3">
          {eraBooks.slice(0, 12).map((b) => (
            <div key={b.id} className="col-12 col-sm-6 col-md-4 col-xl-3">
              <div 
                className="card glass-card h-100 border-0 p-3 d-flex flex-column justify-content-between book-row position-relative overflow-hidden"
                style={{ minHeight: '140px' }}
              >
                {/* Soft checkmark background for read items */}
                {b.read && (
                  <div className="position-absolute" style={{ right: '-10px', top: '-10px', color: 'hsla(142, 70%, 45%, 0.15)', transform: 'rotate(15deg)', zIndex: 0 }}>
                    <Check size={80} strokeWidth={3} />
                  </div>
                )}

                <div className="position-relative" style={{ zIndex: 1 }}>
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                    <h5 className="h6 fw-bold text-main mb-0" style={{ lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={b.title}>
                      {b.title}
                    </h5>
                    <input
                      type="checkbox"
                      className="form-check-input checkbox-custom m-0 flex-shrink-0"
                      checked={b.read}
                      onChange={() => onToggleRead(b.id)}
                    />
                  </div>
                  <p className="small text-muted mb-0 text-truncate">{b.author}</p>
                </div>

                <div className="d-flex justify-content-between align-items-center mt-3 position-relative" style={{ zIndex: 1 }}>
                  <span 
                    className="badge bg-primary bg-opacity-70 badge-interactive cursor-pointer" 
                    onClick={() => onFilterByText(b.country)}
                    title={`Filter by Country: ${b.country}`}
                  >
                    {b.country}
                  </span>
                  <span className="small text-muted fw-bold">{b.year}</span>
                </div>
              </div>
            </div>
          ))}
          {eraBooks.length === 0 && (
            <div className="col-12 py-5 text-center text-muted">
              No books found in this era category.
            </div>
          )}
        </div>

        {eraBooks.length > 12 && (
          <p className="text-center mt-3 mb-0 small text-muted">
            Showing 12 of {eraBooks.length} books in this capsule. Use the <strong>Book List</strong> tab for the complete paginated view.
          </p>
        )}

      </div>

    </div>
  );
}
