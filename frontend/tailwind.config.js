/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        rsk: {
          primary: '#FF6A00',
          secondary: '#FF8C42',
          bg: '#0B0B0B',
          card: '#141414',
          border: '#1F1F1F',
          text: '#FFFFFF',
          muted: '#A0A0A0',
          success: '#22C55E',
          error: '#EF4444',
        },
      },
      borderRadius: {
        xl: '16px',
        lg: '12px',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,106,0,0.25), 0 0 24px rgba(255,106,0,0.18)',
        card: '0 10px 30px rgba(0,0,0,0.45)',
      },
      backgroundImage: {
        'rsk-gradient': 'linear-gradient(135deg, #FF6A00 0%, #FF8C42 55%, #FFB26B 100%)',
        'rsk-radial': 'radial-gradient(60% 60% at 50% 0%, rgba(255,106,0,0.18) 0%, rgba(255,106,0,0) 60%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0px)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 240ms ease-out',
        'scale-in': 'scale-in 180ms ease-out',
        shimmer: 'shimmer 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
