// Independently curated from the owner's published portfolio on 28 October 2026.
// This slice never reads or writes v1 CMS records. See docs/v2-first-slice.md.
export const DISCIPLINES = [
  "All",
  "Infrastructure",
  "Identity & security",
  "Applications",
  "Experiments",
] as const;
export type Discipline = (typeof DISCIPLINES)[number];
export type Project = {
  slug: string;
  number: string;
  title: string;
  subtitle: string;
  summary: string;
  disciplines: Exclude<Discipline, "All">[];
  technologies: string[];
  state: "Built" | "In development";
  motif:
    | "uma"
    | "identity"
    | "platform"
    | "tools"
    | "terminal"
    | "network"
    | "vision"
    | "cloud";
  problem: string;
  approach: string[];
  source?: string;
  href: string;
};

const projects: Project[] = [
  {
    slug: "uma",
    number: "01",
    title: "Uma",
    subtitle: "Infrastructure, made approachable.",
    summary:
      "A role-aware workspace for Proxmox. Virtual machines, browser consoles, and administration brought into one considered interface.",
    disciplines: ["Infrastructure", "Identity & security", "Applications"],
    technologies: [
      "Next.js",
      "TypeScript",
      "Proxmox",
      "LDAP",
      "Redis",
      "Socket.IO",
      "MariaDB",
    ],
    state: "Built",
    motif: "uma",
    href: "/v2/work/uma",
    problem:
      "Shared infrastructure needs a usable management experience with boundaries around what each person can see and change.",
    approach: [
      "Put an application layer between authenticated users and the Proxmox API, with assigned pools, application access controls, and protected routes.",
      "Bring VM creation, snapshots, backups, replication, and hardware settings into a browser workspace, including VNC console access through a custom Node server.",
      "Give administrators dedicated ACL, audit, quota, and network tools. Add presence, chat, and a shared whiteboard around the operational work.",
    ],
    source: "https://github.com/xdkaine/uma-proxmox-wrapper-public",
  },
  {
    slug: "uar",
    number: "02",
    title: "UAR",
    subtitle: "Access requests with a paper trail.",
    summary:
      "An identity governance portal built around account requests, approval evidence, and visibility into an Active Directory environment.",
    disciplines: ["Identity & security", "Applications"],
    technologies: [
      "Next.js",
      "TypeScript",
      "PostgreSQL",
      "Prisma",
      "Redis",
      "LDAP",
    ],
    state: "Built",
    motif: "identity",
    href: "/v2/work/uar",
    problem:
      "Account creation in the Cal Poly Pomona SOC/SDC relied on manual handling, with limited visibility into the approval process.",
    approach: [
      "Translate an observed identity governance gap into a purpose-built request and approval workflow.",
      "Connect the application to the SDC.CPP Active Directory environment using LDAP, with PostgreSQL and Prisma supporting the application data.",
      "Apply lessons from an IT Audit / Technology Risk internship to make approval evidence and process visibility part of the product.",
    ],
  },
  {
    slug: "tbd-dev",
    number: "03",
    title: "TBD-DEV",
    subtitle: "From repository to running application.",
    summary:
      "An on-prem deployment platform for a school environment. A faster path for developers, with operational visibility for staff.",
    disciplines: ["Infrastructure", "Applications"],
    technologies: ["Proxmox", "LXC", "GitHub"],
    state: "In development",
    motif: "platform",
    href: "/v2/work/tbd-dev",
    problem:
      "Developers need a straightforward path to a live application while staff and faculty need policy controls and operational oversight.",
    approach: [
      "Design a self-hosted Platform-as-a-Service around infrastructure owned by the school.",
      "Use a Proxmox-first architecture with LXC containers to keep application deployments lightweight and practical for the environment.",
      "Bring the repository-to-deployment workflow together with the visibility needed to operate a shared platform.",
    ],
  },
  {
    slug: "rog-tools",
    number: "04",
    title: "ROG Tools",
    subtitle: "One community. A connected toolbox.",
    summary:
      "A shared platform for community tools spanning social features, media work, and game-specific applications.",
    disciplines: ["Applications"],
    technologies: [],
    state: "In development",
    motif: "tools",
    href: "/v2/work/rog-tools",
    problem:
      "Community tooling had grown into disconnected applications with fragmented sign-in and navigation.",
    approach: [
      "Build a common platform that lets members sign in once and move between purpose-built tools.",
      "Shape a connected experience around social, media, and game-specific workflows.",
    ],
  },
  {
    slug: "term-ios",
    number: "05",
    title: "term-ios",
    subtitle: "A terminal, on the move.",
    summary:
      "An exploration of an SSH terminal experience built as a native iOS application in Swift.",
    disciplines: ["Applications", "Experiments"],
    technologies: ["Swift", "iOS", "SSH"],
    state: "In development",
    motif: "terminal",
    href: "/v2/work/term-ios",
    problem:
      "Explore what an SSH terminal can feel like inside a native iOS application.",
    approach: [
      "Develop the terminal interface in Swift.",
      "Investigate the interaction and presentation challenges of SSH on a mobile device.",
    ],
  },
  {
    slug: "btchat",
    number: "06",
    title: "btchat",
    subtitle: "Communication beyond the usual channels.",
    summary:
      "An experiment in peer-to-peer and peer-to-multiple communication, with end-to-end encryption as a design goal.",
    disciplines: ["Identity & security", "Experiments"],
    technologies: [],
    state: "In development",
    motif: "network",
    href: "/v2/work/btchat",
    problem:
      "Explore communication that operates outside conventional centrally moderated channels.",
    approach: [
      "Investigate peer-to-peer and peer-to-multiple messaging patterns.",
      "Treat end-to-end encryption as a project goal while the experiment develops.",
    ],
  },
  {
    slug: "the-machine",
    number: "07",
    title: "The Machine",
    subtitle: "Making an intelligent system legible.",
    summary:
      "A project inspired by Person of Interest, exploring machine vision and natural language processing through an open view of the system.",
    disciplines: ["Experiments", "Applications"],
    technologies: ["Machine vision", "Natural language processing"],
    state: "Built",
    motif: "vision",
    href: "/v2/work/the-machine",
    problem:
      "Use a fictional system as a starting point for understanding how machine vision and natural language processing come together.",
    approach: [
      "Explore machine vision and natural language processing as parts of a larger system.",
      "Make the system's operation understandable through an open view of its design and deployment.",
    ],
  },
  {
    slug: "sdc-cloud",
    number: "08",
    title: "SDC Cloud",
    subtitle: "Infrastructure for a learning environment.",
    summary:
      "The cloud.calpolysoc.org project, part of the work behind the Satono Diamond Center.",
    disciplines: ["Infrastructure"],
    technologies: [],
    state: "Built",
    motif: "cloud",
    href: "/v2/work/sdc-cloud",
    problem:
      "Build infrastructure that supports the Cal Poly Pomona SOC/SDC environment.",
    approach: [
      "Develop cloud.calpolysoc.org as part of the Satono Diamond Center work.",
      "A deeper technical write-up is still being prepared; this entry keeps the published project visible in the library.",
    ],
  },
];

export type ProjectQuery = { q?: string; discipline?: Discipline };
export class ProjectQueryError extends Error {}

export function parseProjectQuery(
  params: URLSearchParams,
): Required<ProjectQuery> {
  const q = (params.get("q") ?? "").trim();
  const discipline = params.get("discipline") || "All";
  if (q.length > 120)
    throw new ProjectQueryError("Keep searches to 120 characters or fewer.");
  if (!DISCIPLINES.includes(discipline as Discipline))
    throw new ProjectQueryError(
      "Choose a discipline from the available filters.",
    );
  return { q, discipline: discipline as Discipline };
}

export function listProjects({
  q = "",
  discipline = "All",
}: ProjectQuery = {}) {
  const words = q.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const items = projects.filter((project) => {
    const haystack = [
      project.title,
      project.subtitle,
      project.summary,
      ...project.technologies,
      ...project.disciplines,
    ]
      .join(" ")
      .toLocaleLowerCase();
    return (
      (discipline === "All" || project.disciplines.includes(discipline)) &&
      words.every((word) => haystack.includes(word))
    );
  });
  return {
    items,
    total: items.length,
    disciplines: DISCIPLINES,
    query: { q, discipline },
  };
}

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
export function getHome() {
  return {
    name: "Thomas Phao",
    description:
      "Systems engineer, developer, and a curious builder. I work where infrastructure, identity, and useful software meet.",
    projects: projects.slice(0, 3),
    projectCount: projects.length,
  };
}
