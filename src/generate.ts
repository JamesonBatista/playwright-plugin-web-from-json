/**
 * parseDynamicDateString(input, opts?)
 * -----------------------------------------------------------------------------
 * Lê a string e substitui cada ocorrência de `date(...)` por uma data formatada.
 *
 * Modos suportados dentro de date(...):
 *  1) Apenas formato → usa data randômica no intervalo padrão
 *     Ex.: date(dd/MM/yyyy HH:mm)
 *
 *  2) Base + formato (ou só base):
 *     - today
 *     - today+N  / today-N     (N em dias)
 *     - YYYY-MM-DD             (data fixa)
 *     + formato opcional entre aspas
 *     Ex.: date(today) → default "yyyy-MM-dd"
 *          date(today+7, "dd/MM/yyyy")
 *          date(2025-10-05, "dd/MM/yyyy")
 *
 * ✅ Tokens, offsets, locale, UTC e range seguem descritos abaixo.
 * -----------------------------------------------------------------------------
 */
export function parseDynamicDateString(
  input: string,
  opts?: {
    range?: { start?: Date; end?: Date };
    locale?: "pt-BR" | "en-US";
    useUTC?: boolean;
  }
): string {
  const regex = /date\(([^)]+)\)/gi; // captura conteúdo interno do date(...)
  return input.replace(regex, (_, innerRaw) => {
    const inner = String(innerRaw).trim();

    // tenta interpretar como "base[, 'formato']"
    const parsed = parseDateDirective(inner);
    if (parsed) {
      const base = parsed.base;
      const fmt = parsed.format ?? "yyyy-MM-dd";
      return generateRandomDateByFormat(fmt, { ...opts, base });
    }

    // caso contrário, assume que o conteúdo é apenas o "formato"
    return generateRandomDateByFormat(inner, opts);
  });
}

/** Tenta parsear "today", "today±N" ou "YYYY-MM-DD", com formato opcional. */
function parseDateDirective(
  inner: string
): { base: Date; format?: string } | null {
  // Ex.: today / today+7 / today-3  [, "formato"]
  const reToday =
    /^\s*(today)(?:\s*([+-])\s*(\d+))?\s*(?:,\s*["']([^"']+)["'])?\s*$/i;

  // Ex.: 2025-10-05  [, "formato"]
  const reISO = /^\s*(\d{4})-(\d{2})-(\d{2})\s*(?:,\s*["']([^"']+)["'])?\s*$/;

  let m = inner.match(reToday);
  if (m) {
    const sign = m[2] ?? "";
    const nStr = m[3] ?? "";
    const fmt = m[4];
    const base = new Date();
    if (sign && nStr) {
      const n = Number(nStr);
      base.setDate(base.getDate() + (sign === "+" ? n : -n));
    }
    // zera horas p/ ficar mais previsível
    base.setHours(0, 0, 0, 0);
    return { base, format: fmt };
  }

  m = inner.match(reISO);
  if (m) {
    const y = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    const fmt = m[4];
    const base = new Date(y, mm - 1, dd, 0, 0, 0, 0);
    return { base, format: fmt };
  }

  return null;
}

/* =============================================================================
   Formatting engine with per-token offsets and month/minute heuristic
   ============================================================================= */

type TokenPiece =
  | { isToken: true; base: string; offset?: number; value: string }
  | { isToken: false; value: string };

/**
 * Gera a string de data seguindo o padrão informado.
 * Aceita padrão direto (ex.: "dd/MM/yyyy HH:mm") ou wrapper "date(...)" (via parse).
 * Agora aceita `opts.base` para usar uma data específica (ao invés da aleatória).
 */
export function generateRandomDateByFormat(
  pattern: string,
  opts?: {
    range?: { start?: Date; end?: Date };
    locale?: "pt-BR" | "en-US";
    useUTC?: boolean;
    /** NOVO: data base (se ausente, uma aleatória no range será usada) */
    base?: Date;
  }
): string {
  const fmt = extractFormat(pattern);
  const locale = opts?.locale ?? "pt-BR";
  const useUTC = !!opts?.useUTC;

  // janela padrão randômica: now -3y .. now +1y
  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setFullYear(now.getFullYear() - 3);
  const defaultEnd = new Date(now);
  defaultEnd.setFullYear(now.getFullYear() + 1);

  const start = opts?.range?.start ?? defaultStart;
  const end = opts?.range?.end ?? defaultEnd;

  // usa base específica (se fornecida), senão aleatória
  const baseDate = opts?.base
    ? new Date(opts.base.getTime())
    : randomDateBetween(start, end);

  // 1) Tokeniza com offsets por token
  const tokens = tokenizeFormatWithOffsets(fmt);

  // 2) 1ª passada: decide m/mm (mês ou minuto) e acumula offsets
  const offs = {
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    millis: 0,
  };
  let seenHourToken = false;

  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (!tk.isToken) continue;

    const base = tk.base;
    const offset = tk.offset ?? 0;

    const prevChar = i > 0 ? tokens[i - 1].value.slice(-1) : "";
    const nextChar = i < tokens.length - 1 ? tokens[i + 1].value.charAt(0) : "";

    if (base === "HH" || base === "H" || base === "hh" || base === "h") {
      seenHourToken = true;
    }

    if (!offset) continue;

    if (base === "dd" || base === "d") {
      offs.days += offset;
    } else if (
      base === "yyyy" ||
      base === "aaaa" ||
      base === "yy" ||
      base === "aa"
    ) {
      offs.years += offset;
    } else if (base === "SSS") {
      offs.millis += offset;
    } else if (base === "ss" || base === "s") {
      offs.seconds += offset;
    } else if (base === "HH" || base === "H" || base === "hh" || base === "h") {
      offs.hours += offset;
    } else if (
      base === "MMMM" ||
      base === "MMM" ||
      base === "MM" ||
      base === "M" ||
      base === "mm" ||
      base === "m"
    ) {
      const isMinutes = decideMinutesOrMonth({
        token: base as any,
        seenHourToken,
        prevChar,
        nextChar,
      });
      if (isMinutes) offs.minutes += offset;
      else offs.months += offset;
    }
  }

  // 3) aplica offsets combinados sobre a base
  const adjusted = applyOffsets(baseDate, offs, useUTC);

  // 4) 2ª passada: render com a data ajustada
  const monthNames = buildMonthNames(locale);
  const get = makeDateGetters(adjusted, useUTC);
  seenHourToken = false;
  let out = "";

  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];

    if (!tk.isToken) {
      out += tk.value;
      continue;
    }

    const v = tk.base;

    if (v === "HH" || v === "H" || v === "hh" || v === "h") {
      seenHourToken = true;
    }

    switch (v) {
      // Day
      case "dd":
        out += pad2(get.day());
        break;
      case "d":
        out += String(get.day());
        break;

      // Year
      case "yyyy":
      case "aaaa":
        out += String(get.year4());
        break;
      case "yy":
      case "aa":
        out += pad2(get.year4() % 100);
        break;

      // Month text
      case "MMMM":
        out += monthNames.long[get.month() - 1];
        break;
      case "MMM":
        out += monthNames.short[get.month() - 1];
        break;

      // 24h
      case "HH":
        out += pad2(get.hours24());
        break;
      case "H":
        out += String(get.hours24());
        break;

      // 12h
      case "hh":
        out += pad2(to12h(get.hours24()));
        break;
      case "h":
        out += String(to12h(get.hours24()));
        break;

      // AM/PM
      case "a":
        out += get.hours24() < 12 ? "am" : "pm";
        break;
      case "AA":
        out += get.hours24() < 12 ? "AM" : "PM";
        break;

      // Seconds / Millis
      case "ss":
        out += pad2(get.seconds());
        break;
      case "s":
        out += String(get.seconds());
        break;
      case "SSS":
        out += String(get.millis()).padStart(3, "0");
        break;

      // Timezone
      case "TZ":
        out += formatOffset(get.offsetMinutes());
        break;
      case "Z":
        out += useUTC ? "Z" : "";
        break;

      // Month number vs Minutes
      case "MM":
      case "M":
      case "mm":
      case "m": {
        const prevChar = i > 0 ? tokens[i - 1].value.slice(-1) : "";
        const nextChar =
          i < tokens.length - 1 ? tokens[i + 1].value.charAt(0) : "";
        const isMinutes = decideMinutesOrMonth({
          token: v as any,
          seenHourToken,
          prevChar,
          nextChar,
        });
        if (isMinutes) {
          if (v === "mm") out += pad2(get.minutes());
          else out += String(get.minutes());
        } else {
          if (v === "MM" || v === "mm") out += pad2(get.month());
          else out += String(get.month());
        }
        break;
      }

      default:
        out += v; // literal (fallback)
    }
  }

  return out;
}

/* =========================
   Helpers
   ========================= */

function extractFormat(input: string): string {
  const m = input.match(/^date\((.*)\)$/i);
  return m ? m[1] : input;
}

function randomDateBetween(start: Date, end: Date): Date {
  const s = start.getTime();
  const e = end.getTime();
  const t = s + Math.random() * (e - s);
  return new Date(t);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function makeDateGetters(d: Date, useUTC: boolean) {
  return {
    day: () => (useUTC ? d.getUTCDate() : d.getDate()),
    month: () => (useUTC ? d.getUTCMonth() + 1 : d.getMonth() + 1),
    year4: () => (useUTC ? d.getUTCFullYear() : d.getFullYear()),
    hours24: () => (useUTC ? d.getUTCHours() : d.getHours()),
    minutes: () => (useUTC ? d.getUTCMinutes() : d.getMinutes()),
    seconds: () => (useUTC ? d.getUTCSeconds() : d.getSeconds()),
    millis: () => (useUTC ? d.getUTCMilliseconds() : d.getMilliseconds()),
    offsetMinutes: () => -d.getTimezoneOffset(),
  };
}

function to12h(h24: number) {
  const h = h24 % 12;
  return h === 0 ? 12 : h;
}

function formatOffset(totalMinutes: number): string {
  const sign = totalMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(totalMinutes);
  const hh = Math.floor(abs / 60);
  const mm = abs % 60;
  return `${sign}${String(hh).padStart(2, "0")}${String(mm).padStart(2, "0")}`;
}

function buildMonthNames(locale: "pt-BR" | "en-US") {
  const base = new Date(2000, 0, 1);
  const long: string[] = [];
  const short: string[] = [];
  for (let m = 0; m < 12; m++) {
    const d = new Date(base.getFullYear(), m, 1);
    long.push(d.toLocaleString(locale, { month: "long" }));
    short.push(d.toLocaleString(locale, { month: "short" }));
  }
  return { long, short };
}

/**
 * Tokenizer com suporte a offset por token (dd+2, MM-1, etc).
 */
function tokenizeFormatWithOffsets(fmt: string): TokenPiece[] {
  const bases = [
    "yyyy",
    "aaaa",
    "yy",
    "aa",
    "MMMM",
    "MMM",
    "MM",
    "M",
    "mm",
    "m",
    "dd",
    "d",
    "HH",
    "H",
    "hh",
    "h",
    "SSS",
    "ss",
    "s",
    "AA",
    "a",
    "TZ",
    "Z",
  ];
  const byLenDesc = [...bases].sort((a, b) => b.length - a.length);

  const out: TokenPiece[] = [];
  let i = 0;

  while (i < fmt.length) {
    let matchedBase: string | null = null;

    for (const b of byLenDesc) {
      if (fmt.substr(i, b.length) === b) {
        matchedBase = b;
        break;
      }
    }

    if (matchedBase) {
      // Captura +N/-N logo após o token
      let j = i + matchedBase.length;
      let offset: number | undefined;
      const sign = fmt[j] === "+" || fmt[j] === "-" ? fmt[j] : "";
      if (sign) {
        j++;
        const numMatch = fmt.slice(j).match(/^\d+/);
        if (numMatch) {
          offset = Number(sign + numMatch[0]);
          j += numMatch[0].length;
        }
      }
      const raw = fmt.slice(i, j);
      out.push({ isToken: true, base: matchedBase, offset, value: raw });
      i = j;
    } else {
      // Literal até o próximo token
      let j = i + 1;
      scan: for (; j <= fmt.length; j++) {
        for (const b of byLenDesc) {
          if (fmt.substr(j, b.length) === b) break scan;
        }
      }
      out.push({ isToken: false, value: fmt.slice(i, j) });
      i = j;
    }
  }

  return out;
}

/**
 * Decide se "m/mm" é MINUTO ou MÊS.
 * Regras:
 *  - Se já vimos hora → minuto
 *  - Se há ":" adjacente → minuto
 *  - Senão → mês (default)
 */
function decideMinutesOrMonth(args: {
  token: "M" | "MM" | "m" | "mm";
  seenHourToken: boolean;
  prevChar: string;
  nextChar: string;
}): boolean {
  const { seenHourToken, prevChar, nextChar } = args;
  if (seenHourToken) return true;
  if (prevChar === ":" || nextChar === ":") return true;
  return false;
}

/**
 * Aplica offsets acumulados à data em ordem estável.
 */
function applyOffsets(
  d: Date,
  o: {
    years: number;
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    millis: number;
  },
  useUTC: boolean
): Date {
  const dd = new Date(d.getTime());

  if (useUTC) {
    if (o.years) dd.setUTCFullYear(dd.getUTCFullYear() + o.years);
    if (o.months) dd.setUTCMonth(dd.getUTCMonth() + o.months);
    if (o.days) dd.setUTCDate(dd.getUTCDate() + o.days);
    if (o.hours) dd.setUTCHours(dd.getUTCHours() + o.hours);
    if (o.minutes) dd.setUTCMinutes(dd.getUTCMinutes() + o.minutes);
    if (o.seconds) dd.setUTCSeconds(dd.getUTCSeconds() + o.seconds);
    if (o.millis) dd.setUTCMilliseconds(dd.getUTCMilliseconds() + o.millis);
  } else {
    if (o.years) dd.setFullYear(dd.getFullYear() + o.years);
    if (o.months) dd.setMonth(dd.getMonth() + o.months);
    if (o.days) dd.setDate(dd.getDate() + o.days);
    if (o.hours) dd.setHours(dd.getHours() + o.hours);
    if (o.minutes) dd.setMinutes(dd.getMinutes() + o.minutes);
    if (o.seconds) dd.setSeconds(dd.getSeconds() + o.seconds);
    if (o.millis) dd.setMilliseconds(dd.getMilliseconds() + o.millis);
  }

  return dd;
}
