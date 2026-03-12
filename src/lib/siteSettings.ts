import "server-only";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_SITE_SETTINGS,
  mapDbRowsToSiteSettings,
  sanitizeSiteSettingsInput,
  SITE_SETTING_KEYS,
  type SiteSettings,
} from "@/lib/siteSettings-schema";

const DB_SETTING_KEYS = Object.values(SITE_SETTING_KEYS);

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: DB_SETTING_KEYS } },
      select: { key: true, value: true },
    });

    return mapDbRowsToSiteSettings(rows);
  } catch {
    return { ...DEFAULT_SITE_SETTINGS };
  }
}

export async function updateSiteSettings(
  input: unknown,
): Promise<SiteSettings | null> {
  const sanitized = sanitizeSiteSettingsInput(input);
  const entries = Object.entries(sanitized) as [keyof SiteSettings, string][];

  if (entries.length === 0) {
    return null;
  }

  await prisma.$transaction(
    entries.map(([name, value]) =>
      prisma.siteSetting.upsert({
        where: { key: SITE_SETTING_KEYS[name] },
        update: { value },
        create: {
          key: SITE_SETTING_KEYS[name],
          value,
        },
      }),
    ),
  );

  return getSiteSettings();
}

