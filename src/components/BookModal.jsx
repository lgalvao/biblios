import { useState } from 'react';
import { getGeoInfo, allCountries, allRegions, allContinents } from '../utils/dataUtils';

export default function BookModal({ book, onSave, onClose, books = [], authors = [], languages = [], tags: tagsList = [] }) {
  const [title, setTitle] = useState(book?.title || '');
  const [author, setAuthor] = useState(book?.author || '');
  const [year, setYear] = useState(book?.year || '');
  const [country, setCountry] = useState(book?.country || '');
  const [region, setRegion] = useState(book?.region || '');
  const [continent, setContinent] = useState(book?.continent || '');
  const [read, setRead] = useState(book?.read || false);
  const [originalLanguage, setOriginalLanguage] = useState(book?.originalLanguage || '');
  const [pages, setPages] = useState(book?.pages || '');
  const [description, setDescription] = useState(book?.description || '');
  const [tags, setTags] = useState(book?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');

  const handleAuthorChange = (val) => {
    setAuthor(val);
    if (val && books && books.length > 0) {
      const match = books.find(b => b.author.toLowerCase().trim() === val.toLowerCase().trim() && b.country);
      if (match) {
        setCountry(match.country);
        const geo = getGeoInfo(match.country);
        setRegion(match.region || geo.region);
        setContinent(match.continent || geo.continent);
      }
    }
  };

  const geo = getGeoInfo(country);
  const isKnownCountry = !!(geo.continent && geo.region);

  const handleCountryChange = (val) => {
    setCountry(val);
    const geo = getGeoInfo(val);
    setRegion(geo.region);
    setContinent(geo.continent);
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const tagsSuggestions = (tagsList || []).filter(t => !tags.includes(t));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !author.trim() || !year.trim() || !country.trim() || !continent.trim()) {
      setError('Please fill required fields.');
      return;
    }
    onSave({
      id: book?.id || null,
      title: title.trim(),
      author: author.trim(),
      year: year.trim(),
      country: country.trim(),
      region: region.trim(),
      continent,
      read,
      originalLanguage: originalLanguage.trim(),
      pages: pages ? parseInt(pages, 10) : '',
      description: description.trim(),
      tags
    });
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header border-bottom-0 pb-0 px-3 px-md-4 pt-3 pt-md-4">
            <h5 className="modal-title fw-bold">{book ? 'Edit Book' : 'Add New Book'}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit} className="modal-body p-3 p-md-4">
            {error && <div className="alert alert-danger py-2 small fw-bold mb-4">{error}</div>}
            
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label htmlFor="book-title" className="form-label small fw-bold text-muted text-uppercase">Title</label>
                <input id="book-title" type="text" className="form-control" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div className="col-12 col-md-6">
                <label htmlFor="book-author" className="form-label small fw-bold text-muted text-uppercase">Author</label>
                <input id="book-author" type="text" className="form-control" value={author} onChange={e => handleAuthorChange(e.target.value)} list="author-options" required />
                <datalist id="author-options">
                  {authors.map(a => <option key={a} value={a} />)}
                </datalist>
              </div>
              <div className="col-6 col-md-3">
                <label htmlFor="book-year" className="form-label small fw-bold text-muted text-uppercase">Year</label>
                <input id="book-year" type="text" className="form-control" value={year} onChange={e => setYear(e.target.value)} required />
              </div>
              <div className="col-6 col-md-3">
                <label htmlFor="book-pages" className="form-label small fw-bold text-muted text-uppercase">Pages</label>
                <input id="book-pages" type="number" className="form-control" value={pages} onChange={e => setPages(e.target.value)} />
              </div>
              <div className="col-12 col-md-6">
                <label htmlFor="book-language" className="form-label small fw-bold text-muted text-uppercase">Language</label>
                <input id="book-language" type="text" className="form-control" value={originalLanguage} onChange={e => setOriginalLanguage(e.target.value)} list="language-options" />
                <datalist id="language-options">
                  {languages.map(l => <option key={l} value={l} />)}
                </datalist>
              </div>
              <div className={isKnownCountry || !country.trim() ? "col-12" : "col-12 col-md-4"}>
                <label htmlFor="book-country" className="form-label small fw-bold text-muted text-uppercase">Country</label>
                <input id="book-country" type="text" className="form-control" value={country} onChange={e => handleCountryChange(e.target.value)} list="country-options" required />
                <datalist id="country-options">
                  {allCountries.map(c => <option key={c} value={c} />)}
                </datalist>
                {isKnownCountry && (
                  <div className="form-text text-success d-flex align-items-center gap-1 mt-1 small">
                    <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-20 py-1.5 px-2.5 rounded-pill text-wrap text-start">
                      ✓ Auto-detected: {continent} • {region}
                    </span>
                  </div>
                )}
              </div>
              {country.trim() !== '' && !isKnownCountry && (
                <>
                  <div className="col-12 col-md-4 animate-fade">
                    <label htmlFor="book-continent" className="form-label small fw-bold text-muted text-uppercase">Continent</label>
                    <input id="book-continent" type="text" className="form-control" value={continent} onChange={e => setContinent(e.target.value)} list="continent-options" required />
                    <datalist id="continent-options">
                      {allContinents.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div className="col-12 col-md-4 animate-fade">
                    <label htmlFor="book-region" className="form-label small fw-bold text-muted text-uppercase">Region</label>
                    <input id="book-region" type="text" className="form-control" value={region} onChange={e => setRegion(e.target.value)} list="region-options" />
                    <datalist id="region-options">
                      {allRegions.map(r => <option key={r} value={r} />)}
                    </datalist>
                  </div>
                </>
              )}
              <div className="col-12">
                <label htmlFor="book-description" className="form-label small fw-bold text-muted text-uppercase">Description</label>
                <textarea id="book-description" className="form-control" rows="3" value={description} onChange={e => setDescription(e.target.value)}></textarea>
              </div>
              <div className="col-12">
                <label htmlFor="book-tags" className="form-label small fw-bold text-muted text-uppercase">Tags</label>
                <div className="input-group input-group-sm mb-2">
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Add tag (e.g. classic, biography)..." 
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    list="tag-options"
                  />
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary"
                    onClick={handleAddTag}
                  >
                    Add
                  </button>
                  <datalist id="tag-options">
                    {tagsSuggestions.map(t => <option key={t} value={t} />)}
                  </datalist>
                </div>
                <div className="d-flex flex-wrap gap-2 mt-1">
                  {tags.map(t => (
                    <span 
                      key={t} 
                      className="badge bg-secondary text-white d-flex align-items-center gap-2 py-1.5 px-2.5 rounded-pill"
                      style={{ fontSize: '0.75rem', fontWeight: 500 }}
                    >
                      <span>#{t}</span>
                      <button 
                        type="button" 
                        className="btn-close btn-close-white p-0" 
                        style={{ width: '8px', height: '8px', fontSize: '0.55rem' }} 
                        onClick={() => handleRemoveTag(t)}
                      ></button>
                    </span>
                  ))}
                  {tags.length === 0 && (
                    <span className="small text-muted italic">No tags associated with this book.</span>
                  )}
                </div>
              </div>
              <div className="col-12">
                <div className="form-check form-switch mt-2">
                  <input className="form-check-input" type="checkbox" checked={read} onChange={e => setRead(e.target.checked)} id="readSwitch" />
                  <label className="form-check-label fw-bold" htmlFor="readSwitch">Mark as Read</label>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-top d-flex flex-column-reverse flex-sm-row justify-content-sm-end gap-2">
              <button type="button" className="btn btn-light px-4" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary px-4">Save Book</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
