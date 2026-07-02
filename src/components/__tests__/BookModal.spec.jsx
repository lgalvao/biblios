import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BookModal from '../BookModal';

const mockBooks = [
  {
    title: 'Dom Casmurro',
    author: 'Machado de Assis',
    country: 'Brazil',
    region: 'South America',
    continent: 'South America'
  },
  {
    title: '1984',
    author: 'George Orwell',
    country: 'England',
    region: 'Northern Europe',
    continent: 'Europe'
  }
];

describe('BookModal Component tests', () => {
  const defaultProps = {
    book: null,
    books: mockBooks,
    authors: ['Machado de Assis', 'George Orwell'],
    languages: ['Portuguese', 'English'],
    tags: ['classic', 'dystopian'],
    onSave: vi.fn(),
    onClose: vi.fn()
  };

  it('preenche automaticamente país, região e continente quando um autor conhecido é digitado/selecionado', () => {
    render(<BookModal {...defaultProps} />);

    const authorInput = screen.getByLabelText(/Author/i);
    const countryInput = screen.getByLabelText(/Country/i);

    // Estado inicial vazio
    expect(authorInput.value).toBe('');
    expect(countryInput.value).toBe('');

    // Simula a seleção de um autor conhecido
    fireEvent.change(authorInput, { target: { value: 'Machado de Assis' } });

    // Verifica se os campos de localização geográfica foram preenchidos corretamente
    expect(countryInput.value).toBe('Brazil');
    expect(screen.getByText(/✓ Auto-detected: South America • South America/i)).toBeInTheDocument();
  });

  it('não preenche o país automaticamente se um autor desconhecido for digitado', () => {
    render(<BookModal {...defaultProps} />);

    const authorInput = screen.getByLabelText(/Author/i);
    const countryInput = screen.getByLabelText(/Country/i);

    // Simula a digitação de um autor não mapeado
    fireEvent.change(authorInput, { target: { value: 'Autor Desconhecido' } });

    // O campo country deve continuar vazio
    expect(countryInput.value).toBe('');
  });

  it('exibe erro ao tentar salvar sem preencher os campos obrigatórios', () => {
    render(<BookModal {...defaultProps} />);
    
    const form = screen.getByRole('button', { name: /Save Book/i }).closest('form');
    fireEvent.submit(form);
    
    // O formulário exibe o erro interno (setError)
    expect(screen.getByText('Please fill required fields.')).toBeInTheDocument();
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it('permite adicionar e remover tags', () => {
    render(<BookModal {...defaultProps} />);
    
    const tagInput = screen.getByPlaceholderText(/Add tag/i);
    const addButton = screen.getByRole('button', { name: /^Add$/ });

    // Adicionar tag
    fireEvent.change(tagInput, { target: { value: 'NewTag' } });
    fireEvent.click(addButton);

    // Adicionar tag com Enter
    fireEvent.change(tagInput, { target: { value: 'AnotherTag' } });
    fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });

    expect(screen.getByText('#newtag')).toBeInTheDocument();
    expect(screen.getByText('#anothertag')).toBeInTheDocument();

    // Tentar adicionar duplicada
    fireEvent.change(tagInput, { target: { value: 'newtag' } });
    fireEvent.click(addButton);
    
    const newTags = screen.getAllByText('#newtag');
    expect(newTags.length).toBe(1);

    // Remover tag
    const removeButtons = screen.getAllByRole('button').filter(b => b.className.includes('btn-close-white'));
    fireEvent.click(removeButtons[0]);

    expect(screen.queryByText('#newtag')).not.toBeInTheDocument();
  });

  it('salva corretamente quando todos os campos são preenchidos', () => {
    const onSaveMock = vi.fn();
    render(<BookModal {...defaultProps} onSave={onSaveMock} />);
    
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'New Book' } });
    fireEvent.change(screen.getByLabelText(/Author/i), { target: { value: 'Author' } });
    fireEvent.change(screen.getByLabelText(/Year/i), { target: { value: '2023' } });
    fireEvent.change(screen.getByLabelText(/Country/i), { target: { value: 'Brazil' } });
    // Continent is auto-filled for Brazil
    
    fireEvent.change(screen.getByLabelText(/Language/i), { target: { value: 'Portuguese' } });
    fireEvent.change(screen.getByLabelText(/Pages/i), { target: { value: '250' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Desc' } });
    
    const readCheckbox = screen.getByLabelText(/Mark as Read/i);
    fireEvent.click(readCheckbox);

    const saveButton = screen.getByRole('button', { name: /Save Book/i });
    fireEvent.click(saveButton);

    expect(onSaveMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'New Book',
      author: 'Author',
      year: '2023',
      country: 'Brazil',
      continent: 'South America',
      originalLanguage: 'Portuguese',
      pages: 250,
      description: 'Desc',
      read: true
    }));
  });

  it('carrega dados iniciais corretamente ao editar um livro', () => {
    const bookToEdit = {
      id: 123,
      title: 'Existing Book',
      author: 'Author',
      year: '2000',
      country: 'France',
      region: 'Western Europe',
      continent: 'Europe',
      read: true,
      originalLanguage: 'French',
      pages: 300,
      description: 'Old desc',
      tags: ['tag1']
    };
    render(<BookModal {...defaultProps} book={bookToEdit} />);
    
    expect(screen.getByLabelText(/Title/i).value).toBe('Existing Book');
    expect(screen.getByLabelText(/Pages/i).value).toBe('300');
    expect(screen.getByLabelText(/Mark as Read/i)).toBeChecked();
    expect(screen.getByText('#tag1')).toBeInTheDocument();
  });

  it('exibe mensagem quando não há tags', () => {
    render(<BookModal {...defaultProps} />);
    expect(screen.getByText(/No tags associated with this book/i)).toBeInTheDocument();
  });

  it('limpa o input de tag após adicionar e não adiciona tags vazias', () => {
    render(<BookModal {...defaultProps} />);
    const tagInput = screen.getByPlaceholderText(/Add tag/i);
    const addButton = screen.getByRole('button', { name: /^Add$/ });

    fireEvent.change(tagInput, { target: { value: '  ' } });
    fireEvent.click(addButton);
    expect(screen.queryByText('#')).not.toBeInTheDocument();

    fireEvent.change(tagInput, { target: { value: 'valid' } });
    fireEvent.click(addButton);
    expect(tagInput.value).toBe('');
  });

  it('passa o ID correto no onSave ao editar um livro', () => {
    const onSaveMock = vi.fn();
    const bookToEdit = { ...mockBooks[0], id: 999, year: '1960' };
    render(<BookModal {...defaultProps} book={bookToEdit} onSave={onSaveMock} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
    
    expect(onSaveMock).toHaveBeenCalledWith(expect.objectContaining({
      id: 999
    }));
  });

  it('permite edição manual do continente e região para país desconhecido', () => {
    render(<BookModal {...defaultProps} />);
    
    const countryInput = screen.getByLabelText(/Country/i);
    fireEvent.change(countryInput, { target: { value: 'Atlantis' } });
    
    // Country is unknown, so Continent and Region should appear
    const continentInput = screen.getByLabelText(/Continent/i);
    const regionInput = screen.getByLabelText(/Region/i);

    fireEvent.change(continentInput, { target: { value: 'Oceania' } });
    fireEvent.change(regionInput, { target: { value: 'Lost Sea' } });

    expect(continentInput.value).toBe('Oceania');
    expect(regionInput.value).toBe('Lost Sea');
  });

  it('handles author change when books list is missing or empty', () => {
    const propsWithoutBooks = { ...defaultProps, books: [] };
    render(<BookModal {...propsWithoutBooks} />);
    
    const authorInput = screen.getByLabelText(/Author/i);
    fireEvent.change(authorInput, { target: { value: 'Some Author' } });
    
    expect(screen.getByLabelText(/Country/i).value).toBe('');
  });

  it('shows error when required fields are missing on submit', () => {
    render(<BookModal {...defaultProps} />);
    const form = screen.getByRole('button', { name: /Save Book/i }).closest('form');
    fireEvent.submit(form);
    expect(screen.getByText(/Please fill required fields/i)).toBeInTheDocument();
  });

  it('preenche automaticamente o idioma se todos os livros do autor forem do mesmo idioma', () => {
    const mockBooksWithLangs = [
      {
        title: 'Dom Casmurro',
        author: 'Machado de Assis',
        country: 'Brazil',
        region: 'South America',
        continent: 'South America',
        originalLanguage: 'Portuguese'
      },
      {
        title: 'Memórias Póstumas de Brás Cubas',
        author: 'Machado de Assis',
        country: 'Brazil',
        region: 'South America',
        continent: 'South America',
        originalLanguage: 'Portuguese'
      },
      {
        title: '1984',
        author: 'George Orwell',
        country: 'England',
        region: 'Northern Europe',
        continent: 'Europe',
        originalLanguage: 'English'
      }
    ];

    const customProps = {
      ...defaultProps,
      books: mockBooksWithLangs
    };

    render(<BookModal {...customProps} />);

    const authorInput = screen.getByLabelText(/Author/i);
    const languageInput = screen.getByLabelText(/Language/i);

    expect(languageInput.value).toBe('');

    // Seleciona Machado de Assis (que só tem livros em Portuguese)
    fireEvent.change(authorInput, { target: { value: 'Machado de Assis' } });
    expect(languageInput.value).toBe('Portuguese');
  });

  it('não preenche o idioma automaticamente se o autor possuir livros em idiomas diferentes', () => {
    const mockBooksWithLangs = [
      {
        title: 'Book A',
        author: 'Multilingual Author',
        country: 'Brazil',
        region: 'South America',
        continent: 'South America',
        originalLanguage: 'Portuguese'
      },
      {
        title: 'Book B',
        author: 'Multilingual Author',
        country: 'Brazil',
        region: 'South America',
        continent: 'South America',
        originalLanguage: 'English'
      }
    ];

    const customProps = {
      ...defaultProps,
      books: mockBooksWithLangs
    };

    render(<BookModal {...customProps} />);

    const authorInput = screen.getByLabelText(/Author/i);
    const languageInput = screen.getByLabelText(/Language/i);

    expect(languageInput.value).toBe('');

    fireEvent.change(authorInput, { target: { value: 'Multilingual Author' } });
    expect(languageInput.value).toBe('');
  });

  it('não altera a categoria automaticamente quando o número de páginas é alterado', () => {
    render(<BookModal {...defaultProps} />);

    const pagesInput = screen.getByLabelText(/Pages/i);
    const categorySelect = screen.getByLabelText(/Category/i);

    expect(categorySelect.value).toBe('');

    // Insere 150 páginas -> continua vazio
    fireEvent.change(pagesInput, { target: { value: '150' } });
    expect(categorySelect.value).toBe('');

    // Insere 151 páginas -> continua vazio
    fireEvent.change(pagesInput, { target: { value: '151' } });
    expect(categorySelect.value).toBe('');

    // Seleciona categoria manualmente para 'Novella'
    fireEvent.change(categorySelect, { target: { value: 'Novella' } });
    expect(categorySelect.value).toBe('Novella');

    // Insere 500 páginas -> a categoria deve continuar sendo 'Novella'
    fireEvent.change(pagesInput, { target: { value: '500' } });
    expect(categorySelect.value).toBe('Novella');
  });

  it('handles batch add warning and adding non-duplicates only', () => {
    const onSaveMock = vi.fn();
    render(<BookModal {...defaultProps} onSave={onSaveMock} />);

    // Switch to Batch mode
    const batchButton = screen.getByRole('button', { name: /Batch Add/i });
    fireEvent.click(batchButton);

    // Paste batch text containing:
    // 1. A book already in mockBooks (Dom Casmurro by Machado de Assis)
    // 2. A brand new book (The Hobbit by J.R.R. Tolkien)
    // 3. Another brand new book duplicated inside the batch (The Hobbit by J.R.R. Tolkien)
    const batchTextarea = screen.getByPlaceholderText(/Paste your books here.../i);
    fireEvent.change(batchTextarea, {
      target: {
        value: `Dom Casmurro by Machado de Assis (Brazil, 1899), 256 p., Portuguese\nThe Hobbit by J.R.R. Tolkien (United Kingdom, 1937), 310 p., English\nThe Hobbit by J.R.R. Tolkien (United Kingdom, 1937), 310 p., English`
      }
    });

    const addBatchButton = screen.getByRole('button', { name: /Add Batch/i });
    fireEvent.click(addBatchButton);

    // It should display duplicate warning alert
    expect(screen.getByText(/Duplicate Books Detected/i)).toBeInTheDocument();
    expect(onSaveMock).not.toHaveBeenCalled();

    // The duplicates table should show the duplicates
    // Dom Casmurro is a duplicate (in library) and the second The Hobbit is an internal duplicate
    expect(screen.getAllByText('Dom Casmurro').length).toBeGreaterThan(0);
    expect(screen.getAllByText('The Hobbit').length).toBeGreaterThan(0);

    // Test clicking "Go Back & Edit"
    const goBackButton = screen.getByRole('button', { name: /Go Back & Edit/i });
    fireEvent.click(goBackButton);

    // We should be back in the textarea entry mode
    expect(screen.getByPlaceholderText(/Paste your books here.../i)).toBeInTheDocument();

    // Click Add Batch again to trigger warning
    fireEvent.click(screen.getByRole('button', { name: /Add Batch/i }));

    // Click "Add Non-Duplicates Only"
    const addNonDupButton = screen.getByRole('button', { name: /Add Non-Duplicates Only/i });
    fireEvent.click(addNonDupButton);

    // It should only save the single non-duplicate (The Hobbit)
    expect(onSaveMock).toHaveBeenCalledTimes(1);
    expect(onSaveMock).toHaveBeenCalledWith([
      expect.objectContaining({
        title: 'The Hobbit',
        author: 'J.R.R. Tolkien',
        pages: 310
      })
    ]);
  });

  it('handles batch add warning and adding all books anyway', () => {
    const onSaveMock = vi.fn();
    render(<BookModal {...defaultProps} onSave={onSaveMock} />);

    // Switch to Batch mode
    const batchButton = screen.getByRole('button', { name: /Batch Add/i });
    fireEvent.click(batchButton);

    // Paste batch text containing a duplicate book (Dom Casmurro)
    fireEvent.change(screen.getByPlaceholderText(/Paste your books here.../i), {
      target: {
        value: `Dom Casmurro by Machado de Assis (Brazil, 1899), 256 p., Portuguese`
      }
    });
    
    const addBatchButton = screen.getByRole('button', { name: /Add Batch/i });
    fireEvent.click(addBatchButton);

    // Dom Casmurro is already in library, so warning appears. Click "Add All Anyway"
    const addAllAnywayButton = screen.getByRole('button', { name: /Add All Anyway/i });
    fireEvent.click(addAllAnywayButton);

    expect(onSaveMock).toHaveBeenCalledWith([
      expect.objectContaining({
        title: 'Dom Casmurro',
        author: 'Machado de Assis'
      })
    ]);
  });

  it('handles batch adding the user second book list successfully without duplicates', () => {
    const onSaveMock = vi.fn();
    render(<BookModal {...defaultProps} onSave={onSaveMock} />);

    // Switch to Batch mode
    const batchButton = screen.getByRole('button', { name: /Batch Add/i });
    fireEvent.click(batchButton);

    const batchTextarea = screen.getByPlaceholderText(/Paste your books here.../i);
    fireEvent.change(batchTextarea, {
      target: {
        value: `The Peloponnesian War by Thucydides (Ancient Greece, 400 BC), 600 p, Ancient Greek
The Last Days of Socrates by Plato (Ancient Greece, 399 BC), 256 p, Ancient Greek
The Persian Expedition by Xenophon (Ancient Greece, 370 BC), 350 p, Ancient Greek
The Twelve Caesars by Suetonius (Ancient Rome, 121), 400 p, Latin
The Gallic War by Julius Caesar (Ancient Rome, 50 BC), 300 p, Latin
Selected Letters by Cicero (Ancient Rome, 44 BC), 400 p, Latin
Ecclesiastical History of the English People by Bede (UK, 731), 400 p, Latin
Genesis by Anonymous (Ancient Israel, 500 BC), 80 p, Hebrew
The Analects by Confucius (China, 475 BC), 150 p, Classical Chinese
The Sayings of the Desert Fathers by Anonymous (Byzantium, 500), 250 p, Greek
The Upanishads by Anonymous (India, 700 BC), 300 p, Sanskrit
The Arthashastra by Kautilya (India, 300 BC), 500 p, Sanskrit
The Instruction of Ptahhotep by Anonymous (Ancient Egypt, 2350 BC), 60 p, Middle Egyptian
The Gospel According to Mark by Anonymous (Ancient Israel, 70), 60 p, Greek`
      }
    });

    const addBatchButton = screen.getByRole('button', { name: /Add Batch/i });
    fireEvent.click(addBatchButton);

    expect(onSaveMock).toHaveBeenCalledTimes(1);
    const savedBooks = onSaveMock.mock.calls[0][0];
    expect(savedBooks).toHaveLength(14);
    expect(savedBooks[0]).toMatchObject({
      title: 'The Peloponnesian War',
      author: 'Thucydides',
      year: '400 BC',
      country: 'Ancient Greece',
      region: 'Southern Europe',
      continent: 'Europe',
      pages: 600,
      originalLanguage: 'Ancient Greek'
    });
  });

  it('calls Open Library API and autofills fields when clicking Fetch Metadata', async () => {
    // Mock the global fetch
    const mockOLResponse = {
      docs: [
        {
          key: '/works/OL27479W',
          title: 'The Hobbit',
          author_name: ['J.R.R. Tolkien'],
          first_publish_year: 1937,
          number_of_pages_median: 310,
          language: ['eng'],
          publish_place: ['London']
        }
      ]
    };
    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url) => {
      if (url.includes('openlibrary.org/search.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOLResponse)
        });
      }
      if (url.includes('openlibrary.org/works/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            description: 'A great fantasy novel.'
          })
        });
      }
      return Promise.reject(new Error('Unknown URL in test: ' + url));
    });

    render(<BookModal {...defaultProps} />);

    // Type Title
    const titleInput = screen.getByLabelText(/Title/i);
    fireEvent.change(titleInput, { target: { value: 'The Hobbit' } });

    // The fetch button should be enabled
    const fetchButton = screen.getByRole('button', { name: /Fetch Metadata/i });
    expect(fetchButton).not.toBeDisabled();

    // Click fetch button
    fireEvent.click(fetchButton);

    // Wait for async changes (autofill)
    // The page fields should be filled
    await screen.findByDisplayValue('J.R.R. Tolkien');
    expect(screen.getByLabelText(/Author/i).value).toBe('J.R.R. Tolkien');
    expect(screen.getByLabelText(/Year/i).value).toBe('1937');
    expect(screen.getByLabelText(/Pages/i).value).toBe('310');
    expect(screen.getByLabelText(/Language/i).value).toBe('English');
    expect(screen.getByLabelText(/Description/i).value).toBe('A great fantasy novel.');

    // Check that fetch was called with correct URL
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('openlibrary.org/search.json'));
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('openlibrary.org/works/OL27479W.json'));

    fetchSpy.mockRestore();
  });

  it('falls back to Google Books API when Open Library has no description', async () => {
    const mockOLResponse = {
      docs: [
        {
          key: '/works/OL27479W',
          title: 'The Hobbit',
          author_name: ['J.R.R. Tolkien'],
          first_publish_year: 1937,
          number_of_pages_median: 310,
          language: ['eng'],
          publish_place: ['London']
        }
      ]
    };
    const mockGBResponse = {
      items: [
        {
          volumeInfo: {
            description: '<p>A fallback fantasy novel.</p>',
            pageCount: 320
          }
        }
      ]
    };

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url) => {
      if (url.includes('openlibrary.org/search.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOLResponse)
        });
      }
      if (url.includes('openlibrary.org/works/')) {
        // Return work info without description to trigger Google Books fallback
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      }
      if (url.includes('googleapis.com/books')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGBResponse)
        });
      }
      return Promise.reject(new Error('Unknown URL in test: ' + url));
    });

    render(<BookModal {...defaultProps} />);

    // Type Title
    const titleInput = screen.getByLabelText(/Title/i);
    fireEvent.change(titleInput, { target: { value: 'The Hobbit' } });

    // Click fetch button
    const fetchButton = screen.getByRole('button', { name: /Fetch Metadata/i });
    fireEvent.click(fetchButton);

    // Wait for description to load from Google Books fallback
    await screen.findByDisplayValue('A fallback fantasy novel.');

    expect(screen.getByLabelText(/Description/i).value).toBe('A fallback fantasy novel.');
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('googleapis.com/books/v1/volumes'));

    fetchSpy.mockRestore();
  });

  it('handles batch add and sets Category if selected in the category dropdown', () => {
    const onSaveMock = vi.fn();
    render(<BookModal {...defaultProps} onSave={onSaveMock} />);

    // Switch to Batch mode
    const batchButton = screen.getByRole('button', { name: /Batch Add/i });
    fireEvent.click(batchButton);

    // Paste batch text
    const batchTextarea = screen.getByPlaceholderText(/Paste your books here.../i);
    fireEvent.change(batchTextarea, {
      target: {
        value: `The Hobbit by J.R.R. Tolkien (United Kingdom, 1937), 310 p., English`
      }
    });

    // Select category 'Nonfiction'
    const categorySelect = screen.getByLabelText(/Category/i);
    fireEvent.change(categorySelect, { target: { value: 'Nonfiction' } });

    // Click submit
    const addBatchButton = screen.getByRole('button', { name: /Add Batch/i });
    fireEvent.click(addBatchButton);

    expect(onSaveMock).toHaveBeenCalledTimes(1);
    expect(onSaveMock).toHaveBeenCalledWith([
      expect.objectContaining({
        title: 'The Hobbit',
        author: 'J.R.R. Tolkien',
        category: 'Nonfiction'
      })
    ]);
  });

  it('permite selecionar a nova categoria "Long verse" no modo individual e batch', () => {
    const onSaveMock = vi.fn();
    render(<BookModal {...defaultProps} onSave={onSaveMock} />);

    // Verifica se 'Long verse' está presente nas opções do select individual
    const categorySelect = screen.getByLabelText(/Category/i);
    const options = Array.from(categorySelect.options).map(o => o.value);
    expect(options).toContain('Long verse');

    // Seleciona a categoria 'Long verse'
    fireEvent.change(categorySelect, { target: { value: 'Long verse' } });
    expect(categorySelect.value).toBe('Long verse');

    // Alterna para o modo Batch
    const batchButton = screen.getByRole('button', { name: /Batch Add/i });
    fireEvent.click(batchButton);

    // O dropdown de batch de categoria deve ter 'Long verse'
    const batchCategorySelect = screen.getByLabelText(/Category/i);
    const batchOptions = Array.from(batchCategorySelect.options).map(o => o.value);
    expect(batchOptions).toContain('Long verse');
  });
});
