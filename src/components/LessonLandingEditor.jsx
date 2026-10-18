export const LessonLandingEditor = ({ value, onChange }) => {
  const content = value || {};
  const syllabus = content.syllabus || [];
  const update = (field, next) => onChange({ ...content, [field]: next });
  const updateItem = (index, field, next) => update("syllabus", syllabus.map((item, position) => position === index ? { ...item, [field]: next } : item));
  const move = (index, direction) => {
    const next = [...syllabus];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    update("syllabus", next);
  };
  return <fieldset className="landing-content-editor"><legend>Lesson landing page</legend>
    <p>This content appears on the public lesson page. It is separate from LMS topics and learning activities. Save changes to update the page.</p>
    {[
      ["heroDescription", "Hero description"], ["overview", "Lesson overview"],
      ["tutorialTitle", "Home delivery heading"], ["tutorialDescription", "Home delivery description"],
      ["ctaTitle", "Final CTA heading"], ["ctaDescription", "Final CTA description"]
    ].map(([field, label]) => <label key={field}>{label}<textarea maxLength={10000} onChange={(event) => update(field, event.target.value)} value={content[field] || ""} /></label>)}
    <h4>Landing page syllabus</h4><p>Add the points visitors should see before enrolling. These do not create or link to LMS topics.</p>
    {syllabus.map((item, index) => <fieldset key={index}><legend>Content item {index + 1}</legend>
      <label>Content title<input aria-label={`Content title ${index + 1}`} maxLength={255} required value={item.title} onChange={(event) => updateItem(index, "title", event.target.value)} /></label>
      <label>Content description<textarea aria-label={`Content description ${index + 1}`} maxLength={10000} value={item.description || ""} onChange={(event) => updateItem(index, "description", event.target.value)} /></label>
      <div><button aria-label={`Move content item ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)} type="button">Move up</button><button aria-label={`Move content item ${index + 1} down`} disabled={index === syllabus.length - 1} onClick={() => move(index, 1)} type="button">Move down</button><button aria-label={`Remove content item ${index + 1}`} onClick={() => update("syllabus", syllabus.filter((_, position) => position !== index))} type="button">Remove</button></div>
    </fieldset>)}
    <button disabled={syllabus.length >= 100} onClick={() => update("syllabus", [...syllabus, { title: "", description: "" }])} type="button">+ Add landing page content</button>
  </fieldset>;
};
