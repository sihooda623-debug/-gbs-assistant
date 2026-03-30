import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Notion-inspired - 파란색 악센트
        primary: {
          50: "#eef4fc",
          100: "#d8e9f9",
          200: "#aed0f3",
          300: "#7ab5ec",
          400: "#4a9ae4",
          500: "#0052cc",  // 선명한 파란색
          600: "#003d99",
          700: "#002966",
          800: "#001433",
          900: "#000a1a",
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
