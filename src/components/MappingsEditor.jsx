import { useState, useEffect } from 'react';
import { 
  Save, 
  RefreshCw, 
  Trash2, 
  Edit2, 
  Plus, 
  Search, 
  Check, 
  X, 
  ChevronRight, 
  Globe2 
} from 'lucide-react';
import originalGeoscheme from '../../un-geoscheme-subregions-countries.json';
import { updateGeoschemeData, repairBooksList } from '../utils/dataUtils';


const defaultAliases = {
  'usa': 'United States of America',
  'uk': 'United Kingdom of Great Britain and Northern Ireland',
  'england': 'United Kingdom of Great Britain and Northern Ireland',
  'scotland': 'United Kingdom of Great Britain and Northern Ireland',
  'wales': 'United Kingdom of Great Britain and Northern Ireland',
  'northern ireland': 'United Kingdom of Great Britain and Northern Ireland',
  'brazil': 'Brazil',
  'brasil': 'Brazil',
  'russia': 'Russian Federation',
  'south korea': 'Republic of Korea',
  'north korea': "Democratic People's Republic of Korea",
  'vietnam': 'Viet Nam',
  'iran': 'Iran (Islamic Republic of)',
  'venezuela': 'Venezuela (Bolivarian Republic of)',
  'bolivaria': 'Bolivia (Plurinational State of)',
  'taiwan': 'China',
  'tanzania': 'United Republic of Tanzania',
  'syria': 'Syrian Arab Republic',
  'macedonia': 'North Macedonia',
  'north macedonia': 'North Macedonia',
  'moldova': 'Republic of Moldova',
  'ivory coast': "Côte d'Ivoire",
  'turkmenistan': 'Turkmenistan',
  'uzbekistan': 'Uzbekistan',
  'czech republic': 'Czechia',
  'guinea bissau': 'Guinea-Bissau'
};

const continentNames = {
  'AF': 'Africa',
  'SA': 'South America',
  'NA': 'North America',
  'AS': 'Asia',
  'EU': 'Europe',
  'OC': 'Oceania'
};

export default function MappingsEditor({ onSyncSuccess, onSyncError, onUpdateBooks }) {
  const [geoscheme, setGeoscheme] = useState({});
  const [aliases, setAliases] = useState({});
  const [activeContinent, setActiveContinent] = useState('EU');
  const [activeRegion, setActiveRegion] = useState('');
  
  // Input fields
  const [newRegionName, setNewRegionName] = useState('');
  const [newCountryName, setNewCountryName] = useState('');
  const [newAliasName, setNewAliasName] = useState('');
  const [newAliasTarget, setNewAliasTarget] = useState('');
  
  // Search & Edit states
  const [aliasSearch, setAliasSearch] = useState('');
  const [editingRegion, setEditingRegion] = useState(null); // { name, newName }
  const [editingCountry, setEditingCountry] = useState(null); // { name, newName }
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial mappings from server
  useEffect(() => {
    fetch('/api/regions')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch regions');
        return res.json();
      })
      .then(data => {
        setGeoscheme(data.geoscheme || {});
        setAliases(data.aliases || {});
        
        // Auto-select first region in active continent
        const regions = data.geoscheme?.[activeContinent] || [];
        if (regions.length > 0) {
          setActiveRegion(Object.keys(regions[0])[0]);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error loading region mappings:", err);
        // Fallback to defaults
        setGeoscheme(originalGeoscheme);
        setAliases(defaultAliases);
        
        const regions = originalGeoscheme[activeContinent] || [];
        if (regions.length > 0) {
          setActiveRegion(Object.keys(regions[0])[0]);
        }
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update active region if active continent changes
  const handleContinentChange = (code) => {
    setActiveContinent(code);
    const regions = geoscheme[code] || [];
    if (regions.length > 0) {
      setActiveRegion(Object.keys(regions[0])[0]);
    } else {
      setActiveRegion('');
    }
  };

  // 1. Add Region
  const handleAddRegion = (e) => {
    e.preventDefault();
    const name = newRegionName.trim();
    if (!name) return;

    // Check if region already exists in active continent
    const continentRegions = geoscheme[activeContinent] || [];
    const exists = continentRegions.some(r => Object.keys(r)[0].toLowerCase() === name.toLowerCase());
    if (exists) {
      alert(`Region "${name}" already exists in this continent.`);
      return;
    }

    const updated = { ...geoscheme };
    updated[activeContinent] = [...(updated[activeContinent] || []), { [name]: [] }];
    setGeoscheme(updated);
    setActiveRegion(name);
    setNewRegionName('');
  };

  // 2. Rename Region
  const handleRenameRegionSubmit = (regionName) => {
    const newName = editingRegion?.newName?.trim();
    if (!newName || newName === regionName) {
      setEditingRegion(null);
      return;
    }

    const updated = { ...geoscheme };
    updated[activeContinent] = updated[activeContinent].map(r => {
      const currentName = Object.keys(r)[0];
      if (currentName === regionName) {
        return { [newName]: r[currentName] };
      }
      return r;
    });

    setGeoscheme(updated);
    if (activeRegion === regionName) {
      setActiveRegion(newName);
    }
    setEditingRegion(null);
  };

  // 3. Delete Region
  const handleDeleteRegion = (regionName) => {
    const regionObj = (geoscheme[activeContinent] || []).find(r => Object.keys(r)[0] === regionName);
    const countries = regionObj ? Object.values(regionObj)[0] : [];

    if (countries.length > 0) {
      alert(`Cannot delete region "${regionName}" because it contains countries. Please move or remove the countries first.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the region "${regionName}"?`)) {
      return;
    }

    const updated = { ...geoscheme };
    updated[activeContinent] = updated[activeContinent].filter(r => Object.keys(r)[0] !== regionName);
    setGeoscheme(updated);

    // Re-select region
    if (activeRegion === regionName) {
      if (updated[activeContinent].length > 0) {
        setActiveRegion(Object.keys(updated[activeContinent][0])[0]);
      } else {
        setActiveRegion('');
      }
    }
  };

  // 4. Add Country
  const handleAddCountry = (e) => {
    e.preventDefault();
    const country = newCountryName.trim();
    if (!country || !activeRegion) return;

    // Check if country already exists in any region of geoscheme (case-insensitive)
    let existsInRegion = null;
    let existsInContinent = null;
    Object.entries(geoscheme).forEach(([contCode, regions]) => {
      regions.forEach(r => {
        const rName = Object.keys(r)[0];
        const countries = r[rName];
        if (countries.some(c => c.toLowerCase() === country.toLowerCase())) {
          existsInRegion = rName;
          existsInContinent = contCode;
        }
      });
    });

    if (existsInRegion) {
      alert(`"${country}" already exists in ${continentNames[existsInContinent]} (${existsInRegion}).`);
      return;
    }

    const updated = { ...geoscheme };
    updated[activeContinent] = updated[activeContinent].map(r => {
      const rName = Object.keys(r)[0];
      if (rName === activeRegion) {
        return { [rName]: [...r[rName], country].sort() };
      }
      return r;
    });

    setGeoscheme(updated);
    setNewCountryName('');
  };

  // 5. Rename Country
  const handleRenameCountrySubmit = (oldName) => {
    const newName = editingCountry?.newName?.trim();
    if (!newName || newName === oldName) {
      setEditingCountry(null);
      return;
    }

    // Check if country already exists anywhere in geoscheme
    const all = Object.values(geoscheme).flat().flatMap(r => Object.values(r)[0]);
    if (all.includes(newName)) {
      alert(`Country "${newName}" already exists in the mapping configuration.`);
      return;
    }

    const updated = { ...geoscheme };
    updated[activeContinent] = updated[activeContinent].map(r => {
      const rName = Object.keys(r)[0];
      if (rName === activeRegion) {
        return { 
          [rName]: r[rName].map(c => c === oldName ? newName : c).sort() 
        };
      }
      return r;
    });

    // Also update references in aliases (if target country is renamed, update alias values)
    const updatedAliases = { ...aliases };
    Object.keys(updatedAliases).forEach(alias => {
      if (updatedAliases[alias] === oldName) {
        updatedAliases[alias] = newName;
      }
    });

    setGeoscheme(updated);
    setAliases(updatedAliases);
    setEditingCountry(null);
  };

  // 6. Move Country
  const handleMoveCountry = (country, targetRegionName) => {
    if (!targetRegionName) return;

    const updated = { ...geoscheme };
    let sourceContinent = activeContinent;
    let sourceRegion = activeRegion;
    let found = false;

    // Find country and remove it
    Object.entries(updated).forEach(([contCode, regions]) => {
      updated[contCode] = regions.map(r => {
        const rName = Object.keys(r)[0];
        if (r[rName].includes(country)) {
          sourceContinent = contCode;
          sourceRegion = rName;
          found = true;
          return { [rName]: r[rName].filter(c => c !== country) };
        }
        return r;
      });
    });

    if (!found) return;

    // Add country to target region
    let targetContinentCode = activeContinent;
    Object.entries(updated).forEach(([contCode, regions]) => {
      const hasRegion = regions.some(r => Object.keys(r)[0] === targetRegionName);
      if (hasRegion) {
        targetContinentCode = contCode;
      }
    });

    updated[targetContinentCode] = updated[targetContinentCode].map(r => {
      const rName = Object.keys(r)[0];
      if (rName === targetRegionName) {
        return { [rName]: [...r[rName], country].sort() };
      }
      return r;
    });

    setGeoscheme(updated);
    
    // If we moved it away from the current view, notify/update active states
    if (sourceRegion === activeRegion && sourceContinent === activeContinent) {
      // It will disappear from active view, which is expected
    }
  };

  // 7. Remove Country
  const handleRemoveCountry = (country) => {
    if (!window.confirm(`Are you sure you want to remove "${country}" from the geographic mappings?`)) {
      return;
    }

    const updated = { ...geoscheme };
    updated[activeContinent] = updated[activeContinent].map(r => {
      const rName = Object.keys(r)[0];
      if (rName === activeRegion) {
        return { [rName]: r[rName].filter(c => c !== country) };
      }
      return r;
    });

    setGeoscheme(updated);
  };

  // 8. Add Alias
  const handleAddAlias = (e) => {
    e.preventDefault();
    const alias = newAliasName.trim().toLowerCase();
    const target = newAliasTarget.trim();

    if (!alias || !target) return;

    if (aliases[alias]) {
      alert(`Alias "${alias}" already exists (currently maps to "${aliases[alias]}").`);
      return;
    }

    const updated = { ...aliases, [alias]: target };
    setAliases(updated);
    setNewAliasName('');
    setNewAliasTarget('');
  };

  // 9. Remove Alias
  const handleRemoveAlias = (aliasKey) => {
    const updated = { ...aliases };
    delete updated[aliasKey];
    setAliases(updated);
  };

  // Get list of all regions in system for the Move dropdown
  const getAllSystemRegions = () => {
    const list = [];
    Object.entries(geoscheme).forEach(([contCode, regions]) => {
      regions.forEach(r => {
        list.push({
          name: Object.keys(r)[0],
          continent: continentNames[contCode] || contCode
        });
      });
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  };

  // Get list of all countries in system for Alias target suggestion
  const getAllSystemCountries = () => {
    const list = [];
    Object.values(geoscheme).forEach(regions => {
      regions.forEach(r => {
        const countries = Object.values(r)[0];
        list.push(...countries);
      });
    });
    return [...new Set(list)].sort();
  };

  // Save mappings to disk
  const handleSaveChanges = () => {
    setIsSaving(true);
    const dataToSync = { geoscheme, aliases };

    fetch('/api/regions/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dataToSync)
    })
      .then(res => {
        if (!res.ok) throw new Error('Sync failed');
        return res.json();
      })
      .then(() => {
        // Update in-memory mapping in utils so the whole app takes it immediately
        updateGeoschemeData(geoscheme, aliases);
        
        // Trigger retroactive database repair in App.jsx to realign book records
          onUpdateBooks(prevBooks => {
            // Re-runs repair books list with the updated config
            const { repaired } = repairBooksList(prevBooks, prevBooks);
            return repaired;
          });
        
        onSyncSuccess();
      })
      .catch(err => {
        console.error("Failed to sync region mappings:", err);
        // Save in-memory in utility file anyway so it works during runtime session
        updateGeoschemeData(geoscheme, aliases);
        onSyncError();
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  // Reset mappings to defaults
  const handleResetToDefault = () => {
    if (!window.confirm("Are you sure you want to reset all mappings and aliases to the system defaults? This will overwrite your current configuration on disk.")) {
      return;
    }
    
    setGeoscheme(originalGeoscheme);
    setAliases(defaultAliases);
    
    const regions = originalGeoscheme[activeContinent] || [];
    if (regions.length > 0) {
      setActiveRegion(Object.keys(regions[0])[0]);
    } else {
      setActiveRegion('');
    }
  };

  if (isLoading) {
    return (
      <div className="card shadow-sm p-5 text-center border-0 bg-glass text-muted animate-fade">
        <div className="spinner-border text-primary mx-auto mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mb-0 small fw-medium text-uppercase tracking-wider">Loading Mappings...</p>
      </div>
    );
  }

  const activeContinentRegions = geoscheme[activeContinent] || [];
  const activeRegionObj = activeContinentRegions.find(r => Object.keys(r)[0] === activeRegion);
  const activeRegionCountries = activeRegionObj ? Object.values(activeRegionObj)[0] : [];
  
  const allRegionsList = getAllSystemRegions();
  const allCountriesList = getAllSystemCountries();
  
  // Filter aliases by search query
  const filteredAliases = Object.entries(aliases)
    .filter(([alias, target]) => 
      alias.toLowerCase().includes(aliasSearch.toLowerCase()) || 
      target.toLowerCase().includes(aliasSearch.toLowerCase())
    )
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="card shadow-sm border p-4 mb-4 bg-body-tertiary animate-fade">
      
      {/* Header Actions */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 border-bottom pb-3 mb-4">
        <div>
          <h2 className="h4 m-0 fw-bold d-flex align-items-center gap-2">
            <Globe2 className="text-primary" size={22} />
            <span>Atlas Mapping Editor</span>
          </h2>
          <p className="text-muted small m-0 mt-1">
            Customize how countries map to subregions and continents. Changes will retroactively normalize library book data.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button 
            className="btn btn-outline-danger btn-sm d-flex align-items-center gap-2" 
            onClick={handleResetToDefault}
            disabled={isSaving}
          >
            <RefreshCw size={14} />
            <span>Reset Defaults</span>
          </button>
          <button 
            className="btn btn-primary btn-sm d-flex align-items-center gap-2 px-3 fw-bold" 
            onClick={handleSaveChanges}
            disabled={isSaving}
          >
            {isSaving ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : (
              <Save size={14} />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Mappings'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="row g-4">
        
        {/* Left column: Continents & Regions */}
        <div className="col-12 col-md-4">
          <div className="card border shadow-sm p-3 h-100">
            <h3 className="h6 fw-bold text-uppercase text-muted border-bottom pb-2 mb-3" style={{ letterSpacing: '0.05em' }}>
              1. Continents & Regions
            </h3>

            {/* Continent Tabs */}
            <div className="d-flex flex-wrap gap-1 mb-3 bg-body-secondary p-1 rounded border">
              {Object.keys(continentNames).map(code => (
                <button
                  key={code}
                  className={`btn btn-sm text-uppercase fw-bold flex-fill border-0 ${activeContinent === code ? 'btn-primary shadow-sm' : 'text-body-secondary bg-transparent'}`}
                  style={{ fontSize: '0.7rem' }}
                  onClick={() => handleContinentChange(code)}
                >
                  {code}
                </button>
              ))}
            </div>

            {/* Regions List */}
            <div className="mb-3 overflow-auto" style={{ maxHeight: '350px' }}>
              {activeContinentRegions.length === 0 ? (
                <p className="small text-muted text-center my-4 py-2">No regions in this continent.</p>
              ) : (
                <div className="list-group list-group-flush border rounded">
                  {activeContinentRegions.map(r => {
                    const rName = Object.keys(r)[0];
                    const rCountries = r[rName];
                    const isSelected = activeRegion === rName;

                    return (
                      <div
                        key={rName}
                        onClick={() => setActiveRegion(rName)}
                        className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between p-2 cursor-pointer ${isSelected ? 'active text-white bg-primary' : ''}`}
                      >
                        {editingRegion?.name === rName ? (
                          <div className="d-flex align-items-center gap-1 w-100" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={editingRegion.newName}
                              onChange={e => setEditingRegion({ ...editingRegion, newName: e.target.value })}
                              autoFocus
                            />
                            <button data-testid="confirm-edit-region" className="btn btn-sm btn-success p-1 text-white border-0" onClick={() => handleRenameRegionSubmit(rName)}>
                              <Check size={14} />
                            </button>
                            <button data-testid="cancel-edit-region" className="btn btn-sm btn-danger p-1 text-white border-0" onClick={() => setEditingRegion(null)}>
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
                              <ChevronRight size={14} className={isSelected ? 'text-white' : 'text-muted'} />
                              <span className="text-truncate small fw-medium">{rName}</span>
                            </div>
                            <div className="d-flex align-items-center gap-1" onClick={e => e.stopPropagation()}>
                              <span className={`badge rounded-pill me-1 ${isSelected ? 'bg-body text-primary border border-primary-subtle' : 'bg-secondary-subtle text-secondary-emphasis border'}`} style={{ fontSize: '0.65rem' }}>
                                {rCountries.length}
                              </span>
                              <button 
                                data-testid={`edit-region-${rName}`}
                                className={`btn btn-link btn-xs p-0 border-0 ${isSelected ? 'text-white' : 'text-muted'}`}
                                onClick={() => setEditingRegion({ name: rName, newName: rName })}
                              >
                                <Edit2 size={12} />
                              </button>
                              <button 
                                data-testid={`delete-region-${rName}`}
                                className={`btn btn-link btn-xs p-0 border-0 ${isSelected ? 'text-white' : 'text-danger'}`}
                                onClick={() => handleDeleteRegion(rName)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add Region form */}
            <form onSubmit={handleAddRegion} className="mt-auto border-top pt-3">
              <div className="input-group input-group-sm">
                <input
                  type="text"
                  className="form-control"
                  placeholder="New region name..."
                  value={newRegionName}
                  onChange={e => setNewRegionName(e.target.value)}
                />
                <button className="btn btn-outline-primary d-flex align-items-center gap-1" type="submit">
                  <Plus size={14} />
                  <span>Add</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Center column: Countries in active region */}
        <div className="col-12 col-md-4">
          <div className="card border shadow-sm p-3 h-100">
            <h3 className="h6 fw-bold text-uppercase text-muted border-bottom pb-2 mb-3" style={{ letterSpacing: '0.05em' }}>
              2. Countries in {activeRegion || 'Selected Region'}
            </h3>

            {/* Countries List */}
            <div className="mb-3 overflow-auto flex-fill" style={{ maxHeight: '350px', minHeight: '350px' }}>
              {!activeRegion ? (
                <p className="small text-muted text-center my-5 py-4">Create or select a region to manage countries.</p>
              ) : activeRegionCountries.length === 0 ? (
                <p className="small text-muted text-center my-5 py-4">No countries mapped to this region yet.</p>
              ) : (
                <div className="list-group list-group-flush border rounded">
                  {activeRegionCountries.map(country => (
                    <div key={country} className="list-group-item p-2 d-flex align-items-center justify-content-between">
                      {editingCountry?.name === country ? (
                        <div className="d-flex align-items-center gap-1 w-100">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editingCountry.newName}
                            onChange={e => setEditingCountry({ ...editingCountry, newName: e.target.value })}
                            autoFocus
                          />
                          <button data-testid="confirm-edit-country" className="btn btn-sm btn-success p-1 text-white border-0" onClick={() => handleRenameCountrySubmit(country)}>
                            <Check size={14} />
                          </button>
                          <button data-testid="cancel-edit-country" className="btn btn-sm btn-danger p-1 text-white border-0" onClick={() => setEditingCountry(null)}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="small fw-medium text-truncate me-2">{country}</span>
                          <div className="d-flex align-items-center gap-1">
                            {/* Move dropdown */}
                            <select
                              className="form-select form-select-xs py-0 px-1 border-0 bg-body-secondary text-body-secondary small"
                              style={{ width: '90px', fontSize: '0.65rem', height: '20px' }}
                              value=""
                              onChange={e => handleMoveCountry(country, e.target.value)}
                            >
                              <option value="" disabled>Move to...</option>
                              {allRegionsList
                                .filter(r => r.name !== activeRegion)
                                .map(r => (
                                  <option key={r.name} value={r.name}>
                                    {r.name} ({r.continent})
                                  </option>
                                ))
                              }
                            </select>
                            
                            <button 
                              data-testid={`edit-country-${country}`}
                              className="btn btn-link btn-xs p-0 border-0 text-muted"
                              onClick={() => setEditingCountry({ name: country, newName: country })}
                            >
                              <Edit2 size={12} />
                            </button>
                            <button 
                              data-testid={`delete-country-${country}`}
                              className="btn btn-link btn-xs p-0 border-0 text-danger"
                              onClick={() => handleRemoveCountry(country)}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Country form */}
            <form onSubmit={handleAddCountry} className="mt-auto border-top pt-3">
              <div className="input-group input-group-sm">
                <input
                  type="text"
                  className="form-control"
                  placeholder="New country name..."
                  value={newCountryName}
                  disabled={!activeRegion}
                  onChange={e => setNewCountryName(e.target.value)}
                />
                <button className="btn btn-outline-primary d-flex align-items-center gap-1" type="submit" disabled={!activeRegion}>
                  <Plus size={14} />
                  <span>Add</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right column: Country Aliases */}
        <div className="col-12 col-md-4">
          <div className="card border shadow-sm p-3 h-100">
            <h3 className="h6 fw-bold text-uppercase text-muted border-bottom pb-2 mb-3" style={{ letterSpacing: '0.05em' }}>
              3. Country Aliases
            </h3>

            {/* Alias Search */}
            <div className="input-group input-group-sm mb-3">
              <span className="input-group-text bg-body-secondary border-end-0 text-body-secondary">
                <Search size={12} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search aliases..."
                value={aliasSearch}
                onChange={e => setAliasSearch(e.target.value)}
              />
            </div>

            {/* Aliases List */}
            <div className="mb-3 overflow-auto flex-fill" style={{ maxHeight: '290px', minHeight: '290px' }}>
              {filteredAliases.length === 0 ? (
                <p className="small text-muted text-center my-5 py-4">No aliases match your search.</p>
              ) : (
                <div className="list-group list-group-flush border rounded">
                  {filteredAliases.map(([alias, target]) => (
                    <div key={alias} className="list-group-item p-2 d-flex align-items-center justify-content-between bg-transparent">
                      <div className="d-flex flex-column overflow-hidden me-2">
                        <span className="small fw-bold text-body text-truncate">"{alias}"</span>
                        <span className="small text-muted text-truncate">&rarr; {target}</span>
                      </div>
                      <button 
                        data-testid={`delete-alias-${alias}`}
                        className="btn btn-link btn-xs p-0 border-0 text-danger ms-2"
                        onClick={() => handleRemoveAlias(alias)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Alias form */}
            <form onSubmit={handleAddAlias} className="mt-auto border-top pt-3">
              <div className="row g-2">
                <div className="col-5">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Alias (e.g. uk)"
                    value={newAliasName}
                    onChange={e => setNewAliasName(e.target.value)}
                  />
                </div>
                <div className="col-7">
                  <div className="input-group input-group-sm">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Official country..."
                      value={newAliasTarget}
                      onChange={e => setNewAliasTarget(e.target.value)}
                      list="alias-targets"
                    />
                    <datalist id="alias-targets">
                      {allCountriesList.map(c => <option key={c} value={c} />)}
                    </datalist>
                    <button className="btn btn-outline-primary" type="submit">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}
