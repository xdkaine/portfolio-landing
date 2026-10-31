export type Persona = "member" | "administrator";
export type Operation = "console" | "access";
export type WalkthroughStep = {
  id: string;
  title: string;
  layer: string;
  description: string;
  decision: string;
  source?: { label: string; href: string };
};

const SOURCE =
  "https://github.com/xdkaine/uma-proxmox-wrapper-public/blob/9444cc5c8e465a3917309fa43a2260ae561abc21";
const VNC_ROUTE = `${SOURCE}/app/api/proxmox/vm/%5Bvmid%5D/vnc/route.ts`;

export const UMA_WALKTHROUGH = {
  kind: "illustrated-walkthrough",
  title: "Follow a VM console request",
  description:
    "An illustrated reading of Uma's published VNC route and proxy, with links to the code. No VM connection is made here. The access-policy option is a conceptual role comparison.",
  personas: ["member", "administrator"],
  operations: ["console", "access"],
} as const;

export function simulateUmaRequest(persona: Persona, operation: Operation) {
  const allowed = operation === "console" || persona === "administrator";

  if (operation === "access") {
    return {
      allowed,
      stoppedAt: allowed ? null : "policy",
      steps: [
        {
          id: "identity",
          title: "Signed-in session",
          layer: "01 / SESSION",
          description:
            "Choose a member or administrator to compare who can reach access administration.",
          decision: `This role comparison starts with an authenticated ${persona}.`,
        },
        {
          id: "policy",
          title: "Administrative scope",
          layer: "02 / SCOPE",
          description:
            "The comparison reserves policy changes for administrators. It does not model a policy endpoint or database write.",
          decision: allowed
            ? "Administrator: passes the administrative boundary. End of comparison."
            : "Member: stops at the administrative boundary. No policy change is made.",
        },
      ] satisfies WalkthroughStep[],
    };
  }

  const steps: WalkthroughStep[] = [
    {
      id: "identity",
      title: "Check the session and CSRF token",
      layer: "01 / SESSION",
      description:
        "The POST route reads the application session and validates its CSRF token before handling the VM request.",
      decision: "Not signed in: 401. Invalid CSRF token: 403.",
      source: { label: "VNC request route", href: `${VNC_ROUTE}#L10-L18` },
    },
    {
      id: "policy",
      title: "Check access to this VM",
      layer: "02 / SCOPE",
      description:
        "The route calls checkVMAccess with action-role checking enabled. It evaluates VM and pool permissions before a console ticket can be requested; a denied check returns 403.",
      decision:
        persona === "administrator"
          ? "The published helper permits administrators through its override."
          : "This example assumes the member has an allowed VM/pool ACL or pool-management grant.",
      source: { label: "VM access helper", href: `${SOURCE}/lib/acl.ts#L239-L315` },
    },
    {
      id: "ticket",
      title: "Request a VNC ticket",
      layer: "03 / TICKET",
      description:
        "After the access check passes, the route calls createVNCTicket(node, vmid). On success it records VM_CONSOLE_OPEN and returns the ticket data.",
      decision:
        "Authorization comes before ticket creation. Opening the console stream is a separate request.",
      source: { label: "Ticket and audit code", href: `${VNC_ROUTE}#L27-L56` },
    },
    {
      id: "console",
      title: "Proxy the console connection",
      layer: "04 / PROXY",
      description:
        "The custom Node server handles /api/proxy/vnc WebSocket upgrades, checks the session and origin, then tunnels the connection to Proxmox over TLS.",
      decision:
        "The browser uses the ticket to open the console stream through this proxy.",
      source: { label: "WebSocket proxy", href: `${SOURCE}/server.js#L94-L311` },
    },
  ];
  return { allowed, stoppedAt: null, steps };
}
