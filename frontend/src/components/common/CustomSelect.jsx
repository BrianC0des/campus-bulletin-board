import React, { useState, useRef, useEffect, useId } from 'react';

export default function CustomSelect({ value, onChange, options, className = '', ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (idx) => `${baseId}-option-${idx}`;
  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label ?? value;
  const triggerLabel = selectedOption?.shortLabel ?? selectedLabel;

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (open) {
      const idx = Math.max(0, options.findIndex((o) => o.value === value));
      setActiveIndex(idx);
      requestAnimationFrame(() => optionRefs.current[idx]?.focus());
    }
  }, [open, options, value]);

  const handleTriggerKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  };

  const handleMenuKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'Tab') {
      // Close on Tab and let focus move naturally from the trigger.
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (activeIndex + 1) % options.length;
      setActiveIndex(next);
      optionRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (activeIndex - 1 + options.length) % options.length;
      setActiveIndex(prev);
      optionRefs.current[prev]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
      optionRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = options.length - 1;
      setActiveIndex(last);
      optionRefs.current[last]?.focus();
    }
  };

  return (
    <div className={`custom-select ${className}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="custom-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{triggerLabel}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div
          id={listboxId}
          className="custom-select-menu"
          role="listbox"
          aria-label={ariaLabel}
          aria-activedescendant={optionId(activeIndex)}
          onKeyDown={handleMenuKeyDown}
        >
          {options.map((option, idx) => (
            <button
              ref={(el) => {
                optionRefs.current[idx] = el;
              }}
              id={optionId(idx)}
              type="button"
              role="option"
              aria-selected={value === option.value}
              className={value === option.value ? 'selected' : ''}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              key={option.value}
            >
              <span>{option.label}</span>
              {value === option.value && (
                <svg className="button-icon" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="m4 10.5 3.5 3.5L16 5.5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
