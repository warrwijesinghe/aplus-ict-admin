import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock('../src/api/client.js', () => ({ api }));
import { LegacyContentPage } from '../src/pages/LegacyContentPage.jsx';

const response = (data) => ({ data: { data } });
beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation((url) => Promise.resolve(response(url.endsWith('/tracks') ? [{ id: 'track', title: 'English', courseId: 'course' }] : url.endsWith('/lessons') ? [{ id: 'lesson', trackId: 'track', title: 'Introduction', lessonNumber: 1 }] : [])));
  api.post.mockResolvedValue(response({ id: 'section' }));
});

it('retains the legacy lesson editor and saves the selected publication state', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><LegacyContentPage /></QueryClientProvider>);
  fireEvent.change(await screen.findByLabelText('Course track'), { target: { value: 'track' } });
  fireEvent.change(screen.getByLabelText('Lesson'), { target: { value: 'lesson' } });
  const form = screen.getByRole('heading', { name: 'Add lesson content' }).closest('article');
  fireEvent.change(within(form).getByLabelText('Activity title'), { target: { value: 'Introduction video' } });
  fireEvent.change(within(form).getByLabelText('YouTube or external URL (optional)'), { target: { value: 'https://youtube.com/watch?v=test' } });
  fireEvent.click(within(form).getByRole('button', { name: 'Add activity' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/admin/sections', expect.objectContaining({ lessonId: 'lesson', title: 'Introduction video', status: 'published', isVisible: true })));
});
