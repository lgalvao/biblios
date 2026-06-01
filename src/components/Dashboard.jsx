import { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Book, CheckCircle, Compass, Globe, Languages, FileText } from 'lucide-react';

export default function Dashboard({ books }) {
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
      if (b.country) countrySet.add(b.country.trim().toLowerCase());
      if (b.originalLanguage) langSet.add(b.originalLanguage.trim().toLowerCase());
      const p = parseInt(b.pages, 10) || 250;
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

  const chartData = useMemo(() => {
    const continents = {};
    books.forEach(b => { if (b.continent) continents[b.continent] = (continents[b.continent] || 0) + 1; });
    return Object.entries(continents).map(([name, value]) => ({ name, value }));
  }, [books]);

  const eraData = useMemo(() => {
    const eras = { 'Pre-1800': 0, '1800s': 0, '1900-1949': 0, '1950-1999': 0, '2000+': 0 };
    books.forEach(b => {
      const yrMatch = String(b.year || '').match(/\d+/);
      const yr = yrMatch ? parseInt(yrMatch[0], 10) : null;
      
      if (!yr || yr < 1800) eras['Pre-1800']++;
      else if (yr < 1900) eras['1800s']++;
      else if (yr < 1950) eras['1900-1949']++;
      else if (yr < 2000) eras['1950-1999']++;
      else eras['2000+']++;
    });
    return Object.entries(eras).map(([name, count]) => ({ name, count }));
  }, [books]);

  if (!stats) return null;

  const COLORS = ['#0d6efd', '#6610f2', '#6f42c1', '#d63384', '#dc3545', '#fd7e14', '#ffc107', '#198754', '#20c997', '#0dcaf0'];

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
      <div className="row g-4">
        <div className="col-12 col-xl-6">
          <div className="card shadow-sm border-0 p-4 h-100 d-flex flex-column" style={{ minHeight: '450px' }}>
            <h5 className="fw-bold mb-4 text-uppercase small text-muted">Continents Distribution</h5>
            <div style={{ width: '100%', height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={chartData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={60} 
                    outerRadius={100} 
                    paddingAngle={2}
                    animationDuration={800}
                  >
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-6">
          <div className="card shadow-sm border-0 p-4 h-100 d-flex flex-column" style={{ minHeight: '450px' }}>
            <h5 className="fw-bold mb-4 text-uppercase small text-muted">Chronology of Works</h5>
            <div style={{ width: '100%', height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eraData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} />
                  <YAxis axisLine={false} tickLine={false} fontSize={11} />
                  <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                  <Bar dataKey="count" fill="#0d6efd" radius={[4, 4, 0, 0]} animationDuration={1000} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
