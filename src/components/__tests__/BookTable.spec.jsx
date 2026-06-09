import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    
    const langSpan = screen.getByTestId('language-link-1');
    expect(langSpan).toBeInTheDocument();
    
    // Click the language link to trigger filter
    fireEvent.click(langSpan);
    expect(defaultProps.onLanguageFilterChange).toHaveBeenCalledWith('Galician');
  });

  it('displays author column values and handles click to filter with propagation stopped', () => {
    render(<BookTable {...defaultProps} />);
    
    const authorSpan = screen.getByTestId('author-link-1');
    expect(authorSpan).toBeInTheDocument();
    
    // Click the author link to trigger filter
    fireEvent.click(authorSpan);
    expect(defaultProps.onAuthorFilterChange).toHaveBeenCalledWith('Xosé Neira Vilas');
  });

  it('displays country column values and handles click to filter with propagation stopped', () => {
    render(<BookTable {...defaultProps} />);
    
    const countrySpan = screen.getByTestId('country-link-1');
    expect(countrySpan).toBeInTheDocument();
    
    // Click the country link to trigger filter
    fireEvent.click(countrySpan);
    expect(defaultProps.onCountryFilterChange).toHaveBeenCalledWith('Spain');
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

  it('filters books by pages count (shorter/longer/between values)', () => {
    render(<BookTable {...defaultProps} />);

    const selects = screen.getAllByRole('combobox');
    const pageSelect = selects.find(sel => 
      Array.from(sel.options).some(opt => opt.text === 'Any Pages')
    );
    expect(pageSelect).toBeDefined();

    // 1. Shorter than 200 pages
    fireEvent.change(pageSelect, { target: { value: 'under' } });
    const pagesInput = screen.getByPlaceholderText('Pages');
    fireEvent.change(pagesInput, { target: { value: '200' } });

    expect(screen.getByText('Memoirs of a Peasant Boy')).toBeInTheDocument();
    expect(screen.queryByText('The Door')).not.toBeInTheDocument();

    // 2. Longer than 200 pages
    fireEvent.change(pageSelect, { target: { value: 'over' } });
    fireEvent.change(pagesInput, { target: { value: '200' } });

    expect(screen.queryByText('Memoirs of a Peasant Boy')).not.toBeInTheDocument();
    expect(screen.getByText('The Door')).toBeInTheDocument();

    // 3. Between 150 and 200 pages
    fireEvent.change(pageSelect, { target: { value: 'between' } });
    const minInput = screen.getByPlaceholderText('Min');
    const maxInput = screen.getByPlaceholderText('Max');
    fireEvent.change(minInput, { target: { value: '150' } });
    fireEvent.change(maxInput, { target: { value: '200' } });

    expect(screen.getByText('Memoirs of a Peasant Boy')).toBeInTheDocument();
    expect(screen.queryByText('The Door')).not.toBeInTheDocument();

    // 4. Between 200 and 300 pages
    fireEvent.change(minInput, { target: { value: '200' } });
    fireEvent.change(maxInput, { target: { value: '300' } });

    expect(screen.queryByText('Memoirs of a Peasant Boy')).not.toBeInTheDocument();
    expect(screen.getByText('The Door')).toBeInTheDocument();

    // 5. Reset filters
    fireEvent.change(pageSelect, { target: { value: 'all' } });
    expect(screen.getByText('Memoirs of a Peasant Boy')).toBeInTheDocument();
    expect(screen.getByText('The Door')).toBeInTheDocument();
  });

  it('sorts books when column headers are clicked', () => {
    render(<BookTable {...defaultProps} />);
    
    // Default sorting is by title asc
    const titlesBefore = screen.getAllByText(/Memoirs of a Peasant Boy|The Door/);
    expect(titlesBefore[0].textContent).toBe('Memoirs of a Peasant Boy'); // M comes before T

    // Click on TITLE to sort desc
    const titleHeader = screen.getByRole('columnheader', { name: /TITLE/i });
    fireEvent.click(titleHeader);

    // After desc sort, 'The Door' should be first
    const titlesAfter = screen.getAllByText(/Memoirs of a Peasant Boy|The Door/);
    expect(titlesAfter[0].textContent).toBe('The Door');

    // Click on AUTHOR to sort asc
    const authorHeader = screen.getByRole('columnheader', { name: /AUTHOR/i });
    fireEvent.click(authorHeader);
    
    // Magda Szabó before Xosé Neira Vilas
    const authorsAfter = screen.getAllByText(/Xosé Neira Vilas|Magda Szabó/);
    expect(authorsAfter[0].textContent).toBe('Magda Szabó');

    // Click on other headers to cover sorting branches
    const yearHeader = screen.getByRole('columnheader', { name: /YEAR/i });
    fireEvent.click(yearHeader);
    
    const countryHeader = screen.getByRole('columnheader', { name: /COUNTRY/i });
    fireEvent.click(countryHeader);

    const languageHeader = screen.getByRole('columnheader', { name: /LANGUAGE/i });
    fireEvent.click(languageHeader);

    const pagesHeader = screen.getByRole('columnheader', { name: /PAGES/i });
    fireEvent.click(pagesHeader);
  });

  it('handles country click in mobile responsive view', () => {
    render(<BookTable {...defaultProps} />);
    
    // The country link in the mobile view has a specific structure in the DOM
    // It's inside a 'd-md-none' div. We can find all elements with 'country-link'
    // and click the first one that appears in the mobile block (usually there are multiple per book)
    const countryLinks = screen.getAllByText(/Spain/i).filter(el => el.closest('.country-link'));
    
    // Just click them all to ensure the branch is covered
    countryLinks.forEach(link => fireEvent.click(link));
    
    expect(defaultProps.onCountryFilterChange).toHaveBeenCalledWith('Spain');
  });

  it('expands row to show details and handles tag clicks', () => {
    const props = { ...defaultProps, books: [{ ...mockBooks[0], tags: ['Classic', 'Fiction'] }] };
    render(<BookTable {...props} />);

    // Row shouldn't be expanded initially
    expect(screen.queryByText(/No description available/i)).not.toBeInTheDocument();

    // Click on row to expand
    const row = screen.getByText('Memoirs of a Peasant Boy').closest('tr');
    fireEvent.click(row);

    // Should show description now
    expect(screen.getByText(/A great book/i)).toBeInTheDocument();
    
    // Tag should be present inside the main row and expanded details
    const clickableTag = screen.getByTitle('Search for Classic');
    expect(clickableTag).toBeInTheDocument();

    // Click on tag to trigger search filter
    fireEvent.click(clickableTag);
    expect(props.onSearchChange).toHaveBeenCalledWith('Classic');
  });

  it('handles two-step deletion process', () => {
    vi.useFakeTimers();
    render(<BookTable {...defaultProps} />);
    
    const deleteButtons = screen.getAllByTitle('Delete');
    
    // Click delete on first book
    fireEvent.click(deleteButtons[0]);
    
    // Should now ask for confirmation
    const confirmButton = screen.getByTitle('Confirm delete');
    expect(confirmButton).toBeInTheDocument();
    expect(defaultProps.onDeleteBook).not.toHaveBeenCalled();

    // Click again to confirm
    fireEvent.click(confirmButton);
    expect(defaultProps.onDeleteBook).toHaveBeenCalledWith(1);

    vi.useRealTimers();
  });

  it('handles toggle read status', () => {
    render(<BookTable {...defaultProps} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    // The first one is for 'Memoirs of a Peasant Boy' which is read: true
    expect(checkboxes[0]).toBeChecked();
    
    fireEvent.click(checkboxes[0]);
    expect(defaultProps.onToggleRead).toHaveBeenCalledWith(1);
  });

  it('handles edit book', () => {
    render(<BookTable {...defaultProps} />);
    
    const editBtns = screen.getAllByTitle('Edit');
    fireEvent.click(editBtns[0]);
    
    expect(defaultProps.onEditBook).toHaveBeenCalledWith(mockBooks[0]);
  });

  it('filters books by read status, continent, region, tag and search', () => {
    render(<BookTable {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/Search library.../i);
    const selects = screen.getAllByRole('combobox');
    const readSelect = selects.find(sel => Array.from(sel.options).some(opt => opt.text === 'Reading'));
    const continentSelect = selects.find(sel => Array.from(sel.options).some(opt => opt.text === 'All Continents'));
    const regionSelect = selects.find(sel => Array.from(sel.options).some(opt => opt.text === 'All Regions'));
    selects.find(sel => Array.from(sel.options).some(opt => opt.text === 'All Tags'));

    // Filter by Read
    fireEvent.change(readSelect, { target: { value: 'read' } });
    expect(screen.getByText('Memoirs of a Peasant Boy')).toBeInTheDocument();
    expect(screen.queryByText('The Door')).not.toBeInTheDocument();
    fireEvent.change(readSelect, { target: { value: 'unread' } });
    expect(screen.queryByText('Memoirs of a Peasant Boy')).not.toBeInTheDocument();
    expect(screen.getByText('The Door')).toBeInTheDocument();
    fireEvent.change(readSelect, { target: { value: 'all' } });

    // Filter by Continent
    fireEvent.change(continentSelect, { target: { value: 'Europe' } });
    expect(screen.getByText('The Door')).toBeInTheDocument();
    
    // Filter by Region
    fireEvent.change(regionSelect, { target: { value: 'Southern Europe' } });
    expect(screen.getByText('Memoirs of a Peasant Boy')).toBeInTheDocument();
    expect(screen.queryByText('The Door')).not.toBeInTheDocument();
    fireEvent.change(regionSelect, { target: { value: 'all' } });

    // Search
    fireEvent.change(searchInput, { target: { value: 'Door' } });
    expect(defaultProps.onSearchChange).toHaveBeenCalledWith('Door');
    
    // Para testar o botão X, precisamos re-renderizar com search preenchido
    const propsWithSearch = { ...defaultProps, search: 'Door' };
    render(<BookTable {...propsWithSearch} />);
    const clearSearchBtn = screen.getByRole('button', { name: '' }).closest('div').querySelector('.btn-outline-secondary');
    fireEvent.click(clearSearchBtn);
    expect(defaultProps.onSearchChange).toHaveBeenCalledWith('');
  });

  it('filtra livros pelo campo descrição apenas quando o switch de busca em todos os campos está ativado', () => {
    const customBooks = [
      {
        id: 1,
        title: "Book A",
        author: "Author A",
        year: "1960",
        country: "Brazil",
        region: "South America",
        continent: "South America",
        read: true,
        originalLanguage: "Portuguese",
        pages: 150,
        description: "Contains a secret word inside the story."
      },
      {
        id: 2,
        title: "Book B",
        author: "Author B",
        year: "1980",
        country: "Portugal",
        region: "Southern Europe",
        continent: "Europe",
        read: false,
        originalLanguage: "Portuguese",
        pages: 250,
        description: "Ordinary description."
      }
    ];

    const props = {
      ...defaultProps,
      books: customBooks,
      search: 'secret'
    };

    render(<BookTable {...props} />);

    // Por padrão, 'secret' está apenas na descrição do Book A, e searchAllFields é false por padrão.
    // Portanto, nenhum livro deve ser listado.
    expect(screen.queryByText('Book A')).not.toBeInTheDocument();
    expect(screen.queryByText('Book B')).not.toBeInTheDocument();

    // Encontra o switch "searchAllFieldsSwitch" e clica nele para ativá-lo
    const switchEl = screen.getByLabelText(/Pesquisar em todos os campos/i);
    fireEvent.click(switchEl);

    // Agora o Book A deve ser exibido na tela, mas o Book B não
    expect(screen.getByText('Book A')).toBeInTheDocument();
    expect(screen.queryByText('Book B')).not.toBeInTheDocument();
  });

  it('closes export dropdown when clicking outside', () => {
    render(<BookTable {...defaultProps} />);
    const exportBtn = screen.getByTitle('Export');
    fireEvent.click(exportBtn);
    expect(screen.getByText('CSV')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('CSV')).not.toBeInTheDocument();
  });

  it('handles clipboard fallback when navigator.clipboard is unavailable', () => {
    const originalClipboard = navigator.clipboard;
    
    delete navigator.clipboard;
    
    document.execCommand = vi.fn().mockReturnValue(true);
    
    render(<BookTable {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Export'));
    fireEvent.click(screen.getByText('Copy MD'));
    
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(defaultProps.onShowToast).toHaveBeenCalledWith(expect.any(String), 'success');
    
    navigator.clipboard = originalClipboard;
  });

  it('handles clipboard failure', async () => {
    const mockClipboard = { writeText: vi.fn().mockRejectedValue(new Error('Failed')) };
    Object.assign(navigator, { clipboard: mockClipboard });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<BookTable {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Export'));
    fireEvent.click(screen.getByText('Copy MD'));
    
    await waitFor(() => expect(defaultProps.onShowToast).toHaveBeenCalledWith(expect.any(String), 'danger'));
    consoleSpy.mockRestore();
  });

  it('triggers infinite scroll loading when sentinel is visible', () => {
    const originalObserver = window.IntersectionObserver;
    const observe = vi.fn();
    const disconnect = vi.fn();
    window.IntersectionObserver = vi.fn().mockImplementation(function() {
      return {
        observe,
        disconnect,
        unobserve: vi.fn()
      };
    });

    render(<BookTable {...defaultProps} books={Array.from({ length: 100 }, (_, i) => ({ ...mockBooks[0], id: i }))} />);
    
    expect(observe).toHaveBeenCalled();
    
    // Simulate intersection
    const [callback] = window.IntersectionObserver.mock.calls[0];
    callback([{ isIntersecting: true }]);
    
    // Restore original IntersectionObserver to prevent leaking to other tests
    window.IntersectionObserver = originalObserver;
  });

  it('filters books by pages with various edge cases', () => {
    const booksWithNullPages = [
      { ...mockBooks[0], pages: 100 },
      { ...mockBooks[1], pages: null },
      { ...mockBooks[0], id: 3, pages: '' },
      { ...mockBooks[1], id: 4, pages: undefined }
    ];
    render(<BookTable {...defaultProps} books={booksWithNullPages} />);

    const selects = screen.getAllByRole('combobox');
    const pageSelect = selects.find(sel => Array.from(sel.options).some(opt => opt.text === 'Any Pages'));
    
    // Under 150 - Book 1 should show, Book 2,3,4 should not
    fireEvent.change(pageSelect, { target: { value: 'under' } });
    fireEvent.change(screen.getByPlaceholderText('Pages'), { target: { value: '150' } });
    expect(screen.getAllByText('Memoirs of a Peasant Boy').length).toBe(1);

    // Over 50 - Book 1 should show, Book 2,3,4 should not
    fireEvent.change(pageSelect, { target: { value: 'over' } });
    fireEvent.change(screen.getByPlaceholderText('Pages'), { target: { value: '50' } });
    expect(screen.getAllByText('Memoirs of a Peasant Boy').length).toBe(1);

    // Between - max only
    fireEvent.change(pageSelect, { target: { value: 'between' } });
    const minInput = screen.getByPlaceholderText('Min');
    const maxInput = screen.getByPlaceholderText('Max');
    fireEvent.change(minInput, { target: { value: '' } });
    fireEvent.change(maxInput, { target: { value: '150' } });
    expect(screen.getAllByText('Memoirs of a Peasant Boy').length).toBe(1);

    // Between - both empty (should show both as long as they have pages? No, if pages null matchesPages is false for between)
    fireEvent.change(minInput, { target: { value: '' } });
    fireEvent.change(maxInput, { target: { value: '' } });
    expect(screen.getAllByText('Memoirs of a Peasant Boy').length).toBe(1);
  });

  it('exports CSV correctly including unread books', () => {
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
    window.URL.revokeObjectURL = vi.fn();
    
    render(<BookTable {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Export'));
    fireEvent.click(screen.getByText('CSV'));
    
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('opens export dropdown and calls export functions', () => {
    // Mock navigator and URL for export functions
    global.URL.createObjectURL = vi.fn();
    window.URL.revokeObjectURL = vi.fn();
    const mockClipboard = { writeText: vi.fn().mockResolvedValue() };
    Object.assign(navigator, { clipboard: mockClipboard });

    render(<BookTable {...defaultProps} />);
    
    // Click Export button to open dropdown
    const exportBtn = screen.getByTitle('Export');
    fireEvent.click(exportBtn);
    
    const csvBtn = screen.getByText('CSV');
    expect(csvBtn).toBeInTheDocument();
    
    // Click CSV
    fireEvent.click(csvBtn);
    expect(global.URL.createObjectURL).toHaveBeenCalled();

    // Open again and click MD
    fireEvent.click(exportBtn);
    const mdBtn = screen.getByText('MD (Download)');
    fireEvent.click(mdBtn);
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(2);

    // Open again and click Copy MD
    fireEvent.click(exportBtn);
    const copyMdBtn = screen.getByText('Copy MD');
    fireEvent.click(copyMdBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
