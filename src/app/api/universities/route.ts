import { NextResponse } from "next/server";
import universities from "@/data/universities.json";

type U = { n: string; c: string };
const DATA = universities as U[];

/** Typeahead for the Institution field — prefix matches first, then substring. */
export function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "")
    .trim()
    .toLowerCase();
  if (q.length < 2) return NextResponse.json([]);

  const starts: string[] = [];
  const contains: string[] = [];

  for (const u of DATA) {
    const name = u.n.toLowerCase();
    const label = u.c ? `${u.n}, ${u.c}` : u.n;
    if (name.startsWith(q)) {
      if (starts.length < 8) starts.push(label);
    } else if (name.includes(q)) {
      if (contains.length < 8) contains.push(label);
    }
    if (starts.length >= 8 && contains.length >= 8) break;
  }

  return NextResponse.json([...starts, ...contains].slice(0, 10));
}
