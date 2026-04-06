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
    'tide-dashboard', 'card-water', 'card-water-vertical', 'countdown',
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
  assert.ok(html.includes('-2 m NHN'));
  assert.ok(html.includes('+2 m NHN'));
  assert.ok(html.includes('tide-level-marker mtnw'));
  assert.ok(html.includes('tide-level-marker mthw'));
});


test('Trend wird aus den letzten drei Messwerten als steigend berechnet', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('/currentmeasurement.json')) {
      return jsonResponse({ value: 205, trend: 'FALLING', timestamp: '2026-03-31T08:00:00.000Z' });
    }
    if (url.includes('/WV/measurements.json')) {
      return jsonResponse([
        { timestamp: '2026-03-31T00:00:00.000Z', value: 170 },
        { timestamp: '2026-03-31T01:00:00.000Z', value: 180 },
        { timestamp: '2026-03-31T02:00:00.000Z', value: 190 },
      ]);
    }
    if (url.endsWith('/W.json?includeCharacteristicValues=true')) {
      return jsonResponse({
        characteristicValues: [
          { shortname: 'MTHW', value: 300 },
          { shortname: 'MNTW', value: 80 },
        ],
      });
    }
    return jsonResponse([]);
  };

  const { context, elements } = setupScriptWithFetch(fetchImpl);
  await context.loadTideInfo();

  const html = elements.get('card-water').innerHTML;
  assert.ok(html.includes('↗️ Flut'));
  assert.ok(html.includes('MTHW: 300 cm'));
  assert.ok(html.includes('MTNW: 80 cm'));
});

test('Trend ist gleichbleibend bei kleiner Steigung (< 1 cm pro Intervall)', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('/currentmeasurement.json')) {
      return jsonResponse({ value: 200, trend: 'RISING', timestamp: '2026-03-31T08:00:00.000Z' });
    }
    if (url.includes('/WV/measurements.json')) {
      return jsonResponse([
        { timestamp: '2026-03-31T00:00:00.000Z', value: 199.0 },
        { timestamp: '2026-03-31T01:00:00.000Z', value: 199.5 },
        { timestamp: '2026-03-31T02:00:00.000Z', value: 199.8 },
      ]);
    }
    if (url.endsWith('/W.json?includeCharacteristicValues=true')) {
      return jsonResponse({ characteristicValues: [{ shortname: 'MW', value: 180 }] });
    }
    return jsonResponse([]);
  };

  const { context, elements } = setupScriptWithFetch(fetchImpl);
  await context.loadTideInfo();

  const html = elements.get('card-water').innerHTML;
  assert.ok(html.includes('➡️'));
});

test('zweite Tide-Kachel rendert vertikale Küstenvisualisierung mit Marken', async () => {
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

  const verticalHtml = elements.get('card-water-vertical').innerHTML;
  assert.ok(verticalHtml.includes('tide-coast-scene'));
  assert.ok(verticalHtml.includes('tide-water-value'));
  assert.ok(verticalHtml.includes('+40 cm'));
  assert.ok(verticalHtml.includes('MTHW · 3.00 m NHN'));
  assert.ok(verticalHtml.includes('MTNW · 0.60 m NHN'));
  assert.ok(verticalHtml.includes('MTW (0) · 1.80 m NHN'));
  assert.ok(verticalHtml.includes('tide-current-line'));
  assert.ok(verticalHtml.includes('tide-trend-arrow down'));
  assert.ok(verticalHtml.includes('tide-trend-text">Ebbe'));
});

test('vertikale Tide-Kachel zeigt Niedrigwasser/Hochwasser nahe MTNW/MTHW an', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('/currentmeasurement.json')) {
      return jsonResponse({ value: 69, trend: 'RISING', timestamp: '2026-03-31T08:00:00.000Z' });
    }
    if (url.includes('/WV/measurements.json')) {
      return jsonResponse([
        { timestamp: '2026-03-31T00:00:00.000Z', value: 65 },
        { timestamp: '2026-03-31T01:00:00.000Z', value: 70 },
        { timestamp: '2026-03-31T02:00:00.000Z', value: 74 },
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
  const htmlLow = elements.get('card-water-vertical').innerHTML;
  assert.ok(htmlLow.includes('Niedrigwasser'));

  const fetchImplHigh = async (url) => {
    if (url.includes('/currentmeasurement.json')) {
      return jsonResponse({ value: 292, trend: 'RISING', timestamp: '2026-03-31T08:00:00.000Z' });
    }
    if (url.includes('/WV/measurements.json')) {
      return jsonResponse([
        { timestamp: '2026-03-31T00:00:00.000Z', value: 250 },
        { timestamp: '2026-03-31T01:00:00.000Z', value: 270 },
        { timestamp: '2026-03-31T02:00:00.000Z', value: 290 },
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

  const setupHigh = setupScriptWithFetch(fetchImplHigh);
  await setupHigh.context.loadTideInfo();
  const htmlHigh = setupHigh.elements.get('card-water-vertical').innerHTML;
  assert.ok(htmlHigh.includes('Hochwasser'));
});
