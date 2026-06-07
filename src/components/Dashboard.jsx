import { useMemo, useState } from 'react';
import { ResponsiveContainer, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Book, CheckCircle, Compass, Globe, Languages, FileText, Search } from 'lucide-react';
import { normalizeForSearch } from '../utils/dataUtils';
import CountryFlag from './CountryFlag';

export default function Dashboard({ books }) {
  const [searchTerm, setSearchQuery] = useState('');

  // 1. Basic Stats & KPI Data
  const stats = useMemo(() => {
    const total = books.length;
    if (total === 0) return null;
    const read = books.filter(b => b.read).length;
    const continentCounts = {};
    const regionCounts = {};
    const countrySet = new Set();
    const langSet = new Set();
    let totalPages = 0;
    let readPages = 0;

    books.forEach(b => {
      if (b.continent) continentCounts[b.continent] = (continentCounts[b.continent] || 0) + 1;
      if (b.region) regionCounts[b.region] = (regionCounts[b.region] || 0) + 1;
      if (b.country) {
        let country = b.country.trim().toLowerCase();
        if (['england', 'scotland', 'wales', 'northern ireland', 'united kingdom', 'uk', 'united kingdom of great britain and northern ireland'].includes(country)) {
          country = 'uk';
        }
        countrySet.add(country);
      }
      if (b.originalLanguage) langSet.add(b.originalLanguage.trim().toLowerCase());
      const p = parseInt(b.pages, 10) || 0;
      totalPages += p;
      if (b.read) readPages += p;
    });

    const topContinent = Object.entries(continentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const regionCount = Object.keys(regionCounts).length;

    return {
      total, read, percent: Math.round((read / total) * 100),
      topContinent, regionCount, countryCount: countrySet.size,
      totalPages, readPages, pagesPercent: Math.round((readPages / totalPages) * 100),
      languageCount: langSet.size
    };
  }, [books]);

  // 2. Charts Data
  const chartData = useMemo(() => {
    const continents = {};
    books.forEach(b => {
      if (b.continent) {
        let name = b.continent;
        if (name === 'North America' || name === 'South America' || name === 'Central America') {
          name = 'Americas';
        }
        continents[name] = (continents[name] || 0) + 1;
      }
    });
    return Object.entries(continents).map(([name, value]) => ({ name, value }));
  }, [books]);

  const eraData = useMemo(() => {
    const eras = {
      'Pre-1850': 0,
      '1850-1874': 0,
      '1875-1899': 0,
      '1900-1924': 0,
      '1925-1949': 0,
      '1950-1974': 0,
      '1975-1999': 0,
      '2000+': 0
    };
    books.forEach(b => {
      const yrMatch = String(b.year || '').match(/\d+/);
      const yr = yrMatch ? parseInt(yrMatch[0], 10) : null;
      
      if (!yr || yr < 1850) eras['Pre-1850']++;
      else if (yr < 1875) eras['1850-1874']++;
      else if (yr < 1900) eras['1875-1899']++;
      else if (yr < 1925) eras['1900-1924']++;
      else if (yr < 1950) eras['1925-1949']++;
      else if (yr < 1975) eras['1950-1974']++;
      else if (yr < 2000) eras['1975-1999']++;
      else eras['2000+']++;
    });
    return Object.entries(eras).map(([name, count]) => ({ name, count }));
  }, [books]);

  // 3. Detailed Analytics Data (from Stats.jsx)
  const detailedStats = useMemo(() => {
    const data = {
      country: {},
      region: {},
      continent: {},
      language: {},
      century: {}
    };

    books.forEach(b => {
      // Country
      if (b.country) {
        let country = b.country.trim();
        const cLower = country.toLowerCase();
        if (['england', 'scotland', 'wales', 'northern ireland', 'united kingdom', 'uk', 'united kingdom of great britain and northern ireland'].includes(cLower)) {
          country = 'UK';
        }
        data.country[country] = (data.country[country] || 0) + 1;
      }
      // Region
      if (b.region) data.region[b.region] = (data.region[b.region] || 0) + 1;
      // Continent
      if (b.continent) {
        let name = b.continent;
        if (name === 'North America' || name === 'South America' || name === 'Central America') {
          name = 'Americas';
        }
        data.continent[name] = (data.continent[name] || 0) + 1;
      }
      // Language
      if (b.originalLanguage) data.language[b.originalLanguage] = (data.language[b.originalLanguage] || 0) + 1;
      
      // Century
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

  if (!stats) return null;

  const COLORS = ['#0d6efd', '#6610f2', '#6f42c1', '#d63384', '#dc3545', '#fd7e14', '#ffc107', '#198754', '#20c997', '#0dcaf0'];

  const renderTable = (title, items) => {
    const s = normalizeForSearch(searchTerm);
    const filtered = items.filter(i => normalizeForSearch(i.label).includes(s));
    const sorted = [...filtered].sort((a, b) => b.count - a.count); // sort desc

    return (
      <div className="card shadow-sm border-0 h-100">
        <div className="card-header bg-white py-3">
          <h6 className="fw-bold mb-0 text-uppercase small text-muted">{title}</h6>
        </div>
        <div className="table-responsive" style={{ maxHeight: '350px' }}>
          <table className="table table-hover table-sm mb-0 align-middle">
            <tbody>
              {sorted.map((item, idx) => (
                <tr key={idx} className="cursor-default">
                  <td className="ps-3 fw-medium py-2">
                    {title === 'Countries' ? <><CountryFlag countryName={item.label} /> {item.label}</> : item.label}
                  </td>
                  <td className="text-end pe-3 py-2">
                    <span className="badge bg-primary bg-opacity-10 text-primary fw-bold" style={{ fontSize: '0.75rem' }}>{item.count}</span>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={2} className="text-center py-3 text-muted small">No matches found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade">
      
      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Books', value: stats.total, icon: <Book size={20}/>, color: 'primary' },
          { label: 'Read Books', value: `${stats.read} (${stats.percent}%)`, icon: <CheckCircle size={20}/>, color: 'success' },
          { label: 'Pages Read', value: `${stats.readPages.toLocaleString()} / ${stats.totalPages.toLocaleString()}`, icon: <FileText size={20}/>, color: 'info' },
          { label: 'Countries', value: stats.countryCount, icon: <Globe size={20}/>, color: 'warning' },
          { label: 'Regions', value: stats.regionCount, icon: <Compass size={20}/>, color: 'danger' },
          { label: 'Languages', value: stats.languageCount, icon: <Languages size={20}/>, color: 'secondary' },
        ].map((kpi, i) => (
          <div key={i} className="col-12 col-sm-6 col-lg-4">
            <div className="card shadow-sm border-0 h-100 p-3">
              <div className="d-flex align-items-center gap-3">
                <div className={`bg-${kpi.color} bg-opacity-10 text-${kpi.color} p-3 rounded`}>
                  {kpi.icon}
                </div>
                <div>
                  <p className="text-muted small mb-0 fw-bold text-uppercase">{kpi.label}</p>
                  <h4 className="fw-bold mb-0">{kpi.value}</h4>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="row g-4 mb-5">
        <div className="col-12 col-xl-6">
          <div className="card shadow-sm border-0 p-4 h-100 d-flex flex-column" style={{ minHeight: '420px' }}>
            <h5 className="fw-bold mb-4 text-uppercase small text-muted">Continents Distribution</h5>
            <div style={{ width: '100%', height: '320px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart 
                  layout="vertical" 
                  data={[...chartData].sort((a, b) => b.value - a.value)} 
                  margin={{ top: 10, right: 30, left: 30, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.1} />
                  <XAxis type="number" axisLine={false} tickLine={false} fontSize={11} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    fontSize={11.5} 
                    width={90}
                  />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={800}>
                    {[...chartData].sort((a, b) => b.value - a.value).map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-6">
          <div className="card shadow-sm border-0 p-4 h-100 d-flex flex-column" style={{ minHeight: '420px' }}>
            <h5 className="fw-bold mb-4 text-uppercase small text-muted">Chronology of Works</h5>
            <div style={{ width: '100%', height: '320px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={eraData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    fontSize={9.5} 
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={45}
                  />
                  <YAxis axisLine={false} tickLine={false} fontSize={11} />
                  <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                  <Bar dataKey="count" fill="#0d6efd" radius={[4, 4, 0, 0]} animationDuration={1000} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analysis Section */}
      <div className="border-top pt-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h5 className="fw-bold mb-1">Collection Analytics</h5>
            <p className="small text-muted mb-0">Detailed breakdown lists for all metrics in your library</p>
          </div>
          <div className="input-group input-group-sm" style={{ maxWidth: '300px' }}>
            <span className="input-group-text bg-white border-end-0 text-muted"><Search size={14}/></span>
            <input 
              type="text" 
              className="form-control border-start-0" 
              placeholder="Search breakdowns..." 
              value={searchTerm} 
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="row g-4">
          <div className="col-12 col-md-6 col-xl-4">{renderTable('Countries', detailedStats.country)}</div>
          <div className="col-12 col-md-6 col-xl-4">{renderTable('Regions', detailedStats.region)}</div>
          <div className="col-12 col-md-6 col-xl-4">{renderTable('Continents', detailedStats.continent)}</div>
          <div className="col-12 col-md-6 col-xl-6">{renderTable('Original Languages', detailedStats.language)}</div>
          <div className="col-12 col-md-6 col-xl-6">{renderTable('Chronology (Centuries)', detailedStats.century)}</div>
        </div>
      </div>

    </div>
  );
}
