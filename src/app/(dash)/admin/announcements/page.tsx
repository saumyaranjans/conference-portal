import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Section } from "@/components/ui/Primitives";
import { AnnouncementComposer } from "@/components/AnnouncementComposer";
import type { Profile, Track } from "@/lib/types";

export default async function AnnouncementsPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const [{ data: profiles }, { data: subs }, { data: tracks }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, roles").eq("is_active", true),
    supabase.from("submissions").select("author_id, track_id").neq("status", "draft"),
    supabase.from("tracks").select("id, name").order("name"),
  ]);

  const people = ((profiles ?? []) as any[]).map((p) => ({
    id: p.id,
    full_name: p.full_name ?? "",
    email: p.email ?? "",
    roles: (p.roles ?? []) as string[],
  }));

  const authorIds = [
    ...new Set(((subs ?? []) as any[]).map((s) => s.author_id)),
  ] as string[];

  const authorsByTrack: Record<string, string[]> = {};
  for (const s of (subs ?? []) as any[]) {
    const list = authorsByTrack[s.track_id] ?? [];
    if (!list.includes(s.author_id)) list.push(s.author_id);
    authorsByTrack[s.track_id] = list;
  }

  return (
    <>
      <PageHeader
        title="Announcements"
        subtitle="Post an in-app notice to participants, or compose a bulk email to send from your own account."
      />
      <Section title="Compose announcement">
        <AnnouncementComposer
          people={people as Profile[] as any}
          tracks={((tracks ?? []) as Track[]).map((t) => ({ id: t.id, name: t.name }))}
          authorIds={authorIds}
          authorsByTrack={authorsByTrack}
        />
      </Section>
    </>
  );
}
