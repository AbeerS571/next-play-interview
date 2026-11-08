import { useState } from 'react';
import { colorVar } from '../lib/colors';

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function Avatar({ member, size = 28, className = '' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const style = { width: size, height: size, fontSize: size * 0.4 };

  if (member.avatar_url && !imageFailed) {
    return (
      <img
        className={`avatar ${className}`}
        src={member.avatar_url}
        alt={member.name}
        title={member.name}
        style={style}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span
      className={`avatar ${className}`}
      title={member.name}
      style={{ ...style, background: colorVar(member.color) }}
    >
      {initials(member.name)}
    </span>
  );
}

export function AvatarStack({ members, max = 3, size = 26 }) {
  if (members.length === 0) return null;
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;

  return (
    <div className="avatar-stack" aria-label={members.map((m) => m.name).join(', ')}>
      {shown.map((m) => (
        <Avatar key={m.id} member={m} size={size} />
      ))}
      {extra > 0 && (
        <span className="avatar avatar--more" style={{ width: size, height: size, fontSize: size * 0.38 }}>
          +{extra}
        </span>
      )}
    </div>
  );
}
