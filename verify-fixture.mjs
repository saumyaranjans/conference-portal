// Temporary fixture for the chair invite → accept → assign chain.
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const PASSWORD = "Verify-2027-Fixture!";
const PEOPLE = [
  { email: "verify.convener@example.test", name: "Verify Convener", roles: ["chief"] },
  { email: "verify.chair@example.test", name: "Verify Chair", roles: ["author"] },
];
const mode = process.argv[2];

async function users() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return data.users;
}

if (mode === "up") {
  const existing = await users();
  const ids = {};
  for (const p of PEOPLE) {
    let u = existing.find((x) => x.email === p.email);
    if (!u) {
      const { data, error } = await admin.auth.admin.createUser({
        email: p.email,
        password: PASSWORD,
        email_confirm: true,
      });
      if (error) throw error;
      u = data.user;
    }
    await admin
      .from("profiles")
      .update({ roles: p.roles, full_name: p.name, affiliation: "Verify Institute" })
      .eq("id", u.id);
    ids[p.email] = u.id;
  }
  const { data: tracks } = await admin.from("tracks").select("id, name").order("name");
  console.log(JSON.stringify({ ids, tracks }, null, 1));
} else if (mode === "state") {
  const { data } = await admin
    .from("track_editors")
    .select("track_id, status, token, profiles(full_name), tracks(name)");
  console.log(JSON.stringify(data, null, 1));
} else if (mode === "down") {
  const all = await users();
  for (const p of PEOPLE) {
    const u = all.find((x) => x.email === p.email);
    if (u) {
      await admin.auth.admin.deleteUser(u.id);
      console.log("deleted", p.email);
    }
  }
  await admin
    .from("submissions")
    .update({ assigned_editor_id: null, assigned_editor_at: null })
    .not("assigned_editor_id", "is", null);
  console.log("cleared per-paper overrides");
} else {
  console.log("usage: node verify-fixture.mjs up|state|down");
}
