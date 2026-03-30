# Hochzeit Annika & Martin auf Baltrum

Diese Website ist eine moderne, statische One-Pager-Hochzeitsseite für Annika & Martin.
Sie bündelt Programm, Standorte, Tide-Informationen und eine Galerie an einem Ort.

## Zweck der Website

Die Seite hilft Gästen dabei, schnell alle wichtigen Informationen für das Hochzeitswochenende zu finden:

- Ablauf des Wochenendes im Blick behalten
- Relevante Orte auf Baltrum direkt in Karten öffnen
- Aktuelle Tide-/Wasserstandsinformationen für nahe Pegel sehen
- Fotos aus einem geteilten Google-Drive-Ordner ansehen
- Eigene Fotos über denselben Google-Drive-Link hochladen

## Inhaltsbereiche

Die Navigation springt per Smooth-Scroll zu folgenden Bereichen:

1. **Programm**
   - Freitag/Samstag/Sonntag mit den wichtigsten Zeitpunkten.

2. **Standorte**
   - Google-Maps-Einbettungen für:
     - Standesamt Baltrum
     - Strandabschnitt West
     - Restaurant Zum Seehund

3. **Foto-Galerie**
   - Lädt zufällig bis zu 8 Bilder aus dem geteilten Google-Drive-Ordner.
   - Klick auf ein Bild öffnet eine vergrößerte Lightbox-Ansicht.

4. **Fotos hochladen**
   - Führt auf denselben Google-Drive-Ordner wie die Galerie, damit Gäste Fotos hochladen können.

5. **Tide Info**
   - Dashboard mit aktuellen Wasserständen/Tendenzen (Pegelonline) für Baltrum-nahe Pegel.

6. **Über uns**
   - Horizontale Slider-Karten mit Zitaten und kurzen Geschichten zu Annika & Martin.

## Verwendeter Google-Drive-Ordner

Der aktuell eingetragene Link für Galerie und Upload ist:

`https://drive.google.com/drive/folders/1tRHJIMfP3HbZFu6R9OVMOhlh1fRUJSMr?usp=sharing`

## Technischer Aufbau

- **`index.html`**
  - Struktur aller Bereiche inkl. Navigation und Lightbox-Container.
- **`style.css`**
  - Modernes Design, responsive Layouts, Gallery-/Tide-Karten und Lightbox-Styling.
- **`script.js`**
  - Smooth-Scroll-Navigation
  - Countdown zur Hochzeit
  - Laden der Galerie aus Google Drive (inkl. Zufallsauswahl)
  - Lightbox-Interaktionen
  - Laden der Tide-Daten (Pegelonline)
  - einfacher Passwortschutz via `sessionStorage`

## Hinweis zur Galerie-Anbindung

Für das Auslesen der Dateiliste aus Google Drive wird in `script.js` ein `DRIVE_API_KEY` benötigt.
Ist kein API-Key gesetzt, zeigt die Galerie eine entsprechende Hinweisnachricht an.
