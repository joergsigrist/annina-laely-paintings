import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
let db;
const admin = "11111111-1111-4111-a111-111111111111";
const visitor = "22222222-2222-4222-a222-222222222222";
before(async () => {
  db = new PGlite();
  await db.exec(`
create role anon; create role authenticated;
create schema auth; create schema storage;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
grant usage on schema public,auth,storage to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
grant select,insert,update,delete on storage.objects to authenticated;
`);
  await db.exec(
    fs.readFileSync("supabase/migrations/202609210001_gallery.sql", "utf8"),
  );
  await db.exec(fs.readFileSync("supabase/seed.sql", "utf8"));
  await db.exec(
    `insert into auth.users values('${admin}'),('${visitor}');insert into public.administrators values('${admin}');insert into public.content(kind,slug,published,data) values('painting','private-test',false,'{"title":{"de":"Entwurf","en":"Draft","fr":"Brouillon"},"image":"/private.jpg"}');`,
  );
});
after(async () => {
  await db.close();
});
async function role(name, id = "") {
  await db.exec(
    `reset role;set request.jwt.claim.sub='${id}';set role ${name};`,
  );
}
test("anonymous sees 154 published records, never drafts, and cannot write", async () => {
  await role("anon");
  assert.equal(
    (await db.query("select count(*)::int as n from public.content")).rows[0].n,
    154,
  );
  assert.equal(
    (await db.query("select * from public.content where slug='private-test'"))
      .rows.length,
    0,
  );
  await assert.rejects(db.exec("delete from public.content"));
  await assert.rejects(
    db.exec(
      "insert into public.administrators values('33333333-3333-4333-a333-333333333333')",
    ),
  );
  await assert.rejects(db.exec("select * from public.contact_messages"));
});
test("signed-in non-admin cannot gain rights or upload, modify or read messages", async () => {
  await role("authenticated", visitor);
  assert.equal(
    (await db.query("select public.is_admin() as ok")).rows[0].ok,
    false,
  );
  assert.equal(
    (await db.query("select * from public.administrators")).rows.length,
    0,
  );
  await assert.rejects(
    db.exec(`insert into public.administrators values('${visitor}')`),
  );
  await assert.rejects(
    db.exec(
      `insert into storage.objects(bucket_id,name) values('artworks','attack.jpg')`,
    ),
  );
  assert.equal(
    (await db.query("update public.content set published=false returning id"))
      .rows.length,
    0,
  );
  assert.equal(
    (await db.query("select * from public.contact_messages")).rows.length,
    0,
  );
});
test("contact RPC validates, stores, rate-limits and conceals submissions", async () => {
  await role("anon");
  const submit = (email = "visitor@example.test", website = "") =>
    db.query("select public.submit_contact($1,$2,$3,$4,$5,$6)", [
      "Visitor",
      email,
      "Artwork enquiry",
      "A meaningful test enquiry",
      "fr",
      website,
    ]);
  await assert.rejects(submit("invalid"));
  await submit();
  await submit();
  await submit();
  await assert.rejects(submit());
  await submit("bot@example.test", "spam");
  await role("authenticated", visitor);
  assert.equal(
    (await db.query("select * from public.contact_messages")).rows.length,
    0,
  );
  await role("authenticated", admin);
  assert.equal(
    (await db.query("select count(*)::int as n from public.contact_messages"))
      .rows[0].n,
    3,
  );
  await db.exec("update public.contact_messages set is_read=true");
  await assert.rejects(
    db.exec("update public.contact_messages set email='changed@example.test'"),
  );
});
test("explicit administrator can manage drafts and upload images", async () => {
  await role("authenticated", admin);
  assert.equal(
    (await db.query("select public.is_admin() as ok")).rows[0].ok,
    true,
  );
  assert.equal(
    (await db.query("select * from public.content where slug='private-test'"))
      .rows.length,
    1,
  );
  await db.exec(
    "insert into storage.objects(bucket_id,name) values('artworks','allowed.jpg')",
  );
  await db.exec(
    "update public.content set published=true where slug='private-test'",
  );
  await db.exec("delete from public.content where slug='private-test'");
  await db.exec("delete from storage.objects where name='allowed.jpg'");
});
