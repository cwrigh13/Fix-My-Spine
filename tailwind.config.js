/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs",
    "./public/**/*.html",
    "./public/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2D8B8B',
        secondary: '#E0F2F1',
        accent: '#F9A826',
        text: '#212529',
        muted: '#6C757D',
        border: '#E9ECEF',
        background: '#F8F9FA'
      },
      fontFamily: {
        'heading': ['Plus Jakarta Sans', 'sans-serif'],
        'body': ['Inter', 'sans-serif']
      },
      fontWeight: {
        'heading': '700',
        'body': '400'
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ],
}
