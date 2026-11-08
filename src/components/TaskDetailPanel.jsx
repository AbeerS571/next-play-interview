import { useCallback, useEffect, useRef, useState } from 'react';
import { useBoard } from '../context/BoardContext';
import { fetchComments, addComment } from '../api/comments';
import { fetchActivity } from '../api/activity';
import { formatTimestamp, getUrgency, timeAgo } from '../lib/dates';
import DatePicker from './DatePicker.jsx';
import Avatar from './Avatar.jsx';
import { AssigneePicker, LabelPicker, PriorityPicker } from './Pickers.jsx';

export default function TaskDetailPanel({
  task,
  columns,
  onClose,
  onUpdate,
  onSetAssignees,
  onSetLabels,
  onDelete,
}) {
  const { user } = useBoard();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [tab, setTab] = useState('comments');
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const urgency = getUrgency(task);

  const loadActivity = useCallback(() => {
    fetchActivity(task.id)
      .then(setActivity)
      .catch((e) => setLoadError(e.message));
  }, [task.id]);

  useEffect(() => {
    fetchComments(task.id)
      .then(setComments)
      .catch((e) => setLoadError(e.message));
    loadActivity();
  }, [task.id, loadActivity]);

  // After a save, reload the timeline: the database logs the change
  async function save(promise) {
    try {
      await promise;
      loadActivity();
    } catch {
      // BoardPage shows the error and rolls back
    }
  }

  function saveText() {
    const nextTitle = title.trim();
    const nextDescription = description.trim();
    const fields = {};
    if (nextTitle && nextTitle !== task.title) fields.title = nextTitle;
    if (!nextTitle) setTitle(task.title);
    if (nextDescription !== (task.description ?? '')) fields.description = nextDescription;
    if (Object.keys(fields).length) save(onUpdate(task.id, fields));
  }

  // Ref so the Escape listener always saves the latest text
  const saveTextRef = useRef(saveText);
  saveTextRef.current = saveText;

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        saveTextRef.current();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleComment(e) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setPosting(true);
    try {
      const comment = await addComment(task.id, body);
      setComments((prev) => [...prev, comment]);
      setDraft('');
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setPosting(false);
    }
  }

  const me = { name: user.email || 'Guest', color: 'lavender' };

  return (
    <div
      className="panel-overlay"
      onMouseDown={() => {
        saveTextRef.current();
        onClose();
      }}
    >
      <aside
        className="panel"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Task: ${task.title}`}
      >
        <div className="panel-header">
          <select
            className="status-select"
            value={task.status}
            style={{ background: `var(--${task.status}-bg)` }}
            onChange={(e) => save(onUpdate(task.id, { status: e.target.value }))}
            aria-label="Status"
          >
            {columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          <div className="panel-header-actions">
            <button
              type="button"
              className="icon-button icon-button--danger"
              onClick={() => onDelete(task.id)}
              aria-label="Delete task"
              title="Delete task"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => {
                saveText();
                onClose();
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="panel-body">
          <input
            className="panel-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveText}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            aria-label="Title"
          />

          {urgency && (
            <span className={`urgency urgency--${urgency.level} urgency--large`}>{urgency.label}</span>
          )}

          <textarea
            className="panel-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveText}
            placeholder="Add a description…"
            rows={3}
          />

          <div className="panel-fields">
            <div className="field">
              <span className="field-label">Priority</span>
              <PriorityPicker
                value={task.priority}
                onChange={(priority) => save(onUpdate(task.id, { priority }))}
              />
            </div>

            <div className="field">
              <span className="field-label">Due date</span>
              <DatePicker
                value={task.due_date ?? ''}
                onChange={(key) => save(onUpdate(task.id, { due_date: key || null }))}
              />
            </div>

            <div className="field">
              <span className="field-label">Assignees</span>
              <AssigneePicker
                value={task.assignee_ids}
                onChange={(ids) => save(onSetAssignees(task.id, ids))}
              />
            </div>

            <div className="field">
              <span className="field-label">Labels</span>
              <LabelPicker value={task.label_ids} onChange={(ids) => save(onSetLabels(task.id, ids))} />
            </div>
          </div>

          <div className="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'comments'}
              className={`tab ${tab === 'comments' ? 'is-active' : ''}`}
              onClick={() => setTab('comments')}
            >
              Comments <span className="tab-count">{comments.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'activity'}
              className={`tab ${tab === 'activity' ? 'is-active' : ''}`}
              onClick={() => setTab('activity')}
            >
              Activity <span className="tab-count">{activity.length}</span>
            </button>
          </div>

          {loadError && <p className="error">{loadError}</p>}

          {tab === 'comments' ? (
            <div className="comments">
              {comments.length === 0 && <p className="empty-note">No comments yet.</p>}

              {comments.map((c) => (
                <div key={c.id} className="comment">
                  <Avatar member={me} size={30} />
                  <div className="comment-main">
                    <div className="comment-meta">
                      <strong>You</strong>
                      <time dateTime={c.created_at} title={new Date(c.created_at).toLocaleString()}>
                        {formatTimestamp(c.created_at)}
                      </time>
                    </div>
                    <p className="comment-body">{c.body}</p>
                  </div>
                </div>
              ))}

              <form className="comment-form" onSubmit={handleComment}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleComment(e);
                  }}
                  placeholder="Write a comment…"
                  rows={2}
                />
                <div className="comment-form-actions">
                  <span className="hint">Ctrl/⌘ + Enter to send</span>
                  <button type="submit" className="btn-primary btn-small" disabled={!draft.trim() || posting}>
                    {posting ? 'Posting…' : 'Comment'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <ol className="timeline">
              {activity.length === 0 && <p className="empty-note">No activity yet.</p>}

              {activity.map((a) => (
                <li key={a.id} className={`timeline-item timeline-item--${a.action}`}>
                  <span className="timeline-dot" />
                  <span className="timeline-text">
                    {a.message}
                    <time
                      className="timeline-time"
                      dateTime={a.created_at}
                      title={new Date(a.created_at).toLocaleString()}
                    >
                      {' · '}
                      {timeAgo(a.created_at)}
                    </time>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  );
}
