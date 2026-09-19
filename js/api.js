// api.js — l'única frontera amb Supabase.
//
// Si vols saber quines peticions fa el visor i com, aquest és el fitxer:
// cap altre mòdul crida fetch() contra l'API.
//
// Hi ha dues menes de peticions:
//   1. Tessel·les vectorials (MVT) que demana el mateix MapLibre → mvtUrl()
//   2. Consultes en viu que demana el codi del visor → rpc()

/**
 * La configuració del desplegament: URL del projecte, clau anon i rutes dels
 * PMTiles. La genera etl/web_config.sh a web/config.js a partir de .env.
 *
 * Es reexporta des d'aquí perquè la resta de mòduls no hagin de tocar cap
 * variable global: fan `import { CFG } from './api.js'`.
 *
 * La clau anon és pública per disseny (va al navegador de tothom) i només pot
 * fer el que li permetin els GRANT de la base. La service_role no hi és mai.
 */
export const CFG = window.GEODB;

/**
 * Capçaleres de tota petició REST.
 *
 * `Accept-Profile: api` li diu a PostgREST quin esquema ha de fer servir.
 * Sense aquesta capçalera aniria al primer esquema exposat (normalment public)
 * i no trobaria ni les vistes ni les funcions del visor.
 */
const API_HEADERS = { 'Accept-Profile': 'api', apikey: CFG.anonKey };

/** Treu els paràmetres buits: '' i null no s'han d'enviar, perquè el servidor els interpretaria. */
const clean = params =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''));

/**
 * Construeix la URL-plantilla de les tessel·les d'una capa viva.
 *
 * MapLibre hi substitueix {z}/{x}/{y} per cada tessel·la que necessita, així
 * que les claus han de quedar literals a la URL. URLSearchParams les escaparia
 * (%7Bz%7D), i per això es desfà l'escapament al final.
 *
 * Els filtres (category, subcategory, radius) viatgen com a paràmetres: canviar
 * un filtre vol dir canviar aquesta URL, i el filtratge passa a PostGIS.
 */
export const mvtUrl = (layer, params = {}) => {
  const q = new URLSearchParams({
    z:'{z}', x:'{x}', y:'{y}', layer, ...clean(params), apikey: CFG.anonKey
  });
  return `${CFG.supabaseUrl}/rest/v1/rpc/mvt?` +
         q.toString().replace(/%7B/g, '{').replace(/%7D/g, '}');
};

/**
 * Crida una funció RPC de PostgREST (nearest_services, radius_summary).
 *
 * Torna { data, ms }: la resposta i els mil·lisegons totals inclosa la xarxa.
 * Comparar-los amb el temps que reporta PostGIS (data.query_ms) fa visible
 * quant costa la consulta i quant costa arribar-hi.
 *
 * Si el servidor respon un error (p. ex. 400 "El punt és fora de l'àmbit"),
 * llença una excepció amb el missatge del servidor, no amb un codi HTTP:
 * aquests missatges estan escrits per ensenyar-se a l'usuari.
 */
export async function rpc(name, params) {
  const t0 = performance.now();
  const r = await fetch(
    `${CFG.supabaseUrl}/rest/v1/rpc/${name}?${new URLSearchParams(clean(params))}`,
    { headers: API_HEADERS });
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new Error(body?.message || `HTTP ${r.status}`);
  return { data: body, ms: performance.now() - t0 };
}

/**
 * Metadades del conjunt de dades: data de l'extracte OSM i origen dels límits.
 * És també la prova de vida de l'API: si falla, el visor avisa que les capes
 * vives no hi són però continua funcionant amb la base cartogràfica.
 */
export async function fetchDatasetInfo() {
  const r = await fetch(`${CFG.supabaseUrl}/rest/v1/dataset_info?select=*`,
                        { headers: API_HEADERS });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const [info] = await r.json();
  return info;
}
