export interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[];
  year: string;
  url?: string;
  github?: string;
  status: "LIVE" | "IN PROGRESS" | "ARCHIVED";
  featured: boolean;
}

export const projects: Project[] = [
  {
    id: "01",
    title: "VOID ENGINE",
    description:
      "A real-time 3D rendering engine built from scratch using WebGL2. Features PBR materials, dynamic shadows, scene graph architecture, and a custom GLSL shader pipeline.",
    tags: ["WEBGL", "TYPESCRIPT", "GLSL"],
    year: "2025",
    status: "LIVE",
    featured: true,
  },
  {
    id: "02",
    title: "SIGNAL",
    description:
      "End-to-end encrypted real-time messaging platform. Custom WebSocket protocol with optimistic UI updates, offline-first sync, and minimal client footprint.",
    tags: ["REACT", "NODE.JS", "WEBSOCKET"],
    year: "2025",
    status: "LIVE",
    featured: true,
  },
  {
    id: "03",
    title: "FORGE CLI",
    description:
      "Developer workflow automation tool built in Rust. Scaffolds projects, manages environments, and orchestrates build pipelines through a zero-config terminal interface.",
    tags: ["RUST", "CLI", "SYSTEMS"],
    year: "2025",
    status: "IN PROGRESS",
    featured: true,
  },
  {
    id: "04",
    title: "PIXEL NOIR",
    description:
      "Procedural art generation engine creating unique compositions through layered algorithms. Noise functions, generative color theory, and Canvas API at the core.",
    tags: ["CANVAS API", "TYPESCRIPT", "GENERATIVE"],
    year: "2024",
    status: "LIVE",
    featured: true,
  },
  {
    id: "05",
    title: "DATASTREAM",
    description:
      "Real-time analytics dashboard with live data visualization. Custom D3 chart components, streaming PostgreSQL queries, and responsive grid layouts.",
    tags: ["NEXT.JS", "D3", "POSTGRESQL"],
    year: "2024",
    status: "LIVE",
    featured: false,
  },
  {
    id: "06",
    title: "HEXGRID",
    description:
      "Interactive hexagonal grid system for spatial data visualization and mapping. SVG rendering with physics simulation, A* pathfinding, and dynamic cell states.",
    tags: ["SVG", "REACT", "ALGORITHMS"],
    year: "2024",
    status: "ARCHIVED",
    featured: false,
  },
];
