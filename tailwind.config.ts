import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Violet = couleur principale (boutons, liens, états actifs, progression)
        accent: '#8B5CF6',
        'accent-dark': '#7C3AED',
        'accent-light': '#A78BFA',
        // Vert lime = accent ponctuel (records, succès, moments à mettre en avant)
        volt: '#A3E635',
      },
    },
  },
  plugins: [],
};
export default config;
