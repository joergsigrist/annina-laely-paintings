import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const content = JSON.parse(fs.readFileSync("src/data/content.json", "utf8"));
test("all migrated assets exist and multilingual titles are complete", () => {
  assert.equal(content.length, 154);
  assert.equal(new Set(content.map((x) => x.id)).size, 154);
  assert.equal(new Set(content.map((x) => x.slug)).size, 154);
  for (const item of content) {
    for (const lang of ["de", "en", "fr"])
      assert.ok(item.title[lang]?.trim(), item.slug + " " + lang);
    assert.ok(fs.statSync("public" + item.image).size > 1000, item.image);
    if (item.kind === "show") assert.ok(item.start_date <= item.end_date);
  }
});
