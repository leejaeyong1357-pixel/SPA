/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        teczen: {
          navy: "#003D7A",
          "navy-dark": "#002854",
          "navy-light": "#0055A8",
          blue: "#2E5BFF",
          "blue-light": "#5B7FFF",
          red: "#E60012",
          "red-dark": "#B8000F",
          ink: "#0A1929",
          gray: {
            50: "#F8F9FA",
            100: "#F1F3F5",
            200: "#E9ECEF",
            300: "#DEE2E6",
            400: "#CED4DA",
            500: "#ADB5BD",
            600: "#6C757D",
            700: "#495057",
            800: "#343A40",
            900: "#212529",
          },
        },
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
