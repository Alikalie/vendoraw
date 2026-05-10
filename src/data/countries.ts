export type Country = {
  name: string;
  code: string;
  dial: string;
  currency: string;
  symbol: string;
};

// Full list of world countries with dial code + currency.
export const countries: Country[] = [
  { name: "Afghanistan", code: "AF", dial: "+93", currency: "AFN", symbol: "؋" },
  { name: "Albania", code: "AL", dial: "+355", currency: "ALL", symbol: "L" },
  { name: "Algeria", code: "DZ", dial: "+213", currency: "DZD", symbol: "د.ج" },
  { name: "Argentina", code: "AR", dial: "+54", currency: "ARS", symbol: "$" },
  { name: "Australia", code: "AU", dial: "+61", currency: "AUD", symbol: "A$" },
  { name: "Austria", code: "AT", dial: "+43", currency: "EUR", symbol: "€" },
  { name: "Bangladesh", code: "BD", dial: "+880", currency: "BDT", symbol: "৳" },
  { name: "Belgium", code: "BE", dial: "+32", currency: "EUR", symbol: "€" },
  { name: "Benin", code: "BJ", dial: "+229", currency: "XOF", symbol: "CFA" },
  { name: "Bolivia", code: "BO", dial: "+591", currency: "BOB", symbol: "Bs." },
  { name: "Botswana", code: "BW", dial: "+267", currency: "BWP", symbol: "P" },
  { name: "Brazil", code: "BR", dial: "+55", currency: "BRL", symbol: "R$" },
  { name: "Bulgaria", code: "BG", dial: "+359", currency: "BGN", symbol: "лв" },
  { name: "Burkina Faso", code: "BF", dial: "+226", currency: "XOF", symbol: "CFA" },
  { name: "Cambodia", code: "KH", dial: "+855", currency: "KHR", symbol: "៛" },
  { name: "Cameroon", code: "CM", dial: "+237", currency: "XAF", symbol: "FCFA" },
  { name: "Canada", code: "CA", dial: "+1", currency: "CAD", symbol: "C$" },
  { name: "Chile", code: "CL", dial: "+56", currency: "CLP", symbol: "$" },
  { name: "China", code: "CN", dial: "+86", currency: "CNY", symbol: "¥" },
  { name: "Colombia", code: "CO", dial: "+57", currency: "COP", symbol: "$" },
  { name: "Costa Rica", code: "CR", dial: "+506", currency: "CRC", symbol: "₡" },
  { name: "Croatia", code: "HR", dial: "+385", currency: "EUR", symbol: "€" },
  { name: "Czech Republic", code: "CZ", dial: "+420", currency: "CZK", symbol: "Kč" },
  { name: "Denmark", code: "DK", dial: "+45", currency: "DKK", symbol: "kr" },
  { name: "Dominican Republic", code: "DO", dial: "+1", currency: "DOP", symbol: "RD$" },
  { name: "Ecuador", code: "EC", dial: "+593", currency: "USD", symbol: "$" },
  { name: "Egypt", code: "EG", dial: "+20", currency: "EGP", symbol: "£" },
  { name: "Estonia", code: "EE", dial: "+372", currency: "EUR", symbol: "€" },
  { name: "Ethiopia", code: "ET", dial: "+251", currency: "ETB", symbol: "Br" },
  { name: "Finland", code: "FI", dial: "+358", currency: "EUR", symbol: "€" },
  { name: "France", code: "FR", dial: "+33", currency: "EUR", symbol: "€" },
  { name: "Gambia", code: "GM", dial: "+220", currency: "GMD", symbol: "D" },
  { name: "Germany", code: "DE", dial: "+49", currency: "EUR", symbol: "€" },
  { name: "Ghana", code: "GH", dial: "+233", currency: "GHS", symbol: "₵" },
  { name: "Greece", code: "GR", dial: "+30", currency: "EUR", symbol: "€" },
  { name: "Guatemala", code: "GT", dial: "+502", currency: "GTQ", symbol: "Q" },
  { name: "Guinea", code: "GN", dial: "+224", currency: "GNF", symbol: "FG" },
  { name: "Honduras", code: "HN", dial: "+504", currency: "HNL", symbol: "L" },
  { name: "Hong Kong", code: "HK", dial: "+852", currency: "HKD", symbol: "HK$" },
  { name: "Hungary", code: "HU", dial: "+36", currency: "HUF", symbol: "Ft" },
  { name: "Iceland", code: "IS", dial: "+354", currency: "ISK", symbol: "kr" },
  { name: "India", code: "IN", dial: "+91", currency: "INR", symbol: "₹" },
  { name: "Indonesia", code: "ID", dial: "+62", currency: "IDR", symbol: "Rp" },
  { name: "Iraq", code: "IQ", dial: "+964", currency: "IQD", symbol: "ع.د" },
  { name: "Ireland", code: "IE", dial: "+353", currency: "EUR", symbol: "€" },
  { name: "Israel", code: "IL", dial: "+972", currency: "ILS", symbol: "₪" },
  { name: "Italy", code: "IT", dial: "+39", currency: "EUR", symbol: "€" },
  { name: "Ivory Coast", code: "CI", dial: "+225", currency: "XOF", symbol: "CFA" },
  { name: "Jamaica", code: "JM", dial: "+1", currency: "JMD", symbol: "J$" },
  { name: "Japan", code: "JP", dial: "+81", currency: "JPY", symbol: "¥" },
  { name: "Jordan", code: "JO", dial: "+962", currency: "JOD", symbol: "د.ا" },
  { name: "Kazakhstan", code: "KZ", dial: "+7", currency: "KZT", symbol: "₸" },
  { name: "Kenya", code: "KE", dial: "+254", currency: "KES", symbol: "KSh" },
  { name: "Kuwait", code: "KW", dial: "+965", currency: "KWD", symbol: "د.ك" },
  { name: "Latvia", code: "LV", dial: "+371", currency: "EUR", symbol: "€" },
  { name: "Lebanon", code: "LB", dial: "+961", currency: "LBP", symbol: "ل.ل" },
  { name: "Liberia", code: "LR", dial: "+231", currency: "LRD", symbol: "L$" },
  { name: "Libya", code: "LY", dial: "+218", currency: "LYD", symbol: "ل.د" },
  { name: "Lithuania", code: "LT", dial: "+370", currency: "EUR", symbol: "€" },
  { name: "Luxembourg", code: "LU", dial: "+352", currency: "EUR", symbol: "€" },
  { name: "Madagascar", code: "MG", dial: "+261", currency: "MGA", symbol: "Ar" },
  { name: "Malawi", code: "MW", dial: "+265", currency: "MWK", symbol: "MK" },
  { name: "Malaysia", code: "MY", dial: "+60", currency: "MYR", symbol: "RM" },
  { name: "Mali", code: "ML", dial: "+223", currency: "XOF", symbol: "CFA" },
  { name: "Malta", code: "MT", dial: "+356", currency: "EUR", symbol: "€" },
  { name: "Mauritius", code: "MU", dial: "+230", currency: "MUR", symbol: "₨" },
  { name: "Mexico", code: "MX", dial: "+52", currency: "MXN", symbol: "$" },
  { name: "Mongolia", code: "MN", dial: "+976", currency: "MNT", symbol: "₮" },
  { name: "Morocco", code: "MA", dial: "+212", currency: "MAD", symbol: "د.م." },
  { name: "Mozambique", code: "MZ", dial: "+258", currency: "MZN", symbol: "MT" },
  { name: "Namibia", code: "NA", dial: "+264", currency: "NAD", symbol: "N$" },
  { name: "Nepal", code: "NP", dial: "+977", currency: "NPR", symbol: "₨" },
  { name: "Netherlands", code: "NL", dial: "+31", currency: "EUR", symbol: "€" },
  { name: "New Zealand", code: "NZ", dial: "+64", currency: "NZD", symbol: "NZ$" },
  { name: "Nicaragua", code: "NI", dial: "+505", currency: "NIO", symbol: "C$" },
  { name: "Niger", code: "NE", dial: "+227", currency: "XOF", symbol: "CFA" },
  { name: "Nigeria", code: "NG", dial: "+234", currency: "NGN", symbol: "₦" },
  { name: "Norway", code: "NO", dial: "+47", currency: "NOK", symbol: "kr" },
  { name: "Oman", code: "OM", dial: "+968", currency: "OMR", symbol: "ر.ع." },
  { name: "Pakistan", code: "PK", dial: "+92", currency: "PKR", symbol: "₨" },
  { name: "Panama", code: "PA", dial: "+507", currency: "PAB", symbol: "B/." },
  { name: "Paraguay", code: "PY", dial: "+595", currency: "PYG", symbol: "₲" },
  { name: "Peru", code: "PE", dial: "+51", currency: "PEN", symbol: "S/." },
  { name: "Philippines", code: "PH", dial: "+63", currency: "PHP", symbol: "₱" },
  { name: "Poland", code: "PL", dial: "+48", currency: "PLN", symbol: "zł" },
  { name: "Portugal", code: "PT", dial: "+351", currency: "EUR", symbol: "€" },
  { name: "Qatar", code: "QA", dial: "+974", currency: "QAR", symbol: "ر.ق" },
  { name: "Romania", code: "RO", dial: "+40", currency: "RON", symbol: "lei" },
  { name: "Russia", code: "RU", dial: "+7", currency: "RUB", symbol: "₽" },
  { name: "Rwanda", code: "RW", dial: "+250", currency: "RWF", symbol: "FRw" },
  { name: "Saudi Arabia", code: "SA", dial: "+966", currency: "SAR", symbol: "ر.س" },
  { name: "Senegal", code: "SN", dial: "+221", currency: "XOF", symbol: "CFA" },
  { name: "Serbia", code: "RS", dial: "+381", currency: "RSD", symbol: "дин." },
  { name: "Sierra Leone", code: "SL", dial: "+232", currency: "SLE", symbol: "Le" },
  { name: "Singapore", code: "SG", dial: "+65", currency: "SGD", symbol: "S$" },
  { name: "Slovakia", code: "SK", dial: "+421", currency: "EUR", symbol: "€" },
  { name: "Slovenia", code: "SI", dial: "+386", currency: "EUR", symbol: "€" },
  { name: "Somalia", code: "SO", dial: "+252", currency: "SOS", symbol: "Sh.So." },
  { name: "South Africa", code: "ZA", dial: "+27", currency: "ZAR", symbol: "R" },
  { name: "South Korea", code: "KR", dial: "+82", currency: "KRW", symbol: "₩" },
  { name: "Spain", code: "ES", dial: "+34", currency: "EUR", symbol: "€" },
  { name: "Sri Lanka", code: "LK", dial: "+94", currency: "LKR", symbol: "₨" },
  { name: "Sudan", code: "SD", dial: "+249", currency: "SDG", symbol: "ج.س." },
  { name: "Sweden", code: "SE", dial: "+46", currency: "SEK", symbol: "kr" },
  { name: "Switzerland", code: "CH", dial: "+41", currency: "CHF", symbol: "Fr" },
  { name: "Tanzania", code: "TZ", dial: "+255", currency: "TZS", symbol: "TSh" },
  { name: "Thailand", code: "TH", dial: "+66", currency: "THB", symbol: "฿" },
  { name: "Togo", code: "TG", dial: "+228", currency: "XOF", symbol: "CFA" },
  { name: "Trinidad and Tobago", code: "TT", dial: "+1", currency: "TTD", symbol: "TT$" },
  { name: "Tunisia", code: "TN", dial: "+216", currency: "TND", symbol: "د.ت" },
  { name: "Turkey", code: "TR", dial: "+90", currency: "TRY", symbol: "₺" },
  { name: "Uganda", code: "UG", dial: "+256", currency: "UGX", symbol: "USh" },
  { name: "Ukraine", code: "UA", dial: "+380", currency: "UAH", symbol: "₴" },
  { name: "United Arab Emirates", code: "AE", dial: "+971", currency: "AED", symbol: "د.إ" },
  { name: "United Kingdom", code: "GB", dial: "+44", currency: "GBP", symbol: "£" },
  { name: "United States", code: "US", dial: "+1", currency: "USD", symbol: "$" },
  { name: "Uruguay", code: "UY", dial: "+598", currency: "UYU", symbol: "$U" },
  { name: "Venezuela", code: "VE", dial: "+58", currency: "VES", symbol: "Bs.S" },
  { name: "Vietnam", code: "VN", dial: "+84", currency: "VND", symbol: "₫" },
  { name: "Yemen", code: "YE", dial: "+967", currency: "YER", symbol: "﷼" },
  { name: "Zambia", code: "ZM", dial: "+260", currency: "ZMW", symbol: "ZK" },
  { name: "Zimbabwe", code: "ZW", dial: "+263", currency: "ZWL", symbol: "Z$" },
];

// Approximate USD -> local conversion rates (mock, demo use only).
export const usdRates: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1600,
  GHS: 15,
  KES: 130,
  ZAR: 18,
  INR: 83,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 155,
  CNY: 7.2,
  BRL: 5.1,
  MXN: 17.2,
  EGP: 49,
  SLE: 22.5,
  XOF: 605,
  XAF: 605,
  GMD: 70,
  LRD: 190,
  SGD: 1.34,
  HKD: 7.8,
  TZS: 2600,
  UGX: 3700,
  RWF: 1300,
  ETB: 56,
  MAD: 10,
  TND: 3.1,
  DZD: 134,
  ZMW: 26,
  MWK: 1700,
  MZN: 64,
  AED: 3.67,
  SAR: 3.75,
  QAR: 3.64,
  TRY: 32,
  CHF: 0.88,
  SEK: 10.5,
  NOK: 10.7,
  DKK: 6.85,
};

export function convertFromUsd(amountUsd: number, currency: string): number {
  // Prefer live cache (hydrated by auth-context via lib/fx) when available.
  // Lazy import to avoid cycle.

  let live: number | undefined;
  try {
    // dynamic require pattern not available in ESM bundler; use globalThis bag
    const g = globalThis as unknown as { __fxCache?: Record<string, number> };
    if (g.__fxCache && g.__fxCache[currency] != null) live = g.__fxCache[currency];
  } catch {
    /* ignore */
  }
  const r = live ?? usdRates[currency] ?? 1;
  return amountUsd * r;
}

export function formatMoney(amount: number, currency: string): string {
  const c = countries.find((x) => x.currency === currency);
  const sym = c?.symbol ?? "$";
  const rounded = amount >= 100 ? Math.round(amount).toLocaleString() : amount.toFixed(2);
  return `${sym}${rounded}`;
}

/**
 * SLE (Sierra Leone Leone) is only shown to Sierra Leoneans. For every other
 * profile we display USD. Returns the currency the UI should use given the
 * user's stored profile currency.
 */
export function displayCurrency(profileCurrency: string): string {
  if (profileCurrency === "SLE") return "SLE";
  // Everyone else sees USD (live FX-converted via convertFromUsd).
  return "USD";
}

/**
 * Convenience: convert a USD amount to the user's display currency and format.
 */
export function formatUsd(amountUsd: number, profileCurrency: string): string {
  const display = displayCurrency(profileCurrency);
  return formatMoney(convertFromUsd(amountUsd, display), display);
}

/**
 * Filter the country list shown to users registering or browsing — Sierra Leone
 * stays for SL users (still selectable) but for currency dropdowns elsewhere we
 * may want to hide SLE. Always returns the full list for sign-up.
 */
export function listCountries(): Country[] {
  return countries;
}
