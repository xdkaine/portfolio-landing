import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set to run the seed script.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Seed admin account used to access the dashboard.
  const hashedPassword = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@xtomm.dev" },
    update: {},
    create: {
      email: "admin@xtomm.dev",
      password: hashedPassword,
      name: "XTOMM",
      role: "ADMIN",
    },
  });
  console.log("  Admin user created (admin@xtomm.dev / admin123)");

  // Seed portfolio projects.
  const projectsData = [
    {
      number: "01",
      title: "VOID ENGINE",
      description:
        "A real-time 3D rendering engine built from scratch using WebGL2. Features PBR materials, dynamic shadows, scene graph architecture, and a custom GLSL shader pipeline.",
      tags: ["WEBGL", "TYPESCRIPT", "GLSL"],
      year: "2025",
      status: "LIVE" as const,
      featured: true,
      sortOrder: 1,
    },
    {
      number: "02",
      title: "SIGNAL",
      description:
        "End-to-end encrypted real-time messaging platform. Custom WebSocket protocol with optimistic UI updates, offline-first sync, and minimal client footprint.",
      tags: ["REACT", "NODE.JS", "WEBSOCKET"],
      year: "2025",
      status: "LIVE" as const,
      featured: true,
      sortOrder: 2,
    },
    {
      number: "03",
      title: "FORGE CLI",
      description:
        "Developer workflow automation tool built in Rust. Scaffolds projects, manages environments, and orchestrates build pipelines through a zero-config terminal interface.",
      tags: ["RUST", "CLI", "SYSTEMS"],
      year: "2025",
      status: "IN_PROGRESS" as const,
      featured: true,
      sortOrder: 3,
    },
    {
      number: "04",
      title: "PIXEL NOIR",
      description:
        "Procedural art generation engine creating unique compositions through layered algorithms. Noise functions, generative color theory, and Canvas API at the core.",
      tags: ["CANVAS API", "TYPESCRIPT", "GENERATIVE"],
      year: "2024",
      status: "LIVE" as const,
      featured: true,
      sortOrder: 4,
    },
    {
      number: "05",
      title: "DATASTREAM",
      description:
        "Real-time analytics dashboard with live data visualization. Custom D3 chart components, streaming PostgreSQL queries, and responsive grid layouts.",
      tags: ["NEXT.JS", "D3", "POSTGRESQL"],
      year: "2024",
      status: "LIVE" as const,
      featured: false,
      sortOrder: 5,
    },
    {
      number: "06",
      title: "HEXGRID",
      description:
        "Interactive hexagonal grid system for spatial data visualization and mapping. SVG rendering with physics simulation, A* pathfinding, and dynamic cell states.",
      tags: ["SVG", "REACT", "ALGORITHMS"],
      year: "2024",
      status: "ARCHIVED" as const,
      featured: false,
      sortOrder: 6,
    },
  ];

  for (const project of projectsData) {
    await prisma.project.upsert({
      where: { number: project.number },
      update: project,
      create: project,
    });
  }
  console.log(`  ${projectsData.length} projects seeded`);

  // Seed initial blog posts.
  const postsData = [
    {
      slug: "brutalist-web-design",
      title: "THE CASE FOR BRUTALIST WEB DESIGN",
      excerpt:
        "A manifesto on rejecting design trends and embracing raw, honest interfaces that prioritize function and authenticity over decoration.",
      date: "2025.11.15",
      readTime: "5 MIN",
      tags: ["DESIGN", "OPINION"],
      published: true,
    },
    {
      slug: "webgl-renderer",
      title: "BUILDING A WEBGL RENDERER FROM SCRATCH",
      excerpt:
        "A deep dive into the fundamentals of real-time graphics programming. From triangle rasterization to physically-based rendering pipelines.",
      date: "2025.10.22",
      readTime: "12 MIN",
      tags: ["WEBGL", "TUTORIAL"],
      published: true,
    },
    {
      slug: "rust-changed-my-thinking",
      title: "RUST CHANGED HOW I THINK ABOUT CODE",
      excerpt:
        "Ownership, borrowing, and zero-cost abstractions. How learning Rust fundamentally altered my approach to TypeScript architecture.",
      date: "2025.09.08",
      readTime: "8 MIN",
      tags: ["RUST", "LANGUAGES"],
      published: true,
    },
    {
      slug: "performance-is-a-feature",
      title: "PERFORMANCE IS A FEATURE, NOT AN OPTIMIZATION",
      excerpt:
        "Why speed should be a core design constraint, not an afterthought. Loading states are a design failure we've normalized.",
      date: "2025.08.14",
      readTime: "6 MIN",
      tags: ["PERFORMANCE", "ENGINEERING"],
      published: true,
    },
    {
      slug: "death-of-ui-creativity",
      title: "THE DEATH OF CREATIVITY IN UI DESIGN",
      excerpt:
        "Every website looks the same. Design systems killed personality. Here's why that matters and what we can do about it.",
      date: "2025.07.30",
      readTime: "7 MIN",
      tags: ["DESIGN", "OPINION"],
      published: true,
    },
  ];

  for (const post of postsData) {
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: post,
      create: post,
    });
  }
  console.log(`  ${postsData.length} posts seeded`);

  // Seed site-level configuration values.
  const settings = [
    { key: "site_name", value: "Kaine" },
    { key: "site_aliases", value: "Kaine, Tommy" },
    {
      key: "site_description",
      value:
        "Building digital experiences that refuse to blend in. Portfolio of Kaine.",
    },
    { key: "hero_subtitle", value: "DEVELOPER - DESIGNER - BUILDER" },
    { key: "contact_email", value: "hello@phao.dev" },
    { key: "social_github", value: "https://github.com/xtomm" },
    { key: "social_twitter", value: "https://x.com/xtomm" },
    { key: "social_linkedin", value: "https://linkedin.com/in/xtomm" },
    { key: "response_time_hours", value: "24" },
    { key: "legal_effective_date", value: "2026-03-12" },
    {
      key: "privacy_policy",
      value:
        "We collect contact details only when you submit the contact form. We use this data solely to respond to your inquiry and do not sell personal information.",
    },
    {
      key: "terms_of_service",
      value:
        "All content on this website is provided for informational purposes. Project availability, timelines, and pricing are subject to change.",
    },
  ];

  for (const setting of settings) {
    await prisma.siteSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log(`  ${settings.length} site settings seeded`);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
