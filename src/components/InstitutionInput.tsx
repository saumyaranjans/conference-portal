"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Institution field with a world-universities typeahead. Suggestions come
 * from /api/universities as the user types; free text is still allowed.
 */
export function InstitutionInput({
  id,
  value,
  onChange,
  placeholder,
  required,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function handleChange(v: string) {
    onChange(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/universities?q=${encodeURIComponent(v)}`);
        const data = (await res.json()) as string[];
        setSuggestions(data);
        setOpen(data.length > 0);
        setActive(-1);
      } catch {
        setSuggestions([]);
      }
    }, 200);
  }

  function pick(s: string) {
    onChange(s);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div className="relative" ref={boxRef}>
      <input
        id={id}
        required={required}
        autoComplete="off"
        placeholder={placeholder}
        className="input"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (active >= 0) pick(suggestions[active]);
            else setOpen(false);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && (
        <ul className="absolute z-30 mt-1 w-full max-h-64 overflow-auto card py-1">
          {suggestions.map((s, i) => (
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
