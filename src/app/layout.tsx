import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conference Submission Portal",
  description:
    "Submit, review, and decide on conference papers — authors, reviewers, editors and administrators in one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
