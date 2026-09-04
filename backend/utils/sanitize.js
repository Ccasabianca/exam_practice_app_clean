/** nettoyage des saisies @module utils/sanitize */
const { FilterXSS } = require('xss');

// fix : aucune balise html conservée, le contenu de script et style est supprimé, le texte est gardé tel quel (xss stocké)
const stripper = new FilterXSS({
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
  escapeHtml: (text) => text,
});

/** retire le html d'une chaîne, renvoie les autres valeurs telles quelles */
function stripHtml(value) {
  if (typeof value !== 'string') return value;
  return stripper.process(value).trim();
}

module.exports = { stripHtml };
