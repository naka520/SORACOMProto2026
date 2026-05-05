export function KoupenSVG({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <ellipse cx="60" cy="70" rx="42" ry="40" fill="#fff" stroke="#bbb" strokeWidth="3" />
      <ellipse cx="60" cy="60" rx="38" ry="38" fill="#f6f6f6" />
      <ellipse cx="60" cy="70" rx="30" ry="28" fill="#fff" />
      <ellipse cx="50" cy="75" rx="4" ry="4" fill="#222" />
      <ellipse cx="70" cy="75" rx="4" ry="4" fill="#222" />
      <path d="M54 85 Q60 90 66 85" stroke="#222" strokeWidth="2" fill="none" />
      <ellipse cx="47" cy="82" rx="3" ry="2" fill="#fbb" opacity="0.7" />
      <ellipse cx="73" cy="82" rx="3" ry="2" fill="#fbb" opacity="0.7" />
    </svg>
  );
}
