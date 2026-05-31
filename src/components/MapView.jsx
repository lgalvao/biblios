import { useState, useMemo } from 'react';
import WorldMap from './WorldMap';
import { codeToCountries, countryToCode } from './worldMapData';
import { Compass, Download, Globe, Info } from 'lucide-react';

export default function MapView({ books, onToggleRead, onExportFilteredCSV }) {
  const [selectedCountry, setSelectedCountry] = useState('');

  // 1. Handle clicking a country on the map
  const handleCountryClick = (code) => {
    const names = codeToCountries[code];
    if (names && names.length > 0) {
      // Toggle selection or select first matching country name
      // (e.g. 'gb' maps to 'England', let's use the first one 'England' or match against any in dataset)
      // Find the first country name that actually has books in our list
      const actualCountryName = names.find(n => books.some(b => b.country === n)) || names[0];
      setSelectedCountry(actualCountryName);
    } else {
      setSelectedCountry('');
    }
  };

  // 2. Fetch books matching the selected country
  // We should match any name in the codeToCountries array since e.g. clicking 'gb'
  // should show books from England, Scotland, Wales, and Northern Ireland!
  const countryBooks = useMemo(() => {
    if (!selectedCountry) return [];
    
    const code = countryToCode[selectedCountry];
    if (!code) return books.filter(b => b.country === selectedCountry);

    const relatedNames = codeToCountries[code] || [selectedCountry];
    return books.filter(b => relatedNames.includes(b.country));
  }, [books, selectedCountry]);

  // 3. Selected Country KPIs
  const countryStats = useMemo(() => {
    if (countryBooks.length === 0) return { total: 0, read: 0, percent: 0 };
    const total = countryBooks.length;
    const read = countryBooks.filter(b => b.read).length;
    const percent = Math.round((read / total) * 100);
    return { total, read, percent };
  }, [countryBooks]);

  // Export country books to CSV
  const handleExportCountry = () => {
    if (countryBooks.length === 0) return;
    onExportFilteredCSV(countryBooks, `books_${selectedCountry.replace(/\s+/g, '_').toLowerCase()}.csv`);
  };

  return (
    <div className="container-fluid px-0 animate-fade">
      <div className="row g-4">
        
        {/* Map Card Column */}
        <div className="col-12 col-xl-7 col-xxl-8">
          <div className="card glass-card border-0 p-3 h-100 d-flex flex-column gap-3">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <div className="p-2 rounded bg-opacity-10 bg-primary text-primary d-flex">
                  <Compass size={20} />
                </div>
                <div>
                  <h4 className="h5 mb-0 fw-bold">Interactive Literary Atlas</h4>
                  <p className="small text-muted mb-0">Click highlighted countries to browse their contributions</p>
                </div>
              </div>
              {selectedCountry && (
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setSelectedCountry('')}
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Dynamic Vector World Map */}
            <WorldMap 
              books={books}
              selectedCountry={selectedCountry}
              onCountryClick={handleCountryClick}
            />
          </div>
        </div>

        {/* Details Side Panel Column */}
        <div className="col-12 col-xl-5 col-xxl-4">
          <div className="card glass-card border-0 p-4 h-100 d-flex flex-column" style={{ minHeight: '520px' }}>
            
            {!selectedCountry ? (
              /* Empty Selector State */
              <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center gap-3 text-muted py-4 px-2">
                <div className="p-4 rounded-circle bg-opacity-5 bg-secondary text-muted">
                  <Globe size={32} />
                </div>
                <div>
                  <h4 className="h5 fw-bold text-main mb-2">No Country Selected</h4>
                  <p className="small mx-auto mb-0" style={{ maxWidth: '280px' }}>
                    Select any purple-highlighted country on the world map to view its books, details, and tracking indicators.
                  </p>
                </div>
              </div>
            ) : (
              /* Active Curation View */
              <div className="flex-grow-1 d-flex flex-column gap-4">
                
                {/* Header info */}
                <div className="d-flex justify-content-between align-items-start border-bottom border-secondary border-opacity-10 pb-3">
                  <div>
                    <h3 className="h4 fw-extrabold text-main mb-0">{selectedCountry}</h3>
                    <p className="small text-muted mb-0">
                      Total of {countryStats.total} book{countryStats.total > 1 ? 's' : ''} in catalog
                    </p>
                  </div>
                  <button 
                    className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
                    onClick={handleExportCountry}
                    disabled={countryBooks.length === 0}
                  >
                    <Download size={14} />
                    <span>Export CSV</span>
                  </button>
                </div>

                {/* Selected Country KPI Stats Card */}
                <div className="row g-3">
                  
                  <div className="col-6">
                    <div className="card border-0 p-3 h-100" style={{ background: 'rgba(148, 163, 184, 0.02)', border: '1px solid var(--border-light)' }}>
                      <p className="small text-muted mb-1 fw-semibold">Completed</p>
                      <h4 className="h5 mb-2 fw-extrabold text-success">
                        {countryStats.percent}%
                      </h4>
                      <div className="progress" style={{ height: '4px' }}>
                        <div className="progress-bar bg-success" role="progressbar" style={{ width: `${countryStats.percent}%` }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="col-6">
                    <div className="card border-0 p-3 h-100" style={{ background: 'rgba(148, 163, 184, 0.02)', border: '1px solid var(--border-light)' }}>
                      <p className="small text-muted mb-1 fw-semibold">Read History</p>
                      <h4 className="h5 mb-0 fw-extrabold text-main">
                        {countryStats.read} <span className="small text-muted fw-normal">/ {countryStats.total}</span>
                      </h4>
                    </div>
                  </div>

                </div>

                {/* Books Scrolling List */}
                <div className="d-flex flex-column gap-2 flex-grow-1 overflow-auto pe-1" style={{ maxHeight: '310px' }}>
                  <h5 className="small fw-bold text-muted text-uppercase tracking-wider mb-1">Book Curation</h5>
                  
                  {countryBooks.length === 0 ? (
                    <div className="alert alert-warning d-flex align-items-center gap-2 p-3 mb-0 small" role="alert">
                      <Info size={16} />
                      <span>No works preloaded for this country region. Add one!</span>
                    </div>
                  ) : (
                    <div className="list-group gap-2">
                      {countryBooks.map((b) => (
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
                              <p className="mb-0 fw-bold text-truncate text-main" style={{ fontSize: '0.85rem' }}>
                                {b.title}
                              </p>
                              <p className="mb-0 small text-muted text-truncate">
                                {b.author} • {b.year}
                              </p>
                            </div>
                          </div>
                          {b.read && (
                            <span className="badge bg-success ms-2 flex-shrink-0" style={{ fontSize: '0.65rem' }}>
                              Read
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
