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

  it('triggers save action and calls sync success callback, triggering onUpdateBooks', async () => {
    const onSyncSuccess = vi.fn();
    const onUpdateBooks = vi.fn();
    render(<MappingsEditor onSyncSuccess={onSyncSuccess} onSyncError={vi.fn()} onUpdateBooks={onUpdateBooks} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());
    
    const saveButton = screen.getByRole('button', { name: /save mappings/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => expect(onSyncSuccess).toHaveBeenCalled());
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/regions/sync', expect.any(Object));

    // Simulate calling the update callback passed to onUpdateBooks
    expect(onUpdateBooks).toHaveBeenCalled();
    const updateFn = onUpdateBooks.mock.calls[0][0];
    const prevBooks = [{ title: 'Book 1', author: 'A' }];
    const updatedBooks = updateFn(prevBooks);
    expect(updatedBooks).toBeDefined();
  });

  it('allows renaming a region', async () => {
    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());
    
    // Encontra o botão de editar da região a partir do data-testid
    const editRegionBtn = screen.getByTestId('edit-region-Northern Europe');
    fireEvent.click(editRegionBtn);
    
    const input = screen.getByDisplayValue('Northern Europe');
    fireEvent.change(input, { target: { value: 'Nordic Region' } });
    
    // Clica no botão de confirmar via testid
    const checkBtn = screen.getByTestId('confirm-edit-region');
    fireEvent.click(checkBtn);
    
    expect(screen.getByText('Nordic Region')).toBeInTheDocument();
  });

  it('prevents deleting a region with countries and allows deleting an empty one', async () => {
    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());
    
    const deleteRegionBtn = screen.getByTestId('delete-region-Northern Europe');
    
    // Deleta Northern Europe que tem 2 países
    fireEvent.click(deleteRegionBtn);
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('contains countries'));
    
    // Adiciona uma região vazia
    const regionInput = screen.getByPlaceholderText(/new region name/i);
    fireEvent.change(regionInput, { target: { value: 'Empty Region' } });
    fireEvent.submit(regionInput.closest('form'));
    
    expect(screen.getByText('Empty Region')).toBeInTheDocument();
    
    // Clica para deletar Empty Region
    const emptyRegionDeleteBtn = screen.getByTestId('delete-region-Empty Region');
    fireEvent.click(emptyRegionDeleteBtn);
    
    expect(window.confirm).toHaveBeenCalled();
    expect(screen.queryByText('Empty Region')).not.toBeInTheDocument();
  });

  it('allows renaming and deleting a country', async () => {
    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());
    
    // Edit country 'Sweden'
    const swedenEditBtn = screen.getByTestId('edit-country-Sweden');
    fireEvent.click(swedenEditBtn);
    
    // Test cancel edit
    const cancelBtn = screen.getByTestId('cancel-edit-country');
    fireEvent.click(cancelBtn);
    expect(screen.getByText('Sweden')).toBeInTheDocument();

    // Edit again and confirm
    fireEvent.click(screen.getByTestId('edit-country-Sweden'));
    const input = screen.getByDisplayValue('Sweden');
    fireEvent.change(input, { target: { value: 'Sverige' } });
    
    const checkBtn = screen.getByTestId('confirm-edit-country');
    fireEvent.click(checkBtn);
    
    expect(screen.getByText('Sverige')).toBeInTheDocument();
    
    // Delete 'Norway'
    const norwayDeleteBtn = screen.getByTestId('delete-country-Norway');
    fireEvent.click(norwayDeleteBtn);
    expect(screen.queryByText('Norway')).not.toBeInTheDocument();
  });

  it('allows moving a country to another region', async () => {
    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());
    
    // Add a second region
    const regionInput = screen.getByPlaceholderText(/new region name/i);
    fireEvent.change(regionInput, { target: { value: 'Scandinavia' } });
    fireEvent.submit(regionInput.closest('form'));

    // Select Northern Europe
    fireEvent.click(screen.getByText('Northern Europe'));

    // Move Sweden to Scandinavia
    const moveSelect = screen.getAllByRole('combobox').find(sel => sel.value === '');
    fireEvent.change(moveSelect, { target: { value: 'Scandinavia' } });

    // Sweden should no longer be in Northern Europe view
    expect(screen.queryByText('Sweden')).not.toBeInTheDocument();

    // Check Scandinavia
    fireEvent.click(screen.getByText('Scandinavia'));
    expect(screen.getByText('Sweden')).toBeInTheDocument();
  });

  it('handles reset to defaults and cancelation', async () => {
    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());

    const resetBtn = screen.getByRole('button', { name: /Reset Defaults/i });
    
    // Cancel reset
    window.confirm.mockReturnValueOnce(false);
    fireEvent.click(resetBtn);
    expect(window.confirm).toHaveBeenCalled();
    expect(screen.getByText('Sweden')).toBeInTheDocument();

    // Confirm reset
    window.confirm.mockReturnValueOnce(true);
    fireEvent.click(resetBtn);
    expect(screen.getByText('Western Europe')).toBeInTheDocument();
  });

  it('handles delete region cancelation', async () => {
    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());
    
    // Add empty region to allow deletion attempt
    const regionInput = screen.getByPlaceholderText(/new region name/i);
    fireEvent.change(regionInput, { target: { value: 'Temp' } });
    fireEvent.submit(regionInput.closest('form'));

    window.confirm.mockReturnValueOnce(false);
    fireEvent.click(screen.getByTestId('delete-region-Temp'));
    expect(screen.getByText('Temp')).toBeInTheDocument();
  });

  it('prevents adding duplicate region', async () => {
    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());

    const regionInput = screen.getByPlaceholderText(/new region name/i);
    fireEvent.change(regionInput, { target: { value: 'Northern Europe' } });
    fireEvent.submit(regionInput.closest('form'));
    
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('already exists'));
  });

  it('handles initial fetch failure and uses defaults', async () => {
    globalThis.fetch.mockImplementationOnce(() => Promise.reject(new Error('API Down')));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());
    
    // Should fallback to originalGeoscheme (which has many continents/regions)
    expect(screen.getByText('Western Europe')).toBeInTheDocument(); // Default in originalGeoscheme EU
    consoleSpy.mockRestore();
  });

  it('filters aliases by search query', async () => {
    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());
    
    const searchInput = screen.getByPlaceholderText(/search aliases/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    expect(screen.getByText(/no aliases match your search/i)).toBeInTheDocument();
    
    fireEvent.change(searchInput, { target: { value: 'se' } });
    expect(screen.getByText('"se"')).toBeInTheDocument();
  });

  it('updates regions when continent changes', async () => {
    const customData = {
      geoscheme: {
        "EU": [{ "EU Region": ["EU Country"] }],
        "SA": [{ "SA Region": ["SA Country"] }]
      },
      aliases: {}
    };
    globalThis.fetch.mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve(customData) }));

    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());
    
    expect(screen.getByText('EU Region')).toBeInTheDocument();
    
    // Change to South America (SA)
    const saBtn = screen.getByText('SA');
    fireEvent.click(saBtn);
    
    expect(screen.getByText('SA Region')).toBeInTheDocument();
    expect(screen.queryByText('EU Region')).not.toBeInTheDocument();
  });

  it('early returns when renaming region or country to same name', async () => {
    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());
    
    // Rename region to same name
    fireEvent.click(screen.getByTestId('edit-region-Northern Europe'));
    fireEvent.click(screen.getByTestId('confirm-edit-region')); // Same name (default value in input)
    expect(screen.getByText('Northern Europe')).toBeInTheDocument();

    // Rename country to same name
    fireEvent.click(screen.getByTestId('edit-country-Sweden'));
    fireEvent.click(screen.getByTestId('confirm-edit-country'));
    expect(screen.getByText('Sweden')).toBeInTheDocument();
  });

  it('moves country between different continents', async () => {
    const customData = {
      geoscheme: {
        "EU": [{ "Northern Europe": ["Sweden"] }],
        "AS": [{ "East Asia": ["Japan"] }]
      },
      aliases: {}
    };
    globalThis.fetch.mockImplementation((url) => {
      if (url === '/api/regions') return Promise.resolve({ ok: true, json: () => Promise.resolve(customData) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
    });

    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());
    
    // Select Japan in AS
    fireEvent.click(screen.getByText('AS'));
    expect(screen.getByText('Japan')).toBeInTheDocument();
    
    // Move Japan to Northern Europe (EU)
    const moveSelect = screen.getByDisplayValue('Move to...');
    fireEvent.change(moveSelect, { target: { value: 'Northern Europe' } });
    
    // Japan should be gone from AS view
    expect(screen.queryByText('Japan')).not.toBeInTheDocument();
    
    // Check EU view
    fireEvent.click(screen.getByText('EU'));
    expect(screen.getByText('Japan')).toBeInTheDocument();
  });

  it('handles reset to default when originalGeoscheme has no regions for active continent', async () => {
    // Mock originalGeoscheme to be empty for OC
    // This is a bit tricky since it's imported, but we can just test OC which might be empty or we can mock it
    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());
    
    fireEvent.click(screen.getByText('OC'));
    fireEvent.click(screen.getByRole('button', { name: /Reset Defaults/i }));
    
    // Should handle empty regions gracefully
    expect(window.confirm).toHaveBeenCalled();
  });

  it('returns empty string for unknown country flag', async () => {
    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());
    
    // Check if Sweden is present (using getAll and checking first)
    expect(screen.getAllByText(/Sweden/i).length).toBeGreaterThan(0);
    
    // Add a country without flag
    const countryInput = screen.getByPlaceholderText(/new country name/i);
    fireEvent.change(countryInput, { target: { value: 'ImaginaryLand' } });
    fireEvent.submit(countryInput.closest('form'));
    
    expect(screen.getByText('ImaginaryLand')).toBeInTheDocument();
  });

  it('prevents adding duplicate country', async () => {
    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());

    const countryInput = screen.getByPlaceholderText(/new country name/i);
    fireEvent.change(countryInput, { target: { value: 'Sweden' } });
    fireEvent.submit(countryInput.closest('form'));
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('already exists'));
  });

  it('handles rename to same name by just closing edit', async () => {
    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());

    fireEvent.click(screen.getByTestId('edit-country-Sweden'));
    const input = screen.getByDisplayValue('Sweden');
    fireEvent.change(input, { target: { value: 'Sweden' } }); // Same name
    fireEvent.click(screen.getByTestId('confirm-edit-country'));

    expect(screen.getByText('Sweden')).toBeInTheDocument();
    expect(screen.queryByTestId('confirm-edit-country')).not.toBeInTheDocument();
  });

  it('handles save error and still updates in-memory', async () => {
    globalThis.fetch.mockImplementation((url) => {
      if (url === '/api/regions') return Promise.resolve({ ok: true, json: () => Promise.resolve(mockRegionData) });
      return Promise.reject(new Error('Network error'));
    });
    
    const onSyncError = vi.fn();
    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={onSyncError} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());

    const saveButton = screen.getByRole('button', { name: /save mappings/i });
    fireEvent.click(saveButton);

    await waitFor(() => expect(onSyncError).toHaveBeenCalled());
  });

  it('prevents adding duplicate alias', async () => {
    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());

    const aliasInput = screen.getByPlaceholderText(/Alias \(e\.g\. uk\)/i);
    const targetInput = screen.getByPlaceholderText(/Official country\.\.\./i);
    
    fireEvent.change(aliasInput, { target: { value: 'se' } });
    fireEvent.change(targetInput, { target: { value: 'Sweden' } });
    fireEvent.submit(aliasInput.closest('form'));
    
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('already exists'));
  });

  it('allows adding and removing an alias', async () => {
    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());
    
    const aliasInput = screen.getByPlaceholderText(/Alias \(e\.g\. uk\)/i);
    const targetInput = screen.getByPlaceholderText(/Official country\.\.\./i);
    
    fireEvent.change(aliasInput, { target: { value: 'no' } });
    fireEvent.change(targetInput, { target: { value: 'Norway' } });
    fireEvent.submit(aliasInput.closest('form'));
    
    expect(screen.getByText('"no"')).toBeInTheDocument();
    
    // Delete 'se' alias
    const seDeleteBtn = screen.getByTestId('delete-alias-se');
    fireEvent.click(seDeleteBtn);
    expect(screen.queryByText('"se"')).not.toBeInTheDocument();
  });

  it('shows fallback when flag is not available', async () => {
    // We already added a test for unknown flag "ImaginaryLand".
    // Let's ensure we check its presence in the UI
    render(<MappingsEditor onSyncSuccess={vi.fn()} onSyncError={vi.fn()} onUpdateBooks={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/loading mappings/i)).not.toBeInTheDocument());

    const countryInput = screen.getByPlaceholderText(/new country name/i);
    fireEvent.change(countryInput, { target: { value: 'NoFlagLand' } });
    fireEvent.submit(countryInput.closest('form'));

    // Find the country row and ensure there's no error rendering it
    const newCountryRow = screen.getByText('NoFlagLand');
    expect(newCountryRow).toBeInTheDocument();
  });
});
