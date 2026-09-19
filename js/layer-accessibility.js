// layer-accessibility.js — la capa d'accessibilitat.
//
// QUÈ MOSTRA: cada edifici pintat segons com de lluny li queda el servei triat.
//
// D'ON SURT: la distància ja ve calculada. Durant la generació dels PMTiles,
// PostGIS calcula per a cada edifici la distància a cada subcategoria
// analitzable i la desa en una columna d_<codi> (d_farmacia, d_escola…), que
// viatja dins de la tessel·la com un atribut més.
//
// PER QUÈ IMPORTA: moure el llindar NO demana res al servidor. L'únic que
// canvia és una expressió d'estil que avalua el navegador sobre dades que ja
// té. Obre la pestanya "Network" de les eines de desenvolupament i mou el
// control: no hi apareix cap petició. Aquest és el contrast amb els punts
// d'interès (layer-pois.js), que sí que tornen a demanar tessel·les.
//
// LIMITACIÓ: són distàncies en línia recta, no per la xarxa viària, i només
// compten els edificis mapats a OpenStreetMap. Es mesuren tots els edificis
// del terme, sigui quin sigui el seu ús.

import { $, esc, fmtM } from './utils.js';
import { label, BY_CODE } from './taxonomy.js';
import { state, isAnalysable } from './state.js';
import { map } from './map.js';
import { requireBuildings } from './layer-basemap.js';

/** L'escala de colors, carregada de style/accessibility.json per main.js. */
let scale = null;

/** main.js li passa l'escala un cop llegida del JSON, abans d'ensenyar res. */
export function setAccessibilityScale(loaded) { scale = loaded; }

/**
 * Construeix l'expressió de color de la capa a partir de l'escala i el llindar.
 *
 * L'expressió té forma de cadena de condicions que MapLibre avalua edifici a
 * edifici, i es llegeix de dalt a baix, com un if/else if:
 *
 *   si no té la propietat d_<sub>   → color de "sense dada"
 *   si d_<sub> <= llindar × 0,5     → verd
 *   si d_<sub> <= llindar × 1       → llima
 *   si d_<sub> <= llindar × 2       → taronja
 *   altrament                       → vermell
 *
 * El primer cas és important: ['has', …] distingeix "no hi ha dada" de "la
 * distància és gran". Tippecanoe no escriu els atributs nuls, i un edifici
 * queda sense la propietat si a l'àmbit no hi ha cap servei d'aquella
 * subcategoria.
 *
 * S'exporta —com legendRows()— perquè no toca ni el mapa ni el DOM: amb els
 * mateixos arguments dona sempre el mateix resultat, i això la fa comprovable.
 */
export function colorExpression(field, threshold) {
  const limits = scale.classes.filter(c => c.factor != null);
  const rest = scale.classes[scale.classes.length - 1];
  return [
    'case',
    ['!', ['has', field]], scale.sense_dada,
    ...limits.flatMap(c => [['<=', ['get', field], threshold * c.factor], c.color]),
    rest.color
  ];
}

/**
 * Les línies de la llegenda: "≤ 250 m", "≤ 500 m", …, "> 1 km". "Sense dada"
 * només surt quan pot aparèixer: si la subcategoria no té cap servei a
 * l'àmbit (withData = false).
 */
export function legendRows(threshold, withData = true) {
  const limits = scale.classes.filter(c => c.factor != null);
  const last = limits[limits.length - 1];
  return [
    ...scale.classes.map(c => [
      c.color,
      c.factor != null ? `≤ ${fmtM(threshold * c.factor)}`
                       : `> ${fmtM(threshold * last.factor)}`
    ]),
    ...(withData ? [] : [[scale.sense_dada, "Sense dada: cap servei a l'àmbit"]])
  ];
}

/**
 * Torna a pintar la capa amb el llindar i la subcategoria actuals.
 *
 * Es crida en tres casos: en canviar de subcategoria, en marcar la casella i
 * cada cop que es mou el control del llindar (esdeveniment 'input', o sigui
 * mentre s'arrossega). Que això sigui prou ràpid per fer-ho a cada píxel és
 * justament el que demostra que no hi ha servidor pel mig.
 */
export function refreshAccessibility() {
  const threshold = +$('threshold').value;
  $('thr-val').textContent = fmtM(threshold);

  const on = $('c-access').checked && isAnalysable();
  map.setLayoutProperty('access', 'visibility', on ? 'visible' : 'none');
  requireBuildings(on);
  $('legend').hidden = !on;
  if (!on) return;

  // El nom de la columna es construeix amb el codi de la subcategoria:
  // 'farmacia' → 'd_farmacia'. Totes les columnes són dins de cada tessel·la.
  const field = `d_${state.sub}`;
  map.setPaintProperty('access', 'fill-color', colorExpression(field, threshold));

  $('legend').innerHTML =
    `<div class="muted">Distància a: ${esc(label(state.sub))}</div>` +
    legendRows(threshold, BY_CODE[state.sub].n > 0)
      .map(([c, t]) => `<div><i style="background:${c}"></i>${esc(t)}</div>`).join('');
}
