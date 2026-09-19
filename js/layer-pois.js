// layer-pois.js — els punts d'interès i la seva fitxa.
//
// Aquesta capa és VIVA: els punts els serveix PostGIS com a tessel·les MVT.
// Filtrar per categoria no s'hi fa al navegador, sinó canviant la URL de les
// tessel·les: el filtratge passa al servidor i pel cable només viatgen els
// punts que es veuran. És l'estratègia oposada a la de l'accessibilitat
// (layer-accessibility.js), i val la pena comparar-les.
//
// Fins al zoom 13 i sense subcategoria, PostGIS a més agrupa els punts
// (clusters): a tota la ciutat n'hi ha 40.000, i un per un ni es veurien ni
// cabrien en el temps que Supabase dona a cada tessel·la.

import { $, esc } from './utils.js';
import { label } from './taxonomy.js';
import { mvtUrl } from './api.js';
import { state } from './state.js';
import { map } from './map.js';

/**
 * Les capes de l'estil que dibuixen la font 'live_pois': els punts sols i,
 * fins al zoom 13 i sense subcategoria, els clusters que agrupa PostGIS
 * (cercle i número).
 */
const LAYERS = ['pois', 'poi-clusters', 'poi-cluster-count'];

/**
 * Aplica la selecció actual a la capa de punts.
 *
 * Demana tessel·les noves amb els filtres de categoria i subcategoria, i
 * mostra o amaga la capa segons la casella del panell. Amb la categoria i la
 * subcategoria buides, PostGIS no filtra res i serveix tots els serveis.
 */
export function refreshPois() {
  map.getSource('live_pois').setTiles([
    mvtUrl('pois', { category: state.cat, subcategory: state.sub })
  ]);
  const visibility = $('c-pois').checked ? 'visible' : 'none';
  LAYERS.forEach(l => map.setLayoutProperty(l, 'visibility', visibility));
}

/** Enllaç a l'element original d'OpenStreetMap, per poder-ne corregir les dades. */
const osmUrl = p =>
  `https://www.openstreetmap.org/${{ n:'node', w:'way', r:'relation' }[p.osm_type]}/${p.osm_id}`;

/**
 * Fitxa emergent en fer clic sobre un punt, zoom en fer-ne sobre un cluster,
 * i cursor de mà en passar per sobre de tots dos.
 *
 * Només actua sense cap consulta activa: amb una consulta el clic és per
 * llançar-la, i obrir una fitxa a sobre només faria nosa.
 *
 * Tots els textos passen per esc(): venen d'OSM (vegeu utils.js).
 */
export function initPoiPopups() {
  map.on('click', 'pois', e => {
    if (state.mode !== 'none') return;
    const p = e.features[0].properties;
    new maplibregl.Popup({ closeButton: false })
      .setLngLat(e.lngLat)
      .setHTML(`<b>${esc(p.name || '(sense nom)')}</b><br>` +
               `${esc(label(p.category))} · ${esc(label(p.subcategory))}` +
               (p.opening_hours ? `<br>${esc(p.opening_hours)}` : '') +
               `<br><span class="muted">geometria d'origen: ${esc(p.source_geometry)}</span>` +
               `<br><a href="${osmUrl(p)}" target="_blank" rel="noopener">Veure a OpenStreetMap</a>`)
      .addTo(map);
  });

  // Un cluster no té fitxa: el clic hi acosta el mapa dos nivells, fins al
  // 14 com a molt, que és on els punts ja arriben un per un.
  map.on('click', 'poi-clusters', e => {
    if (state.mode !== 'none') return;
    map.easeTo({
      center: e.features[0].geometry.coordinates,
      zoom: Math.min(Math.floor(map.getZoom()) + 2, 14)
    });
  });

  for (const layer of ['pois', 'poi-clusters']) {
    map.on('mouseenter', layer, () => {
      if (state.mode === 'none') map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', layer, () => {
      if (state.mode === 'none') map.getCanvas().style.cursor = '';
    });
  }
}
