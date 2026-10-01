import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Violet = couleur principale (boutons, liens, états actifs, progression).
        // Basé sur des variables CSS (voir app/globals.css :root) plutôt que
        // des valeurs fixes, pour pouvoir être recoloré temporairement par un
        // événement thématique (components/ThemeEvent.tsx) sans redéploiement.
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        'accent-dark': 'rgb(var(--accent-dark-rgb) / <alpha-value>)',
        'accent-light': 'rgb(var(--accent-light-rgb) / <alpha-value>)',
        // Vert lime = accent ponctuel (records, succès, moments à mettre en avant), jamais recoloré.
        volt: '#A3E635',
      },
    },
  },
  plugins: [],
};
export default config;
