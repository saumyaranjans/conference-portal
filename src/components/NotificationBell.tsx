"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types";

export function NotificationBell({ unread }: { unread: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [count, setCount] = useState(unread);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15)
      .then(({ data }) => setItems((data as Notification[]) ?? []));
  }, [open]);

  async function markAllRead() {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("is_read", false);
    setCount(0);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        <svg
          className="w-5 h-5 text-slate-600"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.8 23.8 0 0 0 5.454-1.31A8.97 8.97 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.97 8.97 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.3 24.3 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 card z-30 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              onClick={markAllRead}
              className="text-xs text-blue-700 hover:underline"
            >
              Mark all read
            </button>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500 text-center">
              Nothing yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((n) => (
                <li key={n.id}>
                  <a
                    href={n.link ?? "#"}
                    className={`block px-4 py-3 hover:bg-slate-50 ${
                      n.is_read ? "" : "bg-blue-50/50"
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-800">
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {n.body}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
