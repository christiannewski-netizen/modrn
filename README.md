# Modrn

Bring your website, edit it by clicking or asking, and modernise it in one click.

- `index.html` — the live, password-locked app (GitHub Pages). The app inside is encrypted.
- `source.enc` — the full source code, encrypted with the same password.
- `unpack-source.cjs` — restores the source: `MODRN_PASSWORD='…' node unpack-source.cjs unpack source.enc ./modrn-src`
