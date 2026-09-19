// main.js — el punt d'entrada del visor.
//
// És l'únic fitxer que index.html carrega, i el que explica l'ordre de les
// coses. Si vols entendre el visor, comença aquí i segueix els imports.
//
// MAPA DELS FITXERS
//   utils.js                 funcions curtes (escapar HTML, formatar metres)
//   taxonomy.js              les categories de serveis i els seus colors
//   api.js                   totes les peticions a Supabase
//   state.js                 la selecció actual (categoria, subcategoria, mode)
//   style.js                 carrega els fitxers d'estil de web/style/
//   map.js                   crea el mapa
//   ui.js                    el panell i els seus controls
//   layer-basemap.js         interruptors de la cartografia base
//   layer-pois.js            punts d'interès (dades vives) + fitxa
//   layer-accessibility.js   accessibilitat (dades precalculades als PMTiles)
//   layer-influence.js       àrees d'influència (dades vives)
//   query-modes.js           els modes de clic i el dibuix dels resultats
//   query-run.js             les consultes en viu contra PostGIS
//
// I els fitxers que no són codi:
//   style/basemap.json       colors, gruixos i ordre de les capes
//   style/accessibility.json l'escala de colors de l'accessibilitat
//   config.js, categories.js generats per etl/web_config.sh — no s'editen

import { fetchDatasetInfo } from './api.js';
import { loadMapStyle, loadAccessibilityScale } from './style.js';
import { createMap } from './map.js';
import { initPanel, setStatus, LIVE_DOWN } from './ui.js';
import { setAccessibilityScale } from './layer-accessibility.js';
import { initPoiPopups } from './layer-pois.js';
import { queryNearest, queryRadius } from './query-run.js';
import { state } from './state.js';

/**
 * Arrenca el visor.
 *
 * L'ordre importa:
 *   1. registrar el protocol pmtiles:// ABANS de crear cap mapa, o MapLibre
 *      no sabrà què fer amb les URL de la cartografia base
 *   2. llegir els fitxers d'estil, que són peticions i per tant s'esperen
 *   3. crear el mapa amb l'estil ja resolt
 *   4. quan el mapa hagi carregat (les fonts ja existeixen), connectar el
 *      panell i les interaccions: abans d'això, map.getSource() no trobaria res
 */
async function start() {
  // pmtiles.Protocol ensenya a MapLibre a demanar trossos d'un fitxer PMTiles
  // amb peticions de rang (Range) en comptes d'anar a un servidor de tessel·les.
  maplibregl.addProtocol('pmtiles', new pmtiles.Protocol().tile);

  const [style, scale] = await Promise.all([loadMapStyle(), loadAccessibilityScale()]);
  setAccessibilityScale(scale);

  const map = createMap(style);

  // Si Supabase està pausat, la base cartogràfica segueix funcionant: cal
  // dir-ho, però sense espatllar la resta. Els errors de les fonts vives es
  // reconeixen pel prefix 'live_' del seu identificador a l'estil.
  //
  // Excepte AbortError: canviar un filtre (setTiles) cancel·la les tessel·les
  // que s'estaven baixant, i MapLibre ho notifica com un error. No vol dir
  // que l'API hagi caigut, i tractar-ho com a tal deixava l'avís encès per a
  // tota la sessió cada cop que algú canviava de categoria massa de pressa.
  map.on('error', e => {
    if (/AbortError/.test(`${e.error?.name} ${e.error?.message}`)) return;
    if (e.sourceId && e.sourceId.startsWith('live_')) setStatus(LIVE_DOWN, true);
  });

  map.on('load', () => {
    initPanel();
    initPoiPopups();

    // El clic al mapa: segons el mode, llança una consulta o no fa res
    // (en mode 'none' el clic el recull la capa de punts, a layer-pois.js).
    map.on('click', e => {
      if (state.mode === 'nearest') return queryNearest(e.lngLat);
      if (state.mode === 'radius')  return queryRadius(e.lngLat);
    });

    showDatasetInfo();
  });
}

/**
 * Escriu al peu del panell la data de l'extracte OSM i l'origen dels límits.
 * És també la prova que l'API respon: si falla, es mostra l'avís de degradació.
 */
async function showDatasetInfo() {
  try {
    const info = await fetchDatasetInfo();
    setStatus(`Extracte OSM: ${(info.extract_timestamp || '').slice(0, 10)} · ` +
              `límit: ${String(info.boundary_source).toUpperCase()} · ODbL`);
  } catch {
    setStatus(LIVE_DOWN, true);
  }
}

start();
