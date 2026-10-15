/**
 * Motor de screening por similaridade de nomes.
 *
 * Normaliza (remove acentos, pontuação e títulos), compara tokens com Jaro-Winkler
 * e devolve uma pontuação de 0 a 100. Acima do limiar gera-se um alerta,
 * que não é uma notificação: é uma decisão que alguém com permissão tem de tomar.
 */

export const MATCH_THRESHOLD = 85;

const STOP_WORDS = new Set(["de", "da", "do", "das", "dos", "e", "sr", "sra", "dr", "dra", "lda", "sa", "ltd", "limited", "inc", "llc"]);

export function normalizeName(name: string): string[] {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const matchDistance = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatches = new Array<boolean>(a.length).fill(false);
  const bMatches = new Array<boolean>(b.length).fill(false);
  let matches = 0;

  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;

  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Similaridade entre dois nomes completos (0–100), independente da ordem dos tokens.
 * Cada token do nome mais curto procura o melhor par no nome mais longo.
 */
export function nameSimilarity(a: string, b: string): number {
  const ta = normalizeName(a);
  const tb = normalizeName(b);
  if (!ta.length || !tb.length) return 0;

  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const used = new Set<number>();
  let total = 0;

  for (const token of short) {
    let best = 0;
    let bestIdx = -1;
    long.forEach((candidate, idx) => {
      if (used.has(idx)) return;
      const score = jaroWinkler(token, candidate);
      if (score > best) {
        best = score;
        bestIdx = idx;
      }
    });
    if (bestIdx >= 0) used.add(bestIdx);
    total += best;
  }

  // Penaliza diferenças grandes no número de tokens (ex.: "João" vs "João Manuel Pedro Silva").
  const coverage = short.length / long.length;
  const score = (total / short.length) * (0.75 + 0.25 * coverage);
  return Math.round(score * 100);
}

export type WatchlistCandidate = {
  id: string;
  fullName: string;
  aliases: string[];
};

export type ScreeningHit = {
  watchlistEntryId: string;
  score: number;
  matchedOn: string;
};

export function screenName(name: string, entries: WatchlistCandidate[]): ScreeningHit[] {
  const hits: ScreeningHit[] = [];
  for (const entry of entries) {
    let best = { score: 0, matchedOn: entry.fullName };
    for (const candidate of [entry.fullName, ...entry.aliases]) {
      const score = nameSimilarity(name, candidate);
      if (score > best.score) best = { score, matchedOn: candidate };
    }
    if (best.score >= MATCH_THRESHOLD) {
      hits.push({ watchlistEntryId: entry.id, score: best.score, matchedOn: best.matchedOn });
    }
  }
  return hits.sort((x, y) => y.score - x.score);
}
