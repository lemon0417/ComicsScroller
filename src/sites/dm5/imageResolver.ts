const PACKER_REGEX =
  /eval\(function\(p,a,c,k,e,(?:r|d)\)\{[\s\S]+?\}\(([\s\S]+)\)\)/;

const splitArgs = (raw: string) => {
  const args: string[] = [];
  let current = "";
  let depth = 0;
  let quote: "'" | '"' | null = null;
  let escape = false;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (escape) {
      current += ch;
      escape = false;
      continue;
    }
    if (ch === "\\") {
      current += ch;
      escape = true;
      continue;
    }
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
    } else if (ch === ")" || ch === "]" || ch === "}") {
      depth = Math.max(0, depth - 1);
    }
    if (ch === "," && depth === 0) {
      args.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) args.push(current.trim());
  return args;
};

const unquote = (value: string) => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const inner = trimmed.slice(1, -1);
    return inner
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t");
  }
  return trimmed;
};

const encodeBase = (num: number, base: number) => {
  const chars =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (num === 0) return "0";
  let n = num;
  let out = "";
  while (n > 0) {
    out = chars[n % base] + out;
    n = Math.floor(n / base);
  }
  return out;
};

const extractDictSource = (arg: string) => {
  const match = /(['"])([\s\S]*?)\1\s*\.split\(/.exec(arg);
  return match ? match[2] : null;
};

const parseArrayLiteral = (raw: string) => {
  try {
    return JSON.parse(raw.replace(/'/g, '"')) as string[];
  } catch {
    return null;
  }
};

const extractArrayVar = (script: string, name: string) => {
  const match = new RegExp(`${name}\\s*=\\s*(\\[[\\s\\S]*?\\])`).exec(script);
  return match ? parseArrayLiteral(match[1]) : null;
};

const extractAnyArray = (script: string) => {
  const match = /(\[[\s\S]*?\])/.exec(script);
  return match ? parseArrayLiteral(match[1]) : null;
};

const extractFirstUrl = (script: string) => {
  const match =
    /https?:\\\/\\\/[^"'\\s]+/.exec(script) ||
    /https?:\/\/[^"'\s]+/.exec(script);
  return match ? match[0].replace(/\\\//g, "/") : null;
};

const unpackPacker = (source: string) => {
  const match = PACKER_REGEX.exec(source);
  if (!match) return source;
  const args = splitArgs(match[1]);
  if (args.length < 4) return source;
  const payload = unquote(args[0]);
  const base = parseInt(args[1], 10);
  const count = parseInt(args[2], 10);
  const dictSource = extractDictSource(args[3]);
  if (!payload || Number.isNaN(base) || Number.isNaN(count) || !dictSource) {
    return source;
  }
  const dict = dictSource.split("|");
  let unpacked = payload;
  for (let i = count - 1; i >= 0; i -= 1) {
    if (dict[i]) {
      const key = encodeBase(i, base);
      const re = new RegExp(`\\b${key}\\b`, "g");
      unpacked = unpacked.replace(re, dict[i]);
    }
  }
  return unpacked;
};

export function resolveDm5ImageUrl(
  responseText: string,
  entityItem?: { cid?: string; key?: string },
) {
  const scriptText = unpackPacker(responseText) || responseText;
  const hd = extractArrayVar(scriptText, "hd_c");
  const dArr = extractArrayVar(scriptText, "d");
  const pvalue = extractArrayVar(scriptText, "pvalue");
  const arr = extractAnyArray(scriptText);
  const candidate =
    (hd && hd[0]) ||
    (dArr && dArr[0]) ||
    (pvalue && pvalue[0]) ||
    (arr && arr[0]) ||
    extractFirstUrl(scriptText) ||
    "";
  const baseUrl = extractFirstUrl(scriptText);
  const queryMatch = /\\?cid=\d+&key=[0-9a-z]+/i.exec(scriptText);
  const cidMatch = /cid\s*=\s*(\d+)/.exec(scriptText);
  const keyMatch = /key\s*=\s*['"]?([^'"]+)['"]?/i.exec(scriptText);
  const cidFromQuery = /cid=(\d+)/i.exec(scriptText);
  const keyFromQuery = /key=([0-9a-zA-Z]+)/i.exec(scriptText);
  const keyFromHex = /[0-9a-f]{32}/i.exec(scriptText);
  const derivedQuery =
    cidMatch && keyMatch && keyMatch[1]
      ? `cid=${cidMatch[1]}&key=${keyMatch[1]}`
      : cidFromQuery && keyFromQuery
        ? `cid=${cidFromQuery[1]}&key=${keyFromQuery[1]}`
        : "";
  const entityKey =
    entityItem && (entityItem.key || (keyFromHex && keyFromHex[0]));
  const entityFallback =
    !derivedQuery && entityItem && entityItem.cid && entityKey
      ? `cid=${entityItem.cid}&key=${entityKey}`
      : "";
  let resolved = String(candidate || "");
  if (resolved && !resolved.startsWith("http") && baseUrl) {
    resolved = resolved.startsWith("/")
      ? `${baseUrl}${resolved}`
      : `${baseUrl}/${resolved}`;
  }
  if (
    resolved &&
    !resolved.includes("?") &&
    (queryMatch || derivedQuery || entityFallback)
  ) {
    const rawQuery = queryMatch
      ? queryMatch[0]
      : derivedQuery || entityFallback;
    const query = rawQuery.startsWith("?") ? rawQuery : `?${rawQuery}`;
    resolved += query;
  }
  return resolved;
}
