import { useEffect, useRef, useState } from 'react';
import { parseDateKey } from '../lib/dates';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Full weeks, including faded days from the previous and next month
function buildGrid(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const start = new Date(year, month, 1 - firstWeekday);
  return Array.from({ length: cells }, (_, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { date, key: toKey(date), inMonth: date.getMonth() === month };
  });
}

export default function DatePicker({ value, onChange, placeholder = 'Pick a date' }) {
  const today = new Date();
  const initial = value ? parseDateKey(value) : today;

  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function toggle() {
    if (!open && value) {
      const d = parseDateKey(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
    if (!open && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < 380 && rect.top > spaceBelow);
    }
    setOpen(!open);
  }

  function changeMonth(step) {
    const d = new Date(viewYear, viewMonth + step, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function pick(key) {
    onChange(key);
    setOpen(false);
  }

  // Escape closes only the calendar, not the whole pop-up behind it
  function onKeyDown(e) {
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
    }
  }

  const todayKey = toKey(today);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const display = value
    ? parseDateKey(value).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : placeholder;

  return (
    <div className="datepicker" ref={wrapperRef} onKeyDown={onKeyDown}>
      <button
        type="button"
        className={`datepicker-trigger ${open ? 'is-open' : ''} ${value ? '' : 'is-empty'}`}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{display}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className={`datepicker-popover ${openUp ? 'is-above' : ''}`} role="dialog" aria-label="Choose a date">
          <div className="datepicker-header">
            <button type="button" className="datepicker-nav" onClick={() => changeMonth(-1)} aria-label="Previous month">
              ‹
            </button>
            <span className="datepicker-month">{monthLabel}</span>
            <button type="button" className="datepicker-nav" onClick={() => changeMonth(1)} aria-label="Next month">
              ›
            </button>
          </div>

          <div className="datepicker-grid">
            {WEEKDAYS.map((w) => (
              <span key={w} className="datepicker-weekday">
                {w}
              </span>
            ))}

            {buildGrid(viewYear, viewMonth).map(({ date, key, inMonth }) => {
              const classes = [
                'datepicker-day',
                inMonth ? '' : 'is-outside',
                key === todayKey ? 'is-today' : '',
                key === value ? 'is-selected' : '',
              ].join(' ');
              return (
                <button
                  key={key}
                  type="button"
                  className={classes}
                  onClick={() => pick(key)}
                  aria-label={date.toDateString()}
                  aria-pressed={key === value}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="datepicker-footer">
            <button type="button" className="link-button" onClick={() => pick(null)}>
              Clear
            </button>
            <button type="button" className="datepicker-today" onClick={() => pick(todayKey)}>
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
