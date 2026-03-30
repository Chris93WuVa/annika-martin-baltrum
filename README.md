# Hochzeit Annika & Martin auf Baltrum

Diese Website ist eine kleine, statische Event-Seite für die Hochzeit von Annika und Martin auf Baltrum.
Sie bündelt alle wichtigen Informationen für Gäste an einem Ort und bietet einen einfachen Zugang zu Programm, Orten, Fotos und Upload.

## Zweck der Website

Die Seite soll Hochzeitsgästen eine schnelle Orientierung geben:

- **Ablauf verstehen:** Das Wochenendprogramm mit den wichtigsten Zeiten ist direkt sichtbar.
- **Orte finden:** Kartenansichten helfen bei der Anreise zu den relevanten Locations auf Baltrum.
- **Erinnerungen teilen:** Gäste können Fotos ansehen und über einen externen Link eigene Bilder hochladen.
- **Vorfreude steigern:** Ein Countdown zeigt die verbleibende Zeit bis zur Trauung.

## Inhalt der Website

Die Website besteht aus vier Hauptbereichen, die über eine Navigation erreichbar sind:

1. **Programm**
   - Übersicht über Freitag, Samstag und Sonntag mit zentralen Programmpunkten.

2. **Standorte**
   - Eingebettete Google-Maps-Ansichten für Standesamt Baltrum und einen Strandabschnitt.

3. **Foto-Galerie**
   - Bereich für stimmungsvolle Baltrum-Bilder.

4. **Fotos hochladen**
   - Link zu einem Google-Drive-Ordner, über den Gäste ihre Bilder teilen können.

## Technischer Aufbau

Die Seite ist bewusst leichtgewichtig umgesetzt und benötigt kein Backend:

- **`index.html`**: Struktur und Inhalte der Website.
- **`style.css`**: Gestaltung (Farben, Layout, Karten, Buttons, Animationen).
- **`script.js`**: Interaktive Funktionen:
  - Umschalten zwischen Sektionen
  - Countdown zur Hochzeit
  - einfacher, clientseitiger Passwortschutz per `sessionStorage`
- **`assets/`**: Bilddateien für die visuelle Gestaltung (z. B. Hero-Hintergrund).

## Hinweis

Der Foto-Upload-Link in der HTML-Datei ist aktuell als Platzhalter (`DEIN_LINK`) hinterlegt und sollte vor der Nutzung mit dem echten Google-Drive-Link ersetzt werden.
