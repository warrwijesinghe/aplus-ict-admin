import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

const api = vi.hoisted(() => ({ patch: vi.fn() }));
vi.mock('../src/api/client.js', () => ({ api }));
import { ProductPriceEditor } from '../src/components/ProductPriceEditor.jsx';
const product = { id: 'product', name: 'Grade 6 lesson', price: '1400.00', status: 'published' };
beforeEach(() => { vi.clearAllMocks(); api.patch.mockResolvedValue({}); });

test('updates only the selected product price and refreshes saved data', async () => {
  const onSaved = vi.fn();
  render(<ProductPriceEditor product={product} canEdit onSaved={onSaved} />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit price for Grade 6 lesson' }));
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '1750.50' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save price' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Price saved');
  expect(api.patch).toHaveBeenCalledWith('/api/v1/admin/products/product', { price: '1750.50' });
  expect(onSaved).toHaveBeenCalledOnce();
});

test('keeps editing available after a rejected price update', async () => {
  api.patch.mockRejectedValue({ response: { data: { error: { message: 'Compare-at price must not be below price' } } } });
  const onSaved = vi.fn();
  render(<ProductPriceEditor product={product} canEdit onSaved={onSaved} />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit price for Grade 6 lesson' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save price' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Compare-at price');
  expect(screen.getByRole('spinbutton')).toBeEnabled();
  expect(onSaved).not.toHaveBeenCalled();
});

test.each([{ canEdit: false, status: 'published' }, { canEdit: true, status: 'archived' }])('prevents price edits for read-only or archived products: %j', ({ canEdit, status }) => {
  render(<ProductPriceEditor product={{ ...product, status }} canEdit={canEdit} onSaved={vi.fn()} />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
