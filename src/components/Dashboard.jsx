import { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { Book, CheckCircle, Compass, Globe, Languages, FileText } from 'lucide-react';

export default function Dashboard({ books }) {
  // 1. Calculate KPI Statistics
  const stats = useMemo(() => {
    const total = books.length;
    if (total === 0) return { total: 0, read: 0, percent: 0, topContinent: 'N/A', countryCount: 0, totalPageCount: 0, readPageCount: 0, pagesPercent: 0, languageCount: 0 };
    
    const read = books.filter(b => b.read).length;
    const percent = Math.round((read / total) * 100);
    
    // Most prolific continent
    const continentCounts = {};
    let topContinent = 'N/A';
    let maxCount = 0;
    
    books.forEach(b => {
      if (b.continent) {
        continentCounts[b.continent] = (continentCounts[b.continent] || 0) + 1;
        if (continentCounts[b.continent] > maxCount) {
          maxCount = continentCounts[b.continent];
          topContinent = b.continent;
        }
      }
    });

    // Unique countries count
    const countrySet = new Set();
    books.forEach(b => {
      if (b.country) {
        countrySet.add(b.country.trim().toLowerCase());
      }
    });
    const countryCount = countrySet.size;

    // Total page count metrics
    let totalPageCount = 0;
    let readPageCount = 0;
    books.forEach(b => {
      const p = intValue(b.pages) || 250;
      totalPageCount += p;
      if (b.read) {
        readPageCount += p;
      }
    });
    const pagesPercent = totalPageCount > 0 ? Math.round((readPageCount / totalPageCount) * 100) : 0;

    // Unique languages
    const langSet = new Set();
    books.forEach(b => {
      if (b.originalLanguage) {
        langSet.add(b.originalLanguage.trim().toLowerCase());
      }
    });
    const languageCount = langSet.size || 1;

    return {
      total,
      read,
      percent,
      topContinent,
      countryCount,
      totalPageCount,
      readPageCount,
      pagesPercent,
      languageCount
    };
  }, [books]);

  // Safe helper to convert values to integer
  function intValue(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  // 2. Prepare Continent Chart Data
  const continentData = useMemo(() => {
    const counts = {};
    books.forEach(b => {
      if (b.continent) {
        counts[b.continent] = (counts[b.continent] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [books]);

  // Premium colors matching our theme HSL tokens
  const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];

  // 3. Prepare Chronological Era Chart Data
  const eraData = useMemo(() => {
    const eras = {
      'Pre-1800': 0,
      '1800-1899 (19th C)': 0,
      '1900-1949': 0,
      '1950-1979': 0,
      '1980-1999': 0,
      '2000-Present': 0
    };

    books.forEach(b => {
      const yearStr = b.year;
      const numMatch = yearStr.match(/\d+/);
      if (numMatch) {
        const yr = parseInt(numMatch[0]);
        if (yr < 1800) eras['Pre-1800']++;
        else if (yr < 1900) eras['1800-1899 (19th C)']++;
        else if (yr < 1950) eras['1900-1949']++;
        else if (yr < 1980) eras['1950-1979']++;
        else if (yr < 2000) eras['1980-1999']++;
        else eras['2000-Present']++;
      } else if (yearStr.toLowerCase().includes("17th") || yearStr.toLowerCase().includes("13th") || yearStr.toLowerCase().includes("2nd")) {
        eras['Pre-1800']++;
      } else {
        eras['2000-Present']++;
      }
    });

    return Object.entries(eras).map(([name, Count]) => ({ name, Count }));
  }, [books]);

  return (
    <div className="container-fluid px-0 animate-fade">
      
      {/* 4. KPI Stat Row */}
      <div className="row g-3 mb-4">
        
        {/* KPI 1: Total Books */}
        <div className="col-12 col-sm-6 col-lg-4">
          <div className="card glass-card h-100 border-0 p-3 d-flex flex-row align-items-center gap-3">
            <div className="icon-container p-3 rounded-3 d-flex align-items-center justify-content-center" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
              <Book size={24} />
            </div>
            <div>
              <p className="small text-muted mb-0 fw-semibold">Total Books</p>
              <h3 className="h3 mb-0 fw-extrabold">{stats.total}</h3>
            </div>
          </div>
        </div>

        {/* KPI 2: Reading Progress */}
        <div className="col-12 col-sm-6 col-lg-4">
          <div className="card glass-card h-100 border-0 p-3 d-flex flex-row align-items-center gap-3">
            <div className="icon-container p-3 rounded-3 d-flex align-items-center justify-content-center" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <CheckCircle size={24} />
            </div>
            <div className="flex-grow-1">
              <p className="small text-muted mb-0 fw-semibold">Reading Progress</p>
              <div className="d-flex align-items-baseline gap-2">
                <h3 className="h3 mb-0 fw-extrabold">{stats.percent}%</h3>
                <span className="small text-muted">({stats.read} / {stats.total})</span>
              </div>
              <div className="progress mt-2" style={{ height: '6px' }}>
                <div 
                  className="progress-bar bg-success" 
                  role="progressbar" 
                  style={{ width: `${stats.percent}%`, transition: 'width 0.8s ease' }} 
                  aria-valuenow={stats.percent} 
                  aria-valuemin="0" 
                  aria-valuemax="100"
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 5: Total Pages Read */}
        <div className="col-12 col-sm-6 col-lg-4">
          <div className="card glass-card h-100 border-0 p-3 d-flex flex-row align-items-center gap-3">
            <div className="icon-container p-3 rounded-3 d-flex align-items-center justify-content-center" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
              <FileText size={24} />
            </div>
            <div className="flex-grow-1 min-w-0">
              <p className="small text-muted mb-0 fw-semibold">Pages Read</p>
              <div className="d-flex align-items-baseline gap-1 flex-wrap">
                <h3 className="h3 mb-0 fw-extrabold">{stats.readPageCount.toLocaleString()}</h3>
                <span className="small text-muted text-truncate">
                  / {stats.totalPageCount.toLocaleString()} p. ({stats.pagesPercent}%)
                </span>
              </div>
              <div className="progress mt-2" style={{ height: '6px' }}>
                <div 
                  className="progress-bar" 
                  role="progressbar" 
                  style={{ width: `${stats.pagesPercent}%`, background: '#8b5cf6', transition: 'width 0.8s ease' }} 
                  aria-valuenow={stats.pagesPercent} 
                  aria-valuemin="0" 
                  aria-valuemax="100"
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 6: Language Diversity */}
        <div className="col-12 col-sm-6 col-lg-4">
          <div className="card glass-card h-100 border-0 p-3 d-flex flex-row align-items-center gap-3">
            <div className="icon-container p-3 rounded-3 d-flex align-items-center justify-content-center" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
              <Languages size={24} />
            </div>
            <div>
              <p className="small text-muted mb-0 fw-semibold">Language Diversity</p>
              <h3 className="h3 mb-0 fw-extrabold">{stats.languageCount}</h3>
              <span className="small text-muted">Unique Languages</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Top Continent */}
        <div className="col-12 col-sm-6 col-lg-4">
          <div className="card glass-card h-100 border-0 p-3 d-flex flex-row align-items-center gap-3">
            <div className="icon-container p-3 rounded-3 d-flex align-items-center justify-content-center" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
              <Compass size={24} />
            </div>
            <div className="min-w-0">
              <p className="small text-muted mb-0 fw-semibold">Top Continent</p>
              <h3 className="h4 mb-0 fw-extrabold text-truncate" title={stats.topContinent}>{stats.topContinent}</h3>
            </div>
          </div>
        </div>

        {/* KPI 4: Countries Represented */}
        <div className="col-12 col-sm-6 col-lg-4">
          <div className="card glass-card h-100 border-0 p-3 d-flex flex-row align-items-center gap-3">
            <div className="icon-container p-3 rounded-3 d-flex align-items-center justify-content-center" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <Globe size={24} />
            </div>
            <div className="min-w-0">
              <p className="small text-muted mb-0 fw-semibold">Countries Represented</p>
              <h3 className="h3 mb-0 fw-extrabold">{stats.countryCount}</h3>
              <span className="small text-muted">Different Nations</span>
            </div>
          </div>
        </div>

      </div>

      {/* 5. Chart Layout Row */}
      <div className="row g-4 mt-2">
        
        {/* Continent Donut Card */}
        <div className="col-12 col-xl-6">
          <div className="card glass-card h-100 border-0 p-4 d-flex flex-column" style={{ minHeight: '380px' }}>
            <h4 className="h5 fw-bold mb-3">Geographic Distribution (Continents)</h4>
            <div className="flex-grow-1 w-100" style={{ minHeight: '260px' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={continentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {continentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--card-bg)', 
                      borderColor: 'var(--card-border)', 
                      borderRadius: '0.5rem', 
                      color: 'var(--text-main)',
                      backdropFilter: 'blur(10px)'
                    }} 
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    wrapperStyle={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Timeline Bar Chart */}
        <div className="col-12 col-xl-6">
          <div className="card glass-card h-100 border-0 p-4 d-flex flex-column" style={{ minHeight: '380px' }}>
            <h4 className="h5 fw-bold mb-3">Chronological Distribution (Eras)</h4>
            <div className="flex-grow-1 w-100" style={{ minHeight: '260px' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={eraData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="var(--text-muted)" 
                    fontSize={10} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="var(--text-muted)" 
                    fontSize={10} 
                    tickLine={false} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--card-bg)', 
                      borderColor: 'var(--card-border)', 
                      borderRadius: '0.5rem', 
                      color: 'var(--text-main)',
                      backdropFilter: 'blur(10px)'
                    }} 
                  />
                  <Bar dataKey="Count" radius={[6, 6, 0, 0]}>
                    {eraData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="url(#barGradient)" />
                    ))}
                  </Bar>
                  
                  {/* SVG Gradient definition */}
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.6}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
