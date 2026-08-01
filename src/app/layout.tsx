import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://glogift2027.in"),
  title: "GLOGIFT2027 - IIM SAMBALPUR",
  description:
    "International Conference on AI-Driven Solutions in Management: Flexibility, Digitalisation and Decarbonization — GLOGIFT 2027, IIM Sambalpur.",
  openGraph: {
    title: "GLOGIFT2027 - IIM SAMBALPUR",
    description:
      "International Conference on AI-Driven Solutions in Management: Flexibility, Digitalisation and Decarbonization — GLOGIFT 2027, IIM Sambalpur.",
    url: "https://glogift2027.in",
    siteName: "GLOGIFT2027 - IIM SAMBALPUR",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The proxy mints a nonce per request; this inline script has to carry it
  // or the Content Security Policy will refuse to run it.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Light is the default; dark applies only when the user has chosen
            it (saved as theme=dark). Applied before first paint to avoid a
            flash of the wrong theme. */}
        {/* The browser blanks a nonce attribute once it has parsed the tag, so
            React sees "" on the client and reports a mismatch that is not one. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
