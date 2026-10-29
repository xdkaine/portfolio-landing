export type Persona = "member" | "administrator";
export type Operation = "console" | "access";
export type WalkthroughStep = {
  id: string;
  title: string;
  layer: string;
  description: string;
  decision: string;
};

export const UMA_WALKTHROUGH = {
  kind: "illustrated-walkthrough",
  title: "A request, from person to platform.",
  description:
    "An illustrative model based on the published Uma case study. The scenarios explain design boundaries; they are not a live connection or a reproduction of its authorization engine.",
  personas: ["member", "administrator"],
  operations: ["console", "access"],
} as const;

export function simulateUmaRequest(persona: Persona, operation: Operation) {
  const allowed = operation === "console" || persona === "administrator";
  const steps: WalkthroughStep[] = [
    {
      id: "identity",
      title: "Start with identity",
      layer: "01 / IDENTITY",
      description:
        "Uma brings LDAP authentication and application sessions together before exposing infrastructure workflows.",
      decision: `Scenario: an authenticated ${persona} requests ${operation === "console" ? "a console for an assigned VM" : "an access-policy change"}.`,
    },
    {
      id: "policy",
      title: "Check the policy",
      layer: "02 / AUTHORIZATION",
      description:
        "Application access controls and assigned pools create a boundary between a person's session and the underlying cluster. Administrative tools have a separate audience.",
      decision: allowed
        ? "This illustrative request can continue within the chosen persona's scope."
        : "This illustrative member request stops here. Access administration belongs to the administrator scenario.",
    },
  ];
  if (allowed) {
    steps.push({
      id: "application",
      title: "Translate the intent",
      layer: "03 / APPLICATION",
      description:
        "The application turns a focused user workflow into an infrastructure operation. Next.js, TypeScript, and a custom Node server make up the web experience.",
      decision:
        operation === "console"
          ? "The requested workflow is browser console access."
          : "The requested workflow is application access administration.",
    });
    if (operation === "console") {
      steps.push({
        id: "proxmox",
        title: "Reach the cluster",
        layer: "04 / INFRASTRUCTURE",
        description:
          "Uma integrates with the Proxmox API to bring cluster resources, virtual machines, and management operations into its own interface.",
        decision:
          "The permitted workflow reaches the infrastructure integration.",
      });
      steps.push({
        id: "console",
        title: "Bring the console to the browser",
        layer: "05 / INTERACTION",
        description:
          "A custom Node server supports real-time events and secure VNC proxying, alongside Socket.IO features in the wider workspace.",
        decision:
          "The person works with the VM through a browser-based console.",
      });
    }
    steps.push({
      id: "audit",
      title: "Make operations visible",
      layer: operation === "console" ? "06 / OVERSIGHT" : "04 / OVERSIGHT",
      description:
        "Audit logging and dedicated administrator views provide operational visibility around infrastructure workflows.",
      decision:
        "The walkthrough ends at the oversight layer. Exact event schemas and transport details are outside this illustration.",
    });
  }
  return { allowed, stoppedAt: allowed ? null : "policy", steps };
}
