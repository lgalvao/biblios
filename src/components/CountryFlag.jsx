import { getCountryCode, getCountryFlag } from '../utils/dataUtils';

/**
 * Componente para exibir a bandeira de um país.
 * No Windows, utiliza o FlagCDN para garantir que a bandeira seja exibida (já que o Windows não suporta emojis de bandeira).
 * Em outros sistemas, pode atuar como fallback, mas o uso de imagem é mais consistente.
 */
export default function CountryFlag({ countryName, className = "" }) {
  if (!countryName) return null;

  const code = getCountryCode(countryName);
  
  if (!code) {
    return <span className={className} title={`No code for ${countryName}`}>{getCountryFlag(countryName)}</span>;
  }

  const url = `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

  return (
    <img 
      src={url} 
      alt={`${countryName} flag`}
      title={`${countryName} (${code})`}
      className={className}
      style={{ 
        width: '20px', 
        height: '15px', 
        verticalAlign: 'middle', 
        marginRight: '0.5rem',
        borderRadius: '2px',
        border: '1px solid rgba(0,0,0,0.1)',
        display: 'inline-block',
        backgroundColor: '#eee' // Placeholder visual
      }}
      onError={(e) => {
        console.warn(`Failed to load flag for ${countryName} from ${url}`);
        e.target.style.display = 'none';
        const span = document.createElement('span');
        span.innerText = getCountryFlag(countryName);
        e.target.parentNode.insertBefore(span, e.target.nextSibling);
      }}
    />
  );
}
