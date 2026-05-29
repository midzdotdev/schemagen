// Format detection for strings. See docs/ir-spec.md § "Node kinds" § "string".

import type { FormatName } from "../ir/types";

// Order matters: more specific patterns must be checked before more permissive
// ones (hostname matches IPv4 by its digits-and-dots pattern, so IPv4 has to
// run first).
export const ALL_FORMATS: readonly FormatName[] = [
  "uuid",
  "date-time",
  "date",
  "email",
  "uri",
  "ipv4",
  "ipv6",
  "hostname",
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOSTNAME = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const IPV4_OCTET = /^(?:0|[1-9]\d{0,2})$/;
const IPV6 =
  /^(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$|^(?:[0-9a-f]{1,4}:){1,7}:$|^:(?::[0-9a-f]{1,4}){1,7}$|^(?:[0-9a-f]{1,4}:){1,6}(?::[0-9a-f]{1,4}){1,6}$|^::$/i;

export const FORMAT_MATCHERS: Record<FormatName, (v: string) => boolean> = {
  date: (v) => ISO_DATE.test(v) && !Number.isNaN(Date.parse(v)),
  "date-time": (v) => ISO_DATETIME.test(v) && !Number.isNaN(Date.parse(v)),
  uuid: (v) => UUID.test(v),
  email: (v) => EMAIL.test(v),
  uri: (v) => {
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:" || u.protocol.length > 0;
    } catch {
      return false;
    }
  },
  hostname: (v) => HOSTNAME.test(v) && v.length <= 253,
  ipv4: (v) => {
    const parts = v.split(".");
    if (parts.length !== 4) return false;
    return parts.every((p) => IPV4_OCTET.test(p) && Number(p) <= 255);
  },
  ipv6: (v) => IPV6.test(v),
};

export function detectFormat(
  values: Iterable<string>,
  enabled: boolean,
  detect: FormatName[] | "all",
): FormatName | undefined {
  if (!enabled) return undefined;
  const candidates = detect === "all" ? ALL_FORMATS : detect;
  const arr = Array.from(values);
  if (arr.length === 0) return undefined;
  for (const fmt of candidates) {
    const match = FORMAT_MATCHERS[fmt];
    if (arr.every((v) => match(v))) return fmt;
  }
  return undefined;
}
