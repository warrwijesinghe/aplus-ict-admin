import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

const api = vi.hoisted(() => ({ patch: vi.fn() }));
vi.mock('../src/api/client.js', () => ({ api, apiOrigin: (url) => url.replace(/\/api\/?$/, '') }));
vi.mock('../src/components/ResourcePicker.jsx', () => ({ ResourcePicker: ({ onSelect }) => <button onClick={() => onSelect({ id: 'image', displayName: 'Grade 6 tutorial' })}>Select uploaded cover</button> }));
import { CourseTutorialSettings } from '../src/components/CourseTutorialSettings.jsx';

beforeEach(() => { vi.clearAllMocks(); api.patch.mockResolvedValue({}); });

test('saves a selected course cover, previews it, and clears it', async () => {
  const onSaved = vi.fn();
  render(<CourseTutorialSettings course={{ id: 'course', title: 'Grade 6 ICT' }} onSaved={onSaved} />);
  fireEvent.click(screen.getByText('Tutorial image — Grade 6 ICT'));
  fireEvent.click(screen.getByRole('button', { name: 'Choose tutorial image' }));
  fireEvent.click(screen.getByRole('button', { name: 'Select uploaded cover' }));
  expect(screen.getByAltText('Selected printed tutorial cover')).toHaveAttribute('src', 'http://localhost:4000/api/v1/resources/image/content');
  fireEvent.click(screen.getByRole('button', { name: 'Save course tutorial image' }));
  await screen.findByRole('status');
  expect(api.patch).toHaveBeenLastCalledWith('/api/v1/admin/courses/course', { tutorialImageResourceId: 'image' });
  expect(onSaved).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Remove image' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save course tutorial image' }));
  await waitFor(() => expect(api.patch).toHaveBeenLastCalledWith('/api/v1/admin/courses/course', { tutorialImageResourceId: null }));
});

test('shows API validation errors without claiming the image was saved', async () => {
  api.patch.mockRejectedValue({ response: { data: { error: { message: 'Image must be public' } } } });
  const onSaved = vi.fn();
  render(<CourseTutorialSettings course={{ id: 'course', title: 'Grade 6 ICT' }} onSaved={onSaved} />);
  fireEvent.click(screen.getByText('Tutorial image — Grade 6 ICT'));
  fireEvent.click(screen.getByRole('button', { name: 'Save course tutorial image' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Image must be public');
  expect(onSaved).not.toHaveBeenCalled();
});
