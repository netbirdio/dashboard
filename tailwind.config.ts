import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./node_modules/flowbite-react/**/*.js",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "nb-gray": {
          DEFAULT: "#181A1D",
          "50": "#f4f6f7",
          "100": "#e4e7e9",
          "200": "#cbd2d6",
          "250": "#b7c0c6",
          "300": "#aab4bd",
          "350": "#8f9ca8",
          "400": "#7c8994",
          "500": "#616e79",
          "600": "#535d67",
          "700": "#474e57",
          "800": "#3f444b",
          "850": "#363b40",
          "900": "#32363D",
          "910": "#2b2f33",
          "920": "#25282d",
          "925": "#1e2123",
          "930": "#25282c",
          "935": "#1f2124",
          "940": "#1c1e21",
          "950": "#181a1d",
          "960": "#15171a",
        },
        netbird: {
          DEFAULT: "#f68330",
          "50": "#fff6ed",
          "100": "#feecd6",
          "150": "#ffdfb8",
          "200": "#ffd4a6",
          "300": "#fab677",
          "400": "#f68330",
          "500": "#f46d1b",
          "600": "#e55311",
          "700": "#be3e10",
          "800": "#973215",
          "900": "#7a2b14",
          "950": "#421308",
        },
        "nb-blue": {
          DEFAULT: "#31e4f5",
          "50": "#ebffff",
          "100": "#cefdff",
          "200": "#a2f9ff",
          "300": "#63f2fd",
          "400": "#31e4f5",
          "500": "#00c4da",
          "600": "#039cb7",
          "700": "#0a7c94",
          "800": "#126478",
          "900": "#145365",
          "950": "#063746",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      transitionDuration: {
        "3000": "3000ms",
      },
    },
  },
  plugins: [require("flowbite/plugin"), require("tailwindcss-animate")],
};
export default config;
