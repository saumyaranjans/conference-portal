import Link from "next/link";

import { BackToTop } from "@/components/landing/BackToTop";
import { IkatStrip } from "@/components/landing/IkatStrip";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * A web reading of the Sambalpur travelogue that the conference sends to
 * delegates. The same content is offered as the original PDF; this page exists
 * so nobody has to download 2 MB to find out how to reach the campus.
 */

export const PDF = "/travelogue/sambalpur-travelogue-glogift-2027.pdf";

const PLACES: { name: string; image: string; alt: string; body: string[] }[] = [
  {
    name: "Samaleswari Temple",
    image: "/travelogue/samaleswari-temple.jpg",
    alt: "The tapering tower of Samaleswari Temple",
    body: [
      "Built in the 16th century by King Balaram Dev, the first Chouhan ruler, the temple stands as a testament to the region's long devotion to the Goddess Samaleswari. Its significance runs older still: the Odia Mahabharata reveres it as a Shaktipitha.",
      "The architecture blends Chouhan style with hints of Khajuraho, crowned by a majestic tapering tower. Festivals such as Dhabalabesa, Nuakhai and Pua Juntia bring the community together through the year, and a Light & Sound Show runs at the complex every evening.",
    ],
  },
  {
    name: "Budharaja Hill & the Wild Animal Conservation Centre",
    image: "/travelogue/art-gallery.jpg",
    alt: "A busy Sambalpur street lined with shops",
    body: [
      "A winding road climbs Budharaja Hill to the 18th-century Budharaja Temple, where a national flag flies visible from every corner of the town. A watchtower is under construction, promising further vantage points over the city.",
      "Nearby, on Brooks Hill beside Motijharan, the Wild Animal Conservation Centre preserves the habitat of Sambalpur's indigenous flora and fauna. It is open every day except Monday.",
    ],
  },
  {
    name: "Regional Art Gallery & Sambalpur Market",
    image: "/travelogue/shopping.jpg",
    alt: "Handloom shops along a Sambalpur market street",
    body: [
      "Established by the Odisha Lalit Kala Academy and set in Gouri Shankar Sahani Park off M.G. Marg, the Regional Art Gallery collects local art, with Sambalpuri textiles at its heart.",
      "Step outside into Sambalpur Market, where government and private shops overflow with Sambalpuri Ikat — sarees in dazzling colours and intricately woven homeware.",
    ],
  },
  {
    name: "Hirakud Dam",
    image: "/travelogue/hirakud-dam.jpg",
    alt: "Water released through the gates of Hirakud Dam",
    body: [
      "The longest earthen dam in the world and the largest artificial water body in Asia, holding back over 746 sq km of the Mahanadi. Its water irrigates the fields around Sambalpur and its power stations light the region's homes and industries.",
      "Sixteen kilometres from the city, the dam offers more than its scale: drive the left or right dyke, climb Gandhi Minar or Jawahar Minar for views over the reservoir, rest in Jawahar Udyan, ride the ropeway between the gardens and Gandhi Minar, or take a boat out near Zero Point.",
    ],
  },
  {
    name: "Debrigarh Wildlife Sanctuary",
    image: "/travelogue/debrigarh.jpg",
    alt: "The welcome sign at Debrigarh Wildlife Sanctuary",
    body: [
      "The right dyke of the dam leads to the entry point of the Debrigarh Wildlife Sanctuary in Bargarh district.",
      "Four kilometres away in Burla, the APJ Abdul Kalam Planetarium & Science Park offers a glimpse into space and scientific marvels.",
    ],
  },
  {
    name: "Huma — the Leaning Temple",
    image: "/travelogue/huma-temple.jpg",
    alt: "The tilted Bimaleswar temple at Huma beside the Mahanadi",
    body: [
      "Twenty-six kilometres from Sambalpur lies the village of Huma and its 17th-century Bimaleswar (Shiva) Temple, known as much for its intriguing tilt — India's Leaning Temple — as for its spiritual standing.",
      "The Mahanadi runs nearby, full of Kuda fish, a local delicacy worth seeking out after a day of exploring.",
    ],
  },
  {
    name: "Ghanteswari & Chipilima",
    image: "/travelogue/ghanteswari.jpg",
    alt: "Bells hung at the Ghanteswari temple",
    body: [
      "Eighteen kilometres downstream, a detour on the Mahanadi reveals Chipilima. Seek blessings at the Ghanteswari Temple, hung with countless bells that chime in the breeze, then see the engineering of the Chipilima Hydroelectric Plant amid the hills.",
      "At Kardola village, two kilometres on, weavers give live demonstrations of traditional 'Tanta' weaving.",
    ],
  },
  {
    name: "Usakothi (Badrama Wildlife Sanctuary)",
    image: "/travelogue/usakothi.jpg",
    alt: "Forested hills of the Badrama sanctuary",
    body: [
      "Thirty-seven kilometres away on NH 53, watchtowers through the sanctuary open onto jungle vistas and roaming animals.",
      "Entry is granted at the village of Badrama, with permission from the Forest Range Officer.",
    ],
  },
  {
    name: "Gudguda Waterfall",
    image: "/travelogue/gudguda.jpg",
    alt: "The cascading Gudguda waterfall",
    body: [
      "A hundred and fifteen kilometres from the city centre, Gudguda cascades through scenery that draws visitors year-round, with litchi orchards blanketing the surrounding country.",
    ],
  },
];

function Heading({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-2xl font-semibold text-gradient mb-4 scroll-mt-8">
      {children}
    </h2>
  );
}

function DownloadButton({ className = "" }: { className?: string }) {
  return (
    <a
      href={PDF}
      download
      className={`btn-attention inline-flex items-center gap-2 rounded-full border-2
                  border-blue-600 bg-white px-6 py-2.5 text-sm font-semibold
                  transition hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-slate-800
                  ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-blue-700 dark:text-blue-300" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3v12m-4-4 4 4 4-4M4 19h16" />
      </svg>
      <span className="text-gradient">Download the travelogue (PDF)</span>
    </a>
  );
}

export function TraveloguePage() {
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

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-10">
        <section className="card card-pad">
          <p className="text-xs font-semibold tracking-wide text-slate-500 mb-1">
            GLOGIFT 2027 &middot; IIM SAMBALPUR
          </p>
          <h1 className="text-3xl font-bold text-gradient mb-3">
            Sambalpur travelogue
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
            Where history whispers on the banks of the Mahanadi. A guide to the
            city hosting the conference &mdash; how to reach it, what to see
            while you are here, and where to find the Sambalpuri Ikat the region
            is known for.
          </p>
        </section>

        <section className="card card-pad">
          <Heading id="odisha">About Odisha</Heading>
          <div className="grid gap-6 md:grid-cols-[1fr_260px] items-start">
            <div className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              <p>
                Odisha is a land where time whispers tales of ancient empires.
                Immerse yourself in the spiritual aura of Puri&rsquo;s Jagannath
                Temple, or marvel at the carvings of the Konark Sun Temple, a
                UNESCO World Heritage Site. Explore the tribal heartland of
                Koraput and Malkangiri, where the Dongria Kondh and Soura
                communities keep their heritage alive through dance and
                Pattachitra painting.
              </p>
              <p>
                Nature lovers can hike the hills of Similipal National Park, a
                haven for tigers and elephants, or cruise Chilika Lake, Asia&rsquo;s
                largest brackish water lagoon. History runs deep at the Kalinga
                War sites in Dhauli and the caves of Udayagiri and Khandagiri in
                Bhubaneswar.
              </p>
              <p>
                For a taste of Odisha, try the fiery Dalma, Chaul Bara from
                Sambalpur and Machha Besar, then sweets like Rasabali, Chenna
                Poda and Chena Jhilli. Shop for Ikat silk in Bargarh, Dhokra
                metalwork, or the appliqué of Pipili.
              </p>
            </div>
            <img
              src="/travelogue/odisha-map.jpg"
              alt="Map of Odisha with its districts"
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700"
            />
          </div>
        </section>

        <section className="card card-pad">
          <Heading id="sambalpur">About Sambalpur</Heading>
          <div className="grid gap-6 md:grid-cols-[260px_1fr] items-start">
            <img
              src="/travelogue/sambalpur.jpg"
              alt="A temple street in Sambalpur"
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700"
            />
            <div className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              <p>
                Where Odisha unfurls westward lies Sambalpur, named — legend
                says — for a queen called Samalai. Amid rolling hills and the
                Mahanadi River, echoes of Samudragupta&rsquo;s conquests and the
                Chauhan dynasty linger, as does the shadow of the British Raj
                and the enduring spirit of the Kandha and Binjhal warriors.
              </p>
              <p>
                The Hirakud Dam stands as a monument to human innovation, while
                the Leaning Temple of Huma speaks of a faith that defies
                explanation. Sanctuaries like Badrama and Debrigarh pulse with
                life, the Gudguda waterfall washes away the cares of the world,
                and Ghanteswari Temple rings with an otherworldly serenity.
              </p>
              <p>
                From Dal-khai to Rangabati, the Sambalpuri dhol has been the
                heartbeat of the state. Chaul Bara and Sarsatia tantalise
                everyone who walks into the city.
              </p>
            </div>
          </div>
        </section>

        <section className="card card-pad">
          <Heading id="getting-here">Getting here</Heading>
          <div className="grid gap-6 md:grid-cols-[1fr_240px] items-start">
            <div className="space-y-4">
              {[
                {
                  mode: "By train",
                  tint: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
                  text: "Sambalpur Junction (SBP) is the main station, with Sambalpur Road (Fatak), Hirakud and Sambalpur City also serving the city. Direct trains run from Mumbai, Delhi, Bangalore, Chennai, Howrah, Ahmedabad, Surat and Jaipur.",
                },
                {
                  mode: "By road",
                  tint: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
                  text: "National Highway 53 connects Sambalpur to the national road network. Driving routes run via NH48 and NH53, with stops possible at Pune, Raipur, Agra, Lucknow, Ranchi and Nagpur.",
                },
                {
                  mode: "By air",
                  tint: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
                  text: "Veer Surendra Sai Airport, Jharsuguda (JRG) is about 80 km from campus, connecting to Bangalore, Kolkata, New Delhi and Mumbai. Swami Vivekananda Airport, Raipur (RPR) is roughly 262 km away and Biju Patnaik International Airport, Bhubaneswar (BBI) around 326 km.",
                },
              ].map((m) => (
                <div key={m.mode}>
                  <span className={`badge ${m.tint}`}>{m.mode}</span>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {m.text}
                  </p>
                </div>
              ))}
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                The campus sits about 5 km from Hirakud Railway Station, 27 km
                from the district headquarters and 55 km from Jharsuguda
                Airport. Taxis and local buses run from the station and bus
                stand. The institute plans to provide bus services from major
                arrival points to the campus during the conference.
              </p>
            </div>
            <img
              src="/travelogue/routes.jpg"
              alt="Routes to reach Sambalpur"
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700"
            />
          </div>
        </section>

        <section>
          <Heading id="places">Places to visit</Heading>
          <div className="space-y-4">
            {PLACES.map((pl, i) => (
              <article key={pl.name} className="card card-pad">
                <div
                  className={`grid gap-6 md:grid-cols-[260px_1fr] items-start ${
                    i % 2 ? "md:[&>img]:order-2" : ""
                  }`}
                >
                  <img
                    src={pl.image}
                    alt={pl.alt}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700"
                  />
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      {pl.name}
                    </h3>
                    <div className="space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      {pl.body.map((para) => (
                        <p key={para.slice(0, 30)}>{para}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="card card-pad">
          <Heading id="shopping">Shopping</Heading>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            Alongside retail names such as MAX Fashions, Pantaloons, Reliance
            Trends and Zudio, Sambalpur has ventures of its own.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              {
                name: "Village Craft",
                detail:
                  "Started in 2005 to support artisans working in art and craft, with a boutique near Ainthapalli.",
                address:
                  "A-33, Pradhanpara Rd, near Jamkani Mandir, Sambalpur, Odisha 768004",
                phone: "097760 30300",
              },
              {
                name: "Sakshi Handloom",
                detail:
                  "Running since 1991 and the world's largest Sambalpuri handloom portal online, with over 600 looms to its name. Small handloom shops also cluster around Gol Bazaar.",
                address:
                  "Main Rd, Sahayog Nagar, Budharaja, Sambalpur, Odisha 768004",
                phone: "082493 54545",
              },
            ].map((s) => (
              <div
                key={s.name}
                className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
              >
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {s.name}
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  {s.detail}
                </p>
                <p className="mt-2 text-xs text-slate-500">{s.address}</p>
                <p className="text-xs text-slate-500">{s.phone}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card card-pad text-center">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            The full travelogue, with the original artwork, is available as a
            PDF.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <DownloadButton />
            <Link href="/#dates" className="btn-secondary">
              Conference timeline
            </Link>
          </div>
        </section>

        <footer className="border-t border-slate-200 dark:border-slate-700 pt-5 pb-6 text-center text-xs text-slate-500">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            GLOGIFT 2027
          </span>
          <span aria-hidden className="mx-2 text-slate-300 dark:text-slate-600">
            |
          </span>
          Indian Institute of Management Sambalpur, Basantpur, Near Gosala,
          Sambalpur, Odisha 768025
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
