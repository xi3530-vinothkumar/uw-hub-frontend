/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // UW Hub brand palette — cool slate with a steel-blue accent
        uw: {
          // Primary surfaces
          bg: '#0f1621',         // deep navy — main app background
          surface: '#1a2335',    // card/panel surface
          border: '#2a3a52',     // subtle borders
          // Text
          text: '#e2e8f4',       // primary text
          muted: '#7a90b0',      // secondary/muted text
          // Accent — steel blue (decision authority, CTAs)
          accent: '#3b82f6',     // blue-500 equivalent
          'accent-dim': '#1d4ed8', // hover/pressed
          // Semantic states (separate from accent)
          accept: '#10b981',     // emerald — accept band
          refer: '#f59e0b',      // amber — refer band
          decline: '#ef4444',    // red — decline band
          // Processing states
          processing: '#6366f1', // indigo — in-flight
          extracted: '#0ea5e9',  // sky — extracted/ready
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-soft': 'pulse 3s ease-in-out infinite',
        'slide-in': 'slideIn 0.25s ease-out both',
      },
      keyframes: {
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      boxShadow: {
        'uw-card': '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(42,58,82,0.6)',
        'uw-elevated': '0 4px 16px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
}
