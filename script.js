// Navigation
function scrollToSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Galerie (Google Drive)
const DRIVE_API_KEY = "";
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

async function loadGalleryFromDrive() {
  if (!galleryGrid || !uploadLink) return;

  const folderId = extractFolderId(uploadLink.href);
  if (!folderId) {
    renderDummyGallery();
    return;
  }

  const apiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)&${DRIVE_API_KEY ? `key=${DRIVE_API_KEY}&` : ""}pageSize=100`;

  try {
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
    throw new Error("Keine Drive-Bilder gefunden");
  } catch (error) {
    try {
      const htmlResponse = await fetch(uploadLink.href);
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
      renderDummyGallery();
    }
  }
}

// Tide Info (Pegelonline)
const PEGEL_UUID_NORDERNEY_RIFFGAT = "c0244c0e-6ae6-40cb-a967-4039b2a0ce7c";
const PEGEL_CURRENT_URL = `https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations/${PEGEL_UUID_NORDERNEY_RIFFGAT}/W/currentmeasurement.json`;
const PEGEL_FORECAST_WV_URL = `https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations/${PEGEL_UUID_NORDERNEY_RIFFGAT}/WV/measurements.json`;
const PEGEL_MEASUREMENTS_W_URL = `https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations/${PEGEL_UUID_NORDERNEY_RIFFGAT}/W/measurements.json`;
const todayCard = document.getElementById("card-today");
const tomorrowCard = document.getElementById("card-tomorrow");
const waterCard = document.getElementById("card-water");

function mapTrendLabel(trend) {
  if (trend === "RISING") return "↗️ steigend";
  if (trend === "FALLING") return "↘️ fallend";
  return "➡️ gleichbleibend";
}

function formatTime(isoTs) {
  return new Date(isoTs).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function localDateKey(isoTs) {
  return new Date(isoTs).toLocaleDateString("de-DE");
}

function getThwTnwByDate(measurements, dateKey) {
  const highs = [];
  const lows = [];
  for (let i = 1; i < measurements.length - 1; i += 1) {
    const prev = measurements[i - 1].value;
    const curr = measurements[i].value;
    const next = measurements[i + 1].value;
    if (localDateKey(measurements[i].timestamp) !== dateKey) continue;

    if (curr >= prev && curr > next) highs.push(measurements[i].timestamp);
    if (curr <= prev && curr < next) lows.push(measurements[i].timestamp);
  }
  return { highs, lows };
}

function renderTideCalendarCard(cardEl, title, tides) {
  if (!cardEl) return;
  const thw = tides.highs.length ? tides.highs.map(formatTime).join(" · ") : "keine Daten";
  const tnw = tides.lows.length ? tides.lows.map(formatTime).join(" · ") : "keine Daten";
  cardEl.innerHTML = `
    <h3>${title}</h3>
    <p class="tide-meta"><strong>THW:</strong> ${thw}</p>
    <p class="tide-meta"><strong>TNW:</strong> ${tnw}</p>
  `;
}

function renderWaterCard(current, allMeasurements) {
  if (!waterCard) return;
  const values = allMeasurements.map((m) => m.value).filter((v) => typeof v === "number");
  const min = Math.min(...values);
  const max = Math.max(...values);
  const value = current?.value ?? null;
  const percent = value != null && max > min ? ((value - min) / (max - min)) * 100 : 0;
  const barWidth = Math.max(6, Math.min(100, percent));

  waterCard.innerHTML = `
    <h3>Wasserstand aktuell</h3>
    <p class="tide-value">${value != null ? `${Math.round(value)} cm` : "–"}</p>
    <div class="tide-level"><span style="width:${barWidth}%"></span></div>
    <p class="tide-meta">${mapTrendLabel(current?.trend || "STEADY")}</p>
    <p class="tide-meta">Stand: ${current?.timestamp ? new Date(current.timestamp).toLocaleString("de-DE") : "unbekannt"}</p>
  `;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function loadTideInfo() {
  if (!tideDashboard || !todayCard || !tomorrowCard || !waterCard) return;

  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 2);
    end.setHours(23, 59, 59, 0);

    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const [current, forecast] = await Promise.all([
      fetchJson(PEGEL_CURRENT_URL),
      fetchJson(`${PEGEL_FORECAST_WV_URL}?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`),
    ]);

    const series = Array.isArray(forecast) && forecast.length ? forecast : await fetchJson(`${PEGEL_MEASUREMENTS_W_URL}?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`);
    const cleaned = series
      .filter((item) => item && typeof item.value === "number" && item.timestamp)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const todayKey = start.toLocaleDateString("de-DE");
    const tomorrow = new Date(start);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = tomorrow.toLocaleDateString("de-DE");

    renderWaterCard(current, cleaned);
    renderTideCalendarCard(todayCard, "THW / TNW heute", getThwTnwByDate(cleaned, todayKey));
    renderTideCalendarCard(tomorrowCard, "THW / TNW morgen", getThwTnwByDate(cleaned, tomorrowKey));
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

loadGalleryFromDrive();
loadTideInfo();
