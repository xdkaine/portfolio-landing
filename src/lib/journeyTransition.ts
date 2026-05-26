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

export interface JourneyFrame {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface JourneyFrameTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}

export function transformFrameWithinStage(
  stage: JourneyFrame,
  frame: JourneyFrame,
): JourneyFrameTransform {
  const stageWidth = Math.max(stage.width, 1);
  const stageHeight = Math.max(stage.height, 1);

  return {
    x: frame.left - stage.left,
    y: frame.top - stage.top,
    scaleX: Math.max(frame.width, 1) / stageWidth,
    scaleY: Math.max(frame.height, 1) / stageHeight,
  };
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
