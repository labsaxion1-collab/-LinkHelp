import { useCallback, useRef, useState, type MouseEvent, type TouchEvent } from 'react';

const SWIPE_THRESHOLD = 48;

export function isTutorialSwipeIgnoredTarget(target: EventTarget | null): boolean {
  if (!target || typeof Element === 'undefined') return false;
  return target instanceof Element && Boolean(target.closest('button, a, input, textarea, select, [role="button"]'));
}

type Options = {
  step: number;
  stepCount: number;
  onStepChange: (next: number) => void;
};

export function useTutorialSwipe({ step, stepCount, onStepChange }: Options) {
  const startX = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const goNext = useCallback(() => {
    if (step < stepCount - 1) onStepChange(step + 1);
  }, [onStepChange, step, stepCount]);

  const goBack = useCallback(() => {
    if (step > 0) onStepChange(step - 1);
  }, [onStepChange, step]);

  const onPointerDown = useCallback((clientX: number) => {
    startX.current = clientX;
    setIsDragging(true);
    setDragOffset(0);
  }, []);

  const onPointerMove = useCallback(
    (clientX: number) => {
      if (!isDragging) return;
      let delta = clientX - startX.current;
      if (step === 0 && delta > 0) delta *= 0.35;
      if (step === stepCount - 1 && delta < 0) delta *= 0.35;
      setDragOffset(delta);
    },
    [isDragging, step, stepCount],
  );

  const onPointerUp = useCallback(
    (clientX: number) => {
      if (!isDragging) return;
      const delta = clientX - startX.current;
      setIsDragging(false);
      setDragOffset(0);
      if (delta < -SWIPE_THRESHOLD) goNext();
      else if (delta > SWIPE_THRESHOLD) goBack();
    },
    [goBack, goNext, isDragging],
  );

  const swipeHandlers = {
    onTouchStart: (event: TouchEvent) => {
      if (isTutorialSwipeIgnoredTarget(event.target)) return;
      onPointerDown(event.touches[0].clientX);
    },
    onTouchMove: (event: TouchEvent) => onPointerMove(event.touches[0].clientX),
    onTouchEnd: (event: TouchEvent) => {
      if (!isDragging && isTutorialSwipeIgnoredTarget(event.target)) return;
      onPointerUp(event.changedTouches[0].clientX);
    },
    onMouseDown: (event: MouseEvent) => {
      if (isTutorialSwipeIgnoredTarget(event.target)) return;
      onPointerDown(event.clientX);
    },
    onMouseMove: (event: MouseEvent) => {
      if (!isDragging) return;
      onPointerMove(event.clientX);
    },
    onMouseUp: (event: MouseEvent) => onPointerUp(event.clientX),
    onMouseLeave: (event: MouseEvent) => {
      if (isDragging) onPointerUp(event.clientX);
    },
  };

  return { dragOffset, isDragging, goNext, goBack, swipeHandlers };
}
