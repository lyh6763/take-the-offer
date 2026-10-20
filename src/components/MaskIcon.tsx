/** 괴도단 가면 마크 (직접 그린 도미노 가면) */
export function MaskIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`mask-icon ${className}`} viewBox="0 0 120 60" aria-hidden="true" focusable="false">
      <path
        d="M4 14 C 20 2, 44 4, 60 16 C 76 4, 100 2, 116 14 C 118 34, 106 52, 86 54 C 74 55, 66 46, 60 38 C 54 46, 46 55, 34 54 C 14 52, 2 34, 4 14 Z"
        fill="currentColor"
      />
      <path d="M22 24 C 30 18, 42 20, 47 28 C 40 33, 28 33, 22 24 Z" fill="var(--mask-eye, #fafafa)" />
      <path d="M98 24 C 90 18, 78 20, 73 28 C 80 33, 92 33, 98 24 Z" fill="var(--mask-eye, #fafafa)" />
    </svg>
  );
}
