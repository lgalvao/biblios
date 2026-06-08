import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from '../Dashboard';

// Mock Recharts to avoid container size errors in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  Cell: () => <div data-testid="recharts-cell" />,
  Tooltip: () => <div data-testid="recharts-tooltip" />,
  BarChart: ({ children }) => <div data-testid="recharts-barchart">{children}</div>,
  Bar: () => <div data-testid="recharts-bar" />,
  XAxis: () => <div data-testid="recharts-xaxis" />,
  YAxis: () => <div data-testid="recharts-yaxis" />,
  CartesianGrid: () => <div data-testid="recharts-cartesiangrid" />
}));

const mockBooks = [
  {
    id: 1,
    title: "Book One",
    author: "Author A",
    year: "1961",
    country: "Spain",
    region: "Southern Europe",
    continent: "Europe",
    read: true,
    originalLanguage: "Spanish",
    pages: 100,
    description: "Nice book.",
    tags: ["classic", "fiction"]
  },
  {
    id: 2,
    title: "Book Two",
    author: "Author B",
    year: "1987",
    country: "Hungary",
    region: "Eastern Europe",
    continent: "Europe",
    read: false,
    originalLanguage: "Hungarian",
    pages: 200,
    description: "Good book.",
    tags: ["fiction", "history"]
  }
];

describe('Dashboard Component tests', () => {
  it('renders basic KPI cards correctly', () => {
    render(<Dashboard books={mockBooks} />);

    // Total Books KPI card
    const totalBooksCard = screen.getByText('Total Books').closest('.card');
    expect(totalBooksCard).toHaveTextContent('2');

    // Read Books KPI card
    const readBooksCard = screen.getByText('Read Books').closest('.card');
    expect(readBooksCard).toHaveTextContent('1 (50%)');

    // Pages Read KPI card
    const pagesReadCard = screen.getByText('Pages Read').closest('.card');
    expect(pagesReadCard).toHaveTextContent('100 / 300');
  });

  it('renders all breakdown tables including Tags', () => {
    render(<Dashboard books={mockBooks} />);

    expect(screen.getByRole('heading', { name: 'Countries', level: 6 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Regions', level: 6 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Continents', level: 6 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Original Languages', level: 6 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chronology (Centuries)', level: 6 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tags', level: 6 })).toBeInTheDocument();

    // Verify tag counts: fiction has 2 occurrences, classic and history have 1
    expect(screen.getByText('fiction')).toBeInTheDocument();
    expect(screen.getByText('classic')).toBeInTheDocument();
    expect(screen.getByText('history')).toBeInTheDocument();

    // Verify values in rows
    const fictionRow = screen.getByText('fiction').closest('tr');
    expect(fictionRow).toHaveTextContent('2');

    const classicRow = screen.getByText('classic').closest('tr');
    expect(classicRow).toHaveTextContent('1');
  });

  it('filters breakdown lists via search input', () => {
    render(<Dashboard books={mockBooks} />);

    const searchInput = screen.getByPlaceholderText('Search breakdowns...');
    expect(searchInput).toBeInTheDocument();

    // Filter by "hist"
    fireEvent.change(searchInput, { target: { value: 'hist' } });

    // history should be visible but classic should be gone
    expect(screen.getByText('history')).toBeInTheDocument();
    expect(screen.queryByText('classic')).not.toBeInTheDocument();

    // Search for nonexistent
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    expect(screen.getAllByText('No matches found').length).toBeGreaterThan(0);
  });

  it('returns null when books list is empty', () => {
    const { container } = render(<Dashboard books={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('handles various ordinal numbers and centuries', () => {
    const centuryBooks = [
      { id: 1, year: '100', title: '1st', author: 'A' }, // 1st Century
      { id: 2, year: '1100', title: '11th', author: 'A' }, // 11th Century
      { id: 3, year: '1200', title: '12th', author: 'A' }, // 12th Century
      { id: 4, year: '1300', title: '13th', author: 'A' }, // 13th Century
      { id: 5, year: '2100', title: '21st', author: 'A' }, // 21st Century
      { id: 6, year: '2200', title: '22nd', author: 'A' }, // 22nd Century
      { id: 7, year: '2300', title: '23rd', author: 'A' }, // 23rd Century
      { id: 8, year: 'Unknown', title: 'U', author: 'A' }
    ];
    render(<Dashboard books={centuryBooks} />);
    expect(screen.getByText('1st Century')).toBeInTheDocument();
    expect(screen.getByText('11th Century')).toBeInTheDocument();
    expect(screen.getByText('12th Century')).toBeInTheDocument();
    expect(screen.getByText('13th Century')).toBeInTheDocument();
    expect(screen.getByText('21st Century')).toBeInTheDocument();
    expect(screen.getByText('22nd Century')).toBeInTheDocument();
    expect(screen.getByText('23rd Century')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('normaliza países do Reino Unido, agrupa Américas e mescla Ásia e Oceania', () => {
    const geoBooks = [
      { id: 1, country: 'England', continent: 'Europe', title: 'T', author: 'A' },
      { id: 2, country: 'Scotland', continent: 'Europe', title: 'T', author: 'A' },
      { id: 3, country: 'Wales', continent: 'Europe', title: 'T', author: 'A' },
      { id: 4, country: 'Northern Ireland', continent: 'Europe', title: 'T', author: 'A' },
      { id: 5, country: 'United Kingdom', continent: 'Europe', title: 'T', author: 'A' },
      { id: 6, country: 'Brazil', continent: 'South America', title: 'T', author: 'A' },
      { id: 7, country: 'USA', continent: 'North America', title: 'T', author: 'A' },
      { id: 8, country: 'Guatemala', continent: 'Central America', title: 'T', author: 'A' },
      { id: 9, country: 'Japan', continent: 'Asia', title: 'T', author: 'A' },
      { id: 10, country: 'Australia', continent: 'Oceania', title: 'T', author: 'A' }
    ];
    render(<Dashboard books={geoBooks} />);
    
    // O Reino Unido deve ser agrupado como UK
    const ukRow = screen.getByText('UK').closest('tr');
    expect(ukRow).toHaveTextContent('5');
    
    // As Américas devem ser agrupadas como Americas no detailedStats.continent
    const americasRow = screen.getByText('Americas').closest('tr');
    expect(americasRow).toHaveTextContent('3');

    // Ásia e Oceania devem ser agrupadas como Asia and Oceania no detailedStats.continent
    const asiaOceaniaRow = screen.getByText('Asia and Oceania').closest('tr');
    expect(asiaOceaniaRow).toHaveTextContent('2');
  });

  it('calculates era distribution correctly', () => {
    const eraBooks = [
      { id: 1, year: '1800', title: 'Pre', author: 'A' },
      { id: 2, year: '1860', title: '1850', author: 'A' },
      { id: 3, year: '1880', title: '1875', author: 'A' },
      { id: 4, year: '1910', title: '1900', author: 'A' },
      { id: 5, year: '1930', title: '1925', author: 'A' },
      { id: 6, year: '1960', title: '1950', author: 'A' },
      { id: 7, year: '1980', title: '1975', author: 'A' },
      { id: 8, year: '2010', title: '2000', author: 'A' }
    ];
    render(<Dashboard books={eraBooks} />);
    // This is mostly validated by checking if it renders without crash as we mocked BarChart
    expect(screen.getAllByTestId('recharts-barchart').length).toBe(2);
  });

  it('handles books with empty or improperly formatted tags', () => {
    const books = [
      { id: 1, title: 'B1', country: 'Brazil', year: '1900', tags: ['Valid', '', null, undefined] }
    ];
    render(<Dashboard books={books} onSelectCountry={vi.fn()} onSelectTag={vi.fn()} />);
    
    // Valid tag should be shown
    expect(screen.getByText('Valid')).toBeInTheDocument();
  });
});
