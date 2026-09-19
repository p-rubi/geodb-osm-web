// style.js — pont entre els fitxers d'estil (.json) i el codi.
//
// L'aspecte del mapa viu a web/style/, no aquí: aquest mòdul només carrega
// aquells fitxers i hi acaba d'omplir els valors que no es poden escriure en
// un JSON perquè depenen de la configuració del desplegament.
//
// ATENCIÓ: es fan servir fetch(), i per tant el visor necessita un servidor
// (`make serve`); obrir index.html amb doble clic (file://) no funciona.
// No és cap novetat: els PMTiles ja ho exigien.

import { CFG, mvtUrl } from './api.js';
import { catColorExpr } from './taxonomy.js';

/**
 * Substitueix recursivament els marcadors {{…}} d'una estructura JSON.
 *
 * Recorre objectes i llistes i, quan troba un text que és exactament un
 * marcador conegut, el canvia pel seu valor. Com que el valor pot ser
 * qualsevol cosa, un text del JSON pot acabar convertit en una llista:
 * és el que passa amb "{{color.category}}", que es torna una expressió
 * ['match', ['get','category'], …].
 */
function resolve(node, tokens) {
  if (typeof node === 'string') return node in tokens ? tokens[node] : node;
  if (Array.isArray(node)) return node.map(child => resolve(child, tokens));
  if (node && typeof node === 'object') {
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, resolve(v, tokens)]));
  }
  return node;
}

/**
 * Carrega style/basemap.json i el deixa a punt per passar-lo a MapLibre.
 *
 * Els marcadors d'URL són els que lliguen l'estil amb aquest desplegament
 * concret: dos fitxers PMTiles locals, els glifs de fonts/ i dues capes
 * servides per PostGIS. Les capes vives arrenquen sense filtre; qui les filtra
 * després és layer-pois.js i layer-influence.js, canviant la URL amb setTiles().
 *
 * Els glifs necessiten una URL absoluta. Es construeix a mà i no amb
 * new URL('fonts/{fontstack}/…'), que escaparia les claus de la plantilla.
 */
export async function loadMapStyle() {
  const r = await fetch('./style/basemap.json');
  if (!r.ok) throw new Error(`No s'ha pogut carregar style/basemap.json (HTTP ${r.status})`);
  return resolve(await r.json(), {
    '{{url.base}}':        `pmtiles://${CFG.pmtiles}`,
    '{{url.access}}':      `pmtiles://${CFG.pmtilesAccess}`,
    '{{url.glyphs}}':      `${new URL('./', location.href).href}fonts/{fontstack}/{range}.pbf`,
    '{{tiles.pois}}':      mvtUrl('pois'),
    // '-' és una subcategoria que no existeix: la capa arrenca buida i amagada,
    // i no es demana cap tessel·la real fins que l'usuari l'activa.
    '{{tiles.influence}}': mvtUrl('influence', { subcategory: '-' }),
    '{{color.category}}':  catColorExpr
  });
}

/** Carrega style/accessibility.json: l'escala de colors de la capa d'accessibilitat. */
export async function loadAccessibilityScale() {
  const r = await fetch('./style/accessibility.json');
  if (!r.ok) throw new Error(`No s'ha pogut carregar style/accessibility.json (HTTP ${r.status})`);
  return r.json();
}
