/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        relay: {
          bg: "#0C0E12",
          surface: "#14171D",
          raised: "#1C2027",
          border: "#272D37",
          subtle: "#1E232B",
          text: "#F1F5F9",
          muted: "#94A3B8",
          faint: "#64748B",
          primary: "#0284C7",
          "primary-hover": "#0369A1",
          success: "#10B981",
          warning: "#F59E0B",
          error: "#EF4444"
        }
      },
      fontFamily: {
        mono: ["JetBrains Mono", "SF Mono", "Menlo", "Consolas", "monospace"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"]
      }
    },
  },
  plugins: [],
}
