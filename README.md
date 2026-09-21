# Annina Laely — Paintings

Dreisprachige Künstlerwebsite (Deutsch, Englisch, Französisch) mit React, TypeScript, Vite und Supabase. Hosting-Ziel: Vercel.

## Lokal starten

```sh
npm ci
npm run dev
```

Ohne Supabase-Konfiguration zeigt die Website die übernommenen Originalinhalte. Kontakt verweist dann ehrlich auf das bestehende Kontaktformular; der Adminbereich erklärt die noch fehlende Verbindung. Es werden keine Schreibvorgänge simuliert.

## Supabase einrichten

1. Ein eigenes Supabase-Projekt auswählen oder erstellen.
2. `supabase/migrations/202609210001_gallery.sql` ausführen.
3. `supabase/seed.sql` ausführen. Der Import umfasst 144 Werke, sieben Ausstellungen und drei Artikel. Er ist wiederholbar und überschreibt keine späteren Änderungen.
4. In Supabase Auth ein Administrationskonto anlegen. Die UUID des Kontos explizit freischalten:

   ```sql
   insert into public.administrators(user_id) values ('UUID-DES-ADMIN-KONTOS');
   ```

5. Öffentliche Selbstregistrierung deaktivieren. Site URL und erlaubte Redirect URLs für die drei Admin-Routen (`/de/admin`, `/en/admin`, `/fr/admin`) in Supabase Auth setzen. SMTP für zuverlässige Passwort-Reset-Mails konfigurieren.
6. `.env.example` nach `.env.local` kopieren und Supabase-Projekt-URL und Publishable Key eintragen. Niemals Service-Role-Keys in `VITE_*` Variablen speichern.
7. Den lokalen Server neu starten bzw. Vercel neu bauen.

Der Adminbereich liegt unter `/de/admin` (entsprechend `/en/admin`, `/fr/admin`). Er bietet Login, Passwort-Reset, neue Einträge, Bearbeitung, Bild-Uploads, Veröffentlichung/Entwurf, Reihenfolge und Löschung. Titel, Beschreibungen und Maltechnik sind in allen drei Sprachen editierbar. Titel sind für alle drei Sprachen Pflicht; fremdsprachige Originaltitel dürfen unverändert bleiben.

Kontaktanfragen landen im geschützten Nachrichtenbereich. Eine automatische E-Mail-Benachrichtigung ist nicht eingerichtet. Das Formular hat serverseitige Validierung, Honeypot und Limits von drei Anfragen pro E-Mail pro Stunde sowie 100 insgesamt pro Stunde. Bei grösserem Spam-Aufkommen zusätzlich CAPTCHA/WAF einsetzen. Nachrichten regelmässig nach dem erforderlichen Aufbewahrungszeitraum entfernen.

Zugriffe werden durch Row Level Security geschützt, nicht nur durch die Oberfläche. Neue Konten erhalten keine Adminrechte. Der Storage-Bucket `artworks` ist öffentlich, weil Bilder öffentlich gezeigt werden. Entwurf bedeutet, dass der Datenbankeintrag nicht öffentlich gelesen werden kann; die Bilddatei selbst ist über ihre URL abrufbar. Beim Löschen eines Eintrags bleiben Bilddateien zur Wiederherstellung erhalten. Nicht mehr verwendete Bilder lassen sich später separat aufräumen.

## Vercel und GitHub

Das lokale Git-Repository existiert bereits. Ein GitHub-Remote und Vercel-/Supabase-Projekt sind noch nicht verbunden.

1. Repository zu GitHub pushen und in Vercel importieren.
2. Framework Vite, Build `npm run build`, Ausgabe `dist`.
3. `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` für Preview und Production eintragen. Preview bevorzugt mit separatem Supabase-Projekt verbinden.
4. Deployen und Login, Upload und Kontaktformular gegen das gewählte Projekt prüfen.
5. Erst nach Abnahme die bestehende Domain umstellen. Die bisherige Website bleibt bis dahin bestehen.

`vercel.json` enthält SPA-Routing und grundlegende Security-Header. Alte Seitenpfade werden auf passende neue Routen weitergeleitet. Alle Sprachvarianten haben eigene URLs; ein Wechsel behält die aktuelle Seite bei. Die Website ist eine kleine clientseitige Anwendung; seitenindividuelles servergerendertes SEO ist nicht eingerichtet.

## Herkunft und bekannte Datenlücke

Inhalte und Bilder wurden am 21.09.2026 von https://www.annina-laely-paintings.com übernommen. Lokale Bilder sind unter `public/artworks` abgelegt und benötigen das Wix-Hosting nicht mehr. Verlinkte Presseartikel bleiben externe Originalartikel in ihrer verfügbaren Sprache. Biografie und Oberfläche wurden ins Deutsche und Französische übertragen; die Übersetzungen sollten vor Veröffentlichung von der Künstlerin freigegeben werden.

Der ursprüngliche Link `artwork/k%EF%BF%BDrbiszeit` liefert HTTP 404. Das Bild zu **Kürbiszeit** konnte aus der Galerie übernommen werden; Masse, Datum, Preis und Technik fehlen bei diesem Werk und wurden nicht erfunden. Die neue Route lautet `artwork/kuerbiszeit`. Auch andere in der Originalquelle leere Felder bleiben leer. Verkaufsstatus und Preise entsprechen ausschliesslich der übernommenen Quelle und sollten vor Veröffentlichung geprüft werden.

Die Original-HTML-Dateien sind lokal in `source-content` archiviert und absichtlich von Git ausgeschlossen. Nach erneutem Import:

```sh
node scripts/import-content.mjs
node scripts/finalize-content.mjs
node scripts/create-seed.mjs
```

## Prüfung

```sh
npm test
npm run build
```

Die Tests führen die tatsächliche Migration und den Seed in lokalem PostgreSQL (PGlite) aus. Die Supabase-eigenen Auth- und Storage-Grundtabellen werden dafür minimal nachgebildet. Geprüft werden veröffentlichte Inhalte, Entwurfsschutz, fehlende Schreibrechte für Besucher und Nicht-Administratoren, Adminrechte, Kontaktvalidierung und Versandlimits. Ein Live-End-to-End-Test gegen Supabase Auth und Storage steht nach der Verbindung des echten Projekts noch aus.

Im Browser geprüft: Galerie, Werkdetails, Vergrösserung mit Escape, Sprachwechsel und mobile Darstellung bei 390 px.

## Referenzen

- [Supabase Storage-Zugriffskontrolle](https://supabase.com/docs/guides/storage/security/access-control)
- [Vite auf Vercel](https://vercel.com/docs/frameworks/frontend/vite)
