import fs from "node:fs";
import path from "node:path";

const origin = "https://www.annina-laely-paintings.com";
const languages = ["de", "en", "fr"];
const content = JSON.parse(fs.readFileSync("src/data/content.json", "utf8"));
const template = fs.readFileSync("dist/index.html", "utf8");

const translations = {
  de: {
    homeTitle: "Annina Laely | Schweizer Künstlerin und Malerei",
    homeDescription:
      "Offizielle Website der Schweizer Künstlerin Annina Laely. Entdecken Sie ihre Malerei, Galerie, Ausstellungen und Presseartikel.",
    galleryTitle: "Galerie und Werke | Annina Laely",
    galleryDescription:
      "Die Galerie der Schweizer Künstlerin Annina Laely: abstrakte Malerei, Farbe und Licht, mit Werkangaben und grossformatigen Ansichten.",
    showsTitle: "Ausstellungen | Annina Laely",
    showsDescription:
      "Ausstellungen und internationale Präsentationen der Schweizer Künstlerin Annina Laely.",
    articlesTitle: "Artikel und Presse | Annina Laely",
    articlesDescription:
      "Presseartikel, Porträts und Publikationen über die Künstlerin Annina Laely und ihre Malerei.",
    aboutTitle: "Über Annina Laely | Schweizer Künstlerin",
    aboutDescription:
      "Über Annina Laely: Schweizer Künstlerin, ihre Biografie und ihre Faszination für Farbe, Licht und Malerei.",
    contactTitle: "Kontakt | Annina Laely",
    contactDescription:
      "Kontakt zu Annina Laely für Anfragen zu Werken, Ausstellungen und ihrer künstlerischen Arbeit.",
    artworkBy: "Werk von",
  },
  en: {
    homeTitle: "Annina Laely | Swiss Artist and Paintings",
    homeDescription:
      "Official website of Swiss artist Annina Laely. Discover her paintings, gallery, exhibitions and press articles.",
    galleryTitle: "Gallery and Artworks | Annina Laely",
    galleryDescription:
      "Explore paintings by Swiss artist Annina Laely, with artwork details and large-format views shaped by colour and light.",
    showsTitle: "Exhibitions | Annina Laely",
    showsDescription:
      "Exhibitions and international presentations by Swiss artist Annina Laely.",
    articlesTitle: "Articles and Press | Annina Laely",
    articlesDescription:
      "Press articles, profiles and publications about artist Annina Laely and her paintings.",
    aboutTitle: "About Annina Laely | Swiss Artist",
    aboutDescription:
      "About Swiss artist Annina Laely, her biography and her fascination with colour, light and painting.",
    contactTitle: "Contact | Annina Laely",
    contactDescription:
      "Contact Annina Laely about artworks, exhibitions and her artistic practice.",
    artworkBy: "artwork by",
  },
  fr: {
    homeTitle: "Annina Laely | Artiste suisse et peintures",
    homeDescription:
      "Site officiel de l’artiste suisse Annina Laely. Découvrez ses peintures, sa galerie, ses expositions et les articles de presse.",
    galleryTitle: "Galerie et œuvres | Annina Laely",
    galleryDescription:
      "Découvrez les peintures de l’artiste suisse Annina Laely, avec les détails des œuvres et des vues grand format autour de la couleur et de la lumière.",
    showsTitle: "Expositions | Annina Laely",
    showsDescription:
      "Expositions et présentations internationales de l’artiste suisse Annina Laely.",
    articlesTitle: "Articles et presse | Annina Laely",
    articlesDescription:
      "Articles de presse, portraits et publications sur l’artiste Annina Laely et ses peintures.",
    aboutTitle: "À propos d’Annina Laely | Artiste suisse",
    aboutDescription:
      "À propos de l’artiste suisse Annina Laely, sa biographie et sa fascination pour la couleur, la lumière et la peinture.",
    contactTitle: "Contact | Annina Laely",
    contactDescription:
      "Contacter Annina Laely au sujet de ses œuvres, de ses expositions et de sa pratique artistique.",
    artworkBy: "œuvre de",
  },
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function localized(value, lang) {
  return value?.[lang] || value?.de || value?.en || value?.fr || "";
}

function pageMeta(lang, route, artwork) {
  const copy = translations[lang];
  const staticPages = {
    "": [copy.homeTitle, copy.homeDescription],
    "/gallery": [copy.galleryTitle, copy.galleryDescription],
    "/shows": [copy.showsTitle, copy.showsDescription],
    "/articles": [copy.articlesTitle, copy.articlesDescription],
    "/about": [copy.aboutTitle, copy.aboutDescription],
    "/contact": [copy.contactTitle, copy.contactDescription],
    "/admin": ["Administration | Annina Laely", ""],
  };
  if (!artwork) {
    const [title, description] = staticPages[route];
    return { title, description, noindex: route === "/admin" };
  }
  const artworkTitle = localized(artwork.title, lang);
  return {
    title: `${artworkTitle} | Annina Laely`,
    description: [
      `${artworkTitle} — ${copy.artworkBy} Annina Laely.`,
      localized(artwork.medium, lang),
      artwork.dimensions,
      artwork.year,
    ]
      .filter(Boolean)
      .join(" "),
    noindex: false,
  };
}

function render(lang, route, artwork) {
  const { title, description, noindex } = pageMeta(lang, route, artwork);
  const canonical = `${origin}/${lang}${route}`;
  const alternates = languages
    .map(
      (alternate) =>
        `<link rel="alternate" hreflang="${alternate}" href="${origin}/${alternate}${route}">`,
    )
    .concat(
      `<link rel="alternate" hreflang="x-default" href="${origin}/de${route}">`,
    )
    .join("");
  const graph = [
    {
      "@type": "WebSite",
      "@id": `${origin}/#website`,
      url: origin,
      name: "Annina Laely Paintings",
      inLanguage: languages,
      author: { "@id": `${origin}/#annina-laely` },
    },
    {
      "@type": "Person",
      "@id": `${origin}/#annina-laely`,
      name: "Annina Laely",
      url: origin,
      image: `${origin}/artworks/annina-laely.png`,
      jobTitle: "Artist",
      knowsAbout: ["Painting", "Abstract art", "Acrylic painting"],
    },
  ];
  if (artwork) {
    graph.push({
      "@type": "VisualArtwork",
      name: localized(artwork.title, lang),
      url: canonical,
      image: `${origin}${artwork.image}`,
      creator: { "@id": `${origin}/#annina-laely` },
      artMedium: localized(artwork.medium, lang),
      size: artwork.dimensions,
      dateCreated: artwork.year,
      inLanguage: lang,
    });
  }
  const metadata = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<meta name="robots" content="${noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large"}">`,
    `<link rel="canonical" href="${canonical}">`,
    alternates,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:type" content="${artwork ? "article" : "website"}">`,
    '<meta property="og:site_name" content="Annina Laely Paintings">',
    '<meta name="twitter:card" content="summary">',
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    `<script id="structured-data" type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replaceAll("<", "\\u003c")}</script>`,
  ].join("");

  return template
    .replace(/<html lang="[^"]+">/, `<html lang="${lang}">`)
    .replace(/<title>[\s\S]*?<\/title>/, "")
    .replace(
      /<meta\b(?=[^>]*(?:name|property)="(?:description|robots|og:title|og:description|og:url|og:type|og:site_name|twitter:card|twitter:title|twitter:description)")[^>]*>\s*/g,
      "",
    )
    .replace(/<link\b(?=[^>]*rel="(?:canonical|alternate)")[^>]*>\s*/g, "")
    .replace(/<script id="structured-data"[\s\S]*?<\/script>/, "")
    .replace("</head>", `${metadata}</head>`);
}

function writeRoute(lang, route, artwork) {
  const output = path.join(
    "dist",
    lang,
    ...route.split("/").filter(Boolean),
    "index.html",
  );
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, render(lang, route, artwork));
}

const sitemapUrls = [];
for (const lang of languages) {
  for (const route of [
    "",
    "/gallery",
    "/shows",
    "/articles",
    "/about",
    "/contact",
    "/admin",
  ]) {
    writeRoute(lang, route);
    if (route !== "/admin") sitemapUrls.push(`${origin}/${lang}${route}`);
  }
  for (const artwork of content.filter(
    (item) => item.kind === "painting" && item.published,
  )) {
    const route = `/artwork/${artwork.slug}`;
    writeRoute(lang, route, artwork);
    sitemapUrls.push(`${origin}/${lang}${route}`);
  }
}

fs.writeFileSync(
  "dist/robots.txt",
  `User-agent: *\nAllow: /\nDisallow: /*/admin\nSitemap: ${origin}/sitemap.xml\n`,
);
fs.writeFileSync(
  "dist/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapUrls.map((url) => `<url><loc>${url}</loc></url>`).join("")}</urlset>`,
);

console.log(`Prepared ${sitemapUrls.length} indexable multilingual URLs.`);
