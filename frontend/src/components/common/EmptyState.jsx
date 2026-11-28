import React from 'react';

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  compact = false,
}) {
  return (
    <div className={`empty-state-box ${compact ? 'compact' : ''}`}>
      {icon && <div className="empty-state-icon" aria-hidden="true">{icon}</div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {(actionLabel || secondaryLabel) && (
        <div className="empty-state-actions">
          {actionLabel && onAction && (
            <button type="button" className="wire-button dark" onClick={onAction}>
              {actionLabel}
            </button>
          )}
          {secondaryLabel && onSecondaryAction && (
            <button type="button" className="wire-button" onClick={onSecondaryAction}>
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
