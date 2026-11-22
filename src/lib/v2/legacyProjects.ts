const legacyProjectNumbers: Record<string, string> = {
  "uar": "1",
  "uma": "2",
  "tbd-dev": "3",
  "rog-tools": "4",
  "term-ios": "5",
  "btchat": "6",
  "the-machine": "8",
  "sdc-cloud": "9"
};

export function legacyProjectNumber(slug: string): string | undefined {
  return Object.hasOwn(legacyProjectNumbers, slug) ? legacyProjectNumbers[slug] : undefined;
}
