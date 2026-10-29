"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import {
  simulateUmaRequest,
  UMA_WALKTHROUGH,
  type Operation,
  type Persona,
} from "@/lib/v2/walkthrough";

export function UmaWalkthrough() {
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
          <span className="v2-eyebrow">INTERACTIVE CASE STUDY / UMA</span>
          <h2 id="walkthrough-title">
            A request, from person
            <br />
            <em>to platform.</em>
          </h2>
        </div>
        <p>{UMA_WALKTHROUGH.description}</p>
      </div>
      <div className="v2-scenario-controls">
        <label>
          Persona
          <select
            value={persona}
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
      <p
        className={`v2-scenario-status ${result.allowed ? "" : "v2-denied"}`}
        role="status"
      >
        {result.allowed
          ? "This scenario continues through the permitted workflow."
          : "This scenario stops at authorization. Try the administrator persona to explore the other path."}
      </p>
      <div className="v2-explorer">
        <ol className="v2-explorer-path" aria-label="Request stages">
          {result.steps.map((item, index) => (
            <li key={item.id}>
              <button
                aria-current={active === index ? "step" : undefined}
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
        <div className="v2-step-detail" aria-live="polite" aria-atomic="true">
          <span className="v2-eyebrow">{step.layer}</span>
          <div className="v2-large-step" aria-hidden="true">
            {String(active + 1).padStart(2, "0")}
          </div>
          <h3>{step.title}</h3>
          <p>{step.description}</p>
          <div className="v2-step-decision">{step.decision}</div>
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
      <noscript>
        <p className="v2-noscript">
          Enable JavaScript to switch scenarios. The architecture and design
          decisions are described below.
        </p>
      </noscript>
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
