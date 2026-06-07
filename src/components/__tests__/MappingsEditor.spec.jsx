import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MappingsEditor from '../MappingsEditor';

const mockRegionData = {
  geoscheme: {
    "EU": [
      {
        "Northern Europe": ["Sweden", "Norway"]
      }
    ]
  },
  aliases: {
    "se": "Sweden"
  }
};

describe('MappingsEditor Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/regions') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRegionData)
        });
      }
      if (url === '/api/regions/sync') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });
    // Mock window.confirm and window.alert
    window.confirm = vi.fn().mockReturnValue(true);
    window.alert = vi.fn();
  });

  it('loads mappings on mount and displays active continent and region', async () => {
    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    
    // Check loading indicator first
    expect(screen.getByText(/loading mappings/i)).toBeInTheDocument();
    
    // Wait for load to finish
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());
    
    // Verify continent buttons and selected region
    expect(screen.getByText('Northern Europe')).toBeInTheDocument();
    expect(screen.getByText('Sweden')).toBeInTheDocument();
    expect(screen.getByText('Norway')).toBeInTheDocument();
    
    // Verify alias
    expect(screen.getByText('"se"')).toBeInTheDocument();
  });

  it('allows adding a new region and country', async () => {
    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());
    
    // Add Region
    const regionInput = screen.getByPlaceholderText(/new region name/i);
    fireEvent.change(regionInput, { target: { value: 'Western Baltics' } });
    fireEvent.submit(regionInput.closest('form'));
    
    expect(screen.getByText('Western Baltics')).toBeInTheDocument();

    // Add Country to new region
    const countryInput = screen.getByPlaceholderText(/new country name/i);
    fireEvent.change(countryInput, { target: { value: 'Gothland' } });
    fireEvent.submit(countryInput.closest('form'));
    
    expect(screen.getByText('Gothland')).toBeInTheDocument();
  });

  it('triggers save action and calls sync success callback', async () => {
    const onSyncSuccess = vi.fn();
    render(<MappingsEditor onSyncSuccess={onSyncSuccess} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());
    
    const saveButton = screen.getByRole('button', { name: /save mappings/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => expect(onSyncSuccess).toHaveBeenCalled());
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/regions/sync', expect.any(Object));
  });
});
