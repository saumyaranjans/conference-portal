import Link from "next/link";

import { BackToTop } from "@/components/landing/BackToTop";
import { SocialLinks } from "@/components/landing/SocialLinks";
import { IkatStrip } from "@/components/landing/IkatStrip";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Directions to the campus for delegates. Kept as its own page rather than a
 * landing-page section because it is the thing people look up on the day they
 * travel, often on a phone, and want to reach in one tap.
 */

const ADDRESS =
  "Indian Institute of Management Sambalpur, Basantpur, Near Gosala, Sambalpur, Odisha 768025";

const MAP_QUERY = encodeURIComponent(
  "Indian Institute of Management Sambalpur, Basantpur, Odisha 768025",
);

const MODES: {
  mode: string;
  tint: string;
  icon: React.ReactNode;
  body: string[];
}[] = [
  {
    mode: "By road",
    tint: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    icon: (
      <>
        <path d="M3 16.5V7a1 1 0 0 1 1-1h9v10.5" />
        <path d="M13 10h4l3.5 3.5v3H18" />
        <circle cx="7.5" cy="17.5" r="1.9" />
        <circle cx="16.5" cy="17.5" r="1.9" />
      </>
    ),
    body: [
      "Sambalpur is well served by road for both commercial and public transport. National Highway 53 / Economic Corridor 1 (EC1) runs through the city and forms part of Asian Highway AH46, the Mumbai–Kolkata corridor.",
      "The city is well connected to Rourkela, Raipur and Bhubaneswar. Driving from further afield, routes run via NH48 and NH53 with convenient stops at Pune, Raipur, Nagpur, Ranchi, Lucknow and Agra.",
    ],
  },
  {
    mode: "By train",
    tint: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
    icon: (
      <>
        <rect x="5" y="3.5" width="14" height="13" rx="3" />
        <path d="M5 11h14M8.5 20l-2 2M15.5 20l2 2" />
        <path d="M8.5 14h.01M15.5 14h.01" />
      </>
    ),
    body: [
      "Hirakud Railway Station is the nearest, about 5 km from the campus. Sambalpur is also served by Sambalpur Junction (SBP), Sambalpur Road (Fatak) and Sambalpur City.",
      "Direct trains run from Mumbai, Delhi, Bengaluru, Chennai, Howrah, Ahmedabad, Surat and Jaipur.",
    ],
  },
  {
    mode: "By air",
    tint: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    icon: (
      <>
        <path d="M10.5 20.5 12 15l7.5-2.2a2 2 0 0 0 0-3.8L4 4l2.5 6L12 11" />
        <path d="m8 21 2.5-1.5" />
      </>
    ),
    body: [
      "Veer Surendra Sai Airport, Jharsuguda (JRG) is the closest, roughly 55 km from the campus, with regular connections to Bengaluru, Kolkata, New Delhi and Mumbai.",
      "Swami Vivekananda Airport, Raipur (RPR) is about 262 km away and Biju Patnaik International Airport, Bhubaneswar (BBI) about 326 km. From either, continue by train or road.",
    ],
  },
];

const DISTANCES = [
  ["Hirakud Railway Station", "5 km"],
  ["Sambalpur district headquarters", "27 km"],
  ["Jharsuguda Airport (JRG)", "55 km"],
];

function Heading({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-2xl font-semibold text-gradient mb-4 scroll-mt-8">
      {children}
    </h2>
  );
}

export function HowToReachPage() {
  return (
    <main className="min-h-screen">
      <IkatStrip />

      <nav className="max-w-5xl mx-auto px-4 pt-3 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm
                     font-medium text-slate-700 transition hover:bg-white hover:text-blue-700
                     dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 11l9-8 9 8M6 10v10h12V10" />
          </svg>
          Home
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="btn-secondary px-4 py-1.5 text-sm">
            Login
          </Link>
          <Link href="/signup" className="btn-primary px-4 py-1.5 text-sm">
            Sign up
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-8">
        <section className="card card-pad">
          <p className="text-xs font-semibold tracking-wide text-slate-500 mb-1">
            GLOGIFT 27 &middot; 25&ndash;27 FEBRUARY 2027
          </p>
          <h1 className="text-3xl font-bold text-gradient mb-3">How to reach</h1>
          <p className="text-sm leading-relaxed text-slate-700 max-w-3xl dark:text-slate-300">
            IIM Sambalpur extends a warm welcome to you for GLOGIFT 27. The
            campus is at Basantpur, near Gosala, Sambalpur, Odisha. Directions
            by road, rail and air are below, along with a map.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {MODES.map((m) => (
            <article key={m.mode} className="card card-pad">
              <span
                className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${m.tint}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {m.icon}
                </svg>
              </span>
              <h2 className="text-base font-semibold text-slate-900 mb-2 dark:text-slate-100">
                {m.mode}
              </h2>
              <div className="space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {m.body.map((p) => (
                  <p key={p.slice(0, 24)}>{p}</p>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="card card-pad">
          <Heading id="campus">Getting to the campus</Heading>
          <div className="grid gap-6 md:grid-cols-[1fr_1fr] items-start">
            <div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {DISTANCES.map(([place, km]) => (
                  <li
                    key={place}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="text-slate-700 dark:text-slate-300">
                      {place}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {km}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                Taxis and local buses run to the campus from the railway
                stations and the bus stand. The institute plans to run shuttle
                buses from the main arrival points during the conference.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-xs font-semibold tracking-wide text-slate-500 mb-2">
                CAMPUS ADDRESS
              </p>
              <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                Indian Institute of Management Sambalpur
                <br />
                Basantpur, Near Gosala
                <br />
                Sambalpur, Odisha 768025
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${MAP_QUERY}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary mt-4 px-4 py-2 text-sm"
              >
                Open in Google Maps
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
                </svg>
              </a>
            </div>
          </div>
        </section>

        <section className="card overflow-hidden">
          <iframe
            title={`Map of ${ADDRESS}`}
            src={`https://www.google.com/maps?q=${MAP_QUERY}&z=15&output=embed`}
            className="block h-[420px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </section>

        <section className="card card-pad text-center">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Planning what to see while you are here?
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/travelogue" className="btn-primary">
              Sambalpur travelogue
            </Link>
            <Link href="/#dates" className="btn-secondary">
              Conference timeline
            </Link>
          </div>
        </section>

        <footer className="border-t border-slate-200 pt-5 pb-6 text-center text-xs text-slate-500 dark:border-slate-700">
          <SocialLinks className="mb-4" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            GLOGIFT 27
          </span>
          <span aria-hidden className="mx-2 text-slate-300 dark:text-slate-600">
            |
          </span>
          {ADDRESS}
          <span aria-hidden className="mx-2 text-slate-300 dark:text-slate-600">
            |
          </span>
          © Indian Institute of Management Sambalpur
        </footer>
      </div>

      <IkatStrip flip />
      <BackToTop />
    </main>
  );
}
