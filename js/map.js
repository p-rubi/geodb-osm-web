// map.js — la instància del mapa.
//
// Un sol mapa per a tot el visor. Es crea a main.js i la resta de mòduls
// l'importen d'aquí:
//
//   import { map } from './map.js';
//
// `map` val undefined fins que main.js crida createMap(). Això no és cap
// problema perquè tots els altres mòduls només el fan servir dins de funcions
// que s'executen després (els mòduls ES mantenen viva la referència: quan
// createMap() li assigna el mapa, tothom qui l'hagi importat el veu).

import { CFG } from './api.js';

/** El mapa MapLibre. No el toquis abans de createMap(). */
export let map;

/**
 * Crea el mapa amb l'estil ja resolt i hi afegeix els controls.
 *
 * `hash: true` desa la posició a l'adreça (#zoom/lat/lon): enganxar l'enllaç
 * porta l'altra persona exactament on eres.
 *
 * `transformRequest` és el punt on MapLibre deixa modificar cada petició que
 * fa pel seu compte. S'aprofita per afegir `Accept-Profile: api` a tot el que
 * va cap a Supabase, que és el que necessita PostgREST per servir l'esquema
 * correcte. La resta de peticions (els PMTiles, que són fitxers locals) passen
 * sense tocar-les.
 */
export function createMap(style) {
  map = new maplibregl.Map({
    container: 'map',
    center: CFG.center,
    zoom: CFG.zoom,
    hash: true,
    transformRequest: url => url.startsWith(CFG.supabaseUrl)
      ? { url, headers: { 'Accept-Profile': 'api' } }
      : { url },
    style
  });

  map.addControl(new maplibregl.NavigationControl(), 'top-right');
  // Escala a baix a la dreta, sobre l'atribució: a baix a l'esquerra (el lloc
  // per defecte) la tapava el panell.
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-right');
  return map;
}
