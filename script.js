// Navigation
function scrollToSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setupActiveNavHighlight() {
  if (typeof document.querySelectorAll !== "function") return;
  const navButtons = Array.from(document.querySelectorAll("nav .nav-button[data-target]"));
  if (!navButtons.length || typeof IntersectionObserver !== "function") return;

  const bySectionId = new Map(navButtons.map((button) => [button.dataset.target, button]));
  const sections = navButtons
    .map((button) => document.getElementById(button.dataset.target))
    .filter(Boolean);
  if (!sections.length) return;

  const setActiveButton = (sectionId) => {
    navButtons.forEach((button) => {
      if (button.dataset.target === sectionId) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible?.target?.id) return;
      if (!bySectionId.has(visible.target.id)) return;
      setActiveButton(visible.target.id);
    },
    {
      root: null,
      threshold: [0.12, 0.25, 0.5],
      rootMargin: "-20% 0px -35% 0px",
    }
  );

  sections.forEach((section) => observer.observe(section));
  const updateByViewportCenter = () => {
    const viewportCenter = window.innerHeight / 2;
    const closest = sections
      .map((section) => {
        const rect = section.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);
        return { id: section.id, distance };
      })
      .sort((a, b) => a.distance - b.distance)[0];

    if (closest?.id) setActiveButton(closest.id);
  };

  window.addEventListener("scroll", updateByViewportCenter, { passive: true });
  window.addEventListener("resize", updateByViewportCenter);
  setActiveButton(sections[0].id);
}

// Galerie (Google Drive)
const DRIVE_API_KEY = "";
const DRIVE_PROXY_URL = "";
const MAX_GALLERY_IMAGES = 8;
const DUMMY_GALLERY_IMAGE = "assets/0310-steffi-chris-schloss-gruenewald.JPG";
const galleryGrid = document.getElementById("gallery-grid");
const uploadLink = document.getElementById("upload-link");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxClose = document.getElementById("lightbox-close");
const lightboxPrev = document.getElementById("lightbox-prev");
const lightboxNext = document.getElementById("lightbox-next");
const tideDashboard = document.getElementById("tide-dashboard");
let visibleGalleryImages = [];
let currentLightboxIndex = -1;

function extractFolderId(url) {
  if (!url) return "";
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : "";
}

function daySeed() {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

function seededShuffle(array, seed) {
  const list = [...array];
  let state = seed || 1;
  for (let i = list.length - 1; i > 0; i -= 1) {
    state = (state * 1664525 + 1013904223) % 4294967296;
    const j = Math.floor((state / 4294967296) * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function pickDailyGalleryImages(images, baseSeed = 0) {
  return seededShuffle(images, daySeed() + baseSeed).slice(0, MAX_GALLERY_IMAGES);
}

function updateLightboxImage() {
  if (!visibleGalleryImages.length || currentLightboxIndex < 0) return;
  const image = visibleGalleryImages[currentLightboxIndex];
  lightboxImage.src = image.full;
  lightboxImage.alt = image.name;
}

function openLightbox(index) {
  currentLightboxIndex = index;
  updateLightboxImage();
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImage.src = "";
  currentLightboxIndex = -1;
}

function showNextImage() {
  if (!visibleGalleryImages.length) return;
  currentLightboxIndex = (currentLightboxIndex + 1) % visibleGalleryImages.length;
  updateLightboxImage();
}

function showPreviousImage() {
  if (!visibleGalleryImages.length) return;
  currentLightboxIndex =
    (currentLightboxIndex - 1 + visibleGalleryImages.length) % visibleGalleryImages.length;
  updateLightboxImage();
}

function renderGallery(images) {
  galleryGrid.innerHTML = "";
  visibleGalleryImages = images;

  images.forEach((image, index) => {
    const button = document.createElement("button");
    button.className = "gallery-item";
    button.type = "button";

    const img = document.createElement("img");
    img.src = image.thumb;
    img.alt = image.name;
    img.loading = "lazy";

    button.appendChild(img);
    button.addEventListener("click", () => openLightbox(index));
    galleryGrid.appendChild(button);
  });
}

function renderDummyGallery() {
  const fallbackImages = Array.from({ length: MAX_GALLERY_IMAGES }, (_, index) => ({
    name: `Dummy-Bild ${index + 1}`,
    thumb: DUMMY_GALLERY_IMAGE,
    full: DUMMY_GALLERY_IMAGE,
  }));
  renderGallery(fallbackImages);
}

function renderEmbeddedDriveFolder(folderId) {
  galleryGrid.innerHTML = "";
  const iframe = document.createElement("iframe");
  iframe.className = "gallery-drive-embed";
  iframe.title = "Google-Drive-Galerie";
  iframe.loading = "lazy";
  iframe.referrerPolicy = "no-referrer";
  iframe.src = `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#grid`;
  galleryGrid.appendChild(iframe);
}

function normalizeProxyFiles(payload) {
  const source = Array.isArray(payload) ? payload : payload?.files;
  if (!Array.isArray(source)) return [];

  return source
    .map((file) => {
      if (typeof file !== "object" || file === null) return null;

      const id = typeof file.id === "string" ? file.id : "";
      const name = typeof file.name === "string" && file.name.trim() ? file.name : "Galeriebild";
      const thumb = typeof file.thumbUrl === "string" ? file.thumbUrl : (id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1200` : "");
      const full = typeof file.fullUrl === "string" ? file.fullUrl : (id ? `https://drive.google.com/uc?export=view&id=${id}` : "");

      if (!thumb || !full) return null;
      return { name, thumb, full };
    })
    .filter(Boolean);
}

async function fetchImagesViaProxy(folderId) {
  if (!DRIVE_PROXY_URL) return [];

  const proxyUrl = new URL(DRIVE_PROXY_URL);
  proxyUrl.searchParams.set("folderId", folderId);
  const response = await fetch(proxyUrl.toString());
  if (!response.ok) throw new Error("Drive-Proxy nicht erreichbar");
  const payload = await response.json();
  return normalizeProxyFiles(payload);
}

async function loadGalleryFromDrive() {
  if (!galleryGrid || !uploadLink) return;

  const folderId = extractFolderId(uploadLink.href);
  if (!folderId) {
    renderDummyGallery();
    return;
  }

  try {
    if (DRIVE_API_KEY) {
      const apiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)&key=${DRIVE_API_KEY}&pageSize=100`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error("Drive API nicht erreichbar");

      const data = await response.json();
      const images = (data.files || [])
        .filter((file) => file.mimeType?.startsWith("image/"))
        .map((file) => ({
          name: file.name || "Galeriebild",
          thumb: `https://drive.google.com/thumbnail?id=${file.id}&sz=w1200`,
          full: `https://drive.google.com/uc?export=view&id=${file.id}`,
        }));

      if (images.length) {
        renderGallery(pickDailyGalleryImages(images, folderId.length));
        return;
      }
    }

    const proxyImages = await fetchImagesViaProxy(folderId);
    if (proxyImages.length) {
      renderGallery(pickDailyGalleryImages(proxyImages, folderId.length));
      return;
    }

    throw new Error("Keine Drive-Bilder gefunden");
  } catch (error) {
    try {
      const htmlResponse = await fetch(uploadLink.href);
      if (typeof htmlResponse.text !== "function") {
        throw new Error("HTML-Fallback nicht unterstützt");
      }
      const html = await htmlResponse.text();
      const ids = Array.from(
        new Set([...html.matchAll(/\/file\/d\/([a-zA-Z0-9_-]{20,})/g)].map((match) => match[1]))
      );

      const fallbackImages = ids.map((id, index) => ({
        name: `Galeriebild ${index + 1}`,
        thumb: `https://drive.google.com/thumbnail?id=${id}&sz=w1200`,
        full: `https://drive.google.com/uc?export=view&id=${id}`,
      }));

      if (!fallbackImages.length) throw new Error("Keine Bild-IDs gefunden");
      renderGallery(pickDailyGalleryImages(fallbackImages, folderId.length));
    } catch (fallbackError) {
      console.warn(
        "Google-Drive-Galerie konnte nicht als Raster geladen werden, verwende eingebettete Ordneransicht.",
        fallbackError
      );
      renderEmbeddedDriveFolder(folderId);
    }
  }
}


// Tide Info (Pegelonline)
const PEGEL_UUID_NORDERNEY_RIFFGAT = "c0244c0e-6ae6-40cb-a967-4039b2a0ce7c";
const PEGEL_CURRENT_URL = `https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations/${PEGEL_UUID_NORDERNEY_RIFFGAT}/W/currentmeasurement.json`;
const PEGEL_FORECAST_WV_URL = `https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations/${PEGEL_UUID_NORDERNEY_RIFFGAT}/WV/measurements.json`;
const PEGEL_MEASUREMENTS_W_URL = `https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations/${PEGEL_UUID_NORDERNEY_RIFFGAT}/W/measurements.json`;
const PEGEL_W_SERIES_WITH_CHARACTERISTICS_URL = `https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations/${PEGEL_UUID_NORDERNEY_RIFFGAT}/W.json?includeCharacteristicValues=true`;
const TIDE_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
let selectedVerticalMarkerKey = "stormflood";
function mapTrendLabel(trend) {
  if (trend === "RISING") return " | ↗️ Flut";
  if (trend === "FALLING") return " | ↘️ Ebbe";
  return " | ➡️ ";
}

function formatSignedCm(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "–";
  if (Math.abs(value) < 0.5) return "0 cm";
  return `${value > 0 ? "+" : ""}${Math.round(value)} cm`;
}

function getMeanTideWaterCm(characteristics, allMeasurements) {
  const normalized = Array.isArray(characteristics) ? characteristics : [];
  const findByShortname = (...shortnames) => {
    const wanted = shortnames.map((name) => String(name).toLowerCase());
    return normalized.find((entry) => wanted.includes(String(entry?.shortname || "").toLowerCase()));
  };
  const mwEntry = findByShortname("MW", "MTW");
  const mthwEntry = findByShortname("MThw", "MTHW");
  const mtnwEntry = findByShortname("MTnw", "MTNW", "MNTW");

  const mthw = typeof mthwEntry?.value === "number" && Number.isFinite(mthwEntry.value)
    ? mthwEntry.value
    : null;
  const mtnw = typeof mtnwEntry?.value === "number" && Number.isFinite(mtnwEntry.value)
    ? mtnwEntry.value
    : null;

  if (typeof mwEntry?.value === "number" && Number.isFinite(mwEntry.value)) {
    return { value: mwEntry.value, source: "Kennwert MW (Pegelonline)", mthw, mtnw };
  }
  if (mthw != null && mtnw != null) {
    return {
      value: (mthw + mtnw) / 2,
      source: "Mittel aus MThw/MTnw (Pegelonline)",
      mthw,
      mtnw,
    };
  }

  const values = allMeasurements.map((m) => m.value).filter((v) => typeof v === "number");
  if (!values.length) return { value: null, source: "kein Referenzwert verfügbar", mthw: null, mtnw: null };
  return {
    value: (Math.min(...values) + Math.max(...values)) / 2,
    source: "Fallback aus Min/Max-Messreihe",
    mthw: null,
    mtnw: null,
  };
}


function deriveTrendFromSeries(allMeasurements) {
  const values = allMeasurements
    .map((entry) => entry?.value)
    .filter((value) => typeof value === "number" && Number.isFinite(value));

  if (values.length < 3) return "STEADY";

  const lastThree = values.slice(-3);
  const diff1 = lastThree[1] - lastThree[0];
  const diff2 = lastThree[2] - lastThree[1];
  const avgSlope = (diff1 + diff2) / 2;

  if (Math.abs(avgSlope) < 1) return "STEADY";
  return avgSlope > 0 ? "RISING" : "FALLING";
}

function renderWaterCard(current, allMeasurements, meanReference) {
  const waterCard = document.getElementById("card-water");
  if (!waterCard) return;
  const value = current?.value ?? null;
  const meanTideWaterCm = meanReference?.value ?? null;
  const anomaly = value != null && meanTideWaterCm != null ? value - meanTideWaterCm : null;

  const LIMIT_CM = 200;
  const normalizedAnomaly = anomaly == null ? 0 : Math.max(-LIMIT_CM, Math.min(LIMIT_CM, anomaly));
  const anomalyPositionPercent = ((normalizedAnomaly + LIMIT_CM) / (2 * LIMIT_CM)) * 100;

  const mthwAnomaly = meanReference?.mthw != null && meanTideWaterCm != null
    ? meanReference.mthw - meanTideWaterCm
    : null;
  const mtnwAnomaly = meanReference?.mtnw != null && meanTideWaterCm != null
    ? meanReference.mtnw - meanTideWaterCm
    : null;

  const markerPosition = (deltaCm) => {
    if (deltaCm == null) return null;
    const clamped = Math.max(-LIMIT_CM, Math.min(LIMIT_CM, deltaCm));
    return ((clamped + LIMIT_CM) / (2 * LIMIT_CM)) * 100;
  };

  const mthwPos = markerPosition(mthwAnomaly);
  const mtnwPos = markerPosition(mtnwAnomaly);

  const chipClass = anomaly > 0 ? "flut" : anomaly < 0 ? "ebbe" : "neutral";
  const chipLabel = anomaly > 0 ? "Hochwasser" : anomaly < 0 ? "Niedrigwasser" : "Mittelwasser";

  waterCard.innerHTML = `
    <h3>Tideanomalie jetzt</h3>
    <p class="tide-value">${formatSignedCm(anomaly)}</p>
    <p class="tide-meta tide-reading">Messwert: ${value != null ? `${Math.round(value)} cm` : "–"} · Stand: ${current?.timestamp ? new Date(current.timestamp).toLocaleString("de-DE") : "unbekannt"}</p>
    <!-- <p class="tide-meta">Referenz: ${meanReference?.source || "unbekannt"}</p> -->
    <div class="anomaly-chip ${chipClass}">${chipLabel}   ${mapTrendLabel(deriveTrendFromSeries(allMeasurements))}</div>
    <!-- <p class="tide-meta">${mapTrendLabel(deriveTrendFromSeries(allMeasurements))}</p> -->
    <div class="tide-level" role="img" aria-label="Tideanomalie-Skala von minus 2 Meter bis plus 2 Meter">
      <span class="tide-level-fill" style="width:${anomalyPositionPercent}%;"></span>
      <span class="tide-level-marker mtnw" style="left:${mtnwPos ?? 0}%;${mtnwPos == null ? 'display:none;' : ''}"></span>
      <span class="tide-level-marker mthw" style="left:${mthwPos ?? 0}%;${mthwPos == null ? 'display:none;' : ''}"></span>
      <span class="tide-level-center"></span>
    </div>
    <div class="tide-marker-labels">
      <span class="tide-marker-label mtnw" style="left:${mtnwPos ?? 0}%;${mtnwPos == null ? 'display:none;' : ''}">MTNW (-1.24 m)</span>
      <span class="tide-marker-label mthw" style="left:${mthwPos ?? 0}%;${mthwPos == null ? 'display:none;' : ''}">MTHW (+1.23 m)</span>
    </div>
    <div class="tide-scale-labels"><span>-2 m NHN</span><span>0 m NHN</span><span>+2 m NHN</span></div>
    <!-- <p class="tide-meta tide-markers">${mtnwPos != null ? 'MTNW' : ''}${mtnwPos != null && mthwPos != null ? ' · ' : ''}${mthwPos != null ? 'MTHW' : ''}</p> -->
    <p class="tide-meta">MTNW: ${meanReference?.mtnw != null ? `${Math.round(meanReference.mtnw)} cm` : "–"} · MTHW: ${meanReference?.mthw != null ? `${Math.round(meanReference.mthw)} cm` : "–"}</p>
    <p class="tide-meta">Referenz: PNP ${meanTideWaterCm != null ? `${Math.round(meanTideWaterCm)} cm NHN` : "n/a"}</p>
  `;
}

function markerPositionPercent(valueCm, minCm, maxCm) {
  if (typeof valueCm !== "number" || !Number.isFinite(valueCm)) return null;
  if (maxCm <= minCm) return null;
  const clamped = Math.max(minCm, Math.min(maxCm, valueCm));
  return ((clamped - minCm) / (maxCm - minCm)) * 100;
}

function formatMetersNhn(cmValue) {
  if (typeof cmValue !== "number" || !Number.isFinite(cmValue)) return "–";
  return `${(cmValue / 100).toFixed(2)} m NHN`;
}

function getWaterExtremaLabel(value, mtnw, mthw) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  if (typeof mtnw === "number" && Number.isFinite(mtnw) && value <= mtnw + 20) return "Niedrigwasser";
  if (typeof mthw === "number" && Number.isFinite(mthw) && value >= mthw - 20) return "Hochwasser";
  return "Mittelwasser";
}

function renderVerticalWaterCard(current, meanReference, trend) {
  const verticalCard = document.getElementById("card-water-vertical");
  if (!verticalCard) return;

  const LIMIT_CM = 250;
  const value = typeof current?.value === "number" ? current.value : null;
  const meanTideWaterCm = meanReference?.value ?? null;
  const anomaly = value != null && meanTideWaterCm != null ? value - meanTideWaterCm : null;
  const normalizedAnomaly = anomaly == null ? 0 : Math.max(-LIMIT_CM, Math.min(LIMIT_CM, anomaly));
  const waterPercent = ((normalizedAnomaly + LIMIT_CM) / (2 * LIMIT_CM)) * 100;
  const mthwAnomaly = meanReference?.mthw != null && meanTideWaterCm != null
    ? meanReference.mthw - meanTideWaterCm
    : null;
  const mtnwAnomaly = meanReference?.mtnw != null && meanTideWaterCm != null
    ? meanReference.mtnw - meanTideWaterCm
    : null;

  const markerPosition = (deltaCm) => {
    if (deltaCm == null) return null;
    const clamped = Math.max(-LIMIT_CM, Math.min(LIMIT_CM, deltaCm));
    return ((clamped + LIMIT_CM) / (2 * LIMIT_CM)) * 100;
  };

  const mthwPos = markerPosition(mthwAnomaly);
  const mtnwPos = markerPosition(mtnwAnomaly);
  const zeroPos = markerPosition(0);
  const waterPos = markerPosition(anomaly) ?? 50;
  const trendClass = trend === "RISING" ? "rising" : trend === "FALLING" ? "falling" : "steady";
  const trendArrowClass = trend === "RISING" ? "up" : trend === "FALLING" ? "down" : "steady";
  const trendLabel = trend === "RISING" ? "Flut" : trend === "FALLING" ? "Ebbe" : "konstant";
  const extremaLabel = getWaterExtremaLabel(value, meanReference?.mtnw, meanReference?.mthw);

  verticalCard.innerHTML = `
    <h3>Wasserstand jetzt</h3>
    <p class="tide-value">${formatSignedCm(anomaly)}${extremaLabel ? ` <span class="tide-extrema-tag">${extremaLabel}</span>` : ""}</p>
    <p class="tide-meta">Dynamische Visualisierung Tideanomalie Baltrum</p>
    <div class="tide-vertical-layout">
      <div class="tide-coast-scene" role="img" aria-label="Schematische Küstenansicht mit Dünen, Strand und Wasserstand">
        <div class="tide-trend-indicator ${trendClass}">
          <span class="tide-trend-arrow ${trendArrowClass}"></span>
          <span class="tide-trend-text">${trendLabel}</span>
        </div>
        <div class="tide-sky"></div>
        <div class="tide-dunes"></div>
        <div class="tide-shore"></div>
        <div class="tide-water" style="height:${waterPercent}%;"></div>
        <span class="tide-current-line" style="bottom:${waterPos}%;"></span>
        <span class="tide-scene-line mthw" style="bottom:${mthwPos ?? 0}%;${mthwPos == null ? "display:none;" : ""}"><span>MTHW (${formatMetersNhn(meanReference?.mthw-meanTideWaterCm)})</span></span>
        <span class="tide-scene-line mtnw" style="bottom:${mtnwPos ?? 0}%;${mtnwPos == null ? "display:none;" : ""}"><span>MTNW (${formatMetersNhn(meanReference?.mtnw-meanTideWaterCm)})</span></span>
        <span class="tide-scene-line zero" style="bottom:${zeroPos ?? 0}%;"><span>MTW (${formatMetersNhn(meanTideWaterCm-meanTideWaterCm)})</span></span>
        <!-- ${formatMetersNhn(meanTideWaterCm)} ${formatMetersNhn(meanReference?.mthw)} ${formatMetersNhn(meanReference?.mtnw)} -->
        <div class="tide-water-value" style="bottom:${Math.max(8, Math.min(94, waterPos))}%;">
          ${formatSignedCm(anomaly)}${extremaLabel!="Mittelwasser" ? ` · ${extremaLabel}` : ""}
        </div>
      </div>
    </div>
    <p class="tide-meta">Stand: ${current?.timestamp ? new Date(current.timestamp).toLocaleString("de-DE") : "unbekannt"} · Anomalie relativ zu MTW (PNP ${formatMetersNhn(meanTideWaterCm)})</p>
  `;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function loadTideInfo() {
  if (!tideDashboard) return;

  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 2);
    end.setHours(23, 59, 59, 0);

    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const [currentResult, forecastResult, seriesMetaResult] = await Promise.allSettled([
      fetchJson(PEGEL_CURRENT_URL),
      fetchJson(`${PEGEL_FORECAST_WV_URL}?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`),
      fetchJson(PEGEL_W_SERIES_WITH_CHARACTERISTICS_URL),
    ]);

    if (currentResult.status !== "fulfilled" || typeof currentResult.value?.value !== "number") {
      throw new Error("Aktueller Wasserstand fehlt in API-Antwort");
    }

    let series = Array.isArray(forecastResult.value) ? forecastResult.value : [];

    if (!series.length) {
      try {
        const measured = await fetchJson(`${PEGEL_MEASUREMENTS_W_URL}?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`);
        series = Array.isArray(measured) ? measured : [];
      } catch (fallbackError) {
        series = [];
      }
    }

    const cleaned = series
      .filter((item) => item && typeof item.value === "number" && item.timestamp)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const characteristics = seriesMetaResult.status === "fulfilled"
      ? seriesMetaResult.value?.characteristicValues
      : null;

    const meanReference = getMeanTideWaterCm(characteristics, cleaned.length ? cleaned : [currentResult.value]);
    renderWaterCard(currentResult.value, cleaned.length ? cleaned : [currentResult.value], meanReference);
    const trend = deriveTrendFromSeries(cleaned.length ? cleaned : [currentResult.value]);
    renderVerticalWaterCard(currentResult.value, meanReference, trend);
  } catch (error) {
    tideDashboard.innerHTML = "<div class='tide-card loading'>Tide-Daten konnten nicht geladen werden. Bitte später erneut versuchen.</div>";
  }
}

// Countdown
const weddingDate = new Date("2026-06-13T10:00:00+02:00");
const countdownEl = document.getElementById("countdown");

function updateCountdown() {
  const now = new Date();
  const diff = weddingDate - now;

  if (Math.floor(diff / (1000 * 60 * 60 * 24)) < 1) {
    countdownEl.textContent = "Heute sagen wir JA 💍";
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  countdownEl.textContent =
    `Wir sagen JA in ${days} Tagen · ${hours} Std · ${minutes} Min`;
}

setInterval(updateCountdown, 60000);
updateCountdown();

// Einfacher Passwortschutz
const PASSWORD = "baltrum2026";

if (!sessionStorage.getItem("accessGranted")) {
  const input = prompt("Passwort bitte...");
  if (input === PASSWORD) {
    sessionStorage.setItem("accessGranted", "true");
  } else {
    document.body.innerHTML = "<h2 style='text-align:center;margin-top:20%'>Kein Zugriff</h2>";
  }
}

if (lightboxClose) {
  lightboxClose.addEventListener("click", closeLightbox);
}

if (lightboxPrev) {
  lightboxPrev.addEventListener("click", showPreviousImage);
}

if (lightboxNext) {
  lightboxNext.addEventListener("click", showNextImage);
}

if (lightbox) {
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeLightbox();
  if (event.key === "ArrowLeft" && lightbox.classList.contains("open")) showPreviousImage();
  if (event.key === "ArrowRight" && lightbox.classList.contains("open")) showNextImage();
});

setupActiveNavHighlight();
loadGalleryFromDrive();
loadTideInfo();
setInterval(loadTideInfo, TIDE_REFRESH_INTERVAL_MS);
