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
  title: "Follow a VM console request",
  description:
    "Choose a user and a task to follow the application boundary. This is an illustration based on Uma's published project description, not a live console or a reproduction of its permission engine.",
  personas: ["member", "administrator"],
  operations: ["console", "access"],
} as const;

export function simulateUmaRequest(persona: Persona, operation: Operation) {
  const allowed = operation === "console" || persona === "administrator";
  const steps: WalkthroughStep[] = [
    {
      id: "identity",
      title: "Identify the user",
      layer: "01 / IDENTITY",
      description:
        "Uma uses LDAP authentication and application sessions. This example starts with a signed-in user; it does not demonstrate the sign-in process.",
      decision: `The ${persona} wants to ${operation === "console" ? "open the console of an assigned VM" : "change an application access policy"}.`,
    },
    {
      id: "policy",
      title: "Check role and scope",
      layer: "02 / AUTHORIZATION",
      description:
        "Uma's application access controls and assigned pools separate a user's workspace from cluster administration. Console access and access-policy administration are different tasks.",
      decision: allowed
        ? operation === "console"
          ? "In this example, the VM is assigned to the user. The console request continues."
          : "The administrator can continue to the application access tools in this example."
        : "The member cannot change access policies in this example. The request stops before an application change or cluster operation.",
    },
  ];
  if (allowed) {
    steps.push({
      id: "application",
      title:
        operation === "console"
          ? "Open the console workflow"
          : "Open access administration",
      layer: "03 / APPLICATION",
      description:
        operation === "console"
          ? "The user opens a VM console through Uma's web interface. The application sits between that browser workflow and the Proxmox integration."
          : "The administrator reaches Uma's application access tools. This path is about application permissions, so it does not include the VM console stages below.",
      decision:
        operation === "console"
          ? "Next: the Proxmox integration, then the browser console."
          : "Next: the oversight layer. This illustration does not model a specific policy change or its storage.",
    });
    if (operation === "console") {
      steps.push({
        id: "proxmox",
      title: "Use the Proxmox integration",
        layer: "04 / INFRASTRUCTURE",
        description:
          "Uma integrates with the Proxmox API for VM and cluster operations. The published project also includes creation, snapshots, backups, replication, and hardware settings.",
        decision:
          "This request follows the console path. The other management operations are outside this example.",
      });
      steps.push({
        id: "console",
      title: "Connect the browser console",
        layer: "05 / INTERACTION",
        description:
          "Uma's custom Node server supports VNC proxying so the VM console can be used in the browser. The same workspace also has real-time features built with Socket.IO.",
        decision:
          "The user reaches the assigned VM's console through Uma. No real VM connection is made by this walkthrough.",
      });
    }
    steps.push({
      id: "audit",
      title: "Review the oversight layer",
      layer: operation === "console" ? "06 / OVERSIGHT" : "04 / OVERSIGHT",
      description:
        "The published project includes audit logging and administrator views. Those tools support review of infrastructure activity alongside the user-facing workflows.",
      decision:
        "End of the illustration. This is not an audit record; exact events, permission checks, and transport details are not modeled here.",
    });
  }
  return { allowed, stoppedAt: allowed ? null : "policy", steps };
}
