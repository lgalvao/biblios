import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

export default function Stats({ books }) {
  const [searchTerm, setSearchQuery] = useState('');
  const sortConfig = { key: 'count', direction: 'desc' };

  const stats = useMemo(() => {
    const data = {
      country: {},
      region: {},
      continent: {},
      language: {},
      century: {}
    };

    books.forEach(b => {
      // 1. By Country
      if (b.country) data.country[b.country] = (data.country[b.country] || 0) + 1;
      
      // 2. By Region
      if (b.region) data.region[b.region] = (data.region[b.region] || 0) + 1;
      
      // 3. By Continent
      if (b.continent) data.continent[b.continent] = (data.continent[b.continent] || 0) + 1;
      
      // 4. By Language
      if (b.originalLanguage) data.language[b.originalLanguage] = (data.language[b.originalLanguage] || 0) + 1;
      
      // 5. By Century
      const yrMatch = String(b.year || '').match(/\d+/);
      if (yrMatch) {
        const yr = parseInt(yrMatch[0], 10);
        const century = Math.floor((yr - 1) / 100) + 1;
        const centuryLabel = `${century}${getOrdinal(century)} Century`;
        data.century[centuryLabel] = (data.century[centuryLabel] || 0) + 1;
      } else {
        data.century['Unknown'] = (data.century['Unknown'] || 0) + 1;
      }
    });

    const format = (obj) => Object.entries(obj).map(([label, count]) => ({ label, count }));

    return {
      country: format(data.country),
      region: format(data.region),
      continent: format(data.continent),
      language: format(data.language),
      century: format(data.century)
    };
  }, [books]);

  function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return (s[(v - 20) % 10] || s[v] || s[0]);
  }


  const renderTable = (title, items) => {
    const filtered = items.filter(i => i.label.toLowerCase().includes(searchTerm.toLowerCase()));
    const sorted = [...filtered].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return (
      <div className="card shadow-sm border-0 h-100">
        <div className="card-header bg-white py-3">
          <h6 className="fw-bold mb-0 text-uppercase small text-muted">{title}</h6>
        </div>
        <div className="table-responsive" style={{ maxHeight: '400px' }}>
          <table className="table table-hover table-sm mb-0 align-middle">
            <tbody>
              {sorted.map((item, idx) => (
                <tr key={idx} className="cursor-default">
                  <td className="ps-3 fw-medium py-2">{item.label}</td>
                  <td className="text-end pe-3 py-2">
                    <span className="badge bg-primary bg-opacity-10 text-primary fw-bold" style={{ fontSize: '0.75rem' }}>{item.count}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade">
      
      {/* Header with Search */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <h5 className="fw-bold mb-0">Collection Analytics</h5>
        <div className="input-group input-group-sm" style={{ maxWidth: '300px' }}>
          <span className="input-group-text bg-white border-end-0 text-muted"><Search size={14}/></span>
          <input 
            type="text" 
            className="form-control border-start-0" 
            placeholder="Search stats..." 
            value={searchTerm} 
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-md-6 col-xl-4">{renderTable('Countries', stats.country)}</div>
        <div className="col-12 col-md-6 col-xl-4">{renderTable('Regions', stats.region)}</div>
        <div className="col-12 col-md-6 col-xl-4">{renderTable('Continents', stats.continent)}</div>
        <div className="col-12 col-md-6 col-xl-6">{renderTable('Original Languages', stats.language)}</div>
        <div className="col-12 col-md-6 col-xl-6">{renderTable('Chronology (Centuries)', stats.century)}</div>
      </div>

    </div>
  );
}
