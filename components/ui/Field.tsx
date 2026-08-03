'use client';

import { useEffect, useId, useRef, type CSSProperties } from 'react';
import gsap from 'gsap';
import { DUR, EASE } from '@/lib/motion';

/**
 * Form field — prototype's `label` + `[data-field-line]`.
 * The forest line draws scaleX 0 -> 1 over 0.7s power3.out on hover, and on
 * focus, so the field is reachable by keyboard with the same affordance.
 */
export default function Field({
  label,
  placeholder,
  type = 'text',
  textarea = false,
  rows = 4,
  gap = 14,
  inputStyle,
  name,
  autoComplete,
  defaultValue,
}: {
  label: string;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
  rows?: number;
  gap?: number;
  inputStyle?: CSSProperties;
  name?: string;
  autoComplete?: string;
  defaultValue?: string;
}) {
  const ref = useRef<HTMLLabelElement>(null);
  const id = useId();

  useEffect(() => {
    const el = ref.current;
    const line = el?.querySelector<HTMLElement>('[data-field-line]');
    if (!el || !line) return;

    const sx = gsap.quickTo(line, 'scaleX', {
      duration: DUR.settle,
      ease: EASE.hover,
    });
    const on = () => sx(1);
    const off = () => sx(0);

    el.addEventListener('mouseenter', on);
    el.addEventListener('mouseleave', off);

    const input = el.querySelector<HTMLElement>('input, textarea');
    input?.addEventListener('focus', on);
    input?.addEventListener('blur', off);

    return () => {
      el.removeEventListener('mouseenter', on);
      el.removeEventListener('mouseleave', off);
      input?.removeEventListener('focus', on);
      input?.removeEventListener('blur', off);
    };
  }, []);

  const base: CSSProperties = {
    width: '100%',
    minWidth: 0,
    paddingBottom: 12,
    fontSize: 17,
    fontWeight: 300,
    ...inputStyle,
  };

  return (
    <label
      ref={ref}
      htmlFor={id}
      style={{ display: 'flex', flexDirection: 'column', gap }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: '#5C5A55',
        }}
      >
        {label}
      </span>

      {textarea ? (
        <textarea
          id={id}
          name={name}
          rows={rows}
          placeholder={placeholder}
          defaultValue={defaultValue}
          style={{ ...base, resize: 'none' }}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          style={base}
        />
      )}

      <div data-field style={{ height: 1, background: '#DDD7C9' }}>
        <div
          data-field-line
          style={{
            height: 1,
            background: '#17342C',
            transform: 'scaleX(0)',
            transformOrigin: 'left center',
          }}
        />
      </div>
    </label>
  );
}
