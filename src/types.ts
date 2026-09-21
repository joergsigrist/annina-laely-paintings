export type Lang = "de" | "en" | "fr";
export type Localized = Record<Lang, string>;
export type Content = {
  id: string;
  slug: string;
  kind: "painting" | "show" | "article";
  title: Localized;
  description: Localized;
  image: string;
  published: boolean;
  sort_order: number;
  number?: string;
  dimensions?: string;
  year?: string;
  date?: string;
  medium?: Localized;
  price?: number | null;
  sold?: boolean;
  location?: string;
  start_date?: string;
  end_date?: string;
  external_url?: string;
  publisher?: string;
  links?: Partial<Localized>;
  source_url?: string;
};
export const languages: Lang[] = ["de", "en", "fr"];
export const localized = (value: Localized | undefined, lang: Lang) =>
  value?.[lang] || value?.de || value?.en || value?.fr || "";
