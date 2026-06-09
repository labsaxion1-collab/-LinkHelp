import { useEffect, useRef, useState } from 'react';

/**
 * IntroSplash — toca o vídeo de abertura uma vez por sessão.
 *
 * Fases:
 *  fadein  → opacidade 0→1 em 700ms (entrada suave)
 *  playing → vídeo tocando normalmente
 *  fadeout → opacidade 1→0 em 700ms (saída suave)
 *  done    → componente desmontado
 */

const SESSION_KEY = 'lh:intro-played';

function markPlayed(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch { /* ignore */ }
}

type Phase = 'fadein' | 'playing' | 'fadeout' | 'done';

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>('fadein');
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    markPlayed();
    setPhase('fadeout');
    setTimeout(() => {
      setPhase('done');
      onDone();
    }, 700);
  };

  // Fase 1 — fade-in: após montar, deixa o browser pintar o frame preto,
  // depois ativa a transição para opaco
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPhase('playing');
      });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Fase 2 — inicia o vídeo assim que a fase muda para 'playing'
  useEffect(() => {
    if (phase !== 'playing') return;
    const video = videoRef.current;
    if (!video) return;

    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => finish());
    }
  }, [phase]);

  if (phase === 'done') return null;

  const opacity = phase === 'fadein' ? 0 : phase === 'fadeout' ? 0 : 1;

  return (
    <div
      className="fixed inset-0 z-[300] overflow-hidden bg-black"
      style={{
        opacity,
        transition:
          phase === 'fadein'
            ? 'opacity 0.7s cubic-bezier(0.4, 0, 0.6, 1)'   /* ease-in suave */
            : phase === 'fadeout'
              ? 'opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1)'  /* ease-out suave */
              : 'none',
        pointerEvents: phase === 'fadeout' ? 'none' : undefined,
      }}
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        src="/brand/intro.mp4"
        muted
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    </div>
  );
}
