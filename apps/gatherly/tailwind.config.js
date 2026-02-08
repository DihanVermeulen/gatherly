module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#00D26A",
          hover: "#00BA5E",
          active: "#00A850",
          light: "#E8FFF4",
        },
        neutral: {
          dark: "#1A1A1A",
          medium: "#666666",
          light: "#F5F5F5",
          border: "#E0E0E0",
        },
        accent: {
          blue: "#4A90E2",
          coral: "#FF6B6B",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        "level-1": "0 1px 3px rgba(0,0,0,0.08)",
        "level-2": "0 4px 12px rgba(0,0,0,0.1)",
        "level-3": "0 8px 24px rgba(0,0,0,0.12)",
        "level-4": "0 16px 48px rgba(0,0,0,0.15)",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
    },
  },
  plugins: [],
};
