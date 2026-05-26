"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type MouseEventHandler,
  type ReactNode,
} from "react";
import {
  shouldAnimateJourneyActivation,
  transformFrameWithinStage,
  type JourneyFrame,
} from "@/lib/journeyTransition";

export interface JourneyLinkData {
  kind: "project" | "transmission";
  title: string;
  marker: string;
  detail: string;
  imageSrc?: string | null;
  imageAlt?: string | null;
}

type JourneyDirection = "open" | "return";

interface JourneyDescriptor extends JourneyLinkData {
  href: string;
  direction: JourneyDirection;
  targetKey?: string;
}

interface JourneyState {
  descriptor: JourneyDescriptor;
  origin: JourneyFrame;
  stage: JourneyFrame;
  arrival?: JourneyFrame;
  sourcePath: string;
  destinationPath: string;
  keyboardInitiated: boolean;
  phase: "opening" | "waiting" | "resolving";
}

interface JourneyTransitionContextValue {
  active: boolean;
  beginJourney: (
    descriptor: JourneyDescriptor,
    origin: JourneyFrame,
    keyboardInitiated: boolean,
  ) => boolean;
  registerArrival: (
    href: string,
    target: HTMLElement,
    targetKey?: string,
  ) => void;
}

const JourneyTransitionContext =
  createContext<JourneyTransitionContextValue | null>(null);

function destinationPathFor(href: string): string {
  return href.split(/[?#]/, 1)[0] || "/";
}

function frameFromRect(rect: DOMRect): JourneyFrame {
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function stageFrame(): JourneyFrame {
  const margin = window.innerWidth < 768 ? 16 : 48;
  const top = window.innerWidth < 768 ? 74 : 86;

  return {
    top,
    left: margin,
    width: Math.max(0, window.innerWidth - margin * 2),
    height: Math.max(200, window.innerHeight - top - margin),
  };
}

function HandoffCard({
  descriptor,
  phase,
  stageHeight,
}: {
  descriptor: JourneyDescriptor;
  phase: JourneyState["phase"];
  stageHeight: number;
}) {
  const isTransmission = descriptor.kind === "transmission";
  const isReturn = descriptor.direction === "return";
  const scanStart = Math.round(stageHeight * 0.09);
  const scanEnd = Math.round(stageHeight * 0.92);

  return (
    <div className="relative h-full overflow-hidden border border-ember bg-void shadow-[0_0_0_1px_var(--color-ember),0_20px_62px_rgba(0,0,0,0.38)]">
      <motion.div
        className="absolute left-0 right-0 top-0 h-px bg-ember/75 will-change-transform"
        initial={{ y: scanStart, opacity: 0 }}
        animate={
          phase === "resolving"
            ? { opacity: 0 }
            : {
                y: isReturn
                  ? [scanEnd, scanStart]
                  : [scanStart, scanEnd],
                opacity: [0, 1, 0.35],
              }
        }
        transition={{ duration: 0.56, ease: "easeInOut" }}
      />
      <div className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-ember" />
      <div className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-ember" />
      <div className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-ember" />
      <div className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-ember" />

      <motion.div
        className={`relative grid h-full min-h-0 gap-6 p-6 md:p-10 ${
          isTransmission && descriptor.imageSrc
            ? "md:grid-cols-[minmax(0,0.85fr)_minmax(290px,1fr)]"
            : ""
        }`}
        initial={{ opacity: 0, y: 8 }}
        animate={{
          opacity: phase === "resolving" ? 0 : 1,
          y: phase === "resolving" ? -6 : 0,
        }}
        transition={{ duration: 0.2, delay: phase === "opening" ? 0.1 : 0 }}
      >
        {isTransmission && descriptor.imageSrc ? (
          <div className="hidden min-h-0 overflow-hidden border border-iron bg-surface md:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={descriptor.imageSrc}
              alt={descriptor.imageAlt ?? ""}
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}

        <div className="flex min-h-0 flex-col justify-between">
          <div className="flex items-center justify-between gap-5 text-[9px] tracking-[0.3em] text-ember md:text-[10px]">
            <span>{descriptor.marker}</span>
            <span className="hidden text-steel sm:inline">
              {isReturn
                ? "FILING"
                : isTransmission
                  ? "RECEIVING"
                  : "ACCESSING"}
            </span>
          </div>
          <div className="py-8">
            <p className="mb-4 text-[9px] tracking-[0.34em] text-steel">
              {isReturn
                ? isTransmission
                  ? "CLOSING TRANSMISSION"
                  : "CLOSING CASE FILE"
                : isTransmission
                  ? "TRANSMISSION RECORD"
                  : "PROJECT RECORD"}
            </p>
            <h2 className="font-display text-4xl leading-[0.94] tracking-tight text-bone sm:text-6xl lg:text-7xl">
              {descriptor.title}
            </h2>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-iron pt-5 text-[9px] tracking-[0.2em] text-steel md:text-[10px]">
            <span>{descriptor.detail}</span>
            <span className="text-ember">
              {isReturn ? "RETURN TO INDEX //" : "OPENING //////////"}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function JourneyTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [journey, setJourney] = useState<JourneyState | null>(null);
  const journeyRef = useRef<JourneyState | null>(null);
  const navigationStartedRef = useRef(false);
  const releaseTimerRef = useRef<number | null>(null);
  const watchdogRef = useRef<number | null>(null);
  const focusTargetRef = useRef<HTMLElement | null>(null);

  const updateJourney = useCallback((next: JourneyState | null) => {
    journeyRef.current = next;
    setJourney(next);
  }, []);

  const finishJourney = useCallback(() => {
    if (releaseTimerRef.current !== null) {
      window.clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }
    if (watchdogRef.current !== null) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }

    const shouldRestoreFocus = Boolean(journeyRef.current?.keyboardInitiated);
    const focusTarget = focusTargetRef.current;
    navigationStartedRef.current = false;
    focusTargetRef.current = null;
    updateJourney(null);

    if (shouldRestoreFocus && focusTarget) {
      window.requestAnimationFrame(() => {
        focusTarget.focus({ preventScroll: true });
      });
    }
  }, [updateJourney]);

  const beginJourney = useCallback(
    (
      descriptor: JourneyDescriptor,
      origin: JourneyFrame,
      keyboardInitiated: boolean,
    ) => {
      if (journeyRef.current) return false;

      const next: JourneyState = {
        descriptor,
        origin,
        stage: stageFrame(),
        sourcePath: pathname,
        destinationPath: destinationPathFor(descriptor.href),
        keyboardInitiated,
        phase: "opening",
      };

      navigationStartedRef.current = false;
      updateJourney(next);
      watchdogRef.current = window.setTimeout(finishJourney, 4500);
      return true;
    },
    [finishJourney, pathname, updateJourney],
  );

  const registerArrival = useCallback(
    (href: string, target: HTMLElement, targetKey?: string) => {
      const current = journeyRef.current;
      if (
        !current ||
        current.phase !== "waiting" ||
        !navigationStartedRef.current ||
        current.destinationPath !== destinationPathFor(href) ||
        (current.descriptor.targetKey
          ? current.descriptor.targetKey !== targetKey
          : Boolean(targetKey))
      ) {
        return;
      }

      if (releaseTimerRef.current !== null) {
        window.clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }

      focusTargetRef.current = target.matches("[data-journey-focus]")
        ? target
        : target.querySelector<HTMLElement>("[data-journey-focus]");
      updateJourney({
        ...current,
        arrival: frameFromRect(target.getBoundingClientRect()),
        phase: "resolving",
      });
    },
    [updateJourney],
  );

  const handlePanelAnimationComplete = useCallback(() => {
    const current = journeyRef.current;
    if (!current) return;

    if (current.phase === "opening" && !navigationStartedRef.current) {
      navigationStartedRef.current = true;
      const waiting = { ...current, phase: "waiting" as const };
      updateJourney(waiting);
      router.push(current.descriptor.href, { scroll: true });
      return;
    }

    if (current.phase === "resolving") {
      finishJourney();
    }
  }, [finishJourney, router, updateJourney]);

  useEffect(() => {
    const current = journeyRef.current;
    if (!current || !navigationStartedRef.current) return;

    if (pathname === current.destinationPath && current.phase === "waiting") {
      releaseTimerRef.current = window.setTimeout(() => {
        const waiting = journeyRef.current;
        if (waiting?.phase === "waiting") {
          updateJourney({ ...waiting, arrival: waiting.stage, phase: "resolving" });
        }
      }, current.descriptor.direction === "return" ? 850 : 240);
      return;
    }

    if (pathname !== current.sourcePath && pathname !== current.destinationPath) {
      releaseTimerRef.current = window.setTimeout(finishJourney, 0);
    }
  }, [finishJourney, pathname, updateJourney]);

  useEffect(() => {
    if (!journey) return;

    const overflow = document.body.style.overflow;
    document.documentElement.classList.add("journey-transition-active");
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.classList.remove("journey-transition-active");
      document.body.style.overflow = overflow;
    };
  }, [journey]);

  useEffect(
    () => () => {
      if (releaseTimerRef.current !== null) {
        window.clearTimeout(releaseTimerRef.current);
      }
      if (watchdogRef.current !== null) {
        window.clearTimeout(watchdogRef.current);
      }
    },
    [],
  );

  const journeyActive = Boolean(journey);
  const value = useMemo<JourneyTransitionContextValue>(
    () => ({
      active: journeyActive,
      beginJourney,
      registerArrival,
    }),
    [beginJourney, journeyActive, registerArrival],
  );
  const destinationFrame = journey?.arrival ?? journey?.stage;
  const originTransform = journey
    ? transformFrameWithinStage(journey.stage, journey.origin)
    : null;
  const destinationTransform =
    journey && destinationFrame
      ? transformFrameWithinStage(journey.stage, destinationFrame)
      : null;

  return (
    <JourneyTransitionContext.Provider value={value}>
      {children}
      <div className="sr-only" aria-live="polite">
        {journey
          ? `${journey.descriptor.direction === "return" ? "Returning from" : "Opening"} ${journey.descriptor.title}`
          : ""}
      </div>
      {journey && destinationFrame && originTransform && destinationTransform ? (
        <div className="pointer-events-auto fixed inset-0 z-[10002]" aria-hidden="true">
          <motion.div
            className="absolute inset-0 bg-void/94"
            initial={{ opacity: 0 }}
            animate={{ opacity: journey.phase === "resolving" ? 0 : 1 }}
            transition={{ duration: journey.phase === "resolving" ? 0.22 : 0.16 }}
          />
          <motion.div
            className="absolute will-change-transform [contain:layout_paint]"
            style={{
              top: journey.stage.top,
              left: journey.stage.left,
              width: journey.stage.width,
              height: journey.stage.height,
              transformOrigin: "top left",
            }}
            initial={{
              x: originTransform.x,
              y: originTransform.y,
              scaleX: originTransform.scaleX,
              scaleY: originTransform.scaleY,
            }}
            animate={{
              x: destinationTransform.x,
              y: destinationTransform.y,
              scaleX: destinationTransform.scaleX,
              scaleY: destinationTransform.scaleY,
              opacity: journey.phase === "resolving" ? 0 : 1,
            }}
            transition={{
              duration: journey.phase === "resolving" ? 0.24 : 0.44,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            onAnimationComplete={handlePanelAnimationComplete}
          >
            <HandoffCard
              descriptor={journey.descriptor}
              phase={journey.phase}
              stageHeight={journey.stage.height}
            />
          </motion.div>
        </div>
      ) : null}
    </JourneyTransitionContext.Provider>
  );
}

type JourneyLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onClick"> & {
  href: string;
  journey: JourneyLinkData;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  arrivalTarget?: { href: string; key: string };
  direction?: JourneyDirection;
  targetKey?: string;
};

export function JourneyLink({
  href,
  journey,
  onClick,
  arrivalTarget,
  direction = "open",
  targetKey,
  ...linkProps
}: JourneyLinkProps) {
  const context = useContext(JourneyTransitionContext);
  const reducedMotion = useReducedMotion();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const arrivalHref = arrivalTarget?.href;
  const arrivalKey = arrivalTarget?.key;

  useEffect(() => {
    const target = linkRef.current;
    if (target && arrivalHref && arrivalKey) {
      context?.registerArrival(arrivalHref, target, arrivalKey);
    }
  }, [arrivalHref, arrivalKey, context]);

  const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    onClick?.(event);

    if (
      !context ||
      !shouldAnimateJourneyActivation({
        active: context.active,
        reducedMotion: Boolean(reducedMotion),
        defaultPrevented: event.defaultPrevented,
        button: event.button,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        target: event.currentTarget.getAttribute("target"),
        download: event.currentTarget.hasAttribute("download"),
      })
    ) {
      return;
    }

    const started = context.beginJourney(
      { ...journey, href, direction, targetKey },
      frameFromRect(event.currentTarget.getBoundingClientRect()),
      event.detail === 0,
    );

    if (started) {
      event.preventDefault();
    }
  };

  return (
    <Link
      {...linkProps}
      ref={linkRef}
      href={href}
      onClick={handleClick}
      data-journey-focus={arrivalTarget ? "" : undefined}
    />
  );
}

export function JourneyReturnLink(props: JourneyLinkProps) {
  return <JourneyLink {...props} direction="return" />;
}

export function JourneyArrivalTarget({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const context = useContext(JourneyTransitionContext);
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (target) {
      context?.registerArrival(href, target);
    }
  }, [context, href]);

  return (
    <div ref={targetRef} className={className}>
      {children}
    </div>
  );
}

export function useJourneyTransitionActive(): boolean {
  return useContext(JourneyTransitionContext)?.active ?? false;
}
