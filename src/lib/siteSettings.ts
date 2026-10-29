import { requireVersion, CmsError } from "./cmsRules";
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
  actor = "Administrator",
): Promise<(SiteSettings & { _version: number }) | null> {
  const sanitized = sanitizeSiteSettingsInput(input);
  const entries = Object.entries(sanitized) as [keyof SiteSettings, string][];

  if (entries.length === 0) {
    return null;
  }

  const version = requireVersion(input);
  await prisma.$transaction(async (tx) => {
    await tx.siteSetting.upsert({
      where: { key: "cms_settings_version" },
      create: { key: "cms_settings_version", value: "1" },
      update: {},
    });
    const updated = await tx.siteSetting.updateMany({
      where: { key: "cms_settings_version", value: String(version) },
      data: { value: String(version + 1) },
    });
    if (updated.count !== 1)
      throw new CmsError(
        "Settings changed in another session. Reload before saving. Your edits have not overwritten newer settings.",
        409,
      );
    for (const [name, value] of entries)
      await tx.siteSetting.upsert({
        where: { key: SITE_SETTING_KEYS[name] },
        update: { value },
        create: { key: SITE_SETTING_KEYS[name], value },
      });
    await tx.cmsAuditEvent.create({
      data: {
        actor,
        action: "updated",
        entity: "settings",
        entityId: "site",
        summary: "Updated site configuration",
      },
    });
  });
  return getAdminSiteSettings();
}
export async function getAdminSiteSettings() {
  const [settings, record] = await prisma.$transaction(
    [
      prisma.siteSetting.findMany({
        where: { key: { in: DB_SETTING_KEYS } },
        select: { key: true, value: true },
      }),
      prisma.siteSetting.findUnique({ where: { key: "cms_settings_version" } }),
    ],
    { isolationLevel: "RepeatableRead" },
  );
  return {
    ...mapDbRowsToSiteSettings(settings),
    _version: Number(record?.value ?? 1),
  };
}
