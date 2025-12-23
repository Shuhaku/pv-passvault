// src/renderer/src/components/Logo.tsx

export const Logo = ({ size = 40 }: { size?: number }) => {
  // ✨ 색상 변경: 토스 블루 -> 리치 골드 (#FFD700)
  const mainColor = '#FFD700'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 1. 원형 고리 (반지) */}
      <circle cx="100" cy="100" r="75" stroke={mainColor} /* 변수명 변경 */ strokeWidth="25" />

      {/* 2. 번개 모양 */}
      <path
        d="M120 10 L85 95 H125 L80 190 L115 105 H75 L120 10Z"
        fill={mainColor} /* 변수명 변경 */
        stroke="white"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
