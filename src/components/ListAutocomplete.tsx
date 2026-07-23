"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Text input with suggestions filtered from a fixed local list (e.g.
 * countries). Works controlled (`value` + `onChange`) or uncontrolled inside
 * a plain form (pass `name`). Free text is always allowed.
 */
export function ListAutocomplete({
  id,
  name,
  options,
  value,
  onChange,
  defaultValue = "",
  placeholder,
  required,
}: {
  id?: string;
  name?: string;
  options: string[];
  value?: string;
  onChange?: (v: string) => void;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const controlled = value !== undefined && onChange !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const current = controlled ? (value as string) : internal;
  const setCurrent = (v: string) =>
    controlled ? onChange!(v) : setInternal(v);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = current.trim().toLowerCase();
  const matches = q
    ? [
        ...options.filter((o) => o.toLowerCase().startsWith(q)),
        ...options.filter(
          (o) => !o.toLowerCase().startsWith(q) && o.toLowerCase().includes(q)
        ),
      ].slice(0, 8)
    : [];

  function pick(s: string) {
    setCurrent(s);
    setOpen(false);
  }

  return (
    <div className="relative" ref={boxRef}>
      <input
        id={id}
        name={name}
        required={required}
        autoComplete="off"
        placeholder={placeholder}
        className="input"
        value={current}
        onChange={(e) => {
          setCurrent(e.target.value);
          setOpen(e.target.value.trim().length > 0);
          setActive(-1);
        }}
        onFocus={() => q && matches.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || matches.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (active >= 0) pick(matches[active]);
            else setOpen(false);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full max-h-60 overflow-auto card py-1">
          {matches.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => pick(s)}
                onMouseEnter={() => setActive(i)}
                className={`w-full text-left px-3 py-1.5 text-sm ${
                  i === active
                    ? "bg-blue-50 text-blue-800"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
