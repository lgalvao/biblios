import { useState, useMemo } from 'react';
import WorldMap from './WorldMap';
import { Search, Download } from 'lucide-react';
import { codeToCountries } from './worldMapData';

export default function MapView({ books, onToggleRead, onExportFilteredCSV }) {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [search, setSearch] = useState('');

  const countryStats = useMemo(() => {
    const stats = {};
    books.forEach(b => {
      if (b.country) {
        if (!stats[b.country]) stats[b.country] = { count: 0, read: 0, books: [] };
        stats[b.country].count++;
        if (b.read) stats[b.country].read++;
        stats[b.country].books.push(b);
      }
    });
    return stats;
  }, [books]);

  const handleCountryClick = (id) => {
    // Resolve ID (could be a code like 'br' or a name)
    let countryName = id;
    if (id && id.length === 2) {
      const names = codeToCountries[id.toLowerCase()];
      if (names) {
        // Try to find a name that matches our dataset exactly first
        const match = names.find(n => countryStats[n]);
        countryName = match || names[0];
      }
    }
    
    setSelectedCountry(selectedCountry === countryName ? null : countryName);
    setSearch('');
  };

  const stats = selectedCountry ? countryStats[selectedCountry] : null;

  const currentBooks = useMemo(() => {
    if (!stats) return [];
    return stats.books.filter(b => 
      !search || 
      b.title.toLowerCase().includes(search.toLowerCase()) || 
      b.author.toLowerCase().includes(search.toLowerCase())
    );
  }, [stats, search]);

  return (
    <div className="animate-fade">
      
      <div className="card shadow-sm border-0 mb-4 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0">Literary Atlas</h5>
          <span className="badge bg-primary rounded-pill">
            {Object.keys(countryStats).length} Countries Explored
          </span>
        </div>
        <WorldMap 
          books={books} 
          selectedCountry={selectedCountry} 
          onCountryClick={handleCountryClick} 
        />
      </div>

      {selectedCountry && (
        <div className="card shadow-sm border-0 animate-fade">
          <div className="card-header bg-white p-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <h5 className="fw-bold mb-0">{selectedCountry}</h5>
              {stats ? (
                <p className="small text-muted mb-0">{stats.read} of {stats.count} books read</p>
              ) : (
                <p className="small text-muted mb-0">No books cataloged from this country yet.</p>
              )}
            </div>
            {stats && (
              <div className="d-flex gap-2 align-items-center">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-light border-end-0"><Search size={14}/></span>
                  <input type="text" className="form-control bg-light border-start-0" placeholder="Filter..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button className="btn btn-sm btn-outline-primary" onClick={() => onExportFilteredCSV(stats.books, `${selectedCountry}_books.csv`)}>
                  <Download size={14} />
                </button>
              </div>
            )}
          </div>
          {stats && (
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                {currentBooks.map(b => (
                  <div key={b.id} className="list-group-item d-flex align-items-center gap-3 py-3">
                    <input type="checkbox" className="form-check-input m-0" checked={b.read} onChange={() => onToggleRead(b.id)} />
                    <div className="flex-grow-1 min-w-0">
                      <div className="fw-bold text-truncate">{b.title}</div>
                      <div className="small text-muted">{b.author}</div>
                    </div>
                    <span className="small text-muted fw-bold">{b.year}</span>
                  </div>
                ))}
                {currentBooks.length === 0 && <div className="p-4 text-center text-muted">No matching titles.</div>}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
