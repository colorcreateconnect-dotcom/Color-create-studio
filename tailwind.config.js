/** @type {import('tailwindcss').Config} */
// Re-skin note: the v3.6.1 engine leans on `amber` (its accent) and `stone` (its neutral).
// We remap those two scales onto the Color Create Studio design system — gold accent + warm
// cocoa/cream neutrals — so existing utility classes render in the SKIN palette without
// editing component logic. Sports `blue`/`slate` are left as Tailwind defaults because the
// stadium chrome-and-blue treatment is shared by both the engine and the SKIN.
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Accent — Golden Loop Gold family (was Tailwind amber)
        amber: {
          50: '#FBF6E9', 100: '#F4EAC9', 200: '#E9D39A', 300: '#E0C684',
          400: '#D4B45F', 500: '#C8A24A', 600: '#B0873A', 700: '#8E6E2C',
          800: '#6E5212', 900: '#574010', 950: '#3A2A0A',
        },
        // Neutral — warm cocoa / cream family (was Tailwind stone)
        stone: {
          50: '#FBF7F0', 100: '#F5EEE3', 200: '#E8DDCD', 300: '#D5C5AF',
          400: '#B7A491', 500: '#9A8278', 600: '#6B554C', 700: '#4E3D35',
          800: '#3B2A24', 900: '#2A1E1A', 950: '#181514',
        },
        // Color Create Connect vibrant brand palette (targeted use)
        ccc: {
          pink: '#EA3B84', purple: '#9B4DD4', blue: '#2A6FDB',
          teal: '#8FD6D2', gold: '#F2C23A',
        },
        sage: { DEFAULT: '#A8B99D', deep: '#7E9270', soft: '#C7D2BF' },
        blush: { DEFAULT: '#F4B8C4', soft: '#FAD9DF', deep: '#D98A9B' },
        gold: { DEFAULT: '#C8A24A', soft: '#E0C684' },
        cream: { DEFAULT: '#F7EFE3', soft: '#F8F3EE', paper: '#FFFCF7' },
        cocoa: { DEFAULT: '#3B2A24', deep: '#181514' },
      },
      fontFamily: {
        display: ["'DM Serif Display'", "'Playfair Display'", 'Georgia', 'serif'],
        sans: ["'Inter'", "'Helvetica Neue'", 'system-ui', 'sans-serif'],
        label: ["'Montserrat'", "'Helvetica Neue'", 'system-ui', 'sans-serif'],
        script: ["'Dancing Script'", 'cursive'],
      },
    },
  },
  plugins: [],
}
