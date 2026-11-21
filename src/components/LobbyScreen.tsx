import { useEffect, useState } from 'react';
import { ArrowRight, DoorOpen, Sparkles, Users } from 'lucide-react';
import type { CharacterType } from '../shared/gameTypes.ts';
import { ACCENT_SWATCHES } from '../shared/worldData.ts';
import { CharacterPreview } from './CharacterPreview.tsx';

interface LobbyScreenProps {
  initialRoomCode?: string;
  loading: boolean;
  error: string | null;
  onCreateRoom: (opts: { name: string; character: CharacterType; accentColor: string }) => void;
  onJoinRoom: (opts: {
    roomCode: string;
    name: string;
    character: CharacterType;
    accentColor: string;
  }) => void;
}

export function LobbyScreen({
  initialRoomCode = '',
  loading,
  error,
  onCreateRoom,
  onJoinRoom,
}: LobbyScreenProps) {
  const [mode, setMode] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem('dbt_name') || '';
    } catch {
      return '';
    }
  });
  const [roomCode, setRoomCode] = useState(initialRoomCode.toUpperCase());
  const [character, setCharacter] = useState<CharacterType>('girl');
  const [accentColor, setAccentColor] = useState<string>(ACCENT_SWATCHES[0].hex);
  const [roomHint, setRoomHint] = useState<string | null>(null);

  useEffect(() => {
    const clean = roomCode.trim().toUpperCase();
    if (mode === 'join' && clean.length === 4) {
      let cancelled = false;
      fetch(`/api/room/${clean}`)
        .then(async (res) => {
          if (!res.ok) return null;
          return res.json();
        })
        .then((data) => {
          if (cancelled) return;
          if (!data) {
            setRoomHint('No active room with that code yet.');
          } else if (data.playerCount >= 2) {
            setRoomHint('Room currently has 2 players connected.');
          } else {
            const taken = (data.takenCharacters as string[]) || [];
            if (taken.includes('girl') && !taken.includes('boy')) {
              setCharacter('boy');
              setAccentColor('#60A5FA');
            } else if (taken.includes('boy') && !taken.includes('girl')) {
              setCharacter('girl');
              setAccentColor('#F472B6');
            }
            setRoomHint(`Room ready · ${data.playerCount}/2 players inside`);
          }
        })
        .catch(() => {
          if (!cancelled) setRoomHint(null);
        });
      return () => {
        cancelled = true;
      };
    } else {
      setRoomHint(null);
    }
  }, [roomCode, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || (character === 'girl' ? 'Maya' : 'Leo');
    try {
      localStorage.setItem('dbt_name', finalName);
    } catch {
      // ignore storage failure
    }
    if (mode === 'create') {
      onCreateRoom({ name: finalName, character, accentColor });
    } else {
      onJoinRoom({
        roomCode: roomCode.trim().toUpperCase(),
        name: finalName,
        character,
        accentColor,
      });
    }
  };

  return (
    <div className="relative flex min-h-full w-full items-center justify-center overflow-y-auto bg-gradient-to-b from-[#131730] via-[#222347] to-[#3B2E4E] px-4 py-6">
      {/* Subtle twinkling star field */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-60">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 bg-[#FDE68A]"
            style={{
              left: `${(i * 43 + 11) % 96}%`,
              top: `${(i * 29 + 7) % 92}%`,
              opacity: 0.35 + ((i % 4) * 0.18),
            }}
          />
        ))}
      </div>

      <div className="relative z-10 grid w-full max-w-4xl grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
        {/* Left Story & Co-op Guide Panel */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#F8F3E6]/10 bg-[#1B1F3A]/85 p-6 backdrop-blur-md lg:col-span-5 lg:p-8">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-[#FDE68A]">
              <DoorOpen className="h-4 w-4 shrink-0" />
              <span>2-Player Cozy Pixel World</span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#F8F3E6] sm:text-4xl">
              Door, But Together
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#CBD5E1]">
              Meet on a floating sky island with a glowing cottage door. Explore together across two phones or browsers—fish on the pier, tend flowers, ring the twin bells, and decorate your shared home.
            </p>
          </div>

          <div className="mt-6 space-y-3 border-t border-[#F8F3E6]/10 pt-5 text-xs text-[#CBD5E1]">
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-[#F472B6]" />
              <div>
                <p className="font-semibold text-[#F8F3E6]">Play on two phones</p>
                <p className="mt-0.5 text-[#94A3B8]">
                  Player 1 creates a room and shares the 4-letter code or invite link. Player 2 joins from any device.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#FBBF24]" />
              <div>
                <p className="font-semibold text-[#F8F3E6]">Co-op secrets</p>
                <p className="mt-0.5 text-[#94A3B8]">
                  Ring both Starlight Bells within 3 seconds to unlock the Stargazer Gazebo bridge, or start Hide & Seek anytime.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Join / Create Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col justify-between rounded-2xl border border-[#F8F3E6]/12 bg-[#1F2442]/90 p-6 backdrop-blur-md lg:col-span-7 lg:p-8"
        >
          <div className="space-y-5">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#13172C] p-1.5">
              <button
                type="button"
                onClick={() => setMode('create')}
                className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                  mode === 'create'
                    ? 'bg-[#F59E0B] text-[#151828]'
                    : 'text-[#CBD5E1] hover:text-[#F8F3E6]'
                }`}
              >
                Create Room
              </button>
              <button
                type="button"
                onClick={() => setMode('join')}
                className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                  mode === 'join'
                    ? 'bg-[#F59E0B] text-[#151828]'
                    : 'text-[#CBD5E1] hover:text-[#F8F3E6]'
                }`}
              >
                Join with Code
              </button>
            </div>

            {mode === 'join' && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#CBD5E1]">
                  4-Letter Room Code
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="ABCD"
                  className="font-mono-num min-h-[48px] w-full rounded-xl border border-[#F8F3E6]/15 bg-[#13172C] px-4 text-center text-2xl font-bold tracking-[0.35em] text-[#FDE68A] uppercase placeholder:text-[#475569] focus:border-[#F59E0B] focus:outline-none"
                  required
                />
                {roomHint && (
                  <p className="mt-1.5 text-xs text-[#93C5FD]">{roomHint}</p>
                )}
              </div>
            )}

            {/* Player Name */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#CBD5E1]">
                Your Name
              </label>
              <input
                type="text"
                maxLength={14}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={character === 'girl' ? 'e.g. Maya' : 'e.g. Leo'}
                className="min-h-[46px] w-full rounded-xl border border-[#F8F3E6]/15 bg-[#13172C] px-4 text-sm font-medium text-[#F8F3E6] placeholder:text-[#64748B] focus:border-[#F59E0B] focus:outline-none"
              />
            </div>

            {/* Character Selection */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[#CBD5E1]">
                <span>Choose Character</span>
                <span className="font-normal text-[#94A3B8]">Animated pixel sprite</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(['girl', 'boy'] as const).map((char) => {
                  const selected = character === char;
                  return (
                    <button
                      key={char}
                      type="button"
                      onClick={() => setCharacter(char)}
                      className={`flex flex-col items-center rounded-xl border p-3 transition-colors ${
                        selected
                          ? 'border-[#F59E0B] bg-[#2B3159]'
                          : 'border-[#F8F3E6]/10 bg-[#161A33] hover:border-[#F8F3E6]/25'
                      }`}
                    >
                      <CharacterPreview
                        character={char}
                        accentColor={accentColor}
                        active={selected}
                      />
                      <span className="mt-1 text-sm font-semibold text-[#F8F3E6]">
                        {char === 'girl' ? 'Girl' : 'Boy'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scarf Accent Color */}
            <div>
              <span className="mb-2 block text-xs font-semibold text-[#CBD5E1]">
                Scarf Color
              </span>
              <div className="flex flex-wrap gap-2.5">
                {ACCENT_SWATCHES.map((swatch) => {
                  const active = accentColor === swatch.hex;
                  return (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => setAccentColor(swatch.hex)}
                      aria-label={swatch.name}
                      className={`h-10 w-10 rounded-lg border-2 transition-transform active:scale-95 ${
                        active ? 'scale-105 border-[#F8F3E6]' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                    />
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-[#F87171]/35 bg-[#7F1D1D]/40 px-4 py-2.5 text-xs font-medium text-[#FECACA]">
                {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || (mode === 'join' && roomCode.trim().length < 4)}
            className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#F59E0B] px-5 py-3 text-sm font-bold text-[#151828] transition-colors hover:bg-[#FBBF24] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>
              {loading
                ? 'Connecting...'
                : mode === 'create'
                  ? 'Create Room & Enter Island'
                  : 'Join Partner on Island'}
            </span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
