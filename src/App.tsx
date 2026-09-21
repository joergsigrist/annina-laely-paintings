import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  lazy,
  Suspense,
  type FormEvent,
} from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
  Menu,
  Maximize2,
} from "lucide-react";
import { copy } from "./i18n";
import {
  artworkTitle,
  type Content,
  type Lang,
  languages,
  localized,
} from "./types";
import { supabase } from "./lib/supabase";
import Seo from "./Seo";
import seed from "./data/content.json";
const Admin = lazy(() => import("./Admin"));
const Context = createContext<{
  lang: Lang;
  data: Content[];
  refresh: () => Promise<void>;
}>({ lang: "de", data: [], refresh: async () => {} });
export const useSite = () => {
  const ctx = useContext(Context);
  return { ...ctx, t: copy[ctx.lang] };
};
export function safeExternal(url: string | undefined) {
  return url && /^https:\/\//i.test(url) ? url : undefined;
}
function Site() {
  const { lang: raw } = useParams();
  const lang = languages.includes(raw as Lang) ? (raw as Lang) : "de";
  const [data, setData] = useState<Content[]>(
    supabase ? [] : (seed as Content[]),
  );
  const [loading, setLoading] = useState(!!supabase);
  const [error, setError] = useState(false);
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  const t = copy[lang];
  const isHome = location.pathname === `/${lang}`;
  async function refresh() {
    if (!supabase) return;
    setLoading(true);
    setError(false);
    const { data: rows, error } = await supabase
      .from("content")
      .select("*")
      .eq("published", true)
      .order("sort_order");
    if (error) setError(true);
    else
      setData(
        (rows || []).map((r) => ({
          ...r.data,
          id: r.id,
          kind: r.kind,
          slug: r.slug,
          published: r.published,
          sort_order: r.sort_order,
        })),
      );
    setLoading(false);
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    setMenu(false);
    window.scrollTo(0, 0);
  }, [lang, location.pathname]);
  if (!languages.includes(raw as Lang)) return <Navigate to="/de" replace />;
  return (
    <Context.Provider value={{ lang, data, refresh }}>
      <Seo />
      <div className={isHome ? "site home-view" : "site"}>
        <a className="skip-link" href="#main">
          {t.skip}
        </a>
        <header className="site-header">
          <Link to={`/${lang}`} className="brand" aria-label="Annina Laely">
            <span className="monogram">AL</span>
            <span>
              ANNINA LAELY<small>PAINTINGS</small>
            </span>
          </Link>
          <button
            className="menu-toggle icon-button"
            aria-label={t.menu}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
          <nav
            className={menu ? "main-nav open" : "main-nav"}
            aria-label={t.menu}
          >
            {[
              ["gallery", t.gallery],
              ["shows", t.shows],
              ["articles", t.articles],
              ["about", t.about],
              ["contact", t.contact],
            ].map(([path, label]) => (
              <NavLink key={path} end to={`/${lang}${path ? "/" + path : ""}`}>
                {label}
              </NavLink>
            ))}
          </nav>
          <nav className="language-nav" aria-label={t.language}>
            {languages.map((l) => (
              <Link
                key={l}
                lang={l}
                aria-label={{ de: "Deutsch", en: "English", fr: "Français" }[l]}
                aria-current={l === lang ? "page" : undefined}
                to={`/${l}${location.pathname.slice(3)}${location.search}`}
              >
                {l.toUpperCase()}
              </Link>
            ))}
          </nav>
        </header>
        <main id="main">
          {error ? (
            <section className="status">
              <h1>{t.connectionError}</h1>
              <button onClick={refresh}>{t.retry}</button>
            </section>
          ) : loading ? (
            <section className="status" role="status">
              {t.loading}
            </section>
          ) : (
            <Suspense fallback={<div className="status">{t.loading}</div>}>
              <Routes>
                <Route index element={<Home />} />
                <Route path="gallery" element={<Gallery />} />
                <Route path="artwork/:slug" element={<Painting />} />
                <Route path="shows" element={<Editorial kind="show" />} />
                <Route path="articles" element={<Editorial kind="article" />} />
                <Route path="about" element={<About />} />
                <Route path="contact" element={<Contact />} />
                <Route path="admin" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          )}
        </main>
        <footer>
          <Link className="footer-name" to={`/${lang}`}>
            Annina Laely<span>Paintings</span>
          </Link>
          <p>
            © {new Date().getFullYear()} Annina Laely
            <br />
            {t.rights}
          </p>
          <div>
            <Link to={`/${lang}/contact`}>
              {t.contact} <ArrowUpRight size={16} />
            </Link>
            <Link className="muted" to={`/${lang}/admin`}>
              {t.admin}
            </Link>
          </div>
        </footer>
      </div>
    </Context.Provider>
  );
}
function Home() {
  const { lang, t } = useSite();
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-hero-content">
        <p className="home-statement">Let the painting be the star</p>
        <h1 id="home-title">Annina Laely</h1>
        <Link className="home-enter" to={`/${lang}/gallery`}>
          {t.gallery} <ArrowRight size={20} />
        </Link>
      </div>
    </section>
  );
}
function Gallery() {
  const { lang, t, data } = useSite();
  const [count, setCount] = useState(12);
  const paintings = data.filter((x) => x.kind === "painting");
  return (
    <>
      <section className="gallery-intro">
        <div>
          <p className="eyebrow">ANNINA LAELY · PAINTINGS</p>
          <h1>{t.headline}</h1>
        </div>
        <p className="intro-copy">
          {t.intro}
          <span className="hand-line" />
        </p>
      </section>
      <div className="collection-heading">
        <span>{t.selected}</span>
        <span>
          {paintings.length} {t.works}
        </span>
      </div>
      <section className="art-grid" aria-label={t.gallery}>
        {paintings.slice(0, count).map((art, i) => {
          const title = artworkTitle(art.title, lang);
          return (
            <Link
              className={`art-card art-card-${i % 6}`}
              key={art.id}
              to={`/${lang}/artwork/${art.slug}`}
              aria-label={title ? `${t.view}: ${title}` : t.view}
            >
              <div className="art-stage">
                <img
                  src={art.image}
                  alt={title || `${t.number} ${art.number || ""}`.trim()}
                  loading={i < 2 ? "eager" : "lazy"}
                />
                <span className="art-open">
                  <Plus size={24} />
                </span>
              </div>
              <div className="art-caption">
                {title && <h2>{title}</h2>}
                <span>{art.year}</span>
              </div>
              <p>
                {localized(art.medium, lang)}
                {art.dimensions && ` · ${art.dimensions}`}
              </p>
            </Link>
          );
        })}
      </section>
      {count < paintings.length && (
        <div className="load-more">
          <button
            className="outline-button"
            onClick={() => setCount(count + 12)}
          >
            {t.more} <Plus size={18} />
          </button>
          <span>
            {Math.min(count, paintings.length)} / {paintings.length}
          </span>
        </div>
      )}
    </>
  );
}
function Painting() {
  const { lang, t, data } = useSite();
  const { slug } = useParams();
  const paintings = data.filter((x) => x.kind === "painting");
  const index = paintings.findIndex((x) => x.slug === slug);
  const art = paintings[index];
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dialog.current?.open && e.key === "Escape") dialog.current.close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, []);
  if (!art) return <NotFound />;
  const title = artworkTitle(art.title, lang);
  const enquiryReference = title || `${t.number} ${art.number || ""}`.trim();
  return (
    <section className="detail-page">
      <Link className="text-link" to={`/${lang}/gallery`}>
        <ArrowLeft size={17} />
        {t.back}
      </Link>
      <div className="detail-layout">
        <button
          className="detail-image"
          aria-label={t.enlarge}
          onClick={() => {
            dialog.current?.showModal();
            document.body.style.overflow = "hidden";
          }}
        >
          <img src={art.image} alt={title} />
          <Maximize2 size={22} />
        </button>
        <div className="detail-info">
          <p className="eyebrow">
            {t.number} {art.number}
          </p>
          {title && <h1>{title}</h1>}
          <p className="detail-description">
            {localized(art.description, lang)}
          </p>
          <dl>
            {[
              [t.year, art.year],
              [t.medium, localized(art.medium, lang)],
              [t.dimensions, art.dimensions],
            ].map(
              ([k, v]) =>
                v && (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ),
            )}
          </dl>
          <p className="price">
            {art.sold
              ? t.sold
              : art.price
                ? new Intl.NumberFormat(lang + "-CH", {
                    style: "currency",
                    currency: "CHF",
                    maximumFractionDigits: 0,
                  }).format(art.price)
                : t.available}
          </p>
          <Link
            className="dark-button"
            to={`/${lang}/contact?artwork=${encodeURIComponent(enquiryReference)}`}
          >
            {t.inquire}
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
      <nav className="work-navigation" aria-label={t.gallery}>
        {index > 0 ? (
          <Link to={`/${lang}/artwork/${paintings[index - 1].slug}`}>
            <ArrowLeft size={20} />
            <span>
              {t.previous}
              {artworkTitle(paintings[index - 1].title, lang) && (
                <strong>
                  {artworkTitle(paintings[index - 1].title, lang)}
                </strong>
              )}
            </span>
          </Link>
        ) : (
          <span />
        )}
        <span>
          {index + 1} / {paintings.length}
        </span>
        {index < paintings.length - 1 ? (
          <Link to={`/${lang}/artwork/${paintings[index + 1].slug}`}>
            <span>
              {t.next}
              {artworkTitle(paintings[index + 1].title, lang) && (
                <strong>
                  {artworkTitle(paintings[index + 1].title, lang)}
                </strong>
              )}
            </span>
            <ArrowRight size={20} />
          </Link>
        ) : (
          <span />
        )}
      </nav>
      <dialog
        className="lightbox"
        ref={dialog}
        onClose={() => (document.body.style.overflow = "")}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <button
          className="icon-button"
          aria-label={t.close}
          onClick={() => dialog.current?.close()}
        >
          <X />
        </button>
        <img src={art.image} alt={title} />
        {title && <p>{title}</p>}
      </dialog>
    </section>
  );
}
function formatDate(date: string | undefined, lang: Lang) {
  return date
    ? new Intl.DateTimeFormat(lang + "-CH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(date + "T12:00:00"))
    : "";
}
function Editorial({ kind }: { kind: "article" | "show" }) {
  const { lang, t, data } = useSite();
  const items = data.filter((x) => x.kind === kind);
  return (
    <section className="editorial-page">
      <div className="page-heading">
        <p className="eyebrow">ANNINA LAELY</p>
        <h1>{kind === "show" ? t.shows : t.articles}</h1>
        <p>{kind === "show" ? t.showIntro : t.articleIntro}</p>
      </div>
      {!items.length && <p>{t.empty}</p>}
      <div className={kind === "show" ? "show-list" : "article-grid"}>
        {items.map((item) => {
          const articleLink =
            item.links?.[lang] ||
            item.links?.de ||
            item.links?.en ||
            item.links?.fr ||
            item.external_url;
          const href = safeExternal(
            kind === "show" ? item.external_url : articleLink,
          );
          return (
            <article className="editorial-card" key={item.id}>
              {item.image && (
                <img
                  src={item.image}
                  alt={localized(item.title, lang)}
                  loading="lazy"
                />
              )}
              <div>
                <p className="eyebrow">
                  {kind === "show"
                    ? `${formatDate(item.start_date, lang)} — ${formatDate(item.end_date, lang)}`
                    : `${item.publisher} · ${formatDate(item.date, lang)}`}
                </p>
                <h2>{localized(item.title, lang)}</h2>
                {item.location && <p>{item.location}</p>}
                {localized(item.description, lang) && (
                  <p className="preserve-lines">
                    {localized(item.description, lang)}
                  </p>
                )}
                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-link"
                  >
                    {kind === "show" ? t.visit : t.read}
                    <ArrowUpRight size={18} />
                  </a>
                )}
                {kind === "article" && item.links && (
                  <div className="article-languages">
                    {Object.entries(item.links)
                      .filter(([, url]) => safeExternal(url))
                      .map(([l, url]) => (
                        <a key={l} href={url} target="_blank" rel="noreferrer">
                          {l.toUpperCase()}
                        </a>
                      ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {kind === "article" && <p className="muted">{t.languageNote}</p>}
    </section>
  );
}
function About() {
  const { lang, t } = useSite();
  return (
    <section className="about-page">
      <div className="about-photo">
        <img src="/artworks/annina-laely.png" alt="Annina Laely" />
      </div>
      <div>
        <p className="eyebrow">{t.about}</p>
        <h1>{t.aboutTitle}</h1>
        <p className="bio">{t.bio}</p>
        <p className="signature">Annina Laely</p>
        <Link className="text-link" to={`/${lang}/contact`}>
          {t.contact}
          <ArrowUpRight size={20} />
        </Link>
      </div>
    </section>
  );
}
function Contact() {
  const { t, lang } = useSite();
  const [query] = useSearchParams();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) {
      setStatus("missing");
      return;
    }
    setBusy(true);
    setStatus("");
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.rpc("submit_contact", {
      p_name: f.get("name"),
      p_email: f.get("email"),
      p_subject: f.get("subject"),
      p_message: f.get("message"),
      p_language: lang,
      p_website: f.get("website"),
    });
    setStatus(error ? "error" : "sent");
    setBusy(false);
  }
  return (
    <section className="contact-page">
      <div>
        <p className="eyebrow">{t.contact}</p>
        <h1>{t.contactTitle}</h1>
        <p>{t.contactIntro}</p>
        <span className="contact-signature">AL</span>
      </div>
      {status === "sent" ? (
        <div className="success-message" role="status">
          {t.sent}
        </div>
      ) : (
        <form onSubmit={submit}>
          <label>
            {t.name}
            <input name="name" autoComplete="name" required maxLength={120} />
          </label>
          <label>
            {t.email}
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
          <label>
            {t.subject}
            <input
              name="subject"
              defaultValue={
                query.get("artwork")
                  ? `${t.contactSubject} ${query.get("artwork")}`
                  : ""
              }
              required
              maxLength={200}
            />
          </label>
          <label>
            {t.message}
            <textarea
              name="message"
              rows={5}
              required
              minLength={10}
              maxLength={5000}
            />
          </label>
          <label className="honeypot" aria-hidden="true">
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <p className="muted">{t.contactNotice}</p>
          {status === "error" && <p role="alert">{t.error}</p>}
          {status === "missing" && <p role="alert">{t.serverMissing}</p>}
          <button className="dark-button" disabled={busy}>
            {busy ? t.sending : t.send}
            <ArrowUpRight size={18} />
          </button>
        </form>
      )}
    </section>
  );
}
function NotFound() {
  const { t, lang } = useSite();
  return (
    <section className="status">
      <h1>{t.notFound}</h1>
      <Link to={`/${lang}/gallery`}>{t.home}</Link>
    </section>
  );
}
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/de" replace />} />
      <Route path="/artwork/:slug" element={<LegacyArtwork />} />
      <Route path="/artwork" element={<Navigate to="/de/gallery" replace />} />
      <Route path="/shows-1" element={<Navigate to="/de/shows" replace />} />
      <Route
        path="/articles"
        element={<Navigate to="/de/articles" replace />}
      />
      <Route path="/contact" element={<Navigate to="/de/contact" replace />} />
      <Route path="/about-me" element={<Navigate to="/de/about" replace />} />
      <Route path="/admin" element={<Navigate to="/de/admin" replace />} />
      <Route path="/:lang/*" element={<Site />} />
    </Routes>
  );
}
function LegacyArtwork() {
  const { slug } = useParams();
  return <Navigate to={`/de/artwork/${slug}`} replace />;
}
