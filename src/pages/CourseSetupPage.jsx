import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, unwrap } from '../api/client.js';

const emptyCourse = { title: '', slug: '', academicLevelId: '', courseGroup: 'SCHOOL', description: '' };
const emptyMedium = { courseId: '', mediumId: '', title: '', slug: '' };

export const CourseSetupPage = ({ user }) => {
  const [context, setContext] = useState(null);
  const [course, setCourse] = useState(emptyCourse);
  const [medium, setMedium] = useState(emptyMedium);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const permissions = user.permissions || [];
  const load = useCallback(async () => {
    setContext(unwrap(await api.get('/api/v1/admin/content-builder/context')));
  }, []);
  useEffect(() => { load().catch((e) => setError(e.response?.data?.error?.message || 'Unable to load course options.')); }, [load]);
  const submit = async (event, kind) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const level = context?.academicLevels?.find((item) => item.id === course.academicLevelId);
      const isAl = level?.code === 'AL';
      const grade = Number(level?.code?.replace('GRADE_', ''));
      const nonSchool = ['DEGREE', 'PROFESSIONAL', 'SHORT_COURSES'].includes(course.courseGroup);
      const values = kind === 'courses' ? { ...course, academicLevelId: nonSchool ? null : course.academicLevelId, academicLevel: nonSchool ? null : isAl ? 'al' : 'ol', courseGroup: nonSchool ? course.courseGroup : isAl ? 'AL' : grade >= 10 ? 'OL' : 'SCHOOL' } : medium;
      const response = await api.post(`/api/v1/admin/content-builder/${kind}`, values);
      if (kind === 'courses') { setCourse(emptyCourse); setMedium((current) => ({ ...current, courseId: unwrap(response).id })); }
      else setMedium(emptyMedium);
      setNotice(kind === 'courses' ? 'Course created as a draft. Add a medium below.' : 'Medium created as a draft. Open its content to add lessons.');
      await load();
    } catch (e) { setError(e.response?.data?.error?.message || 'Unable to save.'); }
    finally { setBusy(false); }
  };
  const change = (setter) => ({ target }) => setter((current) => ({ ...current, [target.name]: target.value }));
  const setPublished = async (kind, item, publish) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await api.patch(`/api/v1/admin/${kind}/${item.id}`, { status: publish ? 'published' : 'draft', isPublic: publish, ...(kind === 'tracks' ? { enrolmentOpen: publish } : {}) });
      await load(); setNotice(`${kind === 'courses' ? 'Course' : 'Medium'} ${publish ? 'published' : 'returned to draft'}.`);
    } catch (e) { setError(e.response?.data?.error?.message || 'Unable to change publication status.'); }
    finally { setBusy(false); }
  };
  const setAvailability = async (item) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const availabilityStatus = item.availabilityStatus === 'inactive' ? 'active' : 'inactive';
      await api.patch(`/api/v1/admin/tracks/${item.id}`, { availabilityStatus });
      await load(); setNotice(`Course marked ${availabilityStatus === 'active' ? 'active' : 'coming soon'}.`);
    } catch (e) { setError(e.response?.data?.error?.message || 'Unable to change availability.'); }
    finally { setBusy(false); }
  };
  const courses = context?.courses || [];
  return <section className="courses-page">
    <header className="admin-page-heading"><div><p className="admin-kicker">Course administration</p><h2>Course setup</h2><p>Create courses and their language-specific learning paths.</p></div><Link to="/courses">Back to courses</Link></header>
    {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="content-notice" role="status">{notice}</p>}
    {permissions.includes('courses.create') && <form className="resource-form" onSubmit={(event) => submit(event, 'courses')}>
      <h3>Create course</h3>
      <label>Title<input name="title" required value={course.title} onChange={change(setCourse)} /></label>
      <label>Slug<input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required value={course.slug} onChange={change(setCourse)} /></label>
      <label>Course category<select name="courseGroup" value={course.courseGroup} onChange={change(setCourse)}><option value="SCHOOL">School ICT (grades 6–13)</option><option value="DEGREE">Degree</option><option value="PROFESSIONAL">Professional Certifications</option><option value="SHORT_COURSES">Short Courses</option></select></label>
      {!['DEGREE', 'PROFESSIONAL', 'SHORT_COURSES'].includes(course.courseGroup) && <label>Academic level<select name="academicLevelId" required value={course.academicLevelId} onChange={change(setCourse)}><option value="">Select academic level</option>{(context?.academicLevels || []).map((item) => <option key={item.id} value={item.id}>{item.nameEn || item.name || item.code}</option>)}</select></label>}
      <label>Description<textarea name="description" value={course.description} onChange={change(setCourse)} /></label>
      <button disabled={busy || !context} type="submit">Create draft course</button>
    </form>}
    {permissions.includes('tracks.create') && <form className="resource-form" onSubmit={(event) => submit(event, 'media')}>
      <h3>Add medium</h3>
      <label>Course<select name="courseId" required value={medium.courseId} onChange={change(setMedium)}><option value="">Select course</option>{courses.map((item) => <option key={item.id} value={item.id}>{item.titleEn || item.title}</option>)}</select></label>
      <label>Medium<select name="mediumId" required value={medium.mediumId} onChange={change(setMedium)}><option value="">Select medium</option>{(context?.availableMedia || []).map((item) => <option key={item.id} value={item.id}>{item.nameEn || item.name}</option>)}</select></label>
      <label>Title<input name="title" required value={medium.title} onChange={change(setMedium)} /></label>
      <label>Slug<input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required value={medium.slug} onChange={change(setMedium)} /></label>
      <button disabled={busy || !context} type="submit">Create draft medium</button>
    </form>}
    <h3>Courses</h3><div className="resource-table-wrap"><table><thead><tr><th>Course</th><th>Status</th><th>Publication</th></tr></thead><tbody>{courses.map((item) => <tr key={item.id}><td>{item.titleEn || item.title}</td><td>{item.status}</td><td>{permissions.includes('courses.update') && <button disabled={busy} onClick={() => setPublished('courses', item, item.status !== 'published')} type="button">{item.status === 'published' ? 'Return to draft' : 'Publish'}</button>}</td></tr>)}</tbody></table></div>
    <h3>Media</h3><p>Publish both the course and its medium to show it in the catalogue. Marking a medium as coming soon makes it unavailable for enrollment and learning, including for existing students.</p><div className="resource-table-wrap"><table><thead><tr><th>Medium</th><th>Publication</th><th>Availability</th><th>Actions</th></tr></thead><tbody>{(context?.media || []).map((item) => <tr key={item.id}><td>{item.Course?.titleEn || item.Course?.title} — {item.mediumLabel || item.title}</td><td>{item.status}</td><td>{item.availabilityStatus === 'inactive' ? 'Coming soon' : 'Active'}</td><td>{permissions.includes('tracks.update') && <><button disabled={busy} onClick={() => setPublished('tracks', item, item.status !== 'published')} type="button">{item.status === 'published' ? 'Return to draft' : 'Publish'}</button> <button disabled={busy} onClick={() => setAvailability(item)} type="button">{item.availabilityStatus === 'inactive' ? 'Set active' : 'Set coming soon'}</button></>} <Link to={`/courses/${item.id}/content`}>Open content</Link></td></tr>)}</tbody></table></div>
  </section>;
};
