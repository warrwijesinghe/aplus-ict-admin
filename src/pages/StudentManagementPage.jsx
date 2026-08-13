import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, unwrap } from "../api/client.js";

const districts = [
  "",
  "Ampara",
  "Anuradhapura",
  "Badulla",
  "Batticaloa",
  "Colombo",
  "Galle",
  "Gampaha",
  "Hambantota",
  "Jaffna",
  "Kalutara",
  "Kandy",
  "Kegalle",
  "Kilinochchi",
  "Kurunegala",
  "Mannar",
  "Matale",
  "Matara",
  "Monaragala",
  "Mullaitivu",
  "Nuwara Eliya",
  "Polonnaruwa",
  "Puttalam",
  "Ratnapura",
  "Trincomalee",
  "Vavuniya",
];
const asError = (error) =>
  error.response?.data?.error?.message || "Unable to load student information";
const date = (value) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";

export const StudentsPage = () => {
  const [filters, setFilters] = useState({
    search: "",
    district: "",
    preferredMedium: "",
    profileStatus: "",
    hasEnrolment: "",
    page: 1,
  });
  const [data, setData] = useState({ items: [], pagination: {} });
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setError("");
      setData(
        unwrap(await api.get("/api/v1/admin/students", { params: filters })),
      );
    } catch (requestError) {
      setError(asError(requestError));
    }
  }, [filters]);
  useEffect(() => {
    load();
  }, [load]);
  const update = ({ target }) =>
    setFilters((current) => ({
      ...current,
      page: 1,
      [target.name]: target.value,
    }));
  return (
    <section className="students-page">
      <div className="admin-page-heading">
        <div>
          <p className="admin-kicker">Learner management</p>
          <h2>Students</h2>
          <p>
            Search profiles and review only the information needed to support
            learning.
          </p>
        </div>
      </div>
      <details className="student-filters" open>
        <summary>Search and filters</summary>
        <div>
          <label>
            Search
            <input
              name="search"
              onChange={update}
              placeholder="Name or email"
              value={filters.search}
            />
          </label>
          <label>
            District
            <select name="district" onChange={update} value={filters.district}>
              {districts.map((district) => (
                <option key={district} value={district}>
                  {district || "All districts"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Communication language
            <select
              name="preferredMedium"
              onChange={update}
              value={filters.preferredMedium}
            >
              <option value="">All languages</option>
              <option value="sinhala">Sinhala</option>
              <option value="english">English</option>
            </select>
          </label>
          <label>
            Profile
            <select
              name="profileStatus"
              onChange={update}
              value={filters.profileStatus}
            >
              <option value="">All profiles</option>
              <option value="complete">Complete</option>
              <option value="incomplete">Incomplete</option>
            </select>
          </label>
          <label>
            Enrolment
            <select
              name="hasEnrolment"
              onChange={update}
              value={filters.hasEnrolment}
            >
              <option value="">All students</option>
              <option value="true">Has active enrolment</option>
              <option value="false">No active enrolment</option>
            </select>
          </label>
        </div>
      </details>
      {error ? <p className="admin-error">{error}</p> : null}
      <div className="resource-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Contact</th>
              <th>School / district</th>
              <th>Year / communication</th>
              <th>Profile</th>
              <th>Enrolments</th>
              <th>Last activity</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((student) => (
              <tr key={student.id}>
                <td>
                  <Link to={`/students/${student.id}`}>
                    {student.fullName || "Unnamed student"}
                  </Link>
                  <small>{student.email}</small>
                </td>
                <td>{student.mobileNumber || "—"}</td>
                <td>
                  {student.schoolName || "—"}
                  <small>{student.district || "—"}</small>
                </td>
                <td>
                  {student.gradeOrExamYear || "—"}
                  <small>{student.preferredMedium || "—"}</small>
                </td>
                <td>{student.profileStatus}</td>
                <td>{student.activeEnrolmentCount}</td>
                <td>{date(student.lastActivityAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.items.length && !error ? (
          <p className="resource-empty">No students match these filters.</p>
        ) : null}
      </div>
      <div className="student-pagination">
        <button
          disabled={filters.page <= 1}
          onClick={() =>
            setFilters((current) => ({ ...current, page: current.page - 1 }))
          }
        >
          Previous
        </button>
        <span>Page {data.pagination.page || 1}</span>
        <button
          disabled={
            (data.pagination.page || 1) * (data.pagination.pageSize || 20) >=
            (data.pagination.total || 0)
          }
          onClick={() =>
            setFilters((current) => ({ ...current, page: current.page + 1 }))
          }
        >
          Next
        </button>
      </div>
    </section>
  );
};

export const StudentDetailPage = () => {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [gradebook, setGradebook] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [selectedTrack, setSelectedTrack] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      setError("");
      const [detail, trackRows] = await Promise.all([
        api.get(`/api/v1/admin/students/${studentId}`),
        api.get("/api/v1/admin/tracks"),
      ]);
      const profile = unwrap(detail);
      setStudent(profile);
      setTracks(unwrap(trackRows));
      const trackId = profile.enrolments[0]?.course?.id;
      if (trackId) {
        const [results, events] = await Promise.all([
          api.get(`/api/v1/admin/students/${studentId}/results`, {
            params: { courseTrackId: trackId },
          }),
          api.get(`/api/v1/admin/students/${studentId}/learning-history`, {
            params: { courseTrackId: trackId, pageSize: 8 },
          }),
        ]);
        setGradebook(unwrap(results));
        setHistory(unwrap(events).items || []);
      } else {
        setGradebook(null);
        setHistory([]);
      }
    } catch (requestError) {
      setError(asError(requestError));
    }
  }, [studentId]);
  useEffect(() => {
    load();
  }, [load]);
  const add = async () => {
    if (!selectedTrack) return;
    setBusy(true);
    try {
      await api.post(`/api/v1/admin/students/${studentId}/enrolments`, {
        courseTrackId: selectedTrack,
        enrolmentType: "admin",
      });
      setSelectedTrack("");
      await load();
    } catch (requestError) {
      setError(asError(requestError));
    } finally {
      setBusy(false);
    }
  };
  const status = async (entry, next) => {
    if (next !== "active" && !window.confirm("Deactivate this enrolment?"))
      return;
    setBusy(true);
    try {
      await api.patch(`/api/v1/admin/enrolments/${entry.id}`, { status: next });
      await load();
    } catch (requestError) {
      setError(asError(requestError));
    } finally {
      setBusy(false);
    }
  };
  if (error && !student)
    return (
      <section>
        <p className="admin-error">{error}</p>
        <Link to="/students">Back to Students</Link>
      </section>
    );
  if (!student) return <section>Loading student…</section>;
  return (
    <section className="student-detail">
      <Link to="/students">← Students</Link>
      <p className="admin-kicker">Student profile</p>
      <h2>{student.profile.fullName || student.email}</h2>
      <p>
        {student.email} · {student.accountStatus}
      </p>
      {error ? <p className="admin-error">{error}</p> : null}
      <div className="student-detail-grid">
        <article>
          <h3>Profile</h3>
          <dl>
            <dt>Mobile</dt>
            <dd>{student.profile.mobileNumber || "—"}</dd>
            <dt>School</dt>
            <dd>{student.profile.schoolName || "—"}</dd>
            <dt>District</dt>
            <dd>{student.profile.district || "—"}</dd>
            <dt>Exam year</dt>
            <dd>{student.profile.gradeOrExamYear || "—"}</dd>
            <dt>Communication language</dt>
            <dd>{student.profile.preferredMedium || "—"}</dd>
            <dt>Completion</dt>
            <dd>{student.profile.profileStatus}</dd>
          </dl>
        </article>
        <article>
          <h3>Add enrolment</h3>
          <label>
            Course / Medium
            <select
              onChange={(event) => setSelectedTrack(event.target.value)}
              value={selectedTrack}
            >
              <option value="">Select Medium</option>
              {tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.title}
                </option>
              ))}
            </select>
          </label>
          <button disabled={busy || !selectedTrack} onClick={add}>
            Add admin enrolment
          </button>
        </article>
      </div>
      <article className="student-enrolment-list">
        <h3>Enrolments and progress</h3>
        {student.enrolments.map((entry) => (
          <div key={entry.id}>
            <strong>{entry.course.title}</strong>
            <span>
              {entry.course.medium} · {entry.enrolmentType} · {entry.status}
            </span>
            <progress max="100" value={entry.progress.percentage} />
            <span>
              {entry.progress.percentage}% ({entry.progress.completedCount}/
              {entry.progress.requiredCount})
            </span>
            <small>Last access: {date(entry.state.lastAccessedAt)}</small>
            {entry.status === "active" ? (
              <button disabled={busy} onClick={() => status(entry, "inactive")}>
                Deactivate
              </button>
            ) : (
              <button disabled={busy} onClick={() => status(entry, "active")}>
                Reactivate
              </button>
            )}
          </div>
        ))}
        {!student.enrolments.length ? <p>No enrolments.</p> : null}
      </article>
      <div className="student-detail-grid">
        <article>
          <h3>Quiz results</h3>
          {gradebook?.quizzes?.length ? (
            gradebook.quizzes.map((quiz) => (
              <p key={quiz.quizId}>
                {quiz.title}:{" "}
                {quiz.pendingManualGrading
                  ? "Pending grade"
                  : `${quiz.percentage ?? "—"}%`}
              </p>
            ))
          ) : (
            <p>No quiz results yet.</p>
          )}
        </article>
        <article>
          <h3>Learning history</h3>
          {history.length ? (
            history.map((event) => (
              <p key={event.id}>
                {event.eventType.replaceAll("_", " ")} ·{" "}
                {date(event.occurredAt)}
              </p>
            ))
          ) : (
            <p>No learning history yet.</p>
          )}
        </article>
        <article>
          <h3>Teacher comments</h3>
          {gradebook?.comments?.length ? (
            gradebook.comments.map((comment) => (
              <p key={comment.id}>{comment.comment}</p>
            ))
          ) : (
            <p>No teacher comments.</p>
          )}
        </article>
      </div>
    </section>
  );
};
