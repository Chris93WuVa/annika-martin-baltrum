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


test('renderWaterCard zeigt feste Skala und MThw/MTnw Marker', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('/currentmeasurement.json')) {
      return jsonResponse({ value: 220, trend: 'RISING', timestamp: '2026-03-31T08:00:00.000Z' });
    }
    if (url.includes('/WV/measurements.json')) {
      return jsonResponse([
        { timestamp: '2026-03-31T00:00:00.000Z', value: 120 },
        { timestamp: '2026-03-31T06:00:00.000Z', value: 250 },
        { timestamp: '2026-03-31T12:00:00.000Z', value: 110 },
      ]);
    }
    if (url.endsWith('/W.json?includeCharacteristicValues=true')) {
      return jsonResponse({
        characteristicValues: [
          { shortname: 'MW', value: 180 },
          { shortname: 'MThw', value: 300 },
          { shortname: 'MTnw', value: 60 },
        ],
      });
    }
    return jsonResponse([]);
  };

  const { context, elements } = setupScriptWithFetch(fetchImpl);
  await context.loadTideInfo();

  const html = elements.get('card-water').innerHTML;
  assert.ok(html.includes('Skala: −2,5 m bis +2,5 m'));
  assert.ok(html.includes('-2,5 m'));
  assert.ok(html.includes('+2,5 m'));
  assert.ok(html.includes('tide-level-marker mtnw'));
  assert.ok(html.includes('tide-level-marker mthw'));
});


test('THW/TNW Karten zeigen pro Tag maximal zwei Zeiten', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('/currentmeasurement.json')) {
      return jsonResponse({ value: 180, trend: 'STEADY', timestamp: '2026-03-31T08:00:00.000Z' });
    }
    if (url.includes('/WV/measurements.json')) {
      return jsonResponse([
        { timestamp: '2026-03-31T00:00:00.000Z', value: 100 },
        { timestamp: '2026-03-31T01:00:00.000Z', value: 160 },
        { timestamp: '2026-03-31T02:00:00.000Z', value: 140 },
        { timestamp: '2026-03-31T03:00:00.000Z', value: 170 },
        { timestamp: '2026-03-31T04:00:00.000Z', value: 90 },
        { timestamp: '2026-03-31T10:00:00.000Z', value: 190 },
        { timestamp: '2026-03-31T11:00:00.000Z', value: 130 },
        { timestamp: '2026-03-31T16:00:00.000Z', value: 200 },
        { timestamp: '2026-03-31T17:00:00.000Z', value: 120 },
      ]);
    }
    if (url.endsWith('/W.json?includeCharacteristicValues=true')) {
      return jsonResponse({ characteristicValues: [{ shortname: 'MW', value: 150 }] });
    }
    return jsonResponse([]);
  };

  const { context, elements } = setupScriptWithFetch(fetchImpl);
  await context.loadTideInfo();

  const todayHtml = elements.get('card-today').innerHTML;
  const thwLine = /<strong>THW:\/strong>\s*([^<]+)/.exec(todayHtml)?.[1] || '';
  const tnwLine = /<strong>TNW:\/strong>\s*([^<]+)/.exec(todayHtml)?.[1] || '';

  const thwCount = thwLine.split('·').map((item) => item.trim()).filter(Boolean).length;
  const tnwCount = tnwLine.split('·').map((item) => item.trim()).filter(Boolean).length;

  assert.ok(thwCount <= 2, `THW enthält zu viele Zeiten: ${thwLine}`);
  assert.ok(tnwCount <= 2, `TNW enthält zu viele Zeiten: ${tnwLine}`);
});
