import Link from "next/link";

/**
 * A way back to the conference landing page from the auth screens, which are
 * otherwise a dead end for anyone who arrived by mistake.
 */
export function HomeLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm
                  font-medium text-slate-700 transition hover:bg-white hover:text-blue-700
                  dark:text-slate-200 dark:hover:bg-slate-800 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 11l9-8 9 8M6 10v10h12V10" />
      </svg>
      Home
    </Link>
  );
}
