import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        airtel: {
          red: "#E40000",
          darkRed: "#C00000",
          gray: "#F5F5F5",
          darkGray: "#333333",
        },
      },
    },
  },
  plugins: [],
};

export default config;
