"use client";

import { useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import {
  simulateUmaRequest,
  UMA_WALKTHROUGH,
  type Operation,
  type Persona,
} from "@/lib/v2/walkthrough";

const subscribe = () => () => undefined;
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function UmaWalkthrough() {
  const interactive = useSyncExternalStore(
    subscribe,
    clientSnapshot,
    serverSnapshot,
  );
  const [persona, setPersona] = useState<Persona>("member");
  const [operation, setOperation] = useState<Operation>("console");
  const [active, setActive] = useState(0);
  const result = simulateUmaRequest(persona, operation);
  const step = result.steps[Math.min(active, result.steps.length - 1)];
  return (
    <section
      id="walkthrough"
      className="v2-walkthrough"
      aria-labelledby="walkthrough-title"
    >
      <div className="v2-section-heading">
        <div>
          <span className="v2-eyebrow">UMA / REQUEST WALKTHROUGH</span>
          <h2 id="walkthrough-title">{UMA_WALKTHROUGH.title}</h2>
        </div>
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
            <option value="console">Open an assigned VM console</option>
            <option value="access">Change an access policy</option>
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
          <RotateCcw size={15} aria-hidden="true" />
          Reset walkthrough
        </button>
      </div>
      {!interactive && (
        <p className="v2-noscript">
          JavaScript is needed to change scenarios. The complete default console
          request is shown below.
        </p>
      )}
      <p
        className={`v2-scenario-status ${result.allowed ? "" : "v2-denied"}`}
        role="status"
      >
        {result.allowed
          ? `The ${persona} ${operation === "console" ? "console request" : "access-policy request"} continues in this illustration.`
          : "The member's access-policy request stops at authorization. Choose Administrator to compare the other path."}
      </p>
      {interactive ? (
        <div className="v2-explorer">
          <ol className="v2-explorer-path" aria-label="Request stages">
            {result.steps.map((item, index) => (
              <li key={item.id}>
                <button
                  aria-current={active === index ? "step" : undefined}
                  aria-controls="v2-active-step"
                  onClick={() => setActive(index)}
                >
                  <span className="v2-step-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    {item.title}
                    <small>{item.layer.split(" / ")[1]}</small>
                  </span>
                  <ArrowUpRightSmall />
                </button>
              </li>
            ))}
          </ol>
          <div className="v2-step-detail" id="v2-active-step">
            <div aria-live="polite" aria-atomic="true">
              <span className="v2-eyebrow">
                Step {active + 1} of {result.steps.length} /{" "}
                {step.layer.split(" / ")[1]}
              </span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <div className="v2-step-decision">{step.decision}</div>
            </div>
            <div className="v2-step-navigation">
              <button
                aria-label="Previous step"
                disabled={active === 0}
                onClick={() => setActive(active - 1)}
              >
                <ArrowLeft size={17} aria-hidden="true" />
                Previous
              </button>
              <span>
                {active + 1} / {result.steps.length}
              </span>
              <button
                aria-label="Next step"
                disabled={active === result.steps.length - 1}
                onClick={() => setActive(active + 1)}
              >
                Next step
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <ol className="v2-static-trace" aria-label="Default console request">
          {result.steps.map((item) => (
            <li key={item.id}>
              <span className="v2-eyebrow">{item.layer}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <p className="v2-step-decision">{item.decision}</p>
            </li>
          ))}
        </ol>
      )}
      <p className="v2-walkthrough-evidence">
        Compare with the published interface:{" "}
        <a href="/v2/uma-workspace.png">open the Uma workspace screenshot</a>.
        The screenshot is historical; it does not show this simulated request.
      </p>
    </section>
  );
}

function ArrowUpRightSmall() {
  return (
    <span className="v2-step-arrow" aria-hidden="true">
      ↗
    </span>
  );
}
