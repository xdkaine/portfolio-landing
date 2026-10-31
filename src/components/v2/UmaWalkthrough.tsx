"use client";

import { useState, useSyncExternalStore } from "react";
import {
  simulateUmaRequest,
  UMA_WALKTHROUGH,
  type Operation,
  type Persona,
  type WalkthroughStep,
} from "@/lib/v2/walkthrough";

const subscribe = () => () => undefined;
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function UmaWalkthrough() {
  const interactive = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [persona, setPersona] = useState<Persona>("member");
  const [operation, setOperation] = useState<Operation>("console");
  const [active, setActive] = useState(0);
  const result = simulateUmaRequest(persona, operation);
  const step = result.steps[Math.min(active, result.steps.length - 1)];
  const stageLabels: Record<string, string> = {
    identity: "Session",
    policy: operation === "access" ? "Role boundary" : "VM access",
    ticket: "VNC ticket",
    console: "Console proxy",
  };

  return (
    <section id="walkthrough" className="v2-walkthrough" aria-labelledby="walkthrough-title">
      <div className="v2-section-heading">
        <h2 id="walkthrough-title">{UMA_WALKTHROUGH.title}</h2>
        <p>{UMA_WALKTHROUGH.description}</p>
      </div>
      <div className="v2-scenario-controls">
        <label>
          Persona
          <select
            value={persona}
            disabled={!interactive}
            onChange={(event) => {
              setPersona(event.target.value as Persona);
              setActive(0);
            }}
          >
            <option value="member">Member</option>
            <option value="administrator">Administrator</option>
          </select>
        </label>
        <label>
          Operation
          <select
            value={operation}
            disabled={!interactive}
            onChange={(event) => {
              setOperation(event.target.value as Operation);
              setActive(0);
            }}
          >
            <option value="console">Open a VM console</option>
            <option value="access">Access policy (conceptual)</option>
          </select>
        </label>
        <button
          className="v2-text-button"
          disabled={!interactive}
          onClick={() => {
            setPersona("member");
            setOperation("console");
            setActive(0);
          }}
        >
          Reset walkthrough
        </button>
      </div>

      {interactive ? (
        <div className="v2-explorer v2-explorer-compact">
          <div className="v2-step-detail" id="v2-active-step">
            <div aria-live="polite" aria-atomic="true">
              <StepContent step={step} />
            </div>
            <div className="v2-step-navigation">
              <button disabled={active === 0} onClick={() => setActive(active - 1)} aria-label="Previous step">
                Previous
              </button>
              <button disabled={active === result.steps.length - 1} onClick={() => setActive(active + 1)} aria-label="Next step">
                Next
              </button>
            </div>
          </div>
          <ol className="v2-explorer-path" aria-label="Request stages">
            {result.steps.map((item, index) => (
              <li key={item.id}>
                <button
                  aria-current={active === index ? "step" : undefined}
                  aria-controls="v2-active-step"
                  onClick={() => setActive(index)}
                >
                  {stageLabels[item.id] ?? item.title}
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <>
          <p className="v2-noscript">The full console request is below. JavaScript enables the scenario controls.</p>
          <ol className="v2-static-trace" aria-label="Default console request">
            {result.steps.map((item) => <li key={item.id}><StepContent step={item} /></li>)}
          </ol>
        </>
      )}
    </section>
  );
}

function StepContent({ step }: { step: WalkthroughStep }) {
  return (
    <>
      <h3>{step.title}</h3>
      <p>{step.description}</p>
      <p className="v2-step-decision">{step.decision}</p>
      {step.source && <a className="v2-step-source" href={step.source.href}>{step.source.label}</a>}
    </>
  );
}
