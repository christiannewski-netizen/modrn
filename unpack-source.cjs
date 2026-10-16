// Packs the whole Modrn source into one encrypted file (source.enc) so it can live in the public repo safely.
// Pack:   MODRN_PASSWORD='...' node tools/pack-source.cjs pack <out.enc>
// Unpack: MODRN_PASSWORD='...' node tools/pack-source.cjs unpack <in.enc> <folder>
const fs = require('fs'); const path = require('path'); const crypto = require('crypto'); const zlib = require('zlib');
const pw = process.env.MODRN_PASSWORD; if (!pw) { console.error('Set MODRN_PASSWORD'); process.exit(1); }
const [mode, file, outDir] = process.argv.slice(2);
const root = path.join(__dirname, '..');
const SKIP = /(^|\/)(\.git|node_modules|public|dist)(\/|$)/;
function walk(dir, base, out) { for (const n of fs.readdirSync(dir)) { const p = path.join(dir, n); const rel = path.relative(base, p); if (SKIP.test(rel)) continue; if (fs.statSync(p).isDirectory()) walk(p, base, out); else out[rel] = fs.readFileSync(p).toString('base64'); } return out; }
if (mode === 'pack') {
  const json = Buffer.from(JSON.stringify({ v: 1, at: new Date().toISOString(), files: walk(root, root, {}) }));
  const gz = zlib.gzipSync(json); const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(pw, salt, 250000, 32, 'sha256'); const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(gz), c.final(), c.getAuthTag()]);
  fs.writeFileSync(file, Buffer.concat([Buffer.from('MODRN1'), salt, iv, ct])); console.log('packed', Math.round(ct.length / 1024) + ' KB');
} else if (mode === 'unpack') {
  const b = fs.readFileSync(file); const salt = b.slice(6, 22), iv = b.slice(22, 34), body = b.slice(34);
  const key = crypto.pbkdf2Sync(pw, salt, 250000, 32, 'sha256'); const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(body.slice(-16)); const gz = Buffer.concat([d.update(body.slice(0, -16)), d.final()]);
  const { files } = JSON.parse(zlib.gunzipSync(gz)); for (const rel of Object.keys(files)) { const p = path.join(outDir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, Buffer.from(files[rel], 'base64')); }
  console.log('unpacked', Object.keys(files).length, 'files to', outDir);
}
