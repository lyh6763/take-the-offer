/** 면접관 실루엣 (직접 그린 도형). 질문을 읽는 동안 speaking 클래스로 흔들린다. */
export function Interviewer({ speaking }: { speaking: boolean }) {
  return (
    <svg className={`interviewer ${speaking ? 'is-speaking' : ''}`} viewBox="0 0 200 220" aria-hidden="true" focusable="false">
      <path d="M20 220 C 24 168, 58 146, 100 146 C 142 146, 176 168, 180 220 Z" fill="#0d0d0d" />
      <path d="M86 146 L 100 182 L 114 146 Z" fill="#e5191c" />
      <ellipse cx="100" cy="88" rx="46" ry="54" fill="#0d0d0d" />
      <path d="M58 70 C 62 38, 138 38, 142 70 C 128 56, 72 56, 58 70 Z" fill="#1d1d1d" />
      <rect x="62" y="80" width="32" height="18" rx="3" fill="none" stroke="#fafafa" strokeWidth="3" />
      <rect x="106" y="80" width="32" height="18" rx="3" fill="none" stroke="#fafafa" strokeWidth="3" />
      <path d="M94 88 L 106 88" stroke="#fafafa" strokeWidth="3" />
      <path className="interviewer__glint" d="M68 84 L 80 84" stroke="#e5191c" strokeWidth="4" strokeLinecap="round" />
      <path className="interviewer__glint" d="M112 84 L 124 84" stroke="#e5191c" strokeWidth="4" strokeLinecap="round" />
      <path className="interviewer__mouth" d="M84 120 Q 100 112 116 120" stroke="#fafafa" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
