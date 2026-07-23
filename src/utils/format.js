/**
 * Talformattering i hele appen: "." som tusindtalsseparator og "," som decimaltegn - den danske
 * talnotation. Bemærk: <input type="number">-felter viser/kræver altid "." som decimaltegn i
 * browseren, uanset sprogindstilling - det er en begrænsning i selve HTML-inputtypen, ikke noget
 * appen kan style sig ud af uden at opgive indbygget talvalidering/pileknapper.
 */
export function formatTal(tal, options) {
  const vaerdi = tal ?? 0
  // Undgår "-0" i visningen (fx ved 0 − 0), da -0 === 0 i JS, men toLocaleString bevarer fortegnet.
  return (vaerdi === 0 ? 0 : vaerdi).toLocaleString('da-DK', options)
}

export function formatKr(tal) {
  return formatTal(tal) + ' kr.'
}

export function formatPct(tal) {
  return formatTal(tal) + '%'
}
