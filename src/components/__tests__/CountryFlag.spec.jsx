import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CountryFlag from '../CountryFlag';
import * as dataUtils from '../../utils/dataUtils';

describe('CountryFlag', () => {
  it('renders null if no countryName is provided', () => {
    const { container } = render(<CountryFlag />);
    expect(container.firstChild).toBeNull();
  });

  it('renders flag emoji if no country code is found', () => {
    vi.spyOn(dataUtils, 'getCountryCode').mockReturnValue(null);
    vi.spyOn(dataUtils, 'getCountryFlag').mockReturnValue('🏳️');
    
    render(<CountryFlag countryName="Unknown" />);
    expect(screen.getByText('🏳️')).toBeDefined();
  });

  it('renders img with correct url if country code is found', () => {
    vi.spyOn(dataUtils, 'getCountryCode').mockReturnValue('BR');
    
    render(<CountryFlag countryName="Brazil" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('https://flagcdn.com/w40/br.png');
    expect(img.getAttribute('alt')).toBe('Brazil flag');
  });

  it('handles image loading error by showing emoji fallback', () => {
    vi.spyOn(dataUtils, 'getCountryCode').mockReturnValue('BR');
    vi.spyOn(dataUtils, 'getCountryFlag').mockReturnValue('🇧🇷');
    
    render(<div><CountryFlag countryName="Brazil" /></div>);
    const img = screen.getByRole('img');
    
    // Simular erro de carregamento
    fireEvent.error(img);
    
    // jsdom doesn't support innerText well, let's check nextSibling
    const span = img.nextSibling;
    expect(span.tagName).toBe('SPAN');
    // jsdom might use textContent instead of innerText
    expect(span.textContent || span.innerText).toBe('🇧🇷');
    expect(img.style.display).toBe('none');
  });
});
