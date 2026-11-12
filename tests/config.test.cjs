// Garde-fous de configuration : secrets, police, contrat d'API.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('.env.example déclare VITE_API_URL sans valeur', () => {
  assert.match(read('.env.example'), /^VITE_API_URL=$/m);
});

test('.env et dist sont ignorés par git', () => {
  const ignore = read('.gitignore');
  assert.match(ignore, /^\.env$/m);
  assert.match(ignore, /^dist$/m);
});

test('la police Plus Jakarta Sans est servie localement, sans CDN', () => {
  assert.ok(fs.existsSync(path.join(root, 'src/assets/fonts/PlusJakartaSans.woff2')));
  const css = read('src/styles.css');
  assert.match(css, /Plus Jakarta Sans/);
  assert.doesNotMatch(read('index.html') + css, /fonts\.googleapis|fonts\.gstatic/);
});

test("le client d'API s'appuie sur VITE_API_URL et le jeton Bearer", () => {
  const client = read('src/lib/api.ts');
  assert.match(client, /VITE_API_URL/);
  assert.match(client, /Bearer \$\{token\}/);
});

test('le WebSocket utilise /ws?token= comme dans le contrat', () => {
  const client = read('src/lib/api.ts');
  assert.match(client, /'\/ws'/);
  assert.match(client, /searchParams\.set\('token'/);
});
