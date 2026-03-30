// Navigation
function showSection(id) {
  document.querySelectorAll('.content').forEach(s =>
    s.classList.remove('active')
  );
  document.getElementById(id).classList.add('active');
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
