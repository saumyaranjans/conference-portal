import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GLOGIFT 2027 — Conference Submission Portal",
  description:
    "International Conference on AI-Driven Solutions in Management: Flexibility, Digitalisation and Decarbonization — GLOGIFT 2027, IIM Sambalpur.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the saved (or system) theme before first paint to avoid a
            flash of the wrong theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
