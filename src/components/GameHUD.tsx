import { useState } from 'react';
import {
  Check,
  Coins,
  Copy,
  Eye,
  Fish,
  Heart,
  LogOut,
  Mail,
  Moon,
  Send,
  ShoppingBag,
  Sparkles,
  Star,
  Sun,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type {
  EmoteType,
  PlayerState,
  RoomWorldState,
  SkyMode,
} from '../shared/gameTypes.ts';
import { DECOR_CATALOG, QUICK_CHATS } from '../shared/worldData.ts';

export type ActiveDrawer = 'none' | 'shop' | 'mailbox' | 'chat';

interface GameHUDProps {
  world: RoomWorldState;
  localPlayer: PlayerState;
  partnerPlayer: PlayerState | null;
  activeDrawer: ActiveDrawer;
  onCloseDrawer: () => void;
  onOpenDrawer: (drawer: ActiveDrawer) => void;
  muted: boolean;
  onToggleMute: () => void;
  onCycleSky: (next: SkyMode) => void;
  onToggleHideAndSeek: () => void;
  onSendEmote: (emote: EmoteType) => void;
  onSendChat: (text: string) => void;
  onAddMailboxNote: (text: string) => void;
  onBuyDecor: (itemId: string) => void;
  onLeaveRoom: () => void;
  toastText: string | null;
}

export function GameHUD({
  world,
  localPlayer,
  partnerPlayer,
  activeDrawer,
  onCloseDrawer,
  onOpenDrawer,
  muted,
  onToggleMute,
  onCycleSky,
  onToggleHideAndSeek,
  onSendEmote,
  onSendChat,
  onAddMailboxNote,
  onBuyDecor,
  onLeaveRoom,
  toastText,
}: GameHUDProps) {
  const [copied, setCopied] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [shopTab, setShopTab] = useState<'decor' | 'fish'>('decor');

  const handleCopyInvite = async () => {
    const url = `${window.location.origin}/?room=${world.roomCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const nextSky: SkyMode =
    world.skyMode === 'dusk' ? 'night' : world.skyMode === 'night' ? 'golden' : 'dusk';

  const hs = world.hideAndSeek;
  const partnerDist =
    partnerPlayer && partnerPlayer.connected
      ? partnerPlayer.scene === localPlayer.scene
        ? Math.hypot(partnerPlayer.x - localPlayer.x, partnerPlayer.y - localPlayer.y)
        : 999
      : null;

  return (
    <>
      {/* Top Compact HUD Bar */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-2 px-3 pt-2.5 sm:px-5 sm:pt-3">
        {/* Left: Room Code + Shared Currencies */}
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-[#F8F3E6]/12 bg-[#151828]/80 px-3 py-1.5 backdrop-blur-md">
          <button
            type="button"
            onClick={handleCopyInvite}
            title="Copy Invite Link"
            className="flex min-h-[36px] items-center gap-1.5 text-xs font-semibold text-[#FDE68A] whitespace-nowrap hover:text-white"
          >
            <span className="font-mono-num tracking-widest">{world.roomCode}</span>
            {copied ? <Check className="h-3.5 w-3.5 text-[#34D399]" /> : <Copy className="h-3.5 w-3.5 opacity-80" />}
          </button>

          <span className="text-[#475569]" aria-hidden="true">·</span>

          <div className="font-mono-num flex items-center gap-2.5 text-xs font-semibold text-[#F8F3E6]">
            <span className="flex items-center gap-1" title="Coins">
              <Coins className="h-3.5 w-3.5 text-[#FBBF24]" />
              {world.inventory.coins}
            </span>
            <span className="flex items-center gap-1" title="Stars">
              <Star className="h-3.5 w-3.5 text-[#7DD3FC]" />
              {world.inventory.stars}
            </span>
            <span className="hidden items-center gap-1 sm:flex" title="Together Hearts">
              <Heart className="h-3.5 w-3.5 text-[#F472B6]" />
              {world.togetherHearts}
            </span>
          </div>
        </div>

        {/* Center: Partner Presence / Hide & Seek Warmth */}
        <div className="pointer-events-none hidden items-center gap-2 rounded-xl border border-[#F8F3E6]/10 bg-[#151828]/75 px-3 py-2 text-xs text-[#CBD5E1] backdrop-blur-md md:flex">
          {hs.active ? (
            <span className="font-semibold text-[#F472B6]">
              Hide & Seek · {hs.seekerId === localPlayer.id ? 'You are Seeking' : 'You are Hiding'}
              {hs.phase === 'seeking' && hs.seekerId === localPlayer.id && partnerDist !== null
                ? partnerDist < 140
                  ? ' · Very Warm!'
                  : partnerDist < 320
                    ? ' · Getting Closer'
                    : ' · Cold'
                : ''}
            </span>
          ) : partnerPlayer && partnerPlayer.connected ? (
            <span>
              {partnerPlayer.name} · {partnerPlayer.scene === 'cottage' ? 'In Cottage' : 'On Island'}
            </span>
          ) : (
            <span className="text-[#94A3B8]">Waiting for partner · Share code {world.roomCode}</span>
          )}
        </div>

        {/* Right: Utility Actions */}
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl border border-[#F8F3E6]/12 bg-[#151828]/80 p-1 backdrop-blur-md">
          <button
            type="button"
            onClick={() => onOpenDrawer(activeDrawer === 'mailbox' ? 'none' : 'mailbox')}
            aria-label="Open Mailbox"
            title="Shared Mailbox"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#93C5FD] transition-colors hover:bg-white/10"
          >
            <Mail className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleHideAndSeek}
            aria-label="Toggle Hide and Seek"
            title={hs.active ? 'Stop Hide & Seek' : 'Start Hide & Seek'}
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
              hs.active ? 'bg-[#EC4899] text-white' : 'text-[#F472B6] hover:bg-white/10'
            }`}
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onCycleSky(nextSky)}
            aria-label="Switch Sky Mood"
            title={`Sky: ${world.skyMode}`}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#FDE68A] transition-colors hover:bg-white/10"
          >
            {world.skyMode === 'golden' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute Sound' : 'Mute Sound'}
            title={muted ? 'Unmute' : 'Mute'}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#CBD5E1] transition-colors hover:bg-white/10"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onLeaveRoom}
            aria-label="Leave Room"
            title="Leave Room"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#FCA5A5] transition-colors hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Mobile Hide & Seek / Partner hint sub-line */}
      {hs.active && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-20 flex justify-center md:hidden">
          <div className="rounded-lg bg-[#151828]/85 px-3 py-1 text-xs font-semibold text-[#F472B6] backdrop-blur-md">
            Hide & Seek · {hs.seekerId === localPlayer.id ? 'Seeking' : 'Hiding'}
            {hs.phase === 'seeking' && hs.seekerId === localPlayer.id && partnerDist !== null
              ? partnerDist < 140
                ? ' · Very Warm!'
                : partnerDist < 320
                  ? ' · Closer'
                  : ' · Cold'
              : ''}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastText && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4 sm:top-18">
          <div className="rounded-xl border border-[#FDE68A]/30 bg-[#1B1F3A]/95 px-4 py-2 text-center text-xs font-semibold text-[#FDE68A] shadow-lg backdrop-blur-md sm:text-sm">
            {toastText}
          </div>
        </div>
      )}

      {/* Modal / Slide Drawer Overlay */}
      {activeDrawer !== 'none' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={onCloseDrawer}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[82vh] w-full max-w-lg flex-col rounded-t-2xl border border-[#F8F3E6]/15 bg-[#1B1F3A] text-[#F8F3E6] shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#F8F3E6]/10 px-5 py-4">
              <div className="flex items-center gap-2 font-display text-lg font-bold">
                {activeDrawer === 'shop' && (
                  <>
                    <ShoppingBag className="h-5 w-5 text-[#FBBF24]" />
                    <span>Cozy Shop & Catch Log</span>
                  </>
                )}
                {activeDrawer === 'mailbox' && (
                  <>
                    <Mail className="h-5 w-5 text-[#93C5FD]" />
                    <span>Shared Island Mailbox</span>
                  </>
                )}
                {activeDrawer === 'chat' && (
                  <>
                    <Sparkles className="h-5 w-5 text-[#F472B6]" />
                    <span>Emotes & Quick Chat</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={onCloseDrawer}
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="cozy-scroll flex-1 overflow-y-auto p-5">
              {activeDrawer === 'shop' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-[#13172C] px-4 py-2.5 text-xs">
                    <span className="text-[#CBD5E1]">Shared Purse</span>
                    <div className="font-mono-num flex items-center gap-3 font-bold">
                      <span className="text-[#FBBF24]">{world.inventory.coins} Coins</span>
                      <span className="text-[#7DD3FC]">{world.inventory.stars} Stars</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#13172C] p-1">
                    <button
                      type="button"
                      onClick={() => setShopTab('decor')}
                      className={`min-h-[40px] rounded-lg text-xs font-semibold ${
                        shopTab === 'decor' ? 'bg-[#F59E0B] text-[#151828]' : 'text-[#CBD5E1]'
                      }`}
                    >
                      Place Decor
                    </button>
                    <button
                      type="button"
                      onClick={() => setShopTab('fish')}
                      className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg text-xs font-semibold ${
                        shopTab === 'fish' ? 'bg-[#F59E0B] text-[#151828]' : 'text-[#CBD5E1]'
                      }`}
                    >
                      <Fish className="h-3.5 w-3.5" />
                      <span>Fish Log ({world.inventory.fishLog.length})</span>
                    </button>
                  </div>

                  {shopTab === 'decor' ? (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {DECOR_CATALOG.map((item) => {
                        const canAfford =
                          world.inventory.coins >= item.costCoins &&
                          world.inventory.stars >= item.costStars;
                        return (
                          <div
                            key={item.itemId}
                            className="flex flex-col justify-between rounded-xl border border-[#F8F3E6]/10 bg-[#141830] p-3.5"
                          >
                            <div>
                              <h3 className="text-sm font-bold text-[#F8F3E6]">{item.name}</h3>
                              <p className="mt-1 text-xs text-[#94A3B8]">{item.description}</p>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <span className="font-mono-num text-xs font-semibold text-[#FDE68A]">
                                {item.costCoins}c{item.costStars > 0 ? ` · ${item.costStars}★` : ''}
                              </span>
                              <button
                                type="button"
                                disabled={!canAfford}
                                onClick={() => {
                                  onBuyDecor(item.itemId);
                                  onCloseDrawer();
                                }}
                                className="min-h-[36px] rounded-lg bg-[#F59E0B] px-3 text-xs font-bold text-[#151828] whitespace-nowrap hover:bg-[#FBBF24] disabled:opacity-40"
                              >
                                Buy & Place
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : world.inventory.fishLog.length === 0 ? (
                    <div className="rounded-xl border border-[#F8F3E6]/10 bg-[#141830] p-6 text-center text-xs text-[#94A3B8]">
                      No fish caught yet. Walk out onto the wooden lake pier and tap Interact to cast your line!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {world.inventory.fishLog.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between rounded-xl border border-[#F8F3E6]/10 bg-[#141830] px-4 py-2.5 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-[#F8F3E6]">{entry.name}</p>
                            <p className="text-[#94A3B8]">Caught by {entry.caughtBy}</p>
                          </div>
                          <span
                            className={`font-semibold capitalize ${
                              entry.rarity === 'starlight'
                                ? 'text-[#7DD3FC]'
                                : entry.rarity === 'rare'
                                  ? 'text-[#FBBF24]'
                                  : 'text-[#CBD5E1]'
                            }`}
                          >
                            {entry.rarity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeDrawer === 'mailbox' && (
                <div className="space-y-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!noteDraft.trim()) return;
                      onAddMailboxNote(noteDraft);
                      setNoteDraft('');
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      maxLength={140}
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="Leave a cozy note for your partner..."
                      className="min-h-[44px] flex-1 rounded-xl border border-[#F8F3E6]/15 bg-[#13172C] px-3.5 text-sm text-[#F8F3E6] placeholder:text-[#64748B] focus:border-[#F59E0B] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#F59E0B] px-4 text-xs font-bold text-[#151828]"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Post</span>
                    </button>
                  </form>

                  <div className="space-y-2.5">
                    {world.mailbox.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-xl border border-[#F8F3E6]/10 bg-[#141830] p-3.5"
                      >
                        <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                          <span className="font-semibold text-[#FDE68A]">{note.author}</span>
                          <span>
                            {new Date(note.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-[#F8F3E6]">{note.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeDrawer === 'chat' && (
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-xs font-semibold text-[#CBD5E1]">Express Emote</p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {(
                        [
                          { id: 'heart', label: '♥ Heart' },
                          { id: 'wave', label: '👋 Wave' },
                          { id: 'dance', label: '♪ Dance' },
                          { id: 'sparkle', label: '✦ Star' },
                          { id: 'tea', label: '☕ Tea' },
                          { id: 'music', label: '♫ Tune' },
                        ] as const
                      ).map((em) => (
                        <button
                          key={em.id}
                          type="button"
                          onClick={() => {
                            onSendEmote(em.id);
                            onCloseDrawer();
                          }}
                          className="min-h-[44px] rounded-xl border border-[#F8F3E6]/12 bg-[#141830] px-2 text-xs font-semibold text-[#F8F3E6] hover:border-[#F59E0B]"
                        >
                          {em.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold text-[#CBD5E1]">Quick Phrases</p>
                    <div className="grid grid-cols-2 gap-2">
                      {QUICK_CHATS.map((phrase) => (
                        <button
                          key={phrase}
                          type="button"
                          onClick={() => {
                            onSendChat(phrase);
                            onCloseDrawer();
                          }}
                          className="min-h-[42px] rounded-xl border border-[#F8F3E6]/10 bg-[#141830] px-3 py-2 text-left text-xs font-medium text-[#F8F3E6] hover:border-[#93C5FD]"
                        >
                          {phrase}
                        </button>
                      ))}
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!chatDraft.trim()) return;
                      onSendChat(chatDraft);
                      setChatDraft('');
                      onCloseDrawer();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      maxLength={60}
                      value={chatDraft}
                      onChange={(e) => setChatDraft(e.target.value)}
                      placeholder="Say something short..."
                      className="min-h-[44px] flex-1 rounded-xl border border-[#F8F3E6]/15 bg-[#13172C] px-3.5 text-sm text-[#F8F3E6] placeholder:text-[#64748B] focus:border-[#F59E0B] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#F59E0B] px-4 text-xs font-bold text-[#151828]"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Send</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
