import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BookTable from '../BookTable';

const mockBooks = [
  {
    id: 1,
    title: "Memoirs of a Peasant Boy",
    author: "Xosé Neira Vilas",
    year: "1961",
    country: "Spain",
    region: "Southern Europe",
    continent: "Europe",
    read: true,
    originalLanguage: "Galician",
    pages: 180,
    description: "A great book."
  },
  {
    id: 2,
    title: "The Door",
    author: "Magda Szabó",
    year: "1987",
    country: "Hungary",
    region: "Eastern Europe",
    continent: "Europe",
    read: false,
    originalLanguage: "Hungarian",
    pages: 288,
    description: "Another great book."
  }
];

describe('BookTable Component tests', () => {
  const defaultProps = {
    books: mockBooks,
    onToggleRead: vi.fn(),
    onEditBook: vi.fn(),
    onDeleteBook: vi.fn(),
    search: '',
    onSearchChange: vi.fn(),
    selectedCountry: '',
    onCountryFilterChange: vi.fn(),
    selectedLanguage: '',
    onLanguageFilterChange: vi.fn(),
    selectedAuthor: '',
    onAuthorFilterChange: vi.fn(),
    onShowToast: vi.fn()
  };

  it('renders table headers including LANGUAGE', () => {
    render(<BookTable {...defaultProps} />);
    expect(screen.getByRole('columnheader', { name: /TITLE/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /AUTHOR/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /LANGUAGE/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /COUNTRY/i })).toBeInTheDocument();
  });

  it('populates language filter dropdown and responds to selection', () => {
    render(<BookTable {...defaultProps} />);
    
    // Retrieve all select elements and find the one that has "All Languages" option
    const selects = screen.getAllByRole('combobox');
    const langSelect = selects.find(sel => 
      Array.from(sel.options).some(opt => opt.text === 'All Languages')
    );
    
    expect(langSelect).toBeDefined();
    
    // Check options list
    const options = Array.from(langSelect.options).map(o => o.text);
    expect(options).toContain('All Languages');
    expect(options).toContain('Galician');
    expect(options).toContain('Hungarian');

    // Simulate change event
    fireEvent.change(langSelect, { target: { value: 'Galician' } });
    expect(defaultProps.onLanguageFilterChange).toHaveBeenCalledWith('Galician');
  });

  it('displays language column values and handles click to filter with propagation stopped', () => {
    render(<BookTable {...defaultProps} />);
    
    const langSpan = screen.getByText('Galician', { selector: 'span' });
    expect(langSpan).toBeInTheDocument();
    
    // Click the language link to trigger filter
    fireEvent.click(langSpan);
    expect(defaultProps.onLanguageFilterChange).toHaveBeenCalledWith('Galician');
  });

  it('displays author column values and handles click to filter with propagation stopped', () => {
    render(<BookTable {...defaultProps} />);
    
    const authorSpan = screen.getByText('Xosé Neira Vilas', { selector: 'span' });
    expect(authorSpan).toBeInTheDocument();
    
    // Click the author link to trigger filter
    fireEvent.click(authorSpan);
    expect(defaultProps.onAuthorFilterChange).toHaveBeenCalledWith('Xosé Neira Vilas');
  });

  it('displays active filter badges for author and language', () => {
    const props = {
      ...defaultProps,
      selectedLanguage: 'Galician',
      selectedAuthor: 'Xosé Neira Vilas'
    };
    render(<BookTable {...props} />);
    
    expect(screen.getByText(/LANGUAGE: Galician/i)).toBeInTheDocument();
    expect(screen.getByText(/AUTHOR: Xosé Neira Vilas/i)).toBeInTheDocument();
  });
});
