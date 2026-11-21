import { useRef, useState } from 'react';
import { Heart, MessageCircle, ShoppingBag, Sparkles } from 'lucide-react';

interface VirtualJoystickProps {
  onMoveVector: (vx: number, vy: number) => void;
  onInteract: () => void;
  interactLabel: string | null;
  canTagSeeker: boolean;
  onTagSeeker: () => void;
  onQuickEmote: () => void;
  onOpenChat: () => void;
  onOpenShop: () => void;
}

export function VirtualJoystick({
  onMoveVector,
  onInteract,
  interactLabel,
  canTagSeeker,
  onTagSeeker,
  onQuickEmote,
  onOpenChat,
  onOpenShop,
}: VirtualJoystickProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const maxRadius = 38;

  const updateStick = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnob({ x: dx, y: dy });

    const normDist = Math.min(1, dist / maxRadius);
    if (normDist < 0.16) {
      onMoveVector(0, 0);
    } else {
      onMoveVector(dx / maxRadius, dy / maxRadius);
    }
  };

  const resetStick = () => {
    pointerIdRef.current = null;
    setKnob({ x: 0, y: 0 });
    onMoveVector(0, 0);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end justify-between px-4 pb-4 sm:px-6 sm:pb-6">
      {/* Left Thumb Zone: Virtual Joystick */}
      <div
        ref={padRef}
        onPointerDown={(e) => {
          e.preventDefault();
          pointerIdRef.current = e.pointerId;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          updateStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (pointerIdRef.current === e.pointerId) {
            updateStick(e.clientX, e.clientY);
          }
        }}
        onPointerUp={(e) => {
          if (pointerIdRef.current === e.pointerId) {
            resetStick();
          }
        }}
        onPointerCancel={resetStick}
        aria-label="Movement Joystick"
        className="pointer-events-auto relative flex h-28 w-28 touch-none items-center justify-center rounded-full border border-[#F8F3E6]/20 bg-[#151828]/60 backdrop-blur-md sm:h-32 sm:w-32"
      >
        <div className="h-14 w-14 rounded-full border border-[#F8F3E6]/10" />
        <div
          className="absolute h-12 w-12 rounded-full border border-[#FDE68A]/50 bg-[#F59E0B]/85 shadow-lg transition-transform duration-75"
          style={{
            transform: `translate3d(${knob.x}px, ${knob.y}px, 0)`,
          }}
        />
      </div>

      {/* Right Thumb Zone: Action Cluster */}
      <div className="pointer-events-auto flex flex-col items-end gap-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenShop}
            aria-label="Shop and Decor"
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#F8F3E6]/20 bg-[#1B1F3A]/85 text-[#FDE68A] backdrop-blur-md transition-transform active:scale-95"
          >
            <ShoppingBag className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onOpenChat}
            aria-label="Chat and Emotes"
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#F8F3E6]/20 bg-[#1B1F3A]/85 text-[#93C5FD] backdrop-blur-md transition-transform active:scale-95"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onQuickEmote}
            aria-label="Send Heart"
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#F472B6]/40 bg-[#1B1F3A]/85 text-[#F472B6] backdrop-blur-md transition-transform active:scale-95"
          >
            <Heart className="h-5 w-5" />
          </button>
        </div>

        {canTagSeeker ? (
          <button
            type="button"
            onClick={onTagSeeker}
            className="flex min-h-[52px] items-center gap-2 rounded-2xl bg-[#EC4899] px-5 py-3 text-sm font-bold text-white shadow-lg transition-transform active:scale-95"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Tag Partner!</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onInteract}
            disabled={!interactLabel}
            className={`flex min-h-[52px] items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold shadow-lg transition-all active:scale-95 ${
              interactLabel
                ? 'bg-[#F59E0B] text-[#151828]'
                : 'border border-[#F8F3E6]/15 bg-[#1B1F3A]/75 text-[#94A3B8]'
            }`}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="max-w-[165px] truncate whitespace-nowrap">
              {interactLabel || 'Interact'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
