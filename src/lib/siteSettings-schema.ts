export interface SiteSettings {
  siteName: string;
  siteAliases: string;
  siteDescription: string;
  heroSubtitle: string;
  contactEmail: string;
  socialGithub: string;
  socialTwitter: string;
  socialLinkedin: string;
  responseTimeHours: string;
  footerChucklesGifUrl: string;
  legalEffectiveDate: string;
  privacyPolicy: string;
  termsOfService: string;
}

export const SITE_SETTING_KEYS: Record<keyof SiteSettings, string> = {
  siteName: "site_name",
  siteAliases: "site_aliases",
  siteDescription: "site_description",
  heroSubtitle: "hero_subtitle",
  contactEmail: "contact_email",
  socialGithub: "social_github",
  socialTwitter: "social_twitter",
  socialLinkedin: "social_linkedin",
  responseTimeHours: "response_time_hours",
  footerChucklesGifUrl: "footer_chuckles_gif_url",
  legalEffectiveDate: "legal_effective_date",
  privacyPolicy: "privacy_policy",
  termsOfService: "terms_of_service",
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: "Kaine",
  siteAliases: "Kaine, Tommy",
  siteDescription:
    "Building anything & everything. Portfolio of Kaine.",
  heroSubtitle: "DEVELOPER - DESIGNER - BUILDER",
  contactEmail: "hello@phao.dev",
  socialGithub: "https://github.com/xdkaine",
  socialTwitter: "https://x.com/xdkaine",
  socialLinkedin: "https://linkedin.com/in/thomasphao",
  responseTimeHours: "24",
  footerChucklesGifUrl: "",
  legalEffectiveDate: "2026-03-12",
  privacyPolicy:
    "We collect contact details only when you submit the contact form. We use this data solely to respond to your inquiry and do not sell personal information.",
  termsOfService:
    "All content on this website is provided for informational purposes. Project availability, timelines, and pricing are subject to change.",
};

export const PUBLIC_SITE_SETTING_NAMES = [
  "siteName",
  "siteAliases",
  "siteDescription",
  "heroSubtitle",
  "contactEmail",
  "socialGithub",
  "socialTwitter",
  "socialLinkedin",
  "responseTimeHours",
  "footerChucklesGifUrl",
] as const;

export type PublicSiteSettings = Pick<
  SiteSettings,
  (typeof PUBLIC_SITE_SETTING_NAMES)[number]
>;

export const DEFAULT_PUBLIC_SITE_SETTINGS: PublicSiteSettings = {
  siteName: DEFAULT_SITE_SETTINGS.siteName,
  siteAliases: DEFAULT_SITE_SETTINGS.siteAliases,
  siteDescription: DEFAULT_SITE_SETTINGS.siteDescription,
  heroSubtitle: DEFAULT_SITE_SETTINGS.heroSubtitle,
  contactEmail: DEFAULT_SITE_SETTINGS.contactEmail,
  socialGithub: DEFAULT_SITE_SETTINGS.socialGithub,
  socialTwitter: DEFAULT_SITE_SETTINGS.socialTwitter,
  socialLinkedin: DEFAULT_SITE_SETTINGS.socialLinkedin,
  responseTimeHours: DEFAULT_SITE_SETTINGS.responseTimeHours,
  footerChucklesGifUrl: DEFAULT_SITE_SETTINGS.footerChucklesGifUrl,
};

const SETTINGS_MAX_LENGTH: Record<keyof SiteSettings, number> = {
  siteName: 80,
  siteAliases: 240,
  siteDescription: 320,
  heroSubtitle: 120,
  contactEmail: 160,
  socialGithub: 2048,
  socialTwitter: 2048,
  socialLinkedin: 2048,
  responseTimeHours: 3,
  footerChucklesGifUrl: 2048,
  legalEffectiveDate: 32,
  privacyPolicy: 50000,
  termsOfService: 50000,
};

const REQUIRED_FIELDS = new Set<keyof SiteSettings>([
  "siteName",
  "siteAliases",
  "siteDescription",
  "heroSubtitle",
  "contactEmail",
  "responseTimeHours",
  "legalEffectiveDate",
  "privacyPolicy",
  "termsOfService",
]);

const URL_FIELDS = new Set<keyof SiteSettings>([
  "socialGithub",
  "socialTwitter",
  "socialLinkedin",
  "footerChucklesGifUrl",
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HOURS_REGEX = /^\d{1,3}$/;

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function mapDbRowsToSiteSettings(
  rows: { key: string; value: string }[],
): SiteSettings {
  const settings: SiteSettings = { ...DEFAULT_SITE_SETTINGS };
  const dbKeyToName = new Map<string, keyof SiteSettings>(
    (Object.entries(SITE_SETTING_KEYS) as [keyof SiteSettings, string][]).map(
      ([name, key]) => [key, name],
    ),
  );

  for (const row of rows) {
    const settingName = dbKeyToName.get(row.key);
    if (!settingName) continue;
    const nextValue = typeof row.value === "string" ? row.value : "";
    settings[settingName] = nextValue || DEFAULT_SITE_SETTINGS[settingName];
  }

  return settings;
}

export function pickPublicSiteSettings(
  settings: SiteSettings,
): PublicSiteSettings {
  return {
    siteName: settings.siteName,
    siteAliases: settings.siteAliases,
    siteDescription: settings.siteDescription,
    heroSubtitle: settings.heroSubtitle,
    contactEmail: settings.contactEmail,
    socialGithub: settings.socialGithub,
    socialTwitter: settings.socialTwitter,
    socialLinkedin: settings.socialLinkedin,
    responseTimeHours: settings.responseTimeHours,
    footerChucklesGifUrl: settings.footerChucklesGifUrl,
  };
}

export function sanitizeSiteSettingsInput(
  input: unknown,
): Partial<SiteSettings> {
  if (!input || typeof input !== "object") {
    return {};
  }

  const payload = input as Record<string, unknown>;
  const sanitized: Partial<SiteSettings> = {};

  for (const name of Object.keys(SITE_SETTING_KEYS) as (keyof SiteSettings)[]) {
    const rawValue = payload[name];
    if (typeof rawValue !== "string") continue;

    const value = rawValue.trim();
    const maxLength = SETTINGS_MAX_LENGTH[name];
    if (value.length > maxLength) continue;

    if (!value && REQUIRED_FIELDS.has(name)) continue;
    if (name === "contactEmail" && value && !EMAIL_REGEX.test(value)) continue;
    if (name === "legalEffectiveDate" && value && !DATE_REGEX.test(value)) continue;
    if (name === "responseTimeHours" && value && !HOURS_REGEX.test(value)) continue;

    if (URL_FIELDS.has(name) && value && !isValidHttpUrl(value)) {
      continue;
    }

    sanitized[name] = value;
  }

  return sanitized;
}
