import Link from "next/link";

/**
 * The portal header brand — links to the user's dashboard home. (It does NOT
 * sign out; the "migrate to public home → sign out" rule applies only to the
 * explicit "Glogift2027.in" sidebar link and to navigating to "/" directly.)
 */
export function BrandHomeLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 shrink-0"
      title="Go to your dashboard home"
    >
      <img
        src="/glogift-logo.png"
        alt="GLOGIFT"
        className="h-9 w-auto object-contain"
      />
      <span className="text-lg font-bold tracking-tight text-gradient w-fit">
        GLOGIFT 27
      </span>
    </Link>
  );
}
