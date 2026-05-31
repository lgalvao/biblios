import { useState } from 'react';

export default function BookModal({ book, onSave, onClose }) {
  const [title, setTitle] = useState(book?.title || '');
  const [author, setAuthor] = useState(book?.author || '');
  const [year, setYear] = useState(book?.year || '');
  const [country, setCountry] = useState(book?.country || '');
  const [continent, setContinent] = useState(book?.continent || '');
  const [read, setRead] = useState(book?.read || false);
  const [originalLanguage, setOriginalLanguage] = useState(book?.originalLanguage || 'English');
  const [pages, setPages] = useState(book?.pages || 250);
  const [description, setDescription] = useState(book?.description || '');
  const [error, setError] = useState('');

  // Continents list for selection
  const continents = ['Africa', 'Asia', 'Central America', 'Europe', 'North America', 'South America', 'Oceania'];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.strip() || !author.strip() || !year.strip() || !country.strip() || !continent.strip() || !originalLanguage.strip()) {
      setError('Please fill in all the required fields.');
      return;
    }

    const savedBook = {
      id: book ? book.id : null,
      title: title.trim(),
      author: author.trim(),
      year: year.trim(),
      country: country.trim(),
      continent: continent,
      read: read,
      originalLanguage: originalLanguage.trim(),
      pages: parseInt(pages, 10) || 250,
      description: description.trim() || `A book from ${country.trim() || 'world literature'}.`
    };

    onSave(savedBook);
  };

  return (
    <div className="modal fade show d-block" style={{ background: 'rgba(11, 15, 25, 0.65)', backdropFilter: 'blur(8px)', zIndex: 9999, overflowY: 'auto' }} tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '540px' }}>
        <div className="modal-content glass-card animate-fade border-0 overflow-hidden">
          
          {/* Modal Header */}
          <div className="modal-header px-4 py-3 d-flex align-items-center justify-content-between">
            <h3 className="modal-title h5 fw-bold m-0">
              {book ? 'Edit Book Details' : 'Add New Book'}
            </h3>
            <button 
              type="button"
              className="btn-close btn-close-white" 
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          {/* Modal Form */}
          <form onSubmit={handleSubmit} className="modal-body p-4 d-flex flex-column gap-3">
            
            {error && (
              <div className="alert alert-danger py-2 px-3 m-0 small fw-bold" role="alert">
                ⚠️ {error}
              </div>
            )}

            {/* Title input */}
            <div className="mb-1">
              <label htmlFor="modal-title" className="form-label text-muted small fw-bold mb-1">Book Title *</label>
              <input
                id="modal-title"
                type="text"
                className="form-control"
                placeholder="e.g. The Posthumous Memoirs of Brás Cubas"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Author input */}
            <div className="mb-1">
              <label htmlFor="modal-author" className="form-label text-muted small fw-bold mb-1">Author Full Name *</label>
              <input
                id="modal-author"
                type="text"
                className="form-control"
                placeholder="e.g. Machado de Assis"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>

            {/* Year & Country Grid */}
            <div className="row g-3">
              <div className="col-6">
                <label htmlFor="modal-year" className="form-label text-muted small fw-bold mb-1">Publication Year *</label>
                <input
                  id="modal-year"
                  type="text"
                  className="form-control"
                  placeholder="e.g. 1881"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>
              
              <div className="col-6">
                <label htmlFor="modal-country" className="form-label text-muted small fw-bold mb-1">Country *</label>
                <input
                  id="modal-country"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Brazil"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </div>

            {/* Original Language & Pages Grid */}
            <div className="row g-3">
              <div className="col-6">
                <label htmlFor="modal-language" className="form-label text-muted small fw-bold mb-1">Original Language *</label>
                <input
                  id="modal-language"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Portuguese"
                  value={originalLanguage}
                  onChange={(e) => setOriginalLanguage(e.target.value)}
                />
              </div>
              
              <div className="col-6">
                <label htmlFor="modal-pages" className="form-label text-muted small fw-bold mb-1">Page Count *</label>
                <input
                  id="modal-pages"
                  type="number"
                  className="form-control"
                  placeholder="e.g. 250"
                  min="1"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                />
              </div>
            </div>

            {/* Continent Dropdown */}
            <div className="mb-1">
              <label htmlFor="modal-continent" className="form-label text-muted small fw-bold mb-1">Continent *</label>
              <select
                id="modal-continent"
                className="form-select"
                style={{ cursor: 'pointer' }}
                value={continent}
                onChange={(e) => setContinent(e.target.value)}
              >
                <option value="">Select Continent...</option>
                {continents.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Description Textarea */}
            <div className="form-floating mb-2">
              <textarea
                id="modal-description"
                className="form-control"
                style={{ height: '140px', minHeight: '100px', resize: 'vertical' }}
                placeholder="A brief summary of the plot, characters, or themes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <label htmlFor="modal-description" className="text-muted">Short Description / Blurb</label>
            </div>

            {/* Read Checkbox */}
            <div className="form-check d-flex align-items-center gap-2 mt-1">
              <input
                type="checkbox"
                id="modal-read"
                className="form-check-input checkbox-custom m-0"
                checked={read}
                onChange={(e) => setRead(e.target.checked)}
              />
              <label htmlFor="modal-read" className="form-check-label small fw-bold text-main cursor-pointer ms-1">
                Mark as read (syncs instantly to Dashboard analytics)
              </label>
            </div>

            {/* Footer Actions */}
            <div className="modal-footer px-0 pb-0 pt-3 mt-2 d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {book ? 'Save Changes' : 'Add Book'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

// Strip extension for strings compatibility
if (!String.prototype.strip) {
  String.prototype.strip = function() {
    return this.replace(/^\s+|\s+$/g, '');
  };
}
