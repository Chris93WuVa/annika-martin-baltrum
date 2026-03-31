import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function setupScriptWithFetch(fetchImpl) {
  const code = fs.readFileSync(new URL('../script.js', import.meta.url), 'utf8');

  const elements = new Map();
  const makeEl = (id) => ({
    id,
    innerHTML: '',
    textContent: '',
    href: 'https://drive.google.com/drive/folders/1tRHJIMfP3HbZFu6R9OVMOhlh1fRUJSMr?usp=sharing',
    classList: { add() {}, remove() {}, contains() { return false; } },
    setAttribute() {},
    addEventListener() {},
    appendChild() {},
  });

  const ids = [
    'gallery-grid', 'upload-link', 'lightbox', 'lightbox-image', 'lightbox-close', 'lightbox-prev', 'lightbox-next',
    'tide-dashboard', 'card-today', 'card-tomorrow', 'card-water', 'countdown',
  ];
  ids.forEach((id) => elements.set(id, makeEl(id)));

  const context = {
    console,
    fetch: fetchImpl,
    Date,
    Math,
    sessionStorage: { getItem() { return 'true'; }, setItem() {} },
    prompt() { return 'baltrum2026'; },
    setInterval() { return 1; },
    document: {
      body: { innerHTML: '' },
      getElementById(id) { return elements.get(id) || null; },
      createElement() { return makeEl('created'); },
      addEventListener() {},
    },
  };

  vm.createContext(context);
  vm.runInContext(code, context);
  return { context, elements };
}

function jsonResponse(data, ok = true, status = 200) {
  return {
    ok,
    status,
    async json() {
      return data;
    },
  };
}

test('loadTideInfo bleibt stabil, wenn WV und W-Metadaten ausfallen', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('/currentmeasurement.json')) {
      return jsonResponse({ value: 210, trend: 'RISING', timestamp: '2026-03-31T08:00:00.000Z' });
    }
    if (url.includes('/WV/measurements.json')) {
      return jsonResponse({}, false, 404);
    }
    if (url.endsWith('/W.json?includeCharacteristicValues=true')) {
      return jsonResponse({}, false, 404);
    }
    if (url.includes('/W/measurements.json')) {
      return jsonResponse([
        { timestamp: '2026-03-31T00:00:00.000Z', value: 120 },
        { timestamp: '2026-03-31T06:00:00.000Z', value: 250 },
        { timestamp: '2026-03-31T12:00:00.000Z', value: 110 },
        { timestamp: '2026-04-01T00:00:00.000Z', value: 130 },
        { timestamp: '2026-04-01T06:00:00.000Z', value: 240 },
        { timestamp: '2026-04-01T12:00:00.000Z', value: 100 },
      ]);
    }
    return jsonResponse([]);
  };

  const { context, elements } = setupScriptWithFetch(fetchImpl);
  await context.loadTideInfo();

  assert.ok(elements.get('card-water').innerHTML.includes('Tideanomalie jetzt'));
  assert.ok(!elements.get('tide-dashboard').innerHTML.includes('Tide-Daten konnten nicht geladen'));
});

test('loadTideInfo zeigt Fehlermeldung wenn aktueller Wasserstand fehlt', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('/currentmeasurement.json')) {
      return jsonResponse({}, false, 503);
    }
    return jsonResponse([]);
  };

  const { context, elements } = setupScriptWithFetch(fetchImpl);
  await context.loadTideInfo();
  assert.ok(elements.get('tide-dashboard').innerHTML.includes('Tide-Daten konnten nicht geladen werden'));
});
