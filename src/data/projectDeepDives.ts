export interface ProjectGalleryItem {
  title: string;
  caption: string;
  image: string;
  alt: string;
}

export interface ProjectDeepDive {
  pitch: string;
  role: string;
  timeline: string;
  challenge: string;
  concept: string;
  writeup: string[];
  highlights: string[];
  demoSummary: string;
  demoUrl?: string;
  repoUrl?: string;
  gallery: ProjectGalleryItem[];
}

export const projectDeepDives: Record<string, ProjectDeepDive> = {
  "01": {
    pitch: "A browser-native graphics lab focused on cinematic real-time rendering.",
    role: "Architecture, rendering pipeline, shader tooling",
    timeline: "12 weeks",
    challenge:
      "Most browser 3D demos look impressive in isolation but collapse under real scene complexity. The challenge was to keep material quality high while protecting frame consistency.",
    concept:
      "Treat the renderer like a product, not a demo. Every subsystem ships as an independently testable module so scenes can evolve without rewriting core graphics logic.",
    writeup: [
      "VOID ENGINE started as an experiment to answer one question: how far can WebGL2 go before a custom engine becomes mandatory? I designed the pipeline around predictable latency, clear ownership boundaries, and deterministic frame pacing.",
      "The first milestone was physically based shading with shadowed lights. The second was scene orchestration: loading assets, binding materials, and managing camera controls without a state tangle. Once those were stable, I built authoring helpers for shader iterations and debugging overlays.",
      "This is now the baseline for every interactive 3D concept I prototype. New scenes can be assembled quickly while still keeping the low-level control needed for performance work.",
    ],
    highlights: [
      "Modular render passes for shadows, lighting, and post-processing",
      "Shader hot-reload workflow for fast visual iteration",
      "Scene graph with strict update/render phase separation",
      "Targeted GPU profiling to hold smooth frame pacing",
    ],
    demoSummary:
      "Live scene explorer with camera controls, material toggles, and debug overlays.",
    demoUrl: "https://example.com/void-engine-demo",
    repoUrl: "https://github.com/example/void-engine",
    gallery: [
      {
        title: "MATERIAL STUDIES",
        caption:
          "PBR calibration board used to validate roughness and metalness behavior.",
        image: "/projects/concept-frame.svg",
        alt: "Void Engine material calibration concept frame",
      },
      {
        title: "RENDER GRAPH",
        caption:
          "Pass ordering map showing shadows, geometry, lighting, and post FX.",
        image: "/projects/system-flow.svg",
        alt: "Void Engine render graph and system flow",
      },
      {
        title: "LIVE SCENE",
        caption:
          "Interactive test scene used for lighting and camera movement benchmarks.",
        image: "/projects/demo-surface.svg",
        alt: "Void Engine live scene demonstration mockup",
      },
    ],
  },
  "02": {
    pitch:
      "Encrypted messaging with fast optimistic UI and resilient sync behavior.",
    role: "Protocol design, real-time state architecture, frontend UX",
    timeline: "10 weeks",
    challenge:
      "Chat apps feel broken the second delivery is delayed. The system needed to stay responsive under poor network conditions while preserving strict message guarantees.",
    concept:
      "Make local state authoritative for interaction speed, then reconcile with server confirmations through deterministic event IDs and conflict-safe merge rules.",
    writeup: [
      "SIGNAL focuses on trust and momentum. Users need confidence that messages are private and that every action they take has immediate visual feedback. I built the interaction model to feel instant even before server acknowledgment returns.",
      "Transport reliability comes from a compact WebSocket protocol with typed envelopes. On reconnect, the client requests missing event ranges and replays only the delta instead of refetching full threads.",
      "The result is a chat system that feels lightweight but remains operational during transient outages, tab sleep, and multi-device usage.",
    ],
    highlights: [
      "Optimistic message pipeline with rollback-safe reconciliation",
      "Session key rotation hooks for improved security posture",
      "Incremental sync protocol to avoid full-thread refetches",
      "Connection-state UX that degrades gracefully offline",
    ],
    demoSummary:
      "Interactive conversation sandbox showing optimistic send and sync recovery.",
    demoUrl: "https://example.com/signal-demo",
    repoUrl: "https://github.com/example/signal",
    gallery: [
      {
        title: "MESSAGE FLOW",
        caption:
          "Client-to-server event sequence and acknowledgment lifecycle.",
        image: "/projects/system-flow.svg",
        alt: "Signal protocol message flow diagram",
      },
      {
        title: "CHAT SURFACE",
        caption:
          "Conversation UI states for sent, synced, failed, and retried messages.",
        image: "/projects/demo-surface.svg",
        alt: "Signal chat interface concept image",
      },
      {
        title: "ENCRYPTION MODEL",
        caption:
          "Key lifecycle concept describing handshake and rotation boundaries.",
        image: "/projects/concept-frame.svg",
        alt: "Signal encryption concept frame",
      },
    ],
  },
  "03": {
    pitch:
      "A zero-config Rust CLI that standardizes and accelerates team workflows.",
    role: "CLI architecture, plugin runtime, DX design",
    timeline: "Ongoing",
    challenge:
      "Developer tooling tends to sprawl into shell scripts and ad-hoc docs. The objective was one deterministic entrypoint for setup, build, and release routines.",
    concept:
      "Ship a composable command graph where each task is discoverable, cached, and versioned. The tool adapts to project conventions without demanding heavy config.",
    writeup: [
      "FORGE CLI is about reducing organizational drag. I mapped common team routines and designed a command system that encodes those routines as reusable primitives.",
      "Execution favors observability: each command emits structured events, timing metrics, and failure reasons. This made it possible to debug CI mismatches locally with confidence.",
      "Current work focuses on plugin boundaries and multi-repo orchestration so teams can scale the same workflow patterns across services.",
    ],
    highlights: [
      "Template scaffolding with guardrails for naming and structure",
      "Environment validation before expensive build steps",
      "Task runner with dependency-aware execution graph",
      "Structured logs for CI/local parity debugging",
    ],
    demoSummary:
      "Terminal walkthrough of scaffolding, environment checks, and release tasks.",
    demoUrl: "https://example.com/forge-cli-demo",
    repoUrl: "https://github.com/example/forge-cli",
    gallery: [
      {
        title: "COMMAND MAP",
        caption: "Top-level command groups and subcommand hierarchy.",
        image: "/projects/system-flow.svg",
        alt: "Forge CLI command graph diagram",
      },
      {
        title: "TERMINAL UX",
        caption:
          "Output format tuned for quick scanning during iterative workflows.",
        image: "/projects/demo-surface.svg",
        alt: "Forge CLI terminal user interface concept",
      },
      {
        title: "PLUGIN MODEL",
        caption:
          "Extensibility plan for domain-specific tasks across repositories.",
        image: "/projects/concept-frame.svg",
        alt: "Forge CLI plugin system concept image",
      },
    ],
  },
  "04": {
    pitch:
      "A generative art engine for producing noir-inspired visual compositions.",
    role: "Algorithm design, creative tooling, rendering system",
    timeline: "8 weeks",
    challenge:
      "Procedural visuals often feel random without intent. The goal was to preserve unpredictability while maintaining a coherent visual voice across outputs.",
    concept:
      "Use layered constraints rather than pure randomness. Palette control, shape grammar, and weighted composition rules create repeatable style without duplicates.",
    writeup: [
      "PIXEL NOIR explores algorithmic aesthetics with deliberate constraints. I built a modular generation pipeline where each stage contributes one visual layer: structure, color, texture, and grain.",
      "A small rule engine handles weighted probabilities for motif placement and contrast behavior. This lets me tune artistic direction without rewriting rendering logic.",
      "The engine now powers quick concept generation for poster ideas and hero backgrounds, with export presets for web and print.",
    ],
    highlights: [
      "Composable generation pipeline with deterministic seed support",
      "Palette control system with contrast and mood presets",
      "Canvas renderer optimized for high-resolution exports",
      "Batch generation mode for rapid exploration",
    ],
    demoSummary:
      "Generative preview where users tweak seed, palette mood, and grain intensity.",
    demoUrl: "https://example.com/pixel-noir-demo",
    repoUrl: "https://github.com/example/pixel-noir",
    gallery: [
      {
        title: "COMPOSITION GRID",
        caption: "Rule-driven layout framework for shape orchestration.",
        image: "/projects/concept-frame.svg",
        alt: "Pixel Noir composition concept frame",
      },
      {
        title: "RENDER PASSES",
        caption:
          "Visual breakdown of base geometry, color wash, and texture overlays.",
        image: "/projects/system-flow.svg",
        alt: "Pixel Noir layered render process",
      },
      {
        title: "OUTPUT PREVIEW",
        caption:
          "Final generated frame with high-contrast styling and grain treatment.",
        image: "/projects/demo-surface.svg",
        alt: "Pixel Noir generated artwork preview",
      },
    ],
  },
  "05": {
    pitch:
      "Streaming analytics interface designed for decision speed and clarity.",
    role: "Dashboard architecture, data visualization, performance tuning",
    timeline: "9 weeks",
    challenge:
      "Data dashboards often overwhelm users with low-signal charts. This project needed quick interpretation under constant incoming updates.",
    concept:
      "Prioritize visual hierarchy and interaction focus. Critical metrics stay pinned while deeper diagnostic detail is progressively disclosed.",
    writeup: [
      "DATASTREAM was designed for operational teams watching live system health. I focused on reducing cognitive overhead: fewer chart types, consistent scales, and explicit anomaly markers.",
      "On the technical side, streaming updates were debounced and grouped to prevent expensive rerenders. Charts animate only where movement improves comprehension.",
      "The dashboard now supports incident review workflows by preserving event snapshots and timeline context.",
    ],
    highlights: [
      "Live metrics stream with buffered update batching",
      "Custom D3 visual modules with shared interaction model",
      "Anomaly markers tied to threshold and trend rules",
      "Snapshot mode for post-incident analysis",
    ],
    demoSummary:
      "Live dashboard simulation with streaming metrics and anomaly highlights.",
    demoUrl: "https://example.com/datastream-demo",
    repoUrl: "https://github.com/example/datastream",
    gallery: [
      {
        title: "DASHBOARD LAYOUT",
        caption:
          "Information hierarchy plan with primary and secondary insight zones.",
        image: "/projects/concept-frame.svg",
        alt: "Datastream dashboard layout concept",
      },
      {
        title: "DATA PIPELINE",
        caption: "Event ingestion and aggregation flow powering live visual state.",
        image: "/projects/system-flow.svg",
        alt: "Datastream streaming data flow diagram",
      },
      {
        title: "ANALYTICS VIEW",
        caption:
          "Composite chart view emphasizing trend shifts and outlier detection.",
        image: "/projects/demo-surface.svg",
        alt: "Datastream analytics dashboard demonstration",
      },
    ],
  },
  "06": {
    pitch:
      "Hex-based spatial interface for modeling zones, paths, and movement costs.",
    role: "Interaction design, simulation logic, SVG rendering",
    timeline: "7 weeks",
    challenge:
      "Hex grids are flexible but can become visually noisy and computationally expensive once interaction states stack up.",
    concept:
      "Decouple simulation state from rendering state. Pathfinding and cell metadata run on a lean model layer, while SVG draws only visible deltas.",
    writeup: [
      "HEXGRID began as an experiment in spatial storytelling interfaces. I needed a layout that could represent relationships, movement, and influence more clearly than rectangular grids.",
      "The core architecture separates algorithmic logic (pathfinding, influence propagation) from visual behavior (hover, select, highlight). This keeps interactions predictable and easy to debug.",
      "Although archived, it remains a strong base for future mapping tools and game-adjacent prototypes.",
    ],
    highlights: [
      "A* routing with terrain-aware movement costs",
      "Selective SVG updates for better interaction performance",
      "Cell state model supporting overlays and live annotations",
      "Interaction states tuned for both mouse and touch",
    ],
    demoSummary:
      "Interactive map mock where users set origins, goals, and terrain weights.",
    demoUrl: "https://example.com/hexgrid-demo",
    repoUrl: "https://github.com/example/hexgrid",
    gallery: [
      {
        title: "GRID TOPOLOGY",
        caption:
          "Hex coordinate system and adjacency rules used by the simulation.",
        image: "/projects/system-flow.svg",
        alt: "Hexgrid topology and adjacency diagram",
      },
      {
        title: "INTERACTION STATES",
        caption: "Hover, selected, blocked, and weighted terrain visual language.",
        image: "/projects/concept-frame.svg",
        alt: "Hexgrid interaction state concept",
      },
      {
        title: "PATH PREVIEW",
        caption:
          "Route visualization with weighted terrain and dynamic recalculation.",
        image: "/projects/demo-surface.svg",
        alt: "Hexgrid pathfinding demo frame",
      },
    ],
  },
};
