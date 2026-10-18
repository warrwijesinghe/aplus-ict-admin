import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock('../src/api/client.js', () => ({ api, unwrap: (response) => response.data.data }));
import { CourseSetupPage } from '../src/pages/CourseSetupPage.jsx';

const response = (data) => ({ data: { data } });
const context = {
  academicLevels: [{ id: 'level', code: 'GRADE_10', nameEn: 'Grade 10' }],
  availableMedia: [{ id: 'english', name: 'English' }],
  courses: [{ id: 'course', title: 'ICT', status: 'draft' }],
  media: [{ id: 'track', courseId: 'course', title: 'English ICT', status: 'draft', Course: { title: 'ICT' } }]
};
const user = { permissions: ['courses.create', 'courses.update', 'tracks.create', 'tracks.update'] };
const show = (viewer = user) => render(<MemoryRouter><CourseSetupPage user={viewer} /></MemoryRouter>);

describe('course setup', () => {
  beforeEach(() => { vi.clearAllMocks(); api.get.mockResolvedValue(response(context)); api.post.mockResolvedValue(response({ id: 'new-course' })); api.patch.mockResolvedValue(response({})); });

  it('creates a draft course with the selected academic level and classification', async () => {
    show();
    const form = (await screen.findByRole('heading', { name: 'Create course' })).closest('form');
    fireEvent.change(within(form).getByLabelText('Title'), { target: { value: 'Grade 10 ICT' } });
    fireEvent.change(within(form).getByLabelText('Slug'), { target: { value: 'grade-10-ict' } });
    fireEvent.change(within(form).getByLabelText('Academic level'), { target: { value: 'level' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Create draft course' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/admin/content-builder/courses', expect.objectContaining({ title: 'Grade 10 ICT', slug: 'grade-10-ict', academicLevelId: 'level', academicLevel: 'ol', courseGroup: 'OL' })));
  });

  it('creates a medium and publishes a medium through the API', async () => {
    show();
    const form = (await screen.findByRole('heading', { name: 'Add medium' })).closest('form');
    await screen.findByRole('option', { name: 'ICT' });
    fireEvent.change(within(form).getByLabelText('Course'), { target: { value: 'course' } });
    fireEvent.change(within(form).getByLabelText('Medium'), { target: { value: 'english' } });
    fireEvent.change(within(form).getByLabelText('Title'), { target: { value: 'English ICT' } });
    fireEvent.change(within(form).getByLabelText('Slug'), { target: { value: 'english-ict' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Create draft medium' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/admin/content-builder/media', { courseId: 'course', mediumId: 'english', title: 'English ICT', slug: 'english-ict' }));
    const row = screen.getByText('ICT — English ICT').closest('tr');
    await waitFor(() => expect(within(row).getByRole('button', { name: 'Publish' })).toBeEnabled());
    fireEvent.click(within(row).getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/api/v1/admin/tracks/track', { status: 'published', isPublic: true, enrolmentOpen: true }));
  });

  it('does not offer creation or publication actions without permissions', async () => {
    show({ permissions: [] });
    expect(await screen.findByText('ICT — English ICT')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /create|publish/i })).not.toBeInTheDocument();
  });

  it('sets course availability separately from publication', async () => {
    show();
    const row = (await screen.findByText('ICT — English ICT')).closest('tr');
    fireEvent.click(within(row).getByRole('button', { name: 'Set coming soon' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/api/v1/admin/tracks/track', { availabilityStatus: 'inactive' }));
  });

  it('creates a degree course without a school academic level', async () => {
    show();
    const form = (await screen.findByRole('heading', { name: 'Create course' })).closest('form');
    fireEvent.change(within(form).getByLabelText('Title'), { target: { value: 'Degree course' } });
    fireEvent.change(within(form).getByLabelText('Slug'), { target: { value: 'degree-course' } });
    fireEvent.change(within(form).getByLabelText('Course category'), { target: { value: 'DEGREE' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Create draft course' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/admin/content-builder/courses', expect.objectContaining({ courseGroup: 'DEGREE', academicLevelId: null })));
  });

  it('creates a short course without a school academic level', async () => {
    show();
    const form = (await screen.findByRole('heading', { name: 'Create course' })).closest('form');
    fireEvent.change(within(form).getByLabelText('Title'), { target: { value: 'Digital Skills' } });
    fireEvent.change(within(form).getByLabelText('Slug'), { target: { value: 'digital-skills' } });
    fireEvent.change(within(form).getByLabelText('Course category'), { target: { value: 'SHORT_COURSES' } });
    expect(within(form).queryByLabelText('Academic level')).not.toBeInTheDocument();
    fireEvent.click(within(form).getByRole('button', { name: 'Create draft course' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/admin/content-builder/courses', expect.objectContaining({ courseGroup: 'SHORT_COURSES', academicLevelId: null, academicLevel: null })));
  });
});
