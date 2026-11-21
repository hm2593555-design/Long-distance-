import { useEffect, useRef } from 'react';
import { drawCharacterSprite } from '../game/pixelRenderer.ts';
import type { CharacterType } from '../shared/gameTypes.ts';

interface CharacterPreviewProps {
  character: CharacterType;
  accentColor: string;
  active?: boolean;
}

export function CharacterPreview({ character, accentColor, active = false }: CharacterPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const render = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      drawCharacterSprite(ctx, {
        x: canvas.width / 2,
        y: canvas.height - 14,
        character,
        accentColor,
        dir: 'down',
        action: active ? 'walk' : 'idle',
        time,
        scale: 3,
      });
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [character, accentColor, active]);

  return (
    <canvas
      ref={canvasRef}
      width={72}
      height={84}
      className="mx-auto block"
    />
  );
}
