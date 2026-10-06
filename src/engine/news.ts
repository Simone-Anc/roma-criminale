import type { Family, FamilyId, GameState, NewsKind } from './types';

const MAX_NEWS = 200;

export function news(
  state: GameState,
  kind: NewsKind,
  headline: string,
  familyId?: FamilyId,
  body?: string,
): void {
  state.news.unshift({ week: state.week, kind, headline, familyId, body });
  if (state.news.length > MAX_NEWS) state.news.length = MAX_NEWS;
}

/** Accordo del verbo: v(f, 'allunga', 'allungano'). */
export function v(f: Family, singular: string, plural: string): string {
  return f.plural ? plural : singular;
}

/** Nome con l'articolo minuscolo, per l'uso a metà frase ("i Lupi", "il Gruppo"). */
export function mid(f: Family): string {
  return f.name.replace(/^(I|Il|Lo|La|Gli|Le|L')(?=[\s'])/, (m) => m.toLowerCase());
}
