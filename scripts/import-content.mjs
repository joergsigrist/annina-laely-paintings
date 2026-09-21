import fs from "node:fs";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import * as cheerio from "cheerio";
const base = "https://www.annina-laely-paintings.com";
const same = (s) => ({ de: s, en: s, fr: s });
const uid = (s) => {
  const h = crypto.createHash("md5").update(s).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20)}`;
};
const get = async (url) => {
  const r = await fetch(url.replace("k%EF%BF%BDrbiszeit", "k%C3%BCrbiszeit"));
  if (!r.ok) throw Error(`${r.status}: ${url}`);
  return r;
};
fs.mkdirSync("src/data", { recursive: true });
fs.mkdirSync("public/artworks", { recursive: true });
const gallery = cheerio.load(
  fs.readFileSync("source-content/artwork.html", "utf8"),
);
const links = [
  ...new Set(
    gallery("main a")
      .map((i, x) => gallery(x).attr("href"))
      .get()
      .filter((x) => x.startsWith(base + "/artwork/")),
  ),
];
// The legacy link for Kürbiszeit returns 404, including with the corrected umlaut.
// Retain its original gallery image below without inventing missing detail data.
const brokenIndex = links.findIndex((x) => x.includes("k%EF%BF%BD"));
if (brokenIndex >= 0)
  fs.writeFileSync(
    "source-content/work-" + brokenIndex + ".html",
    '<main><div data-testid="richTextElement">Kürbiszeit</div><div data-testid="richTextElement">Number</div><div data-testid="richTextElement"></div><img src="' +
      gallery(`a[href="${links[brokenIndex]}"] img`).first().attr("src") +
      '"/></main>',
  );
const translations = {
  Bergsommer: ["Mountain summer", "Été en montagne"],
  Schneesturm: ["Snowstorm", "Tempête de neige"],
  Sommer: ["Summer", "Été"],
  Winter: ["Winter", "Hiver"],
  "Goldener Herbst": ["Golden autumn", "Automne doré"],
  Dschungel: ["Jungle", "Jungle"],
};
async function image(src, name) {
  if (!src) return "";
  const original = src.split("/v1/")[0];
  const ext = original.endsWith(".png") ? "png" : "jpg";
  const path = `/artworks/${name}.${ext}`;
  if (!fs.existsSync("public" + path)) {
    const r = await get(original);
    fs.writeFileSync("public" + path, Buffer.from(await r.arrayBuffer()));
  }
  return path;
}
const paintings = [];
let next = 0;
await Promise.all(
  Array.from({ length: 5 }, async () => {
    while (next < links.length) {
      const index = next++;
      const url = links[index];
      const slug = url.split("/").pop();
      const local = `source-content/work-${index}.html`;
      let html;
      if (fs.existsSync(local)) html = fs.readFileSync(local, "utf8");
      else {
        html = await (await get(url)).text();
        fs.writeFileSync(local, html);
      }
      const $ = cheerio.load(html);
      const values = $("main [data-testid=richTextElement]")
        .map((i, x) => $(x).text().trim())
        .get();
      const value = (key) =>
        values.includes(key) ? values[values.indexOf(key) + 1] || "" : String();
      const name = values[0];
      if (!values.includes("Number")) throw Error("Missing data: " + url);
      const date = value("Date");
      const method = value("Method");
      const title = translations[name]
        ? { de: name, en: translations[name][0], fr: translations[name][1] }
        : same(name);
      const source = $("main img").first().attr("src");
      paintings.push({
        id: uid(url),
        slug,
        kind: "painting",
        title,
        description: same(""),
        image: await image(source, "painting-" + index),
        source_url: url,
        number: value("Number"),
        dimensions: value("Dimension"),
        year: date.slice(-4),
        date,
        medium:
          method === "Acrylic on canvas"
            ? {
                de: "Acryl auf Leinwand",
                en: method,
                fr: "Acrylique sur toile",
              }
            : same(method),
        price: Number(value("Price (CHF)")) || null,
        sold: $("main input[type=checkbox]").is("[checked]"),
        published: true,
        sort_order: index,
      });
      if (index % 20 === 0)
        console.log(`Imported ${index + 1}/${links.length}`);
    }
  }),
);
paintings.sort((a, b) => (Number(b.number) || 0) - (Number(a.number) || 0));
paintings.forEach((x, i) => (x.sort_order = i));
const showsPage = cheerio.load(
  fs.readFileSync("source-content/shows.html", "utf8"),
);
const showTexts = showsPage("main [data-testid=richTextElement]")
  .map((i, x) => showsPage(x).text().trim())
  .get()
  .slice(1);
const showImages = showsPage("main img")
  .map((i, x) => showsPage(x).attr("src"))
  .get();
const showLinks = showsPage("main a")
  .map((i, x) => showsPage(x).attr("href"))
  .get();
const dates = [
  ["2024-10-19", "2025-01-12"],
  ["2024-09-07", "2024-10-04"],
  ["2024-05-24", "2024-06-24"],
  ["2023-11-25", "2023-12-30"],
  ["2023-07-01", "2023-07-21"],
  ["2022-07-08", "2022-10-28"],
  ["2015-10-19", "2015-11-14"],
];
const shows = [];
for (let i = 0; i < 7; i++) {
  const title = showTexts[i * 5].replace(" an Renewal", " and Renewal");
  shows.push({
    id: uid("show-" + i),
    slug: "show-" + i,
    kind: "show",
    title: same(title),
    description: same(""),
    location: showTexts[i * 5 + 4],
    start_date: dates[i][0],
    end_date: dates[i][1],
    image: await image(showImages[i], "show-" + i),
    external_url: showLinks[i] || "",
    published: true,
    sort_order: i,
  });
}
const articlePage = cheerio.load(
  fs.readFileSync("source-content/articles.html", "utf8"),
);
const articleImages = articlePage("main img")
  .map((i, x) => articlePage(x).attr("src"))
  .get();
const articleData = [
  {
    title: {
      de: "Die Verschmelzung von Natur, Emotion und künstlerischer Begabung",
      en: "The Confluence of Nature, Emotion, and Artistry",
      fr: "La rencontre de la nature, de l’émotion et de l’art",
    },
    publisher: "Global Art Magazine",
    date: "2024-02-09",
    links: {
      de: "https://globalartmagazine.com/die-verschmelzung-von-natur-emotion-und-kuenstlerischer-begabung/",
      en: "https://globalartmagazine.com/en/the-fusion-of-nature-emotion-and-artistic-talent/",
    },
  },
  {
    title: {
      de: "Annina Laely — Natur, Emotion und Kunst",
      en: "Annina Laely — nature, emotion and art",
      fr: "Annina Laely — la confluence de la nature, de l’émotion et de l’art",
    },
    publisher: "L’Éventail",
    date: "2023-04-12",
    links: {
      fr: "https://www.eventail.be/art-et-culture/marche-de-lart/annina-laely-la-confluence-de-la-nature-de-lemotion-et-de-lart",
    },
  },
  {
    title: same("Precious No. 7"),
    publisher: "Precious",
    date: "2015-12-01",
    links: {
      de: base + "/_files/ugd/dbd7de_b9bf1996005e478cbf40c807c303b851.pdf",
    },
  },
];
const articles = [];
for (let i = 0; i < 3; i++)
  articles.push({
    ...articleData[i],
    id: uid("article-" + i),
    slug: "article-" + i,
    kind: "article",
    description: same(""),
    image: await image(articleImages[i], "article-" + i),
    published: true,
    sort_order: i,
  });
const aboutPage = cheerio.load(
  fs.readFileSync("source-content/about.html", "utf8"),
);
await image(aboutPage("main img").first().attr("src"), "annina-laely");
fs.writeFileSync(
  "src/data/content.json",
  JSON.stringify([...paintings, ...shows, ...articles], null, 2),
);
console.log(
  `Complete: ${paintings.length} paintings, ${shows.length} shows, ${articles.length} articles.`,
);
