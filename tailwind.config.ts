import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Notion/Linear 스타일 - 와인색 팔레트 (경기북과학고 상징색)
        primary: {
          50: "#fdf2f5",
          100: "#fce4e8",
          200: "#f8c9d4",
          300: "#f4afc0",
          400: "#e67ba8",
          500: "#d84682",
          600: "#a64d5c",  // 주 색상 (와인색)
          700: "#8b3a3a",
          800: "#6b2c2c",
          900: "#4a1f1f",
        },
        // 중립 회색 - 명확한 대비
        gray: {
          50: "#f9fafb",   // 배경
          100: "#f3f4f6",  // 섹션 배경
          150: "#ede9fe",  // 옅은 배경
          200: "#e5e7eb",  // 경계선 (선명)
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",  // 보조 텍스트
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",  // 주 텍스트
        },
        // 상태 색상
        success: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#145231",
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        danger: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#7f1d1d",
          900: "#450a0a",
        },
      },
      borderRadius: {
        xs: "6px",
        sm: "8px",
        md: "10px",
        lg: "12px",
        xl: "14px",
        "2xl": "16px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        sm: "0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        base: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        md: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        lg: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      },
      fontSize: {
        xs: ["12px", "16px"],
        sm: ["13px", "18px"],
        base: ["14px", "20px"],
        lg: ["15px", "22px"],
        xl: ["17px", "24px"],
        "2xl": ["19px", "26px"],
        "3xl": ["22px", "28px"],
        "4xl": ["26px", "30px"],
      },
    },
  },
  plugins: [],
};
export default config;
