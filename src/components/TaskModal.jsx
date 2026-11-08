import { useEffect, useState } from 'react';
import DatePicker from './DatePicker.jsx';
import { AssigneePicker, LabelPicker, PriorityPicker } from './Pickers.jsx';

export default function TaskModal({ onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [labelIds, setLabelIds] = useState([]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSave({
      title: trimmed,
      description: description.trim(),
      priority,
      due_date: dueDate || null,
      assignee_ids: assigneeIds,
      label_ids: labelIds,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>New task</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <input
          className="modal-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          aria-label="Title"
          autoFocus
          required
        />

        <label className="field">
          <span className="field-label">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Add some details…"
          />
        </label>

        <div className="modal-row">
          <div className="field">
            <span className="field-label">Priority</span>
            <PriorityPicker value={priority} onChange={setPriority} />
          </div>

          <div className="field">
            <span className="field-label">Due date</span>
            <DatePicker value={dueDate} onChange={(key) => setDueDate(key || '')} />
          </div>
        </div>

        <div className="field">
          <span className="field-label">Assignees</span>
          <AssigneePicker value={assigneeIds} onChange={setAssigneeIds} />
        </div>

        <div className="field">
          <span className="field-label">Labels</span>
          <LabelPicker value={labelIds} onChange={setLabelIds} />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={!title.trim()}>
            Add task
          </button>
        </div>
      </form>
    </div>
  );
}
