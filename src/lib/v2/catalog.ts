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
export type ProjectEvidence = {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
};
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
  writeup?: "Case study" | "Project note";
  context?: string;
  decisions?: { title: string; body: string }[];
  evidence?: ProjectEvidence[];
};

const projects: Project[] = [
  {
    slug: "uma",
    number: "01",
    title: "Uma",
    subtitle: "A web workspace for shared Proxmox infrastructure.",
    summary:
      "LDAP sign-in, pool-scoped virtual machines, and browser VNC consoles in a custom Proxmox management application.",
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
    writeup: "Case study",
    context:
      "I built Uma for a shared internal Proxmox environment. The application sits between users and the cluster, giving them VM workflows within assigned pools while administrators manage access, quotas, and the wider infrastructure.",
    problem:
      "Users needed to work with virtual machines without receiving the full Proxmox administration interface. The application had to expose useful operations while preserving the boundary between a user's assigned resources and cluster administration.",
    approach: [
      "Authenticate against LDAP/Active Directory, then resolve access through application controls, pool ownership, and Proxmox ACLs before performing infrastructure operations.",
      "Use Next.js and a custom Node server for VM management and browser consoles. The VNC connection passes through a WebSocket proxy and TLS tunnel to Proxmox.",
      "Keep ACLs, audit logs, pool limits, and SDN tools in administrator views. Redis supports caching and rate limiting; MariaDB stores application data through Prisma.",
    ],
    source: "https://github.com/xdkaine/uma-proxmox-wrapper-public",
    decisions: [
      {
        title: "Scope access to the resource",
        body: "LDAP identifies the user. Pool ownership, group membership, and Proxmox ACLs determine which resources and actions the application exposes. Signing in alone does not grant cluster-wide control.",
      },
      {
        title: "Handle consoles outside a normal API response",
        body: "VM management uses the Proxmox REST API, but a VNC console needs a persistent connection. A custom Node server supports the WebSocket proxy alongside the Next.js application.",
      },
      {
        title: "Keep administration in the same workspace",
        body: "Administrators have dedicated views for access rules, quotas, audit events, and networking. The wider application also includes documentation, chat, presence, and a shared whiteboard.",
      },
    ],
    evidence: [
      {
        src: "/v2/uma-workspace.png",
        alt: "Uma workspace showing virtual machine and resource pool management",
        caption: "The published Uma workspace. Users work with the virtual machines and pools available to them.",
        width: 2560,
        height: 1392,
      },
      {
        src: "/v2/uma-overview.png",
        alt: "Uma administrator dashboard with cluster overview and resource management controls",
        caption: "Administrator view from the published project. These are historical screenshots, not live cluster data.",
        width: 2560,
        height: 1392,
      },
    ],
  },
  {
    slug: "uar",
    number: "02",
    title: "UAR",
    subtitle: "Access requests and directory operations for a student data center.",
    summary:
      "Email verification, reviewer approvals, and Active Directory/VPN provisioning for Cal Poly Pomona's student data center.",
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
    writeup: "Case study",
    context:
      "I built the User Access Request Portal while volunteering in Cal Poly Pomona's SOC/SDC. Account creation involved manual handling, and it was difficult to follow a request from intake through approval to provisioning.",
    problem:
      "Staff needed a record of who requested access, who approved it, and whether an account had been provisioned. The portal also had to handle existing directory accounts and account changes after the initial request.",
    approach: [
      "Move requests through email verification, Student Director review, faculty approval when required, and account provisioning. Store request state and approval history in PostgreSQL through Prisma.",
      "Connect to Active Directory through LDAP for account lookup and lifecycle operations. Develop and test directory changes against a non-production clone of the domain.",
      "Add an operations dashboard for account enable/disable, revoke/restore, batch creation, and support tickets. Protect public intake with verification tokens, rate limiting, and abuse checks.",
    ],
    source: "https://github.com/xdkaine/uar-web-public",
    decisions: [
      {
        title: "Make the approval state explicit",
        body: "A request begins with email verification, then enters Student Director review. Requests that need faculty action move to a separate review stage before approval and provisioning.",
      },
      {
        title: "Test directory writes away from production",
        body: "I used a non-production Active Directory clone to test user creation, attribute changes, and account cleanup before connecting those workflows to the live environment.",
      },
      {
        title: "Handle the account after approval",
        body: "Provisioning is one part of the lifecycle. The portal includes account activation, password recovery, expiration handling, support tickets, and operations on existing accounts.",
      },
    ],
    evidence: [
      {
        src: "/v2/uar-dashboard.png",
        alt: "UAR administrator dashboard with verification and reviewer queues above an access-request table",
        caption: "Published administrator view showing the request queues. Counts and email addresses were obscured in the original screenshot.",
        width: 2559,
        height: 1274,
      },
      {
        src: "/v2/uar-request.png",
        alt: "UAR internal student access-request form with example name and university email",
        caption: "Internal student request form, shown with example data. Email verification precedes the review queue.",
        width: 2558,
        height: 1280,
      },
    ],
  },
  {
    slug: "tbd-dev",
    number: "03",
    title: "TBD-DEV",
    subtitle: "GitHub builds running on Proxmox LXC containers.",
    summary:
      "An in-progress on-prem deployment platform that builds GitHub projects as OCI images and prepares them to run in Proxmox LXC containers.",
    disciplines: ["Infrastructure", "Applications"],
    technologies: ["Proxmox", "LXC", "GitHub", "FastAPI", "PostgreSQL", "Next.js", "OCI"],
    state: "In development",
    motif: "platform",
    href: "/v2/work/tbd-dev",
    writeup: "Project note",
    context:
      "I designed TBD-DEV for a school environment: developers connect a repository and deploy applications, while staff retain control of the infrastructure, routing, quotas, and access policy.",
    problem:
      "GitHub builds produce container images, but the target runtime is Proxmox LXC. The platform needs to bridge those formats and manage what happens after an application starts.",
    approach: [
      "Separate a FastAPI/PostgreSQL control plane from the runtime plane. Use Next.js for developer, staff, and administrator views.",
      "Build applications as OCI images, push them to an internal registry, then unpack their root filesystems and prepare them for LXC execution.",
      "Handle runtime initialization, secret injection, health checks, Nginx routing, and rollback as deployment operations. The project remains in development.",
    ],
  },
  {
    slug: "rog-tools",
    number: "04",
    title: "ROG Tools",
    subtitle: "Self-hosted applications for Republic of Gaming.",
    summary:
      "Community, media, and Escape from Tarkov tools sharing one sign-in, with a desktop companion for game-log and screenshot workflows.",
    disciplines: ["Applications"],
    technologies: ["Next.js", "Express", "Nginx", "Redis", "MariaDB", "Docker Compose"],
    state: "In development",
    motif: "tools",
    href: "/v2/work/rog-tools",
    writeup: "Project note",
    context:
      "I built ROG Tools as separate applications for a community I am part of: a landing hub, media workspace, Tarkov workspace, authentication service, and desktop companion.",
    problem:
      "The tools serve different workflows and have different runtime needs, but members should be able to use one account across the suite.",
    approach: [
      "Use Nginx auth_request with a central Express authentication service and Redis sessions. Protected applications receive identity headers after the edge checks the request.",
      "Keep application runtimes and deployments separate. The Tarkov workspace includes maps, quest tracking, party coordination, and a desktop client using revocable device tokens.",
    ],
  },
  {
    slug: "term-ios",
    number: "05",
    title: "term-ios",
    subtitle: "An SSH terminal experiment for iOS.",
    summary:
      "A native Swift application exploring SSH terminal interaction on an iPhone.",
    disciplines: ["Applications", "Experiments"],
    technologies: ["Swift", "iOS", "SSH"],
    state: "In development",
    motif: "terminal",
    href: "/v2/work/term-ios",
    writeup: "Project note",
    problem:
      "Fit a remote shell into a native iOS interface and a small touch screen.",
    approach: [
      "Build the iOS application in Swift. This is an in-progress experiment; a detailed implementation write-up is not published yet.",
    ],
  },
  {
    slug: "btchat",
    number: "06",
    title: "btchat",
    subtitle: "Peer-to-peer Bluetooth messaging on iOS.",
    summary:
      "An iOS messaging experiment using Bluetooth for peer-to-peer communication, with end-to-end encryption as a project goal.",
    disciplines: ["Identity & security", "Experiments"],
    technologies: ["iOS", "Bluetooth"],
    state: "In development",
    motif: "network",
    href: "/v2/work/btchat",
    writeup: "Project note",
    problem:
      "Explore messaging between nearby devices without relying on a conventional central chat service.",
    approach: [
      "Investigate peer-to-peer and peer-to-multiple communication over Bluetooth. The project is in development; end-to-end encryption is a goal, not a verified claim about the current implementation.",
    ],
  },
  {
    slug: "the-machine",
    number: "07",
    title: "The Machine",
    subtitle: "A machine-vision and language-processing experiment.",
    summary:
      "A Person of Interest-inspired project exploring machine vision, natural language processing, and a containerized personal assistant.",
    disciplines: ["Experiments", "Applications"],
    technologies: ["Machine vision", "Natural language processing"],
    state: "Built",
    motif: "vision",
    href: "/v2/work/the-machine",
    writeup: "Project note",
    problem:
      "Use the fictional Machine from Person of Interest as a starting point for a practical machine-vision and language-processing experiment.",
    approach: [
      "Explore machine vision and natural language processing in a deployable, containerized application. The published project note is brief; it does not document model performance or operational results.",
    ],
  },
  {
    slug: "sdc-cloud",
    number: "08",
    title: "SDC Cloud",
    subtitle: "A cloud-services interface for the SDC.",
    summary:
      "A frontend for AWS-like services at cloud.calpolysoc.org, built as part of the Satono Diamond Center project.",
    disciplines: ["Infrastructure"],
    technologies: [],
    state: "Built",
    motif: "cloud",
    href: "/v2/work/sdc-cloud",
    writeup: "Project note",
    problem:
      "Provide a web interface for cloud services in the student data center environment.",
    approach: [
      "Build cloud.calpolysoc.org as part of the Satono Diamond Center project. The public repository and published screenshots are available; a detailed technical write-up is still being prepared.",
    ],
    source: "https://github.com/xdkaine/cloud.calpolysoc",
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
      "I build web applications for shared infrastructure: Proxmox management, directory access, and on-prem deployment.",
    projects: projects.slice(0, 3),
    projectCount: projects.length,
  };
}
