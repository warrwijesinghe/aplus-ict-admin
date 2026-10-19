import { useState } from 'react';
import { apiOrigin } from '../api/client.js';
import { ResourcePicker } from './ResourcePicker.jsx';

export const TutorialImagePicker = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  return <section className="tutorial-image-picker" aria-label="Printed tutorial image">
    {value ? <><img key={value} alt="Selected printed tutorial cover" src={`${apiOrigin(import.meta.env.VITE_API_URL || 'http://localhost:4000')}/api/v1/resources/${value}/content`} style={{ display: 'block', maxWidth: '100%', width: 200, height: 180, objectFit: 'contain' }} /><p>{name || 'Tutorial image selected'}</p></> : <p>No image selected. Lessons use the course image, or the default illustration if neither is set.</p>}
    <button type="button" onClick={() => setOpen(!open)}>{open ? 'Close image library' : value ? 'Change tutorial image' : 'Choose tutorial image'}</button>
    {value && <button type="button" onClick={() => { onChange(null); setName(''); }}>Remove image</button>}
    <p>Upload an image in the Resource Library with public visibility and public access, then select it here.</p>
    {open && <ResourcePicker allowedCategories={['lesson_image', 'site_asset', 'course_thumbnail']} allowedMimeTypes={['image/']} publicOnly onSelect={(item) => { onChange(item.id); setName(item.displayName); setOpen(false); }} />}
  </section>;
};
