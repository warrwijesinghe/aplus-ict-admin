import '../legacy-content.css';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { InlineError, LoadingSkeleton } from '../components/States.jsx';

const contentApi = {
  adminList: (type) => api.get(`/api/v1/admin/${type}`).then((response) => response.data),
  adminCreate: (type, body) => api.post(`/api/v1/admin/${type}`, body).then((response) => response.data),
  adminUpdate: (type, id, body) => api.patch(`/api/v1/admin/${type}/${id}`, body).then((response) => response.data)
};

const contentTypes = [
  ['video', 'Video lesson'],
  ['practical_activity', 'Practical activity'],
  ['page', 'Study note'],
  ['quiz', 'Quiz'],
  ['pdf', 'PDF note'],
  ['download', 'Download'],
  ['image', 'Image'],
  ['embed', 'Interactive embed'],
  ['rich_text', 'Rich text'],
  ['label', 'Label'],
  ['file', 'File']
];

const emptySection = () => ({
  accessPolicy: 'free',
  content: '',
  isVisible: true,
  resourceId: '',
  sortOrder: '0',
  title: '',
  type: 'video',
  youtubeUrl: ''
});

const emptyProduct = () => ({
  currency: 'LKR',
  name: '',
  price: '',
  slug: '',
  status: 'active'
});

const dataRows = (query) => query.data?.data || [];
const textOrNull = (value) => value.trim() || null;

const humanContentType = (type) => contentTypes.find(([value]) => value === type)?.[1] || type;

/**
 * This is intentionally a small, direct editor. It gives the content team
 * one reliable place to create sections and decide which sections are free
 * before a full visual course-builder is introduced.
 */
export const LegacyContentPage = () => {
  const client = useQueryClient();
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [editingSectionId, setEditingSectionId] = useState('');
  const [sectionForm, setSectionForm] = useState(emptySection);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [trackOrderDrafts, setTrackOrderDrafts] = useState({});

  const tracksQuery = useQuery({
    queryKey: ['admin', 'tracks'],
    queryFn: () => contentApi.adminList('tracks')
  });
  const lessonsQuery = useQuery({
    queryKey: ['admin', 'lessons'],
    queryFn: () => contentApi.adminList('lessons')
  });
  const sectionsQuery = useQuery({
    queryKey: ['admin', 'sections'],
    queryFn: () => contentApi.adminList('sections')
  });
  const productsQuery = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: () => contentApi.adminList('products')
  });

  const refreshContent = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['admin', 'sections'] }),
      client.invalidateQueries({ queryKey: ['admin', 'products'] })
    ]);

  const trackOrderMutation = useMutation({
    mutationFn: ({ id, sortOrder }) => contentApi.adminUpdate('tracks', id, { sortOrder }),
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: ['admin', 'tracks'] }),
      client.invalidateQueries({ queryKey: ['content', 'public', 'courses'] })
    ])
  });

  const sectionMutation = useMutation({
    mutationFn: (payload) =>
      editingSectionId
        ? contentApi.adminUpdate('sections', editingSectionId, payload)
        : contentApi.adminCreate('sections', payload),
    onSuccess: () => {
      setEditingSectionId('');
      setSectionForm(emptySection());
      return refreshContent();
    }
  });

  const productMutation = useMutation({
    mutationFn: async (payload) => {
      const created = await contentApi.adminCreate('products', payload);
      if (payload.status === 'active' || payload.status === 'inactive') {
        const action = payload.status === 'active' ? 'publish' : 'unpublish';
        try { await api.post(`/api/v1/admin/products/${created.data.id}/${action}`); }
        catch (error) { throw new Error(`Product was saved as a draft but could not be updated: ${error.response?.data?.error?.message || error.message}`); }
      }
      return created;
    },
    onSuccess: () => {
      setProductForm(emptyProduct());
      return refreshContent();
    }
  });

  if (
    tracksQuery.isLoading ||
    lessonsQuery.isLoading ||
    sectionsQuery.isLoading ||
    productsQuery.isLoading
  ) {
    return <LoadingSkeleton label="Loading lesson editor" />;
  }

  const loadError =
    tracksQuery.error || lessonsQuery.error || sectionsQuery.error || productsQuery.error;
  if (loadError) return <InlineError error={loadError} />;

  const tracks = dataRows(tracksQuery);
  const orderedTracks = [...tracks].sort((first, second) => Number(first.sortOrder || 0) - Number(second.sortOrder || 0));
  const lessons = dataRows(lessonsQuery);
  const sections = dataRows(sectionsQuery);
  const products = dataRows(productsQuery);
  const trackLessons = lessons.filter((lesson) => lesson.trackId === selectedTrackId);
  const lessonSections = sections
    .filter((section) => section.lessonId === selectedLessonId)
    .sort((first, second) => first.sortOrder - second.sortOrder);
  const lessonProducts = products.filter((product) => product.lessonId === selectedLessonId);
  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId);

  const chooseTrack = (event) => {
    setSelectedTrackId(event.target.value);
    setSelectedLessonId('');
    setEditingSectionId('');
    setSectionForm(emptySection());
  };

  const saveTrackOrder = (track) => {
    const value = Number(trackOrderDrafts[track.id] ?? track.sortOrder ?? 0);
    if (!Number.isInteger(value) || value < 0) return;
    trackOrderMutation.mutate({ id: track.id, sortOrder: value });
  };

  const chooseLesson = (event) => {
    setSelectedLessonId(event.target.value);
    setEditingSectionId('');
    setSectionForm(emptySection());
  };

  const saveSection = (event) => {
    event.preventDefault();
    if (!selectedLessonId) return;

    sectionMutation.mutate({
      accessPolicy: sectionForm.accessPolicy,
      content: textOrNull(sectionForm.content),
      isVisible: sectionForm.isVisible,
      status: sectionForm.isVisible ? 'published' : 'draft',
      lessonId: selectedLessonId,
      resourceId: textOrNull(sectionForm.resourceId),
      sortOrder: Number(sectionForm.sortOrder) || 0,
      title: textOrNull(sectionForm.title),
      type: sectionForm.type,
      youtubeUrl: textOrNull(sectionForm.youtubeUrl)
    });
  };

  const editSection = (section) => {
    setEditingSectionId(section.id);
    setSectionForm({
      accessPolicy: section.accessPolicy || 'free',
      content: section.content || '',
      isVisible: section.status === 'published' && section.isVisible !== false,
      resourceId: section.resourceId || '',
      sortOrder: String(section.sortOrder || 0),
      title: section.title || '',
      type: section.type || 'video',
      youtubeUrl: section.youtubeUrl || ''
    });
  };

  const saveProduct = (event) => {
    event.preventDefault();
    if (!selectedLessonId) return;

    const selectedTrack = tracks.find((track) => track.id === selectedTrackId);
    productMutation.mutate({
      productType: 'lesson_exam_success_pack',
      courseId: selectedTrack?.courseId,
      courseTrackId: selectedTrackId,
      currency: productForm.currency.toUpperCase(),
      lessonId: selectedLessonId,
      name: productForm.name.trim(),
      price: Number(productForm.price),
      slug: productForm.slug.trim(),
      status: productForm.status
    });
  };

  return (
    <section className="admin-content-editor">
      <p className="eyebrow">Lesson content studio</p>
      <h1>Build a free-to-premium learning path</h1>
      <p className="admin-content-intro">
        Students can complete free activities first. When you add paid activities and publish an active
        lesson unlock product, the same lesson grows into its premium path.
      </p>

      <article className="admin-content-card admin-track-order-card">
        <p className="eyebrow">Homepage catalogue</p>
        <h2>Course listing order</h2>
        <p>Set a lower display order to show a published course earlier within its A/L, O/L, or Grades 6–9 section on the homepage.</p>
        <ul className="admin-track-order-list">
          {orderedTracks.map((track) => <li key={track.id}>
            <strong>{track.title}</strong>
            <label>
              Display order
              <input
                min="0"
                onChange={(event) => setTrackOrderDrafts((current) => ({ ...current, [track.id]: event.target.value }))}
                type="number"
                value={trackOrderDrafts[track.id] ?? String(track.sortOrder || 0)}
              />
            </label>
            <button disabled={trackOrderMutation.isPending} onClick={() => saveTrackOrder(track)} type="button">
              {trackOrderMutation.isPending ? 'Saving...' : 'Save order'}
            </button>
          </li>)}
        </ul>
        {trackOrderMutation.error ? <InlineError error={trackOrderMutation.error} /> : null}
      </article>

      <div className="admin-content-picker">
        <label>
          Course track
          <select onChange={chooseTrack} value={selectedTrackId}>
            <option value="">Choose a Sinhala or English track</option>
            {orderedTracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Lesson
          <select disabled={!selectedTrackId} onChange={chooseLesson} value={selectedLessonId}>
            <option value="">Choose a lesson</option>
            {trackLessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {String(lesson.lessonNumber).padStart(2, '0')} - {lesson.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!selectedLesson ? (
        <p className="admin-content-empty">
          Select a course track and lesson to start adding content.
        </p>
      ) : (
        <div className="admin-content-layout">
          <div className="admin-content-primary">
            <article className="admin-content-card">
              <div className="admin-content-card-heading">
                <div>
                  <p className="eyebrow">Selected lesson</p>
                  <h2>{selectedLesson.title}</h2>
                </div>
                <span>Lesson {String(selectedLesson.lessonNumber).padStart(2, '0')}</span>
              </div>
              <p className="admin-progress-rule">
                Progress counts only available activities. For example, 4 completed free activities out of
                10 shows 40%; after purchasing access to 10 paid activities it becomes 4 out of 20, or 20%.
              </p>
              {lessonSections.length ? (
                <ol className="admin-section-list">
                  {lessonSections.map((section) => (
                    <li key={section.id}>
                      <div>
                        <strong>{section.title || humanContentType(section.type)}</strong>
                        <span>
                          {humanContentType(section.type)} - {section.accessPolicy || 'free'} -
                          order {section.sortOrder || 0}
                        </span>
                      </div>
                      <button onClick={() => editSection(section)} type="button">
                        Edit
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="admin-content-empty">
                  No content yet. Add the first free activity below.
                </p>
              )}
            </article>

            <article className="admin-content-card">
              <p className="eyebrow">{editingSectionId ? 'Editing activity' : 'New activity'}</p>
              <h2>{editingSectionId ? 'Update lesson content' : 'Add lesson content'}</h2>
              <form className="admin-content-form" onSubmit={saveSection}>
                <label>
                  Activity title
                  <input
                    onChange={(event) =>
                      setSectionForm((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="Example: Watch the binary number video"
                    required
                    value={sectionForm.title}
                  />
                </label>
                <div className="admin-content-form-grid">
                  <label>
                    Content type
                    <select
                      onChange={(event) =>
                        setSectionForm((current) => ({ ...current, type: event.target.value }))
                      }
                      value={sectionForm.type}
                    >
                      {contentTypes.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Student access
                    <select
                      onChange={(event) =>
                        setSectionForm((current) => ({
                          ...current,
                          accessPolicy: event.target.value
                        }))
                      }
                      value={sectionForm.accessPolicy}
                    >
                      <option value="free">Free for signed-in students</option>
                      <option value="paid">Premium - unlock this lesson</option>
                    </select>
                  </label>
                  <label>
                    Display order
                    <input
                      min="0"
                      onChange={(event) =>
                        setSectionForm((current) => ({ ...current, sortOrder: event.target.value }))
                      }
                      type="number"
                      value={sectionForm.sortOrder}
                    />
                  </label>
                </div>
                <label>
                  Lesson text or instructions
                  <textarea
                    onChange={(event) =>
                      setSectionForm((current) => ({ ...current, content: event.target.value }))
                    }
                    placeholder="Add the instructions, study note, or quiz guidance shown to students."
                    rows="5"
                    value={sectionForm.content}
                  />
                </label>
                <div className="admin-content-form-grid">
                  <label>
                    YouTube or external URL (optional)
                    <input
                      onChange={(event) =>
                        setSectionForm((current) => ({
                          ...current,
                          youtubeUrl: event.target.value
                        }))
                      }
                      placeholder="https://..."
                      type="url"
                      value={sectionForm.youtubeUrl}
                    />
                  </label>
                  <label>
                    Attached resource ID (optional)
                    <input
                      onChange={(event) =>
                        setSectionForm((current) => ({
                          ...current,
                          resourceId: event.target.value
                        }))
                      }
                      placeholder="UUID of an uploaded resource"
                      value={sectionForm.resourceId}
                    />
                  </label>
                </div>
                <label className="admin-checkbox">
                  <input
                    checked={sectionForm.isVisible}
                    onChange={(event) =>
                      setSectionForm((current) => ({ ...current, isVisible: event.target.checked }))
                    }
                    type="checkbox"
                  />
                  Publish this activity to students
                </label>
                {sectionMutation.error ? <InlineError error={sectionMutation.error} /> : null}
                <div className="admin-form-actions">
                  <button disabled={sectionMutation.isPending} type="submit">
                    {sectionMutation.isPending
                      ? 'Saving...'
                      : editingSectionId
                        ? 'Save activity'
                        : 'Add activity'}
                  </button>
                  {editingSectionId ? (
                    <button
                      className="button secondary"
                      onClick={() => {
                        setEditingSectionId('');
                        setSectionForm(emptySection());
                      }}
                      type="button"
                    >
                      Cancel edit
                    </button>
                  ) : null}
                </div>
              </form>
            </article>
          </div>

          <aside className="admin-content-side">
            <article className="admin-content-card">
              <p className="eyebrow">Lesson unlock</p>
              <h2>Premium lesson access price</h2>
              <p>
                One active product unlocks all paid activities in this lesson. This keeps today&apos;s
                sale lesson-by-lesson and leaves bundle offers for a later release.
              </p>
              {lessonProducts.length ? (
                <ul className="admin-product-list">
                  {lessonProducts.map((product) => (
                    <li key={product.id}>
                      <strong>{product.name}</strong>
                      <span>
                        {product.currency} {product.price} - {product.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-content-empty">No lesson unlock product has been published.</p>
              )}
              <form className="admin-content-form" onSubmit={saveProduct}>
                <label>
                  Product name
                  <input
                    onChange={(event) =>
                      setProductForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Lesson 01 premium unlock"
                    required
                    value={productForm.name}
                  />
                </label>
                <label>
                  Product slug
                  <input
                    onChange={(event) =>
                      setProductForm((current) => ({ ...current, slug: event.target.value }))
                    }
                    placeholder="al-ict-en-lesson-01-unlock"
                    required
                    value={productForm.slug}
                  />
                </label>
                <div className="admin-content-form-grid">
                  <label>
                    Price
                    <input
                      min="0"
                      onChange={(event) =>
                        setProductForm((current) => ({ ...current, price: event.target.value }))
                      }
                      required
                      step="0.01"
                      type="number"
                      value={productForm.price}
                    />
                  </label>
                  <label>
                    Currency
                    <input
                      maxLength="3"
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          currency: event.target.value
                        }))
                      }
                      value={productForm.currency}
                    />
                  </label>
                </div>
                <label>
                  Status
                  <select
                    onChange={(event) =>
                      setProductForm((current) => ({ ...current, status: event.target.value }))
                    }
                    value={productForm.status}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active and purchasable</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
                {productMutation.error ? <InlineError error={productMutation.error} /> : null}
                <button disabled={productMutation.isPending} type="submit">
                  {productMutation.isPending ? 'Publishing...' : 'Create lesson unlock'}
                </button>
              </form>
            </article>
          </aside>
        </div>
      )}
    </section>
  );
};
