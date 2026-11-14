import type { DisplayProjectStatus } from "@/lib/projectPresentation";

const statuses = {
  LIVE: { label: "Live", className: "text-status-live" },
  "IN PROGRESS": { label: "In progress", className: "text-status-progress" },
  ARCHIVED: { label: "Archived", className: "text-steel" },
};

export function ProjectStatus({ status }: { status: DisplayProjectStatus }) {
  const presentation = statuses[status];
  return <span className={`inline-flex items-center gap-2 text-xs ${presentation.className}`}><span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 bg-current" />{presentation.label}</span>;
}
