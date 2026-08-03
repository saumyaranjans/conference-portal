import { LandingPage } from "@/components/landing/LandingPage";

/**
 * The root URL (www.glogift2027.in) is ALWAYS the public conference landing
 * page — never the submission portal, even when a portal session is open. The
 * portal is reached only by going through Login (a signed-in visitor who opens
 * /login is forwarded to their dashboard by the proxy; see src/proxy.ts).
 */
export default function Home() {
  return <LandingPage />;
}
