// Navigation
function scrollToSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Galerie (Google Drive)
const DRIVE_API_KEY = "";
const MAX_GALLERY_IMAGES = 8;
const galleryGrid = document.getElementById("gallery-grid");
const uploadLink = document.getElementById("upload-link");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxClose = document.getElementById("lightbox-close");
const tideDashboard = document.getElementById("tide-dashboard");

function extractFolderId(url) {
  if (!url) return "";
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : "";
}

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function openLightbox(src, alt) {
  lightboxImage.src = src;
  lightboxImage.alt = alt;
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImage.src = "";
}

function renderGallery(images) {
  galleryGrid.innerHTML = "";

  images.forEach((image) => {
    const button = document.createElement("button");
    button.className = "gallery-item";
    button.type = "button";

    const img = document.createElement("img");
    img.src = image.thumb;
    img.alt = image.name;
    img.loading = "lazy";

    button.appendChild(img);
    button.addEventListener("click", () => openLightbox(image.full, image.name));
    galleryGrid.appendChild(button);
  });
}

async function loadGalleryFromDrive() {
  if (!galleryGrid || !uploadLink) return;

  const folderId = extractFolderId(uploadLink.href);
  if (!folderId) {
    galleryGrid.innerHTML = "<p class='gallery-loading'>Kein gültiger Google-Drive-Ordner-Link gefunden.</p>";
    return;
  }

  if (!DRIVE_API_KEY) {
    galleryGrid.innerHTML = "<p class='gallery-loading'>Bitte den Google-Drive-API-Key in <code>script.js</code> setzen, damit zufällige Bilder geladen werden können.</p>";
    return;
  }

  const apiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)&key=${DRIVE_API_KEY}&pageSize=100`;

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

    if (!images.length) {
      galleryGrid.innerHTML = "<p class='gallery-loading'>Im geteilten Ordner wurden keine Bilder gefunden.</p>";
      return;
    }

    renderGallery(shuffle(images).slice(0, MAX_GALLERY_IMAGES));
  } catch (error) {
    galleryGrid.innerHTML = "<p class='gallery-loading'>Galerie konnte nicht geladen werden. Bitte prüft Freigabe, Folder-ID und API-Key.</p>";
  }
}

// Tide Info (Pegelonline)
const PEGELONLINE_STATIONS_URL =
  "https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations.json?includeCurrentMeasurement=true";
const PREFERRED_TIDE_STATIONS = ["BALTRUM", "NORDERNEY", "BORKUM", "JUIST"];

function mapTrendLabel(trend) {
  if (trend === "RISING") return "↗️ steigend";
  if (trend === "FALLING") return "↘️ fallend";
  return "➡️ gleichbleibend";
}

function renderTideCards(stations) {
  if (!tideDashboard) return;
  tideDashboard.innerHTML = "";

  stations.forEach((station) => {
    const value = station.currentMeasurement?.value;
    const timestamp = station.currentMeasurement?.timestamp;
    const trend = station.currentMeasurement?.trend || "STEADY";

    const card = document.createElement("article");
    card.className = "tide-card";
    card.innerHTML = `
      <h3>${station.shortname || station.longname}</h3>
      <p class="tide-value">${value ?? "–"} cm</p>
      <p class="tide-meta">${mapTrendLabel(trend)}</p>
      <p class="tide-meta">Stand: ${timestamp ? new Date(timestamp).toLocaleString("de-DE") : "unbekannt"}</p>
    `;
    tideDashboard.appendChild(card);
  });
}

async function loadTideInfo() {
  if (!tideDashboard) return;

  try {
    const response = await fetch(PEGELONLINE_STATIONS_URL);
    if (!response.ok) throw new Error("Pegelonline nicht erreichbar");

    const stations = await response.json();
    const withData = stations.filter((station) => station.currentMeasurement?.value !== null);

    const nearby = withData.filter((station) =>
      PREFERRED_TIDE_STATIONS.some((term) =>
        `${station.shortname} ${station.longname}`.toUpperCase().includes(term)
      )
    );

    const selected = (nearby.length ? nearby : withData).slice(0, 4);
    if (!selected.length) throw new Error("Keine Stationsdaten verfügbar");

    renderTideCards(selected);
  } catch (error) {
    tideDashboard.innerHTML = "<div class='tide-card loading'>Tide-Daten konnten aktuell nicht geladen werden. Bitte später erneut versuchen.</div>";
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

if (lightbox) {
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeLightbox();
});

loadGalleryFromDrive();
loadTideInfo();
