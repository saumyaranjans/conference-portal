import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  deletePublicationOpportunity,
  upsertPublicationOpportunity,
} from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { PageHeader, Section } from "@/components/ui/Primitives";
import type { PublicationOpportunity } from "@/lib/types";

export default async function AdminPublicationsPage() {
  await requireRole("admin", "chief");
  const supabase = await createClient();

  const { data } = await supabase
    .from("publication_opportunities")
    .select("*")
    .order("sort_order");

  const items = (data ?? []) as PublicationOpportunity[];

  return (
    <>
      <PageHeader
        title="Publication Opportunities"
        subtitle="Journals and special issues shown to authors, reviewers and track editors."
      />

      <Section title="Add an opportunity">
        <ActionForm
          action={upsertPublicationOpportunity}
          className="card card-pad space-y-3"
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input name="title" required placeholder="Journal name" className="input" />
            <input
              name="category"
              placeholder="Category (e.g. Springer / ABDC-A)"
              className="input"
            />
            <input name="url" placeholder="Link (https://…)" className="input" />
            <input
              name="image_url"
              placeholder="Cover image (/journals/x.jpg)"
              className="input"
            />
            <input
              name="sort_order"
              type="number"
              defaultValue={items.length + 1}
              placeholder="Order"
              className="input"
            />
          </div>
          <textarea
            name="description"
            rows={2}
            placeholder="Short description shown under the title"
            className="input"
          />
          <SubmitButton>Add</SubmitButton>
        </ActionForm>
      </Section>

      <Section title={`Current opportunities (${items.length})`}>
        {items.length === 0 ? (
          <div className="card card-pad">
            <p className="text-sm text-slate-500">
              Nothing added yet. Entries appear in the sidebar for authors,
              reviewers and track editors.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((o) => (
              <ActionForm
                key={o.id}
                action={upsertPublicationOpportunity}
                className="card card-pad space-y-3"
              >
                <input type="hidden" name="id" value={o.id} />
                <div className="flex items-start gap-4">
                  {o.image_url && (
                    <img
                      src={o.image_url}
                      alt={o.title}
                      className="w-16 rounded border border-slate-200 bg-white shrink-0"
                    />
                  )}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1">
                    <input name="title" defaultValue={o.title} className="input" />
                    <input
                      name="category"
                      defaultValue={o.category}
                      placeholder="Category"
                      className="input"
                    />
                    <input name="url" defaultValue={o.url} className="input" />
                    <input
                      name="image_url"
                      defaultValue={o.image_url}
                      placeholder="Cover image path"
                      className="input"
                    />
                    <input
                      name="sort_order"
                      type="number"
                      defaultValue={o.sort_order}
                      className="input"
                    />
                  </div>
                </div>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={o.description}
                  className="input"
                />
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="label">Visibility</label>
                    <select
                      name="is_active"
                      defaultValue={String(o.is_active)}
                      className="input"
                    >
                      <option value="true">Shown</option>
                      <option value="false">Hidden</option>
                    </select>
                  </div>
                  <SubmitButton variant="secondary">Save</SubmitButton>
                </div>
              </ActionForm>
            ))}

            <div className="card card-pad">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Remove an entry
              </p>
              <div className="flex flex-wrap gap-2">
                {items.map((o) => (
                  <ActionForm
                    key={o.id}
                    action={deletePublicationOpportunity}
                    confirm={`Remove "${o.title}"?`}
                  >
                    <input type="hidden" name="id" value={o.id} />
                    <SubmitButton
                      variant="secondary"
                      className="text-xs py-1 px-2"
                    >
                      Remove {o.title}
                    </SubmitButton>
                  </ActionForm>
                ))}
              </div>
            </div>
          </div>
        )}
      </Section>
    </>
  );
}
