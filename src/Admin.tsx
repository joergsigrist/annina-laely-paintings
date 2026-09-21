import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { Plus, Pencil, Trash2, LogOut } from "lucide-react";
import { useSite } from "./App";
import { supabase } from "./lib/supabase";
import { type Content, type Lang, languages, localized } from "./types";
type Message = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
  is_read: boolean;
};
const blank = () => ({ de: "", en: "", fr: "" });
const newItem = (kind: Content["kind"], order: number): Content => ({
  id: crypto.randomUUID(),
  slug: crypto.randomUUID(),
  kind,
  title: blank(),
  description: blank(),
  medium: blank(),
  image: "",
  published: false,
  sort_order: order,
  links: {},
});
export default function Admin() {
  const { t, lang, refresh } = useSite();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoaded, setAuthLoaded] = useState(!supabase);
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [items, setItems] = useState<Content[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tab, setTab] = useState<Content["kind"] | "messages">("painting");
  const [editor, setEditor] = useState<Content | null>(null);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data, error }) => {
      setSession(data.session);
      setAuthLoaded(true);
      if (error) setNote(t.error);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let active = true;
    setAllowed(false);
    setItems([]);
    setMessages([]);
    setEditor(null);
    if (!session || !supabase) return;
    setChecking(true);
    supabase.rpc("is_admin").then(({ data, error }) => {
      if (!active) return;
      setAllowed(data === true && !error);
      setChecking(false);
      if (data === true && !error) void load();
    });
    return () => {
      active = false;
    };
  }, [session?.user.id]);
  async function load() {
    if (!supabase) return;
    setLoadError(false);
    const [a, b] = await Promise.all([
      supabase.from("content").select("*").order("sort_order"),
      supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    if (a.error || b.error) {
      setLoadError(true);
      return;
    }
    setItems(
      (a.data || []).map((r) => ({
        ...r.data,
        id: r.id,
        kind: r.kind,
        slug: r.slug,
        published: r.published,
        sort_order: r.sort_order,
      })),
    );
    setMessages(b.data || []);
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setNote("");
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: String(form.get("password")),
    });
    if (error) setNote(t.loginError);
    setBusy(false);
  }
  async function reset() {
    if (!supabase || !email) return;
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + `/${lang}/admin`,
    });
    setNote(error ? t.error : t.resetSent);
    setBusy(false);
  }
  async function password(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({
      password: String(new FormData(e.currentTarget).get("password")),
    });
    setNote(error ? t.error : t.passwordUpdated);
    if (!error) setRecovery(false);
    setBusy(false);
  }
  async function logout() {
    await supabase?.auth.signOut();
    setAllowed(false);
    setRecovery(false);
    setNote("");
  }
  async function remove(item: Content) {
    if (!supabase || !window.confirm(t.confirmDelete)) return;
    setBusy(true);
    const { error } = await supabase.from("content").delete().eq("id", item.id);
    setNote(error ? t.deleteError : t.saved);
    if (!error) {
      await load();
      await refresh();
    }
    setBusy(false);
  }
  async function markRead(id: string) {
    const { error } = await supabase!
      .from("contact_messages")
      .update({ is_read: true })
      .eq("id", id);
    if (error) setNote(t.error);
    else
      setMessages(
        messages.map((m) => (m.id === id ? { ...m, is_read: true } : m)),
      );
  }
  if (!supabase)
    return (
      <section className="admin-page">
        <p className="eyebrow">ANNINA LAELY</p>
        <h1>{t.admin}</h1>
        <p>{t.setup}</p>
      </section>
    );
  return (
    <section className="admin-page">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">ANNINA LAELY</p>
          <h1>{t.admin}</h1>
          <p className="muted">{t.adminIntro}</p>
        </div>
        {session && (
          <button className="outline-button" onClick={logout}>
            <LogOut size={16} />
            {t.logout}
          </button>
        )}
      </div>
      {note && (
        <p className="feedback" role="status">
          {note}
        </p>
      )}
      {!authLoaded || checking ? (
        <p role="status">{t.loading}</p>
      ) : recovery ? (
        <form className="admin-login" onSubmit={password}>
          <label>
            {t.newPassword}
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
          </label>
          <button className="dark-button" disabled={busy}>
            {t.resetPassword}
          </button>
        </form>
      ) : !session ? (
        <form className="admin-login" onSubmit={login}>
          <label>
            {t.email}
            <input
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
              required
            />
          </label>
          <label>
            {t.password}
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="dark-button" disabled={busy}>
            {t.login}
          </button>
          <br />
          <button
            className="plain-button"
            type="button"
            disabled={!email || busy}
            onClick={reset}
          >
            {t.forgot}
          </button>
        </form>
      ) : !allowed ? (
        <p role="alert">{t.notAdmin}</p>
      ) : (
        <>
          <div className="admin-tabs">
            {(["painting", "show", "article", "messages"] as const).map(
              (key) => (
                <button
                  key={key}
                  className={tab === key ? "active" : ""}
                  onClick={() => {
                    setTab(key);
                    setEditor(null);
                    setNote("");
                  }}
                >
                  {
                    {
                      painting: t.gallery,
                      show: t.shows,
                      article: t.articles,
                      messages: t.messages,
                    }[key]
                  }
                  {key === "messages" &&
                    ` (${messages.filter((m) => !m.is_read).length})`}
                </button>
              ),
            )}
          </div>
          {loadError ? (
            <p role="alert">
              {t.connectionError}{" "}
              <button className="plain-button" onClick={load}>
                {t.retry}
              </button>
            </p>
          ) : editor ? (
            <Editor
              key={editor.id}
              item={editor}
              onCancel={() => setEditor(null)}
              onSaved={async () => {
                setEditor(null);
                setNote(t.saved);
                await load();
                await refresh();
              }}
            />
          ) : tab === "messages" ? (
            <div>
              {!messages.length && <p>{t.empty}</p>}
              {messages.map((m) => (
                <article className="admin-message" key={m.id}>
                  <p className="eyebrow">
                    {new Date(m.created_at).toLocaleString(lang + "-CH")}
                    {m.is_read && ` · ${t.readState}`}
                  </p>
                  <h2>{m.subject}</h2>
                  <p>
                    {m.name} ·{" "}
                    <a href={`mailto:${encodeURIComponent(m.email)}`}>
                      {m.email}
                    </a>
                  </p>
                  <p className="preserve-lines">{m.message}</p>
                  {!m.is_read && (
                    <button
                      className="outline-button"
                      onClick={() => markRead(m.id)}
                    >
                      {t.markRead}
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <>
              <button
                className="dark-button"
                onClick={() => {
                  setNote("");
                  setEditor(
                    newItem(tab, items.filter((x) => x.kind === tab).length),
                  );
                }}
              >
                <Plus size={18} />
                {t.new}
              </button>
              <div className="admin-list">
                {items
                  .filter((x) => x.kind === tab)
                  .map((item) => (
                    <div className="admin-row" key={item.id}>
                      {item.image && <img src={item.image} alt="" />}
                      <div>
                        <p>{localized(item.title, lang)}</p>
                        <span className="muted">
                          {item.published ? t.published : t.draft}
                        </span>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`${t.edit}: ${localized(item.title, lang)}`}
                        onClick={() => {
                          setNote("");
                          setEditor(item);
                        }}
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        className="icon-button danger"
                        aria-label={`${t.delete}: ${localized(item.title, lang)}`}
                        disabled={busy}
                        onClick={() => remove(item)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
function Editor({
  item,
  onCancel,
  onSaved,
}: {
  item: Content;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const { lang, t } = useSite();
  const [draft, setDraft] = useState<Content>(structuredClone(item));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(item.image);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editLang, setEditLang] = useState<Lang>(lang);
  useEffect(() => {
    if (!file) {
      setPreview(item.image);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, item.image]);
  function field(key: keyof Content, value: unknown) {
    setDraft({ ...draft, [key]: value });
  }
  function translated(key: "title" | "description" | "medium", value: string) {
    setDraft({
      ...draft,
      [key]: { ...(draft[key] || blank()), [editLang]: value },
    });
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!languages.every((l) => draft.title[l].trim())) {
      setError(t.requiredTranslations);
      return;
    }
    if (draft.kind === "painting" && !draft.image && !file) {
      setError(t.noImage);
      return;
    }
    setBusy(true);
    let uploaded: string | undefined;
    try {
      let image = draft.image;
      if (file) {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 10 * 1024 * 1024
        )
          throw Error(t.uploadError);
        try {
          const bitmap = await createImageBitmap(file);
          bitmap.close();
        } catch {
          throw Error(t.uploadError);
        }
        const ext =
          file.type === "image/jpeg"
            ? "jpg"
            : file.type === "image/png"
              ? "png"
              : "webp";
        const path = `${draft.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase!.storage
          .from("artworks")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        uploaded = path;
        image = supabase!.storage.from("artworks").getPublicUrl(path)
          .data.publicUrl;
      }
      const clean = { ...draft, image };
      const { id, kind, slug, published, sort_order, ...data } = clean;
      const { error: saveError } = await supabase!
        .from("content")
        .upsert({ id, kind, slug, published, sort_order, data });
      if (saveError) throw saveError;
      uploaded = undefined;
      await onSaved();
    } catch (err) {
      if (uploaded) await supabase!.storage.from("artworks").remove([uploaded]);
      setError(
        err instanceof Error && err.message === t.uploadError
          ? t.uploadError
          : t.error,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="admin-editor" onSubmit={save}>
      <h2>{localized(item.title, lang) || t.new}</h2>
      <div className="admin-tabs" aria-label={t.language}>
        {languages.map((l) => (
          <button
            type="button"
            key={l}
            className={l === editLang ? "active" : ""}
            onClick={() => setEditLang(l)}
          >
            {{ de: "Deutsch", en: "English", fr: "Français" }[l]}
          </button>
        ))}
      </div>
      <label>
        {t.title} ({editLang.toUpperCase()})
        <input
          value={draft.title[editLang]}
          onChange={(e) => translated("title", e.target.value)}
          maxLength={200}
        />
      </label>
      <label>
        {t.description} ({editLang.toUpperCase()})
        <textarea
          rows={4}
          value={draft.description[editLang]}
          onChange={(e) => translated("description", e.target.value)}
          maxLength={10000}
        />
      </label>
      {draft.kind === "painting" && (
        <label>
          {t.medium} ({editLang.toUpperCase()})
          <input
            value={draft.medium?.[editLang] || ""}
            onChange={(e) => translated("medium", e.target.value)}
            maxLength={200}
          />
        </label>
      )}
      <fieldset>
        <legend>{t.image}</legend>
        {preview && <img src={preview} alt={localized(draft.title, lang)} />}
        <label>
          {t.upload}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              setError("");
              const selected = e.target.files?.[0];
              if (
                selected &&
                (!["image/jpeg", "image/png", "image/webp"].includes(
                  selected.type,
                ) ||
                  selected.size > 10485760)
              ) {
                setError(t.uploadError);
                e.target.value = "";
                return;
              }
              setFile(selected || null);
            }}
          />
          <span className="muted">{t.uploadHint}</span>
        </label>
      </fieldset>
      <div className="form-grid">
        {draft.kind === "painting" && (
          <>
            <label>
              {t.number}
              <input
                value={draft.number || ""}
                onChange={(e) => field("number", e.target.value)}
                maxLength={50}
              />
            </label>
            <label>
              {t.year}
              <input
                type="number"
                min="1900"
                max="2200"
                value={draft.year || ""}
                onChange={(e) => field("year", e.target.value)}
              />
            </label>
            <label>
              {t.dimensions}
              <input
                value={draft.dimensions || ""}
                onChange={(e) => field("dimensions", e.target.value)}
                maxLength={100}
              />
            </label>
            <label>
              {t.price} (CHF)
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.price ?? ""}
                onChange={(e) =>
                  field(
                    "price",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!!draft.sold}
                onChange={(e) => field("sold", e.target.checked)}
              />
              {t.sold}
            </label>
          </>
        )}
        {draft.kind === "show" && (
          <>
            <label>
              {t.start}
              <input
                type="date"
                required
                value={draft.start_date || ""}
                onChange={(e) => field("start_date", e.target.value)}
              />
            </label>
            <label>
              {t.end}
              <input
                type="date"
                required
                min={draft.start_date || undefined}
                value={draft.end_date || ""}
                onChange={(e) => field("end_date", e.target.value)}
              />
            </label>
            <label>
              {t.location}
              <input
                value={draft.location || ""}
                onChange={(e) => field("location", e.target.value)}
                maxLength={200}
              />
            </label>
            <label>
              {t.link}
              <input
                type="url"
                pattern="https://.*"
                value={draft.external_url || ""}
                onChange={(e) => field("external_url", e.target.value)}
                maxLength={2000}
              />
            </label>
          </>
        )}
        {draft.kind === "article" && (
          <>
            <label>
              {t.publisher}
              <input
                value={draft.publisher || ""}
                onChange={(e) => field("publisher", e.target.value)}
                maxLength={200}
              />
            </label>
            <label>
              {t.date}
              <input
                type="date"
                required
                value={draft.date || ""}
                onChange={(e) => field("date", e.target.value)}
              />
            </label>
            {languages.map((l) => (
              <label key={l}>
                {t.link} ({l.toUpperCase()})
                <input
                  type="url"
                  pattern="https://.*"
                  value={draft.links?.[l] || ""}
                  onChange={(e) =>
                    field("links", { ...draft.links, [l]: e.target.value })
                  }
                  maxLength={2000}
                />
              </label>
            ))}
          </>
        )}
        <label>
          {t.order}
          <input
            type="number"
            min="0"
            required
            value={draft.sort_order}
            onChange={(e) => field("sort_order", Number(e.target.value))}
          />
        </label>
      </div>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={draft.published}
          onChange={(e) => field("published", e.target.checked)}
        />
        {t.published}
      </label>
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      <div className="button-row">
        <button className="dark-button" disabled={busy}>
          {busy ? t.saving : t.save}
        </button>
        <button
          className="outline-button"
          disabled={busy}
          type="button"
          onClick={onCancel}
        >
          {t.cancel}
        </button>
      </div>
    </form>
  );
}
