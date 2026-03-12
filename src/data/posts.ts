export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  tags: string[];
}

export const posts: Post[] = [
  {
    id: "01",
    slug: "brutalist-web-design",
    title: "THE CASE FOR BRUTALIST WEB DESIGN",
    excerpt:
      "A manifesto on rejecting design trends and embracing raw, honest interfaces that prioritize function and authenticity over decoration.",
    date: "2025.11.15",
    readTime: "5 MIN",
    tags: ["DESIGN", "OPINION"],
  },
  {
    id: "02",
    slug: "webgl-renderer",
    title: "BUILDING A WEBGL RENDERER FROM SCRATCH",
    excerpt:
      "A deep dive into the fundamentals of real-time graphics programming. From triangle rasterization to physically-based rendering pipelines.",
    date: "2025.10.22",
    readTime: "12 MIN",
    tags: ["WEBGL", "TUTORIAL"],
  },
  {
    id: "03",
    slug: "rust-changed-my-thinking",
    title: "RUST CHANGED HOW I THINK ABOUT CODE",
    excerpt:
      "Ownership, borrowing, and zero-cost abstractions. How learning Rust fundamentally altered my approach to TypeScript architecture.",
    date: "2025.09.08",
    readTime: "8 MIN",
    tags: ["RUST", "LANGUAGES"],
  },
  {
    id: "04",
    slug: "performance-is-a-feature",
    title: "PERFORMANCE IS A FEATURE, NOT AN OPTIMIZATION",
    excerpt:
      "Why speed should be a core design constraint, not an afterthought. Loading states are a design failure we've normalized.",
    date: "2025.08.14",
    readTime: "6 MIN",
    tags: ["PERFORMANCE", "ENGINEERING"],
  },
  {
    id: "05",
    slug: "death-of-ui-creativity",
    title: "THE DEATH OF CREATIVITY IN UI DESIGN",
    excerpt:
      "Every website looks the same. Design systems killed personality. Here's why that matters and what we can do about it.",
    date: "2025.07.30",
    readTime: "7 MIN",
    tags: ["DESIGN", "OPINION"],
  },
];
