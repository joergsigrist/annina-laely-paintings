import fs from "node:fs";
const path = "src/data/content.json";
const data = JSON.parse(fs.readFileSync(path, "utf8"));
const museum = data.find((x) => x.slug === "show-5");
const chur = data.find((x) => x.slug === "show-6");
if (museum.external_url?.includes("facebook.com")) {
  chur.external_url = museum.external_url;
  museum.external_url = "";
}
const pumpkin = data.find((x) => x.source_url?.includes("k%EF%BF%BD"));
if (pumpkin) pumpkin.slug = "kuerbiszeit";
for (const x of data.filter((x) => x.kind === "painting")) {
  const index = x.image.match(/painting-(\d+)/)?.[1];
  const path = `source-content/work-${index}.html`;
  if (fs.existsSync(path)) {
    const s = fs.readFileSync(path, "utf8");
    const found = s.match(/"comp-m308jdiu":\{[^}]*"checked":(true|false)/);
    if (found) x.sold = found[1] === "true";
  }
  for (const l of ["de", "en", "fr"])
    if (x.medium) x.medium[l] = x.medium[l].replace(/\u200b/g, "").trim();
}
fs.writeFileSync("src/data/content.json", JSON.stringify(data, null, 2));
console.log(
  "Content corrections applied. Sold:",
  data.filter((x) => x.sold).length,
);
