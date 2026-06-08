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
    const addButton = screen.getByRole('button', { name: /Add/i });

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
    const addButton = screen.getByRole('button', { name: /Add/i });

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
    
    fireEvent.click(screen.getByRole('button', { name: /Save Book/i }));
    
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
});
