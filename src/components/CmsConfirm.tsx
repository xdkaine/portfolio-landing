"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
type Options = { title: string; description: string; confirmLabel?: string };
export function useCmsConfirm() {
  const [options, setOptions] = useState<Options | null>(null);
  const resolver = useRef<((accepted: boolean) => void) | null>(null);
  const confirm = useCallback(
    (next: Options) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false);
        resolver.current = resolve;
        setOptions(next);
      }),
    [],
  );
  const finish = (accepted: boolean) => {
    resolver.current?.(accepted);
    resolver.current = null;
    setOptions(null);
  };
  useEffect(() => () => resolver.current?.(false), []);
  return {
    confirm,
    confirmation: options ? (
      <CmsConfirm options={options} onFinish={finish} />
    ) : null,
  };
}
function CmsConfirm({
  options,
  onFinish,
}: {
  options: Options;
  onFinish: (accepted: boolean) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="cms-confirm"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onFinish(false);
      }}
    >
      <h2 id={titleId}>{options.title}</h2>
      <p id={descriptionId}>{options.description}</p>
      <div>
        <button
          type="button"
          autoFocus
          className="cms-button"
          onClick={() => onFinish(false)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="cms-button cms-primary"
          onClick={() => onFinish(true)}
        >
          {options.confirmLabel ?? "Continue"}
        </button>
      </div>
    </dialog>
  );
}
