import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSite } from "./App";
import { languages, localized } from "./types";

const origin = "https://www.annina-laely-paintings.com";

const pageCopy = {
  de: {
    homeTitle: "Annina Laely | Schweizer Künstlerin und Malerei",
    homeDescription:
      "Offizielle Website der Schweizer Künstlerin Annina Laely. Entdecken Sie ihre Malerei, Galerie, Ausstellungen und Presseartikel.",
    galleryTitle: "Galerie und Werke | Annina Laely",
    galleryDescription:
      "Die Galerie der Schweizer Künstlerin Annina Laely: abstrakte Malerei, Farbe und Licht, mit Werkangaben und grossformatigen Ansichten.",
    showsDescription:
      "Ausstellungen und internationale Präsentationen der Schweizer Künstlerin Annina Laely.",
    articlesDescription:
      "Presseartikel, Porträts und Publikationen über die Künstlerin Annina Laely und ihre Malerei.",
    aboutDescription:
      "Über Annina Laely: Schweizer Künstlerin, ihre Biografie und ihre Faszination für Farbe, Licht und Malerei.",
    contactDescription:
      "Kontakt zu Annina Laely für Anfragen zu Werken, Ausstellungen und ihrer künstlerischen Arbeit.",
  },
  en: {
    homeTitle: "Annina Laely | Swiss Artist and Paintings",
    homeDescription:
      "Official website of Swiss artist Annina Laely. Discover her paintings, gallery, exhibitions and press articles.",
    galleryTitle: "Gallery and Artworks | Annina Laely",
    galleryDescription:
      "Explore paintings by Swiss artist Annina Laely, with artwork details and large-format views shaped by colour and light.",
    showsDescription:
      "Exhibitions and international presentations by Swiss artist Annina Laely.",
    articlesDescription:
      "Press articles, profiles and publications about artist Annina Laely and her paintings.",
    aboutDescription:
      "About Swiss artist Annina Laely, her biography and her fascination with colour, light and painting.",
    contactDescription:
      "Contact Annina Laely about artworks, exhibitions and her artistic practice.",
  },
  fr: {
    homeTitle: "Annina Laely | Artiste suisse et peintures",
    homeDescription:
      "Site officiel de l’artiste suisse Annina Laely. Découvrez ses peintures, sa galerie, ses expositions et les articles de presse.",
    galleryTitle: "Galerie et œuvres | Annina Laely",
    galleryDescription:
      "Découvrez les peintures de l’artiste suisse Annina Laely, avec les détails des œuvres et des vues grand format autour de la couleur et de la lumière.",
    showsDescription:
      "Expositions et présentations internationales de l’artiste suisse Annina Laely.",
    articlesDescription:
      "Articles de presse, portraits et publications sur l’artiste Annina Laely et ses peintures.",
    aboutDescription:
      "À propos de l’artiste suisse Annina Laely, sa biographie et sa fascination pour la couleur, la lumière et la peinture.",
    contactDescription:
      "Contacter Annina Laely au sujet de ses œuvres, de ses expositions et de sa pratique artistique.",
  },
};

function setMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
}

export default function Seo() {
  const { lang, data, t } = useSite();
  const location = useLocation();

  useEffect(() => {
    const relativePath = location.pathname.slice(3) || "";
    const copy = pageCopy[lang];
    const artworkSlug = relativePath.match(/^\/artwork\/([^/]+)$/)?.[1];
    const artwork = artworkSlug
      ? data.find(
          (item) => item.kind === "painting" && item.slug === artworkSlug,
        )
      : undefined;

    let title = copy.homeTitle;
    let description = copy.homeDescription;
    if (relativePath === "/gallery") {
      title = copy.galleryTitle;
      description = copy.galleryDescription;
    } else if (relativePath === "/shows") {
      title = `${t.shows} | Annina Laely`;
      description = copy.showsDescription;
    } else if (relativePath === "/articles") {
      title = `${t.articles} | Annina Laely`;
      description = copy.articlesDescription;
    } else if (relativePath === "/about") {
      title = `${t.about} | Annina Laely`;
      description = copy.aboutDescription;
    } else if (relativePath === "/contact") {
      title = `${t.contact} | Annina Laely`;
      description = copy.contactDescription;
    } else if (artwork) {
      const artworkTitle = localized(artwork.title, lang);
      title = `${artworkTitle} | Annina Laely`;
      description = [
        `${artworkTitle} — ${lang === "de" ? "Werk von" : lang === "fr" ? "œuvre de" : "artwork by"} Annina Laely.`,
        localized(artwork.medium, lang),
        artwork.dimensions,
        artwork.year,
      ]
        .filter(Boolean)
        .join(" ");
    } else if (relativePath === "/admin") {
      title = `${t.admin} | Annina Laely`;
      description = "";
    }

    const canonical = `${origin}/${lang}${relativePath}`;
    const noIndex =
      relativePath === "/admin" ||
      (!artwork && relativePath.startsWith("/artwork/"));

    document.title = title;
    setMeta('meta[name="description"]', {
      name: "description",
      content: description,
    });
    setMeta('meta[name="robots"]', {
      name: "robots",
      content: noIndex
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large",
    });
    setMeta('meta[property="og:title"]', {
      property: "og:title",
      content: title,
    });
    setMeta('meta[property="og:description"]', {
      property: "og:description",
      content: description,
    });
    setMeta('meta[property="og:url"]', {
      property: "og:url",
      content: canonical,
    });
    setMeta('meta[property="og:type"]', {
      property: "og:type",
      content: artwork ? "article" : "website",
    });
    setMeta('meta[property="og:site_name"]', {
      property: "og:site_name",
      content: "Annina Laely Paintings",
    });
    setMeta('meta[name="twitter:card"]', {
      name: "twitter:card",
      content: "summary_large_image",
    });
    setMeta('meta[name="twitter:title"]', {
      name: "twitter:title",
      content: title,
    });
    setMeta('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: description,
    });

    let canonicalLink = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonical;

    document.head
      .querySelectorAll('link[rel="alternate"]')
      .forEach((node) => node.remove());
    for (const alternateLang of [...languages, "x-default"] as const) {
      const alternate = document.createElement("link");
      alternate.rel = "alternate";
      alternate.hreflang = alternateLang;
      alternate.href = `${origin}/${alternateLang === "x-default" ? "de" : alternateLang}${relativePath}`;
      document.head.appendChild(alternate);
    }

    const structuredData: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": `${origin}/#website`,
          url: origin,
          name: "Annina Laely Paintings",
          inLanguage: ["de", "en", "fr"],
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
      ],
    };
    if (artwork) {
      (structuredData["@graph"] as Record<string, unknown>[]).push({
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
    let jsonLd =
      document.head.querySelector<HTMLScriptElement>("#structured-data");
    if (!jsonLd) {
      jsonLd = document.createElement("script");
      jsonLd.id = "structured-data";
      jsonLd.type = "application/ld+json";
      document.head.appendChild(jsonLd);
    }
    jsonLd.textContent = JSON.stringify(structuredData);
  }, [data, lang, location.pathname, t]);

  return null;
}
