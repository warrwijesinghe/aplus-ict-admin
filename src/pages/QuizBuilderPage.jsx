import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, unwrap } from "../api/client.js";

export const QuizBuilderPage = ({ user }) => {
  const { courseTrackId, activityId } = useParams(); const [quiz, setQuiz] = useState(null), [questions, setQuestions] = useState([]), [rules, setRules] = useState([]), [tab, setTab] = useState("questions"), [error, setError] = useState(""), [notice, setNotice] = useState(""), [settings, setSettings] = useState(null);
  const load = useCallback(async () => { setError(""); try { let row = unwrap(await api.get("/api/v1/admin/quizzes", { params: { lessonSectionId: activityId } })); if (!row) row = unwrap(await api.post("/api/v1/admin/quizzes", { lessonSectionId: activityId })); const [questionRows, ruleRows] = await Promise.all([api.get(`/api/v1/admin/quizzes/${row.id}/questions`), api.get(`/api/v1/admin/quizzes/${row.id}/random-rules`)]); setQuiz(row); setSettings(row); setQuestions(unwrap(questionRows).items); setRules(unwrap(ruleRows)); } catch (e) { setError(e.response?.data?.error?.message || "Unable to open Quiz Builder."); } }, [activityId]); useEffect(() => { load(); }, [load]);
  const request = async (work, message) => { try { await work(); if (message) setNotice(message); await load(); } catch (e) { setError(e.response?.data?.error?.message || "Quiz update failed."); } };
  const reorder = (index, direction) => { const next = [...questions]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; request(() => api.post(`/api/v1/admin/quizzes/${quiz.id}/questions/reorder`, { orderedIds: next.map((x) => x.id) })); };
  const [search] = useSearchParams();
  const lessonId = quiz?.lessonId || search.get("lesson");
  const returnPath = lessonId
    ? `/courses/${courseTrackId}/lessons/${encodeURIComponent(lessonId)}${search.get("edit") === "1" ? "?edit=1" : ""}`
    : `/courses/${courseTrackId}/content`;
  const backLink = <Link to={returnPath}>{lessonId ? "Back to lesson" : "Back to lessons"}</Link>;
  const permissions = user.permissions || [];
  const canImport = permissions.includes("quizzes.update");
  const canPublish = ["quizzes.publish", "activities.publish"].every((permission) => permissions.includes(permission));
  if (!quiz || !settings) return error
    ? <div>{backLink}<p className="admin-error" role="alert">{error} <button onClick={load} type="button">Retry</button></p></div>
    : <p className="resource-empty" role="status">Loading Quiz Builder…</p>; return <section className="quiz-builder"><header className="admin-page-heading"><div>{backLink}<p className="admin-kicker">Quiz activity</p><h2>Quiz Builder</h2><p>{quiz.title} · {quiz.status}</p></div>{canPublish && <button className="quiz-action" onClick={() => request(() => api.post(`/api/v1/admin/quizzes/${quiz.id}/publish`), "Quiz published.")} type="button">Publish Quiz</button>}</header>{error && <p className="admin-error">{error}</p>}{notice && <p className="content-notice">{notice}</p>}<nav className="builder-tabs"><button className={tab === "questions" ? "active" : ""} onClick={() => setTab("questions")} type="button">Questions</button>{rules.length > 0 && <button className={tab === "rules" ? "active" : ""} onClick={() => setTab("rules")} type="button">Existing random rules</button>}<button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")} type="button">Settings</button><button className={tab === "preview" ? "active" : ""} onClick={() => setTab("preview")} type="button">Preview</button></nav>{(tab === "questions" || (tab === "rules" && !rules.length)) && canImport && ["draft", "unpublished"].includes(quiz.status) && <QuizImport quizId={quiz.id} onImported={load} />}{(tab === "questions" || (tab === "rules" && !rules.length)) && <Questions quiz={quiz} questions={questions} request={request} reorder={reorder} canEdit={canImport && quiz.status !== "archived"} onSaved={load} />}{tab === "rules" && rules.length > 0 && <Rules quiz={quiz} rules={rules} request={request} />}{tab === "settings" && <Settings data={settings} setData={setSettings} request={request} quiz={quiz} />}{tab === "preview" && <Preview quiz={quiz} questions={questions} rules={rules} />}</section>;
};
const aikenTemplate = "Which device is used to enter text?\nA. Monitor\nB. Keyboard\nC. Speaker\nD. Printer\nANSWER: B\n";

const QuizImport = ({ quizId, onImported }) => {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const upload = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (!/\.txt$/i.test(file.name) || file.size > 256 * 1024)
        throw new Error("Choose a .txt file up to 256 KB.");
      let text;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      } catch {
        throw new Error("Save the file as UTF-8 text and try again.");
      }
      const result = unwrap(await api.post(`/api/v1/admin/quizzes/${quizId}/import-aiken`, { text }));
      setFile(null);
      form.reset();
      setNotice(`${result.imported} question${result.imported === 1 ? "" : "s"} imported.`);
      await onImported();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || requestError.message || "Unable to import questions.");
    } finally {
      setBusy(false);
    }
  };

  return <form className="quiz-import" onSubmit={upload}>
    <h3>Import quiz questions</h3>
    <p>Upload a UTF-8 Aiken text file with single-answer multiple-choice questions. Each question starts at 1 mark.</p>
    <a download="quiz-template.txt" href={`data:text/plain;charset=utf-8,${encodeURIComponent(aikenTemplate)}`}>Download sample file</a>
    <div className="quiz-import-controls">
      <label>Quiz file<input type="file" accept=".txt,text/plain" disabled={busy}
        onChange={(event) => setFile(event.target.files?.[0] || null)} required /></label>
      <button className="quiz-action" type="submit" disabled={!file || busy}>{busy ? "Importing…" : "Import questions"}</button>
    </div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {notice && <p className="content-notice" role="status">{notice}</p>}
  </form>;
};

const plainText = (html) => {
  const template = document.createElement("template");
  template.innerHTML = html || "";
  return template.content.textContent;
};
const choiceLetter = (index) => String.fromCharCode(65 + index);

const AnswerChoices = ({ options = [] }) => options.length > 0 && <ol className="quiz-answer-choices" type="A">
  {options.map((option) => <li key={option.id} className={option.isCorrect ? "quiz-answer-correct" : undefined}>
    <span>{plainText(option.text)}</span>
    {option.isCorrect && <strong>Correct answer</strong>}
  </li>)}
</ol>;

const QuestionEditor = ({ path, question, onCancel, onSaved }) => {
  const [text, setText] = useState(() => plainText(question.questionText));
  const [options, setOptions] = useState(() => question.options.map((option) => ({
    id: option.id, text: plainText(option.text),
  })));
  const [correctOptionId, setCorrectOptionId] = useState(question.options.find((option) => option.isCorrect)?.id || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.patch(path + "/content", { questionText: text, options, correctOptionId });
      await onSaved();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || "Unable to save the question.");
    } finally {
      setBusy(false);
    }
  };

  return <form className="quiz-question-editor" onSubmit={save}>
    <label>Question
      <textarea autoFocus maxLength={4000} required value={text} onChange={(event) => setText(event.target.value)} />
    </label>
    <fieldset>
      <legend>Answer options</legend>
      {options.map((option, index) => <div key={option.id} className="quiz-edit-option">
        <label>Option {choiceLetter(index)}
          <input maxLength={4000} required value={option.text}
            onChange={(event) => setOptions((current) => current.map((item) => item.id === option.id ? { ...item, text: event.target.value } : item))} />
        </label>
        <label className="quiz-correct-picker">
          <input type="radio" name="correctOption" required checked={correctOptionId === option.id}
            onChange={() => setCorrectOptionId(option.id)} />
          Correct answer
        </label>
      </div>)}
    </fieldset>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <div className="quiz-question-actions">
      <button className="quiz-action" type="submit" disabled={busy}>{busy ? "Saving…" : "Save question"}</button>
      <button type="button" onClick={onCancel} disabled={busy}>Cancel</button>
    </div>
  </form>;
};

const Questions = ({ quiz, questions, request, reorder, canEdit, onSaved }) => {
  const [editing, setEditing] = useState(null);
  const [saved, setSaved] = useState("");
  return <div className="quiz-questions"><section>
    <header><h3>Quiz questions</h3><strong>Total marks: {questions.reduce((sum, row) => sum + Number(row.marks), 0)}</strong></header>
    {saved && <p className="content-notice" role="status">{saved}</p>}
    {questions.map((row, index) => {
      const question = row.question;
      const path = `/api/v1/admin/quizzes/${quiz.id}/questions/${row.id}`;
      return <div className="quiz-question-entry" key={row.id}>
        <article>
          <strong>{index + 1}. {plainText(question?.questionText || question?.title)}</strong>
          {canEdit && editing !== row.id && question?.questionType === "single_choice" && question.options?.length >= 2 &&
            <button type="button" onClick={() => { setEditing(row.id); setSaved(""); }}>Edit question</button>}
          {canEdit && <div className="quiz-question-actions">
            <input aria-label={`Marks for question ${index + 1}`} min="0.01" step="0.01" type="number" value={row.marks}
              onChange={(event) => request(() => api.patch(path, { marks: event.target.value }))} />
            <button aria-label={`Move question ${index + 1} up`} disabled={!index} onClick={() => reorder(index, -1)} type="button">↑</button>
            <button aria-label={`Move question ${index + 1} down`} disabled={index === questions.length - 1} onClick={() => reorder(index, 1)} type="button">↓</button>
            <button onClick={() => request(() => api.delete(path), "Question removed.")} type="button">Remove</button>
          </div>}
        </article>
        {editing === row.id
          ? <QuestionEditor path={path} question={question} onCancel={() => setEditing(null)} onSaved={async () => {
            await onSaved();
            setEditing(null);
            setSaved(`Question ${index + 1} saved.`);
          }} />
          : <AnswerChoices options={question?.options} />}
      </div>;
    })}
    {!questions.length && <p className="resource-empty">No questions yet. Upload a quiz file to add questions.</p>}
  </section></div>;
};

const Rules = ({ quiz, rules, request }) => <div className="quiz-questions">
  <section>
    <h3>Existing random rules</h3>
    {rules.map((rule) => <article key={rule.id}>
      <strong>Choose {rule.questionCount} questions</strong>
      <p>{rule.matchingCount} eligible questions · {rule.marksPerQuestion} marks each</p>
      <button onClick={() => request(() => api.delete(`/api/v1/admin/quizzes/${quiz.id}/random-rules/${rule.id}`), "Random rule removed.")} type="button">Remove</button>
    </article>)}
  </section>
</div>;
const Settings = ({ quiz, data, setData, request }) => <form className="quiz-settings" onSubmit={(e) => { e.preventDefault(); request(() => api.patch(`/api/v1/admin/quizzes/${quiz.id}`, data), "Settings saved."); }}><div className="form-pair"><label>Title<input required value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} /></label><label>Time limit (minutes)<input min="1" type="number" value={data.timeLimitMinutes || ""} onChange={(e) => setData({ ...data, timeLimitMinutes: e.target.value || null })} /></label><label>Available from<input type="datetime-local" value={data.availableFrom ? data.availableFrom.slice(0, 16) : ""} onChange={(e) => setData({ ...data, availableFrom: e.target.value || null })} /></label><label>Available until<input type="datetime-local" value={data.availableUntil ? data.availableUntil.slice(0, 16) : ""} onChange={(e) => setData({ ...data, availableUntil: e.target.value || null })} /></label><label>Attempts allowed<input min="1" type="number" value={data.attemptsAllowed} onChange={(e) => setData({ ...data, attemptsAllowed: e.target.value })} /></label><label>Pass percentage<input min="0" max="100" step="0.01" type="number" value={data.passPercentage} onChange={(e) => setData({ ...data, passPercentage: e.target.value })} /></label><label>Questions per attempt<input min="1" type="number" value={data.questionsPerAttempt || ""} onChange={(e) => setData({ ...data, questionsPerAttempt: e.target.value || null })} /></label><label>Grading method<select value={data.gradingMethod} onChange={(e) => setData({ ...data, gradingMethod: e.target.value })}>{["highest", "latest", "average", "first"].map((x) => <option key={x}>{x}</option>)}</select></label><label>Feedback mode<select value={data.feedbackMode} onChange={(e) => setData({ ...data, feedbackMode: e.target.value })}>{["immediate", "after_submission", "after_quiz_closes", "never"].map((x) => <option key={x}>{x}</option>)}</select></label></div><label>Instructions<textarea value={data.instructions || ""} onChange={(e) => setData({ ...data, instructions: e.target.value })} /></label>{[["shuffleQuestions", "Shuffle Questions"], ["shuffleOptions", "Shuffle options"], ["showCorrectAnswers", "Show correct answers"], ["showScore", "Show score"], ["showExplanations", "Show explanations"], ["completionRequiresPass", "Completion requires pass"]].map(([key, label]) => <label className="check" key={key}><input checked={data[key]} onChange={(e) => setData({ ...data, [key]: e.target.checked })} type="checkbox" /> {label}</label>)}<button type="submit">Save settings</button></form>;
const Preview = ({ quiz, questions, rules }) => <section className="quiz-preview"><p className="admin-kicker">Admin Preview — no attempt is created</p><h3>{quiz.title}</h3><p>{quiz.instructions || "No instructions."}</p><p>{quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} minutes` : "No time limit"} · {quiz.attemptsAllowed} attempt(s) · {quiz.shuffleQuestions ? "Questions shuffle" : "Fixed order"}</p>{questions.map((row, index) => <div className="quiz-question-entry" key={row.id}><article><strong>{index + 1}. {plainText(row.question?.questionText)}</strong><span>{row.marks} marks</span></article><AnswerChoices options={row.question?.options} /></div>)}{rules.map((rule) => <article key={rule.id}>Random: {rule.questionCount} Questions · {rule.marksPerQuestion} marks each</article>)}</section>;
