export interface JourneyActivationInput {
  active: boolean;
  reducedMotion: boolean;
  defaultPrevented: boolean;
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  target?: string | null;
  download?: boolean;
}

export function shouldAnimateJourneyActivation(
  input: JourneyActivationInput,
): boolean {
  if (input.active || input.reducedMotion || input.defaultPrevented) return false;
  if (input.button !== 0) return false;
  if (input.metaKey || input.ctrlKey || input.shiftKey || input.altKey) return false;
  if (input.download) return false;
  if (input.target && input.target !== "_self") return false;

  return true;
}
