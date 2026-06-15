import { useState } from 'react';
import { getGeoInfo, allCountries, allRegions, allContinents, parseBatchText } from '../utils/dataUtils';
import { Download } from 'lucide-react';

export default function BookModal({ book, onSave, onClose, books = [], authors = [], languages = [], tags: tagsList = [] }) {
  const [mode, setMode] = useState('single'); // 'single' or 'batch'
  const [batchText, setBatchText] = useState('');
  const [title, setTitle] = useState(book?.title || '');
  const [author, setAuthor] = useState(book?.author || '');
  const [year, setYear] = useState(book?.year || '');
  const [country, setCountry] = useState(book?.country || '');
  const [region, setRegion] = useState(book?.region || '');
  const [continent, setContinent] = useState(book?.continent || '');
  const [read, setRead] = useState(book?.read || false);
  const [originalLanguage, setOriginalLanguage] = useState(book?.originalLanguage || '');
  const [pages, setPages] = useState(book?.pages || '');
  const [category, setCategory] = useState(book?.category || '');
  const [description, setDescription] = useState(book?.description || '');
  const [tags, setTags] = useState(book?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  const handleSetMode = (m) => {
    setMode(m);
    setDuplicateWarning(null);
    setError('');
  };

  const handleFetchMetadata = () => {
    if (!title.trim() && !author.trim()) return;

    setError('');
    setIsLoadingMetadata(true);

    const query = title.trim() && author.trim()
      ? `title=${encodeURIComponent(title.trim())}&author=${encodeURIComponent(author.trim())}`
      : title.trim()
      ? `title=${encodeURIComponent(title.trim())}`
      : `author=${encodeURIComponent(author.trim())}`;

    const url = `https://openlibrary.org/search.json?${query}&fields=key,title,author_name,first_publish_year,number_of_pages_median,language,publisher,publish_place&limit=5`;

    const olLangMap = {
      eng: 'English',
      spa: 'Spanish',
      por: 'Portuguese',
      fra: 'French',
      fre: 'French',
      deu: 'German',
      ger: 'German',
      ita: 'Italian',
      rus: 'Russian',
      zho: 'Chinese',
      chi: 'Chinese',
      jpn: 'Japanese',
      ara: 'Arabic',
      lat: 'Latin',
      grc: 'Ancient Greek',
      ell: 'Greek',
      gre: 'Greek',
      nld: 'Dutch',
      dut: 'Dutch',
      swe: 'Swedish',
      nor: 'Norwegian',
      dan: 'Danish',
      pol: 'Polish',
      ces: 'Czech',
      cze: 'Czech',
      hun: 'Hungarian',
      fin: 'Finnish',
      tur: 'Turkish',
      heb: 'Hebrew',
      hin: 'Hindi',
      san: 'Sanskrit'
    };

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch from Open Library');
        return res.json();
      })
      .then((data) => {
        if (data.docs && data.docs.length > 0) {
          const match = data.docs[0];

          if (match.title && !title.trim()) {
            setTitle(match.title);
          }

          if (match.author_name && match.author_name.length > 0 && !author.trim()) {
            handleAuthorChange(match.author_name[0]);
          } else if (author.trim()) {
            handleAuthorChange(author.trim());
          }

          if (match.first_publish_year && !year.trim()) {
            setYear(String(match.first_publish_year));
          }

          if (match.number_of_pages_median && !pages) {
            setPages(String(match.number_of_pages_median));
            if (match.number_of_pages_median <= 150) {
              setCategory('Novella');
            } else {
              setCategory('Novel');
            }
          }

          if (match.language && match.language.length > 0 && !originalLanguage.trim()) {
            const olLang = match.language[0];
            const englishName = olLangMap[olLang] || olLang;
            setOriginalLanguage(englishName);
          }

          if (!country.trim() && match.publish_place && match.publish_place.length > 0) {
            const places = match.publish_place.map((p) => p.toLowerCase());
            const matched = allCountries.find((c) =>
              places.some((p) => p.includes(c.toLowerCase()))
            );
            if (matched) {
              handleCountryChange(matched);
            }
          }

          // Fetch detailed work metadata to get description
          if (!description.trim()) {
            let descriptionPromise = Promise.resolve(null);
            if (match.key) {
              const workUrl = `https://openlibrary.org${match.key}.json`;
              descriptionPromise = fetch(workUrl)
                .then(workRes => (workRes.ok ? workRes.json() : null))
                .then(workData => {
                  if (workData && workData.description) {
                    if (typeof workData.description === 'string') {
                      return workData.description;
                    } else if (workData.description.value) {
                      return workData.description.value;
                    }
                  }
                  return null;
                })
                .catch(() => null);
            }

            descriptionPromise
              .then(olDesc => {
                if (olDesc && olDesc.trim()) {
                  setDescription(olDesc.trim());
                  setIsLoadingMetadata(false);
                  return;
                }

                // Fallback to Google Books API if Open Library description is empty or missing
                const cleanDesc = (raw) => {
                  if (!raw) return '';
                  return raw
                    .replace(/<p>/g, '')
                    .replace(/<\/p>/g, '')
                    .replace(/<br\s*\/?>/g, '\n')
                    .replace(/<\/br>/g, '\n')
                    .replace(/<i>/g, '')
                    .replace(/<\/i>/g, '')
                    .replace(/<b>/g, '')
                    .replace(/<\/b>/g, '')
                    .trim();
                };

                const searchTitle = title.trim() || match.title || '';
                const searchAuthor = author.trim() || (match.author_name && match.author_name[0]) || '';
                if (!searchTitle && !searchAuthor) {
                  setIsLoadingMetadata(false);
                  return;
                }

                const gbQuery = searchTitle && searchAuthor
                  ? `intitle:${encodeURIComponent(searchTitle)}+inauthor:${encodeURIComponent(searchAuthor)}`
                  : searchTitle
                  ? `intitle:${encodeURIComponent(searchTitle)}`
                  : `inauthor:${encodeURIComponent(searchAuthor)}`;
                const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=${gbQuery}&maxResults=1`;

                return fetch(gbUrl)
                  .then(gbRes => (gbRes.ok ? gbRes.json() : null))
                  .then(gbData => {
                    setIsLoadingMetadata(false);
                    if (gbData && gbData.items && gbData.items.length > 0) {
                      const volInfo = gbData.items[0].volumeInfo;
                      if (volInfo) {
                        if (volInfo.description) {
                          const cleaned = cleanDesc(volInfo.description);
                          if (cleaned) {
                            setDescription(cleaned);
                          }
                        }
                        const resolvedPages = pages || (match.number_of_pages_median ? String(match.number_of_pages_median) : '');
                        if (!resolvedPages && volInfo.pageCount) {
                          setPages(String(volInfo.pageCount));
                          if (volInfo.pageCount <= 150) {
                            setCategory('Novella');
                          } else {
                            setCategory('Novel');
                          }
                        }
                      }
                    }
                  })
                  .catch(() => {
                    setIsLoadingMetadata(false);
                  });
              })
              .catch(() => {
                setIsLoadingMetadata(false);
              });
          } else {
            setIsLoadingMetadata(false);
          }
        } else {
          setIsLoadingMetadata(false);
          setError('No books found with the provided details.');
        }
      })
      .catch((err) => {
        setIsLoadingMetadata(false);
        setError('Error fetching metadata: ' + err.message);
      });
  };

  const handleAuthorChange = (val) => {
    setAuthor(val);
    if (val && books && books.length > 0) {
      const normalizedVal = val.toLowerCase().trim();
      const match = books.find(b => b.author.toLowerCase().trim() === normalizedVal && b.country);
      if (match) {
        setCountry(match.country);
        const geo = getGeoInfo(match.country);
        setRegion(match.region || geo.region);
        setContinent(match.continent || geo.continent);
      }

      // Preencher o idioma automaticamente se todos os livros do autor forem do mesmo idioma
      const authorBooks = books.filter(b => b.author.toLowerCase().trim() === normalizedVal);
      if (authorBooks.length > 0) {
        const languages = authorBooks.map(b => b.originalLanguage).filter(Boolean);
        if (languages.length > 0) {
          const uniqueLangs = [...new Set(languages)];
          if (uniqueLangs.length === 1) {
            setOriginalLanguage(uniqueLangs[0]);
          }
        }
      }
    }
  };

  const handlePagesChange = (val) => {
    setPages(val);
    if (val !== '') {
      const pageNum = parseInt(val, 10);
      if (!isNaN(pageNum)) {
        if (pageNum <= 150) {
          setCategory('Novella');
        } else {
          setCategory('Novel');
        }
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

    if (mode === 'batch') {
      setError('');
      const parsedBooks = parseBatchText(batchText);
      if (parsedBooks.length === 0) {
        setError('No valid books found in batch text. Please check the format.');
        return;
      }

      // Check for duplicates
      const duplicates = [];
      const nonDuplicates = [];
      const seen = new Set();

      parsedBooks.forEach(b => {
        const titleNorm = b.title.trim().toLowerCase();
        const authorNorm = b.author.trim().toLowerCase();
        const key = `${titleNorm}|${authorNorm}`;

        const isDupInLibrary = books.some(existing => 
          existing.title.trim().toLowerCase() === titleNorm && 
          existing.author.trim().toLowerCase() === authorNorm
        );

        if (isDupInLibrary || seen.has(key)) {
          duplicates.push(b);
        } else {
          nonDuplicates.push(b);
          seen.add(key);
        }
      });

      if (duplicates.length > 0) {
        setDuplicateWarning({
          duplicates,
          nonDuplicates,
          allParsedBooks: parsedBooks
        });
        return;
      }

      onSave(parsedBooks);
      return;
    }

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
      category: category.trim(),
      description: description.trim(),
      tags
    });
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header border-bottom-0 pb-0 px-3 px-md-4 pt-3 pt-md-4 flex-column align-items-start">
            <div className="d-flex justify-content-between w-100 align-items-center mb-3">
              <h5 className="modal-title fw-bold">{book ? 'Edit Book' : 'Add New Book'}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            
            {!book && (
              <div className="nav nav-pills small bg-light p-1 rounded border mb-3">
                <button 
                  className={`nav-link py-1 px-3 ${mode === 'single' ? 'active' : 'text-muted'}`}
                  onClick={() => handleSetMode('single')}
                >
                  Single Book
                </button>
                <button 
                  className={`nav-link py-1 px-3 ${mode === 'batch' ? 'active' : 'text-muted'}`}
                  onClick={() => handleSetMode('batch')}
                >
                  Batch Add
                </button>
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="modal-body p-3 p-md-4">
            {error && <div className="alert alert-danger py-2 small fw-bold mb-4">{error}</div>}
            
            {mode === 'batch' ? (
              duplicateWarning ? (
                <div className="animate-fade">
                  <div className="alert alert-warning border border-warning border-opacity-50 bg-warning bg-opacity-10 d-flex flex-column gap-2 mb-3 p-3 rounded text-start animate-fade">
                    <h6 className="fw-bold mb-1 d-flex align-items-center gap-2 text-warning-emphasis">
                      <span>⚠️ Duplicate Books Detected</span>
                    </h6>
                    <p className="small mb-2 text-muted">
                      We found {duplicateWarning.duplicates.length} duplicate book(s) (either already in your library or duplicated within the batch):
                    </p>
                    <div className="table-responsive bg-body border rounded mb-2" style={{ maxHeight: '180px' }}>
                      <table className="table table-sm table-hover mb-0 align-middle" style={{ fontSize: '0.85rem' }}>
                        <thead className="table-light">
                          <tr>
                            <th className="ps-2 py-1.5">Title</th>
                            <th className="py-1.5">Author</th>
                          </tr>
                        </thead>
                        <tbody>
                          {duplicateWarning.duplicates.map((b, idx) => (
                            <tr key={idx}>
                              <td className="ps-2 py-1.5 fw-medium text-wrap">{b.title}</td>
                              <td className="py-1.5 text-muted text-wrap">{b.author}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="small mb-0 text-muted">
                      Please choose whether to add all books anyway (including duplicates) or add only the non-duplicate entries.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="animate-fade">
                  <label className="form-label small fw-bold text-muted text-uppercase">Batch Text Input</label>
                  <p className="small text-muted mb-2">
                    Format: <code>Title by Author (Year, Country), Pages p., Language</code><br/>
                    Example: <code>The Crying of Lot 49 by Thomas Pynchon (1966, USA), 152 p., English</code>
                  </p>
                  <textarea 
                    className="form-control font-monospace" 
                    rows="10" 
                    placeholder="Paste your books here..."
                    value={batchText}
                    onChange={e => setBatchText(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  ></textarea>
                  <div className="form-text mt-2">Each book must be on its own line.</div>
                </div>
              )
            ) : (
              <div className="row g-3 animate-fade">
                <div className="col-12">
                  <div className="bg-light p-2.5 rounded border d-flex flex-wrap justify-content-between align-items-center gap-2 text-start">
                    <div>
                      <span className="small fw-bold text-muted text-uppercase d-block" style={{ fontSize: '0.7rem' }}>Autofill from Open Library</span>
                      <span className="small text-muted" style={{ fontSize: '0.75rem' }}>Enter Title and/or Author, then fetch pages, year, language, etc.</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary fw-semibold d-flex align-items-center gap-1.5"
                      onClick={handleFetchMetadata}
                      disabled={isLoadingMetadata || (!title.trim() && !author.trim())}
                    >
                      {isLoadingMetadata ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          <span>Fetching...</span>
                        </>
                      ) : (
                        <>
                          <Download size={14} />
                          <span>Fetch Metadata</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

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
                  <input id="book-pages" type="number" className="form-control" value={pages} onChange={e => handlePagesChange(e.target.value)} />
                </div>
                <div className="col-6 col-md-3">
                  <label htmlFor="book-category" className="form-label small fw-bold text-muted text-uppercase">Category</label>
                  <select id="book-category" className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="">Select Category</option>
                    <option value="Novel">Novel</option>
                    <option value="Novella">Novella</option>
                    <option value="Stories">Stories</option>
                    <option value="Essays">Essays</option>
                    <option value="Memoir">Memoir</option>
                  </select>
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
            )}

            <div className="mt-4 pt-3 border-top d-flex flex-column-reverse flex-sm-row justify-content-sm-end gap-2 w-100">
              {duplicateWarning ? (
                <>
                  <button type="button" className="btn btn-light px-4" onClick={() => setDuplicateWarning(null)}>
                    Go Back & Edit
                  </button>
                  {duplicateWarning.nonDuplicates.length > 0 && (
                    <button 
                      type="button" 
                      className="btn btn-outline-primary px-4" 
                      onClick={() => {
                        onSave(duplicateWarning.nonDuplicates);
                        setDuplicateWarning(null);
                      }}
                    >
                      Add Non-Duplicates Only ({duplicateWarning.nonDuplicates.length})
                    </button>
                  )}
                  <button 
                    type="button" 
                    className="btn btn-primary px-4" 
                    onClick={() => {
                      onSave(duplicateWarning.allParsedBooks);
                      setDuplicateWarning(null);
                    }}
                  >
                    Add All Anyway ({duplicateWarning.allParsedBooks.length})
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn-light px-4" onClick={onClose}>Cancel</button>
                  <button type="submit" className="btn btn-primary px-4">
                    {mode === 'batch' ? 'Add Batch' : (book ? 'Save Changes' : 'Save Book')}
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
