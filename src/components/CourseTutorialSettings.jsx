import { useState } from 'react';
import { api } from '../api/client.js';
import { TutorialImagePicker } from './TutorialImagePicker.jsx';

export const CourseTutorialSettings = ({ course, onSaved }) => {
  const [imageId, setImageId] = useState(course.tutorialImageResourceId || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const save = async () => {
    setBusy(true); setError(''); setSaved(false);
    try {
      await api.patch(`/api/v1/admin/courses/${course.id}`, { tutorialImageResourceId: imageId });
      await onSaved(); setSaved(true);
    } catch (e) { setError(e.response?.data?.error?.message || 'Unable to save tutorial image.'); }
    finally { setBusy(false); }
  };
  return <details className="resource-form">
    <summary>Tutorial image — {course.titleEn || course.title}</summary>
    <p>This is the default for all lessons and media in this course. An image selected in a lesson overrides it.</p>
    <fieldset disabled={busy}>
      <TutorialImagePicker value={imageId} onChange={(id) => { setImageId(id); setSaved(false); }} />
      <button type="button" onClick={save}>{busy ? 'Saving…' : 'Save course tutorial image'}</button>
    </fieldset>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {saved && <p role="status">Course tutorial image saved.</p>}
  </details>;
};
