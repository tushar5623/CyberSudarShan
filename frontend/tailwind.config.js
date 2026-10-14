/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 1. Yahan humne define kiya ki movement kaisi hogi (Keyframes)
      keyframes: {
        'moving-gradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
      },
      // 2. Yahan humne us movement ko ek naam diya (Animation utility)
      animation: {
        'gradient-flow': 'moving-gradient 3s linear infinite alternate',
      },
    },
  },
  plugins: [],
}