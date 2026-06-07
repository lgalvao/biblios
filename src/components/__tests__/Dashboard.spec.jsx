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
  });
});
