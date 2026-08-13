import { useCallback, useEffect, useState } from "react";
import { api, unwrap } from "../api/client.js";

const emptyMessage = { recipient: "", text: "", category: "general", contentType: "standard", messageType: "0" };
const smsTypeLabel = (value) => ({ general: "GENERAL", registration: "REG", payment: "PAYMENT", notification: "NOTIFICATION", reminder: "REMINDER" }[value] || "GENERAL");
const requestMessage = (error) => error.response?.data?.error?.message || "Unable to complete the SMS operation";
const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";
const gatewayTypeLabel = (value) => Number(value) === 1 ? "Promotional" : "Non-promotional";

export const SmsMessagesPage = () => {
  const [data, setData] = useState({ items: [], pagination: {} });
  const [filters, setFilters] = useState({ page: 1, status: "", recipient: "" });
  const [form, setForm] = useState(emptyMessage);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState("");

  const load = useCallback(async () => {
    try { setError(""); setData(unwrap(await api.get("/api/v1/admin/sms/messages", { params: filters }))); }
    catch (requestError) { setError(requestMessage(requestError)); }
  }, [filters]);
  useEffect(() => { load(); }, [load]);

  const send = async (event) => {
    event.preventDefault(); setBusy(true); setNotice("");
    try { await api.post("/api/v1/admin/sms/messages", { ...form, messageType: Number(form.messageType) }); setForm(emptyMessage); setNotice("SMS queued for sending."); await load(); }
    catch (requestError) { setError(requestMessage(requestError)); }
    finally { setBusy(false); }
  };
  const resend = async (message) => {
    if (!window.confirm(`Queue another copy of this SMS for ${message.recipient}? The recipient may receive it more than once.`)) return;
    setResending(message.id); setNotice("");
    try { await api.post(`/api/v1/admin/sms/messages/${message.id}/resend`); setNotice("SMS queued for resend."); await load(); }
    catch (requestError) { setError(requestMessage(requestError)); }
    finally { setResending(""); }
  };
  const updateFilter = ({ target }) => setFilters((current) => ({ ...current, page: 1, [target.name]: target.value }));
  const updateForm = ({ target }) => setForm((current) => ({ ...current, [target.name]: target.value }));

  return <section className="sms-page">
    <div className="admin-page-heading"><div><p className="admin-kicker">Mobitel Enterprise SMS</p><h2>SMS messages</h2><p>Queue messages, monitor delivery results, and resend when needed.</p></div></div>
    {error ? <p className="admin-error">{error}</p> : null}{notice ? <p className="content-notice">{notice}</p> : null}
    <form className="resource-form sms-compose" onSubmit={send}>
      <h3>Send SMS</h3>
      <label>Recipient<input name="recipient" onChange={updateForm} placeholder="94771234567" required value={form.recipient} /></label>
      <label>SMS purpose<select name="category" onChange={updateForm} value={form.category}><option value="general">GENERAL</option><option value="registration">REG - Registration</option><option value="payment">PAYMENT</option><option value="notification">NOTIFICATION</option><option value="reminder">REMINDER</option></select></label>
      <label>Gateway type<select name="messageType" onChange={updateForm} value={form.messageType}><option value="0">Non-promotional</option><option value="1">Promotional</option></select></label>
      <label>Language<select name="contentType" onChange={updateForm} value={form.contentType}><option value="standard">Standard (English)</option><option value="multilingual">Multi-language</option></select></label>
      <label className="sms-text">Message<textarea maxLength="160" name="text" onChange={updateForm} required value={form.text} /><small>{[...form.text].length}/160 characters</small></label>
      <button disabled={busy} type="submit">{busy ? "Queueing..." : "Queue SMS"}</button>
    </form>
    <div className="student-filters sms-filters"><label>Status<select name="status" onChange={updateFilter} value={filters.status}><option value="">All statuses</option>{["queued", "sending", "sent", "failed"].map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label>Recipient<input name="recipient" onChange={updateFilter} placeholder="9477..." value={filters.recipient} /></label></div>
    <div className="resource-table-wrap"><table><thead><tr><th>Recipient / message</th><th>SMS type</th><th>Status</th><th>Attempts</th><th>Gateway result</th><th>Queued</th><th>Action</th></tr></thead><tbody>{data.items.map((message) => <tr key={message.id}><td className="sms-message"><strong>{message.recipient}</strong><small>{message.text}</small></td><td><strong className="sms-category">{smsTypeLabel(message.category)}</strong><small>{gatewayTypeLabel(message.messageType)} · {message.contentType}</small></td><td><span className={`sms-status ${message.status}`}>{message.status}</span></td><td>{message.attemptCount}/{message.maxAttempts}<small>{message.attempts?.[0]?.status || "waiting"}</small></td><td>{message.gatewayCode || "-"}<small>{message.failureReason || (message.status === "sent" ? "Accepted by gateway" : "")}</small></td><td>{formatDate(message.createdAt)}<small>{message.createdBy?.name || "System"}</small></td><td>{message.status !== "sending" ? <button disabled={resending === message.id} onClick={() => resend(message)} type="button">{resending === message.id ? "Queueing..." : "Resend"}</button> : "Sending..."}</td></tr>)}</tbody></table>{!data.items.length ? <p className="resource-empty">No SMS messages match the current filters.</p> : null}</div>
    {data.pagination.totalPages > 1 ? <div className="pagination"><button disabled={filters.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))} type="button">Previous</button><span>Page {data.pagination.page} of {data.pagination.totalPages}</span><button disabled={filters.page >= data.pagination.totalPages} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))} type="button">Next</button></div> : null}
  </section>;
};
