import fs from "node:fs";
const content = JSON.parse(fs.readFileSync("src/data/content.json", "utf8"));
const quote = (s) => "'" + String(s).replaceAll("'", "''") + "'";
const rows = content.map(
  ({ id, kind, slug, published, sort_order, ...data }) =>
    `(${quote(id)},${quote(kind)},${quote(slug)},${published},${sort_order},${quote(JSON.stringify(data))}::jsonb)`,
);
fs.writeFileSync(
  "supabase/seed.sql",
  "-- Idempotent initial import. Does not overwrite subsequent admin edits.\ninsert into public.content(id,kind,slug,published,sort_order,data) values\n" +
    rows.join(",\n") +
    "\non conflict(id) do nothing;\n",
);
console.log(`Seed prepared: ${content.length} records.`);
