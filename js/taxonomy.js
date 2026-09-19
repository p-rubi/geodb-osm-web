// taxonomy.js — tot el que sap el visor sobre la taxonomia de serveis.
//
// D'ON SURT: de `window.GEODB_CATEGORIES`, que escriu web/categories.js.
// Aquell fitxer el genera etl/web_config.sh llegint la vista api.categories,
// i s'incrusta a la pàgina en comptes de demanar-lo a l'API perquè els
// selectors han de funcionar encara que Supabase estigui pausat: la capa
// d'accessibilitat (PMTiles) no depèn del servidor.
//
// Cada categoria és un objecte:
//   { code, parent, label, color, sort, analysis, is_service, n }
//   parent    null = categoria de primer nivell; si no, el codi de la seva mare
//   analysis  true = té capa d'accessibilitat i àrea d'influència precalculades
//   is_service true = és un servei a la població (i no, p. ex., una piscina privada)
//   n         nombre de punts d'interès de l'àmbit d'estudi

const CATS = window.GEODB_CATEGORIES;

/** Índex codi → categoria, per no recórrer la llista cada cop. */
export const BY_CODE = Object.fromEntries(CATS.map(c => [c.code, c]));

/** Les categories de primer nivell que surten al selector (només serveis). */
export const CATEGORIES = CATS.filter(c => !c.parent && c.is_service);

/** Les subcategories d'una categoria, en l'ordre en què les dona la base. */
export const subsOf = cat => CATS.filter(c => c.parent === cat);

/** L'etiqueta llegible d'un codi ('farmacia' → 'Farmàcia'). Si no el coneix, torna el codi. */
export const label = code => BY_CODE[code]?.label ?? code;

/** El color d'un codi, per als punts de les llistes de resultats. */
export const color = code => BY_CODE[code]?.color ?? '#9a9c92';

/**
 * Expressió MapLibre que dona color a una entitat segons la seva categoria.
 *
 * Es construeix un sol cop i es fa servir a tres capes (punts, àrea
 * d'influència i el seu contorn) a través del marcador {{color.category}}
 * de style/basemap.json. El resultat té aquesta forma:
 *   ['match', ['get','category'], 'salut','#ef4444', 'educacio','#3b82f6', …, '#9a9c92']
 * L'últim valor és el color per defecte quan la categoria no és cap de les llistades.
 */
export const catColorExpr = ['match', ['get', 'category'],
  ...CATEGORIES.flatMap(c => [c.code, c.color]), '#9a9c92'];
