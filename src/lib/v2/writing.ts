import {
  DISCIPLINES,
  getProject,
  parseProjectQuery,
  type Discipline,
  type ProjectQuery,
} from "@/lib/v2/catalog";
import {
  hasPostBody,
  isSafePostMediaSource,
  normalizePostDocument,
  type PostDocument,
} from "@/lib/postContent";
import { normalizeV1PublicUrl } from "@/lib/v1Path";

export type WritingQuery = Required<ProjectQuery>;
export type WritingProject = { slug: string; title: string; href: string };
export type WritingSummary = {
  kind: "writing";
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  publishedAt: string | null;
  updatedAt: string;
  readTime: string;
  tags: string[];
  coverImage: string | null;
  coverAlt: string | null;
  featured: boolean;
  href: string;
  disciplines: Exclude<Discipline, "All">[];
  relatedProjects: WritingProject[];
};
export type WritingArticle = WritingSummary & {
  bodyJson: PostDocument | null;
  content: string | null;
};
export type WritingList = {
  items: WritingSummary[];
  total: number;
  query: WritingQuery;
};

// These classifications and relationships belong to v2 presentation. Article
// titles, excerpts, dates, and bodies always come from the published CMS reader.
const writingContext: Record<string, {
  disciplines: Exclude<Discipline, "All">[];
  projectSlugs: string[];
}> = {
  "building-my-homelab": { disciplines: ["Infrastructure"], projectSlugs: [] },
  "building-the-satono-diamond-center1": {
    disciplines: ["Infrastructure", "Identity & security"],
    projectSlugs: ["sdc-cloud"],
  },
};

export type PublishedWritingSummarySource = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  publishedAt: string | null;
  updatedAt: string;
  readTime: string;
  tags: string[];
  coverImage: string | null;
  coverAlt: string | null;
  featured: boolean;
  status?: string;
  published?: boolean;
  deletedAt?: unknown;
};
export type PublishedWritingArticleSource = PublishedWritingSummarySource & {
  status: string;
  published: boolean;
  bodyJson: unknown;
  content: string | null;
};
export type PublishedWritingReader = {
  list: () => Promise<PublishedWritingSummarySource[]>;
  get: (slug: string) => Promise<PublishedWritingArticleSource | null>;
};

export class WritingUnavailableError extends Error {
  constructor() {
    super("Writing is temporarily unavailable. Please try again.");
    this.name = "WritingUnavailableError";
  }
}

export function parseWritingQuery(params: URLSearchParams): WritingQuery {
  return parseProjectQuery(params);
}

function toSummary(source: PublishedWritingSummarySource): WritingSummary | null {
  // The shared reader owns publication/snapshot semantics. These additional
  // checks fail closed if it ever supplies explicit non-public state.
  if ((source.status !== undefined && source.status !== "PUBLISHED") ||
      source.published === false || source.deletedAt != null ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source.slug)) return null;

  const context = Object.hasOwn(writingContext, source.slug)
    ? writingContext[source.slug]
    : undefined;
  const taggedDisciplines = DISCIPLINES.filter(
    (discipline): discipline is Exclude<Discipline, "All"> =>
      discipline !== "All" && source.tags.some(tag => tag.toLowerCase() === discipline.toLowerCase()),
  );
  const disciplines = [...new Set([...(context?.disciplines ?? []), ...taggedDisciplines])];
  const relatedProjects = (context?.projectSlugs ?? []).flatMap(slug => {
    const project = getProject(slug);
    return project ? [{ slug: project.slug, title: project.title, href: project.href }] : [];
  });
  const coverImage = source.coverImage && isSafePostMediaSource(source.coverImage)
    ? normalizeV1PublicUrl(source.coverImage)
    : null;

  // Explicit fields prevent current or future CMS metadata from becoming part
  // of the independent v2 public contract.
  return {
    kind: "writing",
    slug: source.slug,
    title: source.title,
    excerpt: source.excerpt,
    date: source.date,
    publishedAt: source.publishedAt,
    updatedAt: source.updatedAt,
    readTime: source.readTime,
    tags: [...source.tags],
    coverImage,
    coverAlt: coverImage ? source.coverAlt : null,
    featured: source.featured,
    href: `/v2/writing/${source.slug}`,
    disciplines,
    relatedProjects,
  };
}

function matchesQuery(item: WritingSummary, query: WritingQuery): boolean {
  const words = query.q.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const haystack = [item.title, item.excerpt, ...item.tags, ...item.disciplines]
    .join(" ").toLocaleLowerCase();
  return (query.discipline === "All" || item.disciplines.includes(query.discipline)) &&
    words.every(word => haystack.includes(word));
}

export function createWritingService(reader: PublishedWritingReader) {
  return {
    async listWriting(options: ProjectQuery = {}): Promise<WritingList> {
      const params = new URLSearchParams();
      if (options.q !== undefined) params.set("q", options.q);
      if (options.discipline !== undefined) params.set("discipline", options.discipline);
      const query = parseWritingQuery(params);
      let source: PublishedWritingSummarySource[];
      try {
        source = await reader.list();
      } catch {
        throw new WritingUnavailableError();
      }
      const items = source.flatMap(post => {
        const item = toSummary(post);
        return item && matchesQuery(item, query) ? [item] : [];
      });
      return { items, total: items.length, query };
    },
    async getWriting(slug: string): Promise<WritingArticle | null> {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) return null;
      let source: PublishedWritingArticleSource | null;
      try {
        source = await reader.get(slug);
      } catch {
        throw new WritingUnavailableError();
      }
      if (!source || source.slug !== slug || source.status !== "PUBLISHED" || source.published !== true) return null;
      const summary = toSummary(source);
      if (!summary) return null;
      const document = normalizePostDocument(source.bodyJson);
      return {
        ...summary,
        bodyJson: hasPostBody(document) ? document : null,
        content: source.content?.trim() ? source.content : null,
      };
    },
  };
}

export function writingForProject(items: WritingSummary[], projectSlug: string): WritingSummary[] {
  return items.filter(item => item.relatedProjects.some(project => project.slug === projectSlug));
}
