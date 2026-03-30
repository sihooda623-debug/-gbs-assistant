import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Notion-inspired - 파란색 악센트 (#2383e2)
        primary: {
          50: "#eef4fc",
          100: "#d8e9f9",
          200: "#aed0f3",
          300: "#7ab5ec",
          400: "#4a9ae4",
          500: "#2383e2",  // main accent
          600: "#1a6ec4",
          700: "#1559a0",
          800: "#0f437c",
          900: "#0a2e57",
        },
        // Notion 중립 팔레트 - 깔끔한 회색
        gray: {
          50: "#f7f6f3",    // surface
          100: "#f1f0ec",
          150: "#ede9e4",
          200: "#e9e9e7",   // border
          300: "#d3d2cf",
          400: "#b0afad",
          500: "#9b9a97",   // text secondary
          600: "#6b6a67",
          700: "#4a4946",
          800: "#37352f",   // text primary
          900: "#191816",
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
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "12px",   // Notion: 12px max
        "2xl": "12px",  // Notion: 12px max
      },
      boxShadow: {
        none: "none",
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
