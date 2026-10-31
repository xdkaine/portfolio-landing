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
  decisions?: { title: string; body: string; source?: string }[];
  evidence?: ProjectEvidence[];
};

const projects: Project[] = [
  {
    slug: "uma",
    number: "01",
    title: "Uma",
    subtitle: "VM management and browser consoles for Proxmox.",
    summary:
      "A Proxmox interface with LDAP sign-in, resource pools, and a custom WebSocket proxy for browser consoles.",
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
      "I built Uma for shared Proxmox infrastructure in Cal Poly Pomona's SOC/SDC. It combines a member workspace for virtual machines and resource pools with administrator tools for access, quotas, and cluster operations.",
    problem:
      "A console starts with a VNC ticket from Proxmox, followed by a persistent browser connection to the cluster. That path crosses both the Next.js API and a custom Node server, with permission checks and connection handling in different parts of the application.",
    approach: [
      "Use LDAP/Active Directory for sign-in, then check VM and pool ACLs for the requested operation.",
      "Issue VNC tickets through a Next.js route and carry browser console traffic through the Node server's WebSocket-to-TLS proxy.",
      "Store audit events and application data in MariaDB through Prisma; expose quotas, ACLs, and networking in administrator views.",
    ],
    source: "https://github.com/xdkaine/uma-proxmox-wrapper-public",
    decisions: [
      {
        title: "Check the VM action before issuing a ticket",
        body: "The console route checks the session and CSRF token before calling checkVMAccess. That function evaluates VM and pool permissions using the user's groups, Proxmox ACLs, and pool-management rights. An administrator can proceed directly. Other users need a matching grant; a denied request receives a 403 response before the application asks Proxmox for a VNC ticket. The permission decision is made on the server.",
        source: "https://github.com/xdkaine/uma-proxmox-wrapper-public/blob/9444cc5c8e465a3917309fa43a2260ae561abc21/lib/acl.ts",
      },
      {
        title: "Separate the ticket from the console connection",
        body: "The Next.js route asks Proxmox for a VNC ticket and returns the connection data. The browser then opens /api/proxy/vnc on the custom Node server. That server handles the WebSocket upgrade and opens a TLS connection to Proxmox's VNC endpoint. It passes the upgrade response back to the browser and pipes traffic between the two sockets, closing the other side when either connection ends.",
        source: "https://github.com/xdkaine/uma-proxmox-wrapper-public/blob/9444cc5c8e465a3917309fa43a2260ae561abc21/server.js",
      },
      {
        title: "Record what the ticket request did",
        body: "The route writes a VM_CONSOLE_OPEN audit event for rejected sessions, invalid CSRF tokens, permission denials, ticket errors, and successful ticket creation. Successful entries include the VM, node, username, and client context. Each event describes the ticket request and its result. Audit records are stored in MariaDB alongside the application's other persistent data and can be reviewed through the administrator interface.",
        source: "https://github.com/xdkaine/uma-proxmox-wrapper-public/blob/9444cc5c8e465a3917309fa43a2260ae561abc21/app/api/proxmox/vm/%5Bvmid%5D/vnc/route.ts",
      },
      {
        title: "The administrator workspace",
        body: "The administrator dashboard brings together cluster resources, pool limits, access rules, and networking. Pool limits cover CPU, memory, disk, and resource counts. The two screenshots show the working VM and pool view and the wider cluster overview. MariaDB stores application data through Prisma, while Redis supports caching and rate limiting.",
        source: "https://github.com/xdkaine/uma-proxmox-wrapper-public/blob/9444cc5c8e465a3917309fa43a2260ae561abc21/README.md#key-features",
      },
    ],
    evidence: [
      {
        src: "/v2/uma-workspace.png",
        alt: "Uma workspace showing virtual machine and resource pool management",
        caption: "Uma's VM workspace, with resource pools and virtual-machine controls.",
        width: 2560,
        height: 1392,
      },
      {
        src: "/v2/uma-overview.png",
        alt: "Uma administrator dashboard with cluster overview and resource management controls",
        caption: "Cluster overview and resource controls in the administrator dashboard. Historical project screenshot.",
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
      "I built the User Access Request Portal while volunteering in Cal Poly Pomona's SOC/SDC. Account creation involved manual handling, and staff needed to follow each request from intake through review to provisioning. The portal also brings directory accounts, VPN records, and support work into an operations dashboard.",
    problem:
      "Requests can refer to an existing Active Directory user, a new account, or temporary event access. Email verification, approval, and provisioning are separate stages, with their own failure and retry paths.",
    approach: [
      "Move requests through email verification, Student Director review, faculty approval when required, and account provisioning. Store request state and approval history in PostgreSQL through Prisma.",
      "Connect to Active Directory through LDAP for account lookup and lifecycle operations. Develop and test directory changes against a non-production clone of the domain.",
      "Add an operations dashboard for account enable/disable, revoke/restore, batch creation, and support tickets. Protect public intake with verification tokens, rate limiting, and abuse checks.",
    ],
    source: "https://github.com/xdkaine/uar-web-public",
    decisions: [
      {
        title: "Match existing accounts before provisioning",
        body: "For an internal request, the handler derives a BroncoName from the university email and looks it up in Active Directory. An existing account without a mail attribute is marked for linking, with its detected username saved on the request. The review record then carries both the new access request and the existing directory identity through the approval workflow.",
        source: "https://github.com/xdkaine/uar-web-public/blob/75cde9230da10c202fa790c1af0cfaaef76bdc2c/my-app/app/api/request/route.ts",
      },
      {
        title: "Save verification before sending the notification",
        body: "The verification handler claims an unused, unexpired token and moves the request into Student Director review in the database. It then attempts the administrator email. If SMTP fails, the request stays verified and the notification is marked for retry. The user receives a successful verification response, while staff can recover the notification separately. Requests needing faculty action have a further review stage before approval.",
        source: "https://github.com/xdkaine/uar-web-public/blob/75cde9230da10c202fa790c1af0cfaaef76bdc2c/my-app/app/api/verify/confirm/route.ts",
      },
      {
        title: "Test directory writes in a clone",
        body: "I used a non-production Active Directory clone to test user creation, attribute changes, and account cleanup before connecting those workflows to the live environment. The portal spans database state and directory operations. Its request record carries review history, linked usernames, provisioning state, and errors, giving administrators a record to inspect when an account operation needs attention.",
      },
      {
        title: "Continue beyond the approval queue",
        body: "The dashboard includes activation, password recovery, expiration handling, and queued account lifecycle actions. Existing AD and VPN records can be matched back to portal records, and staff can inspect, retry, or cancel lifecycle work. Support tickets keep follow-up account work attached to an authenticated user. These are separate operations from approving the initial request.",
        source: "https://github.com/xdkaine/uar-web-public/blob/75cde9230da10c202fa790c1af0cfaaef76bdc2c/README.md#administrative-operations-and-scheduled-processing",
      },
    ],
    evidence: [
      {
        src: "/v2/uar-dashboard.png",
        alt: "UAR administrator dashboard with verification and reviewer queues above an access-request table",
        caption: "Administrator review queues and request records. Counts and addresses were obscured in the published screenshot.",
        width: 2559,
        height: 1274,
      },
      {
        src: "/v2/uar-request.png",
        alt: "UAR internal student access-request form with example name and university email",
        caption: "Internal student intake form with example data, before email verification and review.",
        width: 2558,
        height: 1280,
      },
    ],
  },
  {
    slug: "tbd-dev",
    number: "03",
    title: "TBD-DEV",
    subtitle: "From a GitHub repository to a Proxmox LXC deployment.",
    summary:
      "An in-progress on-prem deployment platform that builds GitHub projects as OCI images and prepares them to run in Proxmox LXC containers.",
    disciplines: ["Infrastructure", "Applications"],
    technologies: ["Proxmox", "LXC", "GitHub", "FastAPI", "PostgreSQL", "Next.js", "OCI"],
    state: "In development",
    motif: "platform",
    href: "/v2/work/tbd-dev",
    writeup: "Project note",
    context:
      "An in-progress deployment platform for a school environment, with developer, staff, and administrator views.",
    problem:
      "The build output is an OCI image; the target runtime is a Proxmox LXC container.",
    approach: [
      "A FastAPI/PostgreSQL control plane tracks deployments, with Next.js views for developers and operators.",
      "The deployment path builds an OCI image, pushes it to an internal registry, then unpacks its root filesystem for LXC execution.",
      "Runtime initialization, secrets, health checks, Nginx routing, and rollback are part of the platform's development scope.",
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
      "I built these tools for Republic of Gaming, a community I am part of. The suite has a landing hub, media and Tarkov workspaces, and a desktop companion.",
    problem:
      "Members use one account across applications with separate runtimes and deployments.",
    approach: [
      "Nginx auth_request checks requests with a central Express authentication service backed by Redis sessions, then supplies identity headers to protected applications.",
      "The Tarkov workspace includes maps, quest tracking, and party coordination. Its desktop client uses revocable device tokens for game-log and screenshot workflows.",
    ],
  },
  {
    slug: "term-ios",
    number: "05",
    title: "term-ios",
    subtitle: "An SSH terminal experiment for iOS.",
    summary:
      "A Swift experiment in using a remote shell from an iPhone.",
    disciplines: ["Applications", "Experiments"],
    technologies: ["Swift", "iOS", "SSH"],
    state: "In development",
    motif: "terminal",
    href: "/v2/work/term-ios",
    writeup: "Project note",
    problem:
      "Remote shell interaction on a small touch screen.",
    approach: [
      "A native iOS interface, built in Swift. In development.",
    ],
  },
  {
    slug: "btchat",
    number: "06",
    title: "btchat",
    subtitle: "Peer-to-peer Bluetooth messaging on iOS.",
    summary:
      "Nearby messaging over Bluetooth, exploring one-to-one and group communication on iOS.",
    disciplines: ["Identity & security", "Experiments"],
    technologies: ["iOS", "Bluetooth"],
    state: "In development",
    motif: "network",
    href: "/v2/work/btchat",
    writeup: "Project note",
    problem:
      "Messaging between nearby devices without a central chat service.",
    approach: [
      "An iOS Bluetooth experiment. End-to-end encryption remains a project goal.",
    ],
  },
  {
    slug: "the-machine",
    number: "07",
    title: "The Machine",
    subtitle: "A machine-vision and language-processing experiment.",
    summary:
      "A containerized personal-assistant experiment inspired by Person of Interest.",
    disciplines: ["Experiments", "Applications"],
    technologies: ["Machine vision", "Natural language processing"],
    state: "Built",
    motif: "vision",
    href: "/v2/work/the-machine",
    writeup: "Project note",
    problem:
      "An exploration of machine vision and natural language processing, based on the show's fictional Machine.",
    approach: [
      "A containerized application combining the two areas in a personal-assistant project.",
    ],
  },
  {
    slug: "sdc-cloud",
    number: "08",
    title: "SDC Cloud",
    subtitle: "A private cloud console for the Satono Diamond Center lab.",
    summary:
      "A Keycloak-authenticated console for Floci-backed services and Proxmox virtual machines in an isolated, nested lab.",
    disciplines: ["Infrastructure"],
    technologies: [],
    state: "Built",
    motif: "cloud",
    href: "/v2/work/sdc-cloud",
    writeup: "Project note",
    context:
      "Satono Diamond Center is my mock data center: an isolated lab with nested Proxmox nodes inside the real student data center. SDC Cloud is its private, VPN-accessible service console at cloud.calpolysoc.org.",
    problem:
      "The console connects AWS-style service workflows and VM lifecycle operations to different backends.",
    approach: [
      "The Next.js console uses Keycloak sessions and tenant-scoped API calls to Floci for S3, DynamoDB, and SQS workflows.",
      "VM operations follow a separate path: signed calls to an internal EC2-style wrapper, then cloudctl and the Proxmox API for cloning, starting, stopping, and deleting VMs.",
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
