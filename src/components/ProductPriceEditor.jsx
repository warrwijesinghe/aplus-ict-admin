import { useState } from 'react';
import { api } from '../api/client.js';

const formatPrice = (value) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(Number(value));

export const ProductPriceEditor = ({ product, onSaved, canEdit = false }) => {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(product.price));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const save = async (event) => {
    event.preventDefault(); setError(''); setNotice('');
    if (!/^(0|[1-9]\d*)(?:\.\d{1,2})?$/.test(price) || Number(price) <= 0 || Number(price) > 9999999999.99) {
      setError('Enter a price greater than zero, with up to two decimal places.'); return;
    }
    setBusy(true);
    try {
      await api.patch(`/api/v1/admin/products/${product.id}`, { price });
      await onSaved(); setEditing(false); setNotice('Price saved. Existing orders keep their original totals.');
    } catch (requestError) { setError(requestError.response?.data?.error?.message || 'Unable to save price.'); }
    finally { setBusy(false); }
  };
  return <div>
    {editing ? <form onSubmit={save} aria-label={`Edit price for ${product.name}`}>
      <label>Price (LKR)<input aria-label={`Price for ${product.name} (LKR)`} autoFocus disabled={busy} min="0.01" max="9999999999.99" step="0.01" required type="number" value={price} onChange={(event) => setPrice(event.target.value)} /></label>
      <button disabled={busy} type="submit">{busy ? 'Saving…' : 'Save price'}</button>
      <button disabled={busy} type="button" onClick={() => { setEditing(false); setError(''); }}>Cancel</button>
    </form> : <><span>{formatPrice(product.price)}</span>{canEdit && product.status !== 'archived' && <button aria-label={`Edit price for ${product.name}`} type="button" onClick={() => { setPrice(String(product.price)); setNotice(''); setEditing(true); }}>Edit price</button>}</>}
    {error && <p className="admin-error" role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </div>;
};
