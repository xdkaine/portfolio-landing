interface ProjectTeaserInput {
  description: string;
  caseStudy?: { subtitle?: string; pitch?: string } | null;
}

// Use the editorial summary rather than serializing the full write-up into a card.
export function getProjectTeaser(project: ProjectTeaserInput): string {
  const summary = (project.caseStudy?.subtitle?.trim()
    || project.caseStudy?.pitch?.trim()
    || project.description.trim()).replace(/\s+/g, " ");
  const limit = 220;
  if (summary.length <= limit) return summary;

  const preview = summary.slice(0, limit - 1);
  const sentence = preview.match(/^(.{70,}?[.!?])(?:\s|$)/)?.[1];
  if (sentence) return sentence;
  const boundary = preview.lastIndexOf(" ");
  return `${preview.slice(0, boundary > 0 ? boundary : preview.length).trimEnd()}…`;
}
