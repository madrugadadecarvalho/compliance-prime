/** Lista resumida de países (ISO 3166-1 alfa-2) usada nos formulários. */
export const COUNTRIES = [
  ["AO", "Angola"],
  ["PT", "Portugal"],
  ["BR", "Brasil"],
  ["MZ", "Moçambique"],
  ["CV", "Cabo Verde"],
  ["ST", "São Tomé e Príncipe"],
  ["GW", "Guiné-Bissau"],
  ["TL", "Timor-Leste"],
  ["ZA", "África do Sul"],
  ["NA", "Namíbia"],
  ["CD", "República Democrática do Congo"],
  ["CG", "República do Congo"],
  ["ZM", "Zâmbia"],
  ["NG", "Nigéria"],
  ["SS", "Sudão do Sul"],
  ["ML", "Mali"],
  ["CN", "China"],
  ["AE", "Emirados Árabes Unidos"],
  ["US", "Estados Unidos"],
  ["GB", "Reino Unido"],
  ["FR", "França"],
  ["ES", "Espanha"],
  ["DE", "Alemanha"],
  ["CH", "Suíça"],
  ["RU", "Rússia"],
  ["VE", "Venezuela"],
  ["HT", "Haiti"],
  ["AF", "Afeganistão"],
  ["IR", "Irão"],
  ["KP", "Coreia do Norte"],
  ["MM", "Myanmar"],
  ["SY", "Síria"],
  ["YE", "Iémen"],
] as const;

export type CountryCode = (typeof COUNTRIES)[number][0];

export const COUNTRY_CODES = COUNTRIES.map(([code]) => code) as [CountryCode, ...CountryCode[]];

const NAMES = new Map<string, string>(COUNTRIES);

export function countryName(code: string | null | undefined): string {
  if (!code) return "—";
  return NAMES.get(code) ?? code;
}
