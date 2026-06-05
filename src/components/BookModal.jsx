import { useState } from 'react';
import { getGeoInfo, allCountries, allRegions, allContinents } from '../utils/dataUtils';

export default function BookModal({ book, onSave, onClose }) {
  const [title, setTitle] = useState(book?.title || '');
  const [author, setAuthor] = useState(book?.author || '');
  const [year, setYear] = useState(book?.year || '');
  const [country, setCountry] = useState(book?.country || '');
  const [region, setRegion] = useState(book?.region || '');
  const [continent, setContinent] = useState(book?.continent || '');
  const [read, setRead] = useState(book?.read || false);
  const [originalLanguage, setOriginalLanguage] = useState(book?.originalLanguage || 'English');
  const [pages, setPages] = useState(book?.pages || '');
  const [description, setDescription] = useState(book?.description || '');
  const [error, setError] = useState('');

  const handleCountryChange = (val) => {
    setCountry(val);
    const geo = getGeoInfo(val);
    setRegion(geo.region);
    setContinent(geo.continent);
  };

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
      description: description.trim()
    });
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header border-bottom-0 pb-0">
            <h5 className="modal-title fw-bold">{book ? 'Edit Book' : 'Add New Book'}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit} className="modal-body p-4">
            {error && <div className="alert alert-danger py-2 small fw-bold mb-4">{error}</div>}
            
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label small fw-bold text-muted text-uppercase">Title</label>
                <input type="text" className="form-control" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small fw-bold text-muted text-uppercase">Author</label>
                <input type="text" className="form-control" value={author} onChange={e => setAuthor(e.target.value)} required />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small fw-bold text-muted text-uppercase">Year</label>
                <input type="text" className="form-control" value={year} onChange={e => setYear(e.target.value)} required />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small fw-bold text-muted text-uppercase">Pages</label>
                <input type="number" className="form-control" value={pages} onChange={e => setPages(e.target.value)} />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small fw-bold text-muted text-uppercase">Language</label>
                <input type="text" className="form-control" value={originalLanguage} onChange={e => setOriginalLanguage(e.target.value)} />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small fw-bold text-muted text-uppercase">Country</label>
                <input type="text" className="form-control" value={country} onChange={e => handleCountryChange(e.target.value)} list="country-options" required />
                <datalist id="country-options">
                  {allCountries.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small fw-bold text-muted text-uppercase">Continent</label>
                <input type="text" className="form-control" value={continent} onChange={e => setContinent(e.target.value)} list="continent-options" required />
                <datalist id="continent-options">
                  {allContinents.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small fw-bold text-muted text-uppercase">Region</label>
                <input type="text" className="form-control" value={region} onChange={e => setRegion(e.target.value)} list="region-options" />
                <datalist id="region-options">
                  {allRegions.map(r => <option key={r} value={r} />)}
                </datalist>
              </div>
              <div className="col-12">
                <label className="form-label small fw-bold text-muted text-uppercase">Description</label>
                <textarea className="form-control" rows="3" value={description} onChange={e => setDescription(e.target.value)}></textarea>
              </div>
              <div className="col-12">
                <div className="form-check form-switch mt-2">
                  <input className="form-check-input" type="checkbox" checked={read} onChange={e => setRead(e.target.checked)} id="readSwitch" />
                  <label className="form-check-label fw-bold" htmlFor="readSwitch">Mark as Read</label>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-top d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-light px-4" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary px-4">Save Book</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
