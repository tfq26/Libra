import tailwindcssPrimeui from 'tailwindcss-primeui'

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  plugins: [tailwindcssPrimeui],
  safelist: [{ pattern: /^p-/ }], // ✅ ensure PrimeVue classes aren't purged
}