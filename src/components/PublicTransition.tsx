"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition, type ComponentProps, type ReactNode } from "react";
import {
  isPublicTransitionPath,
  sharedElementName,
  TRANSITION_TYPES,
  transitionTypesForNavigation,
  type PublicTransitionIntent,
  type SharedElementKind,
} from "@/lib/publicTransition";

const PAGE_TRANSITIONS = {
  [TRANSITION_TYPES.sectionForward]: "portfolio-page",
  [TRANSITION_TYPES.sectionBack]: "portfolio-page",
  [TRANSITION_TYPES.drillIn]: "portfolio-page",
  [TRANSITION_TYPES.drillOut]: "portfolio-page",
  [TRANSITION_TYPES.siblingNext]: "portfolio-page",
  [TRANSITION_TYPES.siblingPrev]: "portfolio-page",
  [TRANSITION_TYPES.utility]: "portfolio-page",
  [TRANSITION_TYPES.skip]: "none",
  default: "portfolio-page",
} as const;

const SHARED_TRANSITIONS = {
  "project-title": "editorial-shared-title",
  "project-marker": "editorial-shared-marker",
  "post-title": "editorial-shared-title",
  "post-cover": "editorial-shared-media",
} as const;

export function PublicTransitionSurface({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (!isPublicTransitionPath(pathname)) {
    return children;
  }

  return (
    <ViewTransition key={pathname} default="none" enter={PAGE_TRANSITIONS} exit={PAGE_TRANSITIONS} update="none">
      <div className="public-transition-surface" data-public-page={pathname}>{children}</div>
    </ViewTransition>
  );
}

type PublicLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  intent?: PublicTransitionIntent;
};

export function PublicLink({
  href,
  intent = "section",
  ...linkProps
}: PublicLinkProps) {
  const pathname = usePathname();
  const transitionTypes = transitionTypesForNavigation({
    currentPath: pathname,
    href,
    intent,
  });

  return <Link {...linkProps} href={href} transitionTypes={transitionTypes} />;
}

export function PublicSharedElement({
  kind,
  itemKey,
  children,
}: {
  kind: SharedElementKind;
  itemKey: string;
  children: ReactNode;
}) {
  const className = SHARED_TRANSITIONS[kind];

  return (
    <ViewTransition
      name={sharedElementName(kind, itemKey)}
      default="none"
      share={{
        [TRANSITION_TYPES.drillIn]: className,
        [TRANSITION_TYPES.drillOut]: className,
        [TRANSITION_TYPES.sectionForward]: "none",
        [TRANSITION_TYPES.sectionBack]: "none",
        [TRANSITION_TYPES.siblingNext]: "none",
        [TRANSITION_TYPES.siblingPrev]: "none",
        [TRANSITION_TYPES.utility]: "none",
        [TRANSITION_TYPES.skip]: "none",
        default: className,
      }}
    >
      {children}
    </ViewTransition>
  );
}
