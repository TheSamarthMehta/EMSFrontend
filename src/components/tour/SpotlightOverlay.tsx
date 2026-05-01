export function SpotlightOverlay({ targetRect }: { targetRect: DOMRect | null }) {
  if (!targetRect) return <div className="fixed inset-0 z-[9998] h-[100vh] h-[100dvh] touch-none bg-black/55" />;

  return (
    <>
      <div className="fixed inset-0 z-[9998] h-[100vh] h-[100dvh] touch-none bg-black/55" />
      <div
        className="pointer-events-none fixed z-[9998] rounded-xl transition-all duration-200 ease-in-out"
        style={{
          top: targetRect.top - 6,
          left: targetRect.left - 6,
          width: targetRect.width + 12,
          height: targetRect.height + 12,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.5)",
        }}
      />
    </>
  );
}

