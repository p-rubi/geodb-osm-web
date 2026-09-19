// utils.js — funcions curtes que fa servir tothom.
//
// No depèn de res: ni del mapa, ni de l'API, ni de l'estat. És el fitxer que
// es pot llegir primer sense context.

/** Accés curt a un element del panell pel seu id: $('status') → <div id="status">. */
export const $ = id => document.getElementById(id);

/**
 * Escapa un text abans d'inserir-lo com a HTML.
 *
 * PER QUÈ: els noms, horaris i adreces venen d'OpenStreetMap, i OSM l'edita
 * qualsevol. Un nom com `<img src=x onerror=alert(1)>` executaria codi al
 * navegador de tothom qui visiti el visor (un atac XSS). Tracta sempre les
 * dades d'OSM com a entrada no fiable: tot el que acabi dins d'un innerHTML
 * o d'un setHTML() ha de passar per aquí.
 */
export const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

/**
 * Formata una distància en metres per mostrar-la: 240 → "240 m", 1500 → "1,5 km".
 * Fa servir la convenció catalana (coma decimal) via toLocaleString('ca'). Entre
 * el número i la unitat hi va un espai no separable ( ): en una llista
 * estreta, "190 m" no s'ha de partir en dues línies.
 */
export const fmtM = m => m >= 1000
  ? `${(m / 1000).toLocaleString('ca', { maximumFractionDigits: 1 })} km`
  : `${Math.round(m)} m`;
