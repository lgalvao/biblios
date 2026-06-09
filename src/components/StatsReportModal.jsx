import { useMemo, useState } from 'react';
import { Copy, Download, FileText } from 'lucide-react';
import { calculateStats, generateStatsMarkdown, exportStatsPDF } from '../utils/statsGenerator';
import CountryFlag from './CountryFlag';

export default function StatsReportModal({ books, onClose, onShowToast }) {
  const stats = useMemo(() => calculateStats(books), [books]);
  const [copiando, setCopiando] = useState(false);

  if (!stats) return null;

  const handleCopy = () => {
    const md = generateStatsMarkdown(books, stats);
    setCopiando(true);
    
    const showSuccess = () => {
      if (onShowToast) {
        onShowToast("Report copied to clipboard!", "success");
      }
      setTimeout(() => setCopiando(false), 2000);
    };

    const showFailure = (err) => {
      console.error('Error copying Markdown:', err);
      if (onShowToast) {
        onShowToast("Failed to copy report.", "danger");
      }
      setCopiando(false);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(md)
        .then(showSuccess)
        .catch(showFailure);
    } else {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = md;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          showSuccess();
        } else {
          showFailure("execCommand returned false");
        }
      } catch (err) {
        showFailure(err);
      }
    }
  };

  const handleDownloadMD = () => {
    const md = generateStatsMarkdown(books, stats);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'library_statistics_report.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onShowToast) {
      onShowToast("Markdown report downloaded successfully!", "success");
    }
  };

  const handleDownloadPDF = () => {
    exportStatsPDF(books, stats);
    if (onShowToast) {
      onShowToast("PDF report generated successfully!", "success");
    }
  };

  const renderCardList = (titulo, items, isCountry = false) => {
    return (
      <div className="card border-0 shadow-sm h-100 bg-body-tertiary">
        <div className="card-header bg-transparent border-0 pt-3 pb-1">
          <h6 className="fw-bold text-uppercase small text-primary mb-0">{titulo}</h6>
        </div>
        <div className="card-body p-0" style={{ maxHeight: '240px', overflowY: 'auto' }}>
          {items.length === 0 ? (
            <div className="p-3 text-muted small italic">No data available</div>
          ) : (
            <table className="table table-hover table-sm table-borderless mb-0 align-middle">
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-bottom border-secondary-subtle">
                    <td className="ps-3 py-2 small fw-medium">
                      {isCountry ? (
                        <>
                          <CountryFlag countryName={item.label} />
                          <span className="ms-2">{item.label}</span>
                        </>
                      ) : (
                        item.label
                      )}
                    </td>
                    <td className="text-end pe-3 py-2">
                      <span className="badge bg-primary bg-opacity-10 text-primary fw-bold" style={{ fontSize: '0.75rem' }}>
                        {item.count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div className="modal-content shadow-lg border-0 bg-body">
          
          {/* Header */}
          <div className="modal-header border-bottom-0 pb-0 px-4 pt-4 d-flex justify-content-between align-items-center">
            <div>
              <h5 className="modal-title fw-bold">Statistics Report</h5>
              <p className="text-muted small mb-0">Detailed statistics of your book collection</p>
            </div>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>

          {/* Body */}
          <div className="modal-body px-4 py-3">
            
            {/* Banner - Total Books */}
            <div className="card border-0 shadow-sm mb-4 bg-primary bg-opacity-10 text-primary-emphasis">
              <div className="card-body d-flex align-items-center justify-content-between p-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-primary bg-opacity-20 p-2.5 rounded">
                    <FileText size={24} className="text-primary" />
                  </div>
                  <div>
                    <h6 className="fw-bold mb-0 text-uppercase small" style={{ letterSpacing: '0.05em' }}>Total Books in Report</h6>
                    <p className="mb-0 small text-muted">Based on currently selected book filters</p>
                  </div>
                </div>
                <div>
                  <h3 className="fw-black mb-0 px-3 py-1 bg-primary text-white rounded-pill shadow-sm">{stats.totalBooks}</h3>
                </div>
              </div>
            </div>

            {/* Grid of stats lists */}
            <div className="row g-3">
              <div className="col-12 col-md-6">
                {renderCardList("By Continent", stats.byContinent)}
              </div>
              <div className="col-12 col-md-6">
                {renderCardList("By Century", stats.byCentury)}
              </div>
              <div className="col-12 col-md-6">
                {renderCardList("By Original Language", stats.byLanguage)}
              </div>
              <div className="col-12 col-md-6">
                {renderCardList("By Country", stats.byCountry, true)}
              </div>
              <div className="col-12">
                {renderCardList("By Author (Only if the author has more than one)", stats.byAuthor)}
              </div>
            </div>

          </div>

          {/* Footer with Actions */}
          <div className="modal-footer border-top-0 pt-0 px-4 pb-4 d-flex flex-wrap gap-2 justify-content-end">
            <button 
              type="button" 
              className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
              onClick={handleCopy}
              disabled={copiando}
            >
              <Copy size={16} />
              <span>{copiando ? "Copied!" : "Copy MD"}</span>
            </button>
            
            <button 
              type="button" 
              className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
              onClick={handleDownloadMD}
            >
              <Download size={16} />
              <span>Download MD</span>
            </button>

            <button 
              type="button" 
              className="btn btn-primary d-inline-flex align-items-center gap-2"
              onClick={handleDownloadPDF}
            >
              <Download size={16} />
              <span>Download PDF</span>
            </button>
            
            <button type="button" className="btn btn-light" onClick={onClose}>
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
