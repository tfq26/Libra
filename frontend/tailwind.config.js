import plugin from "tailwindcss";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
    textShadow: {
      sm: '0 1px 2px var(--tw-shadow-color)',
      DEFAULT: '0 2px 4px var(--tw-shadow-color)',
      lg: '0 8px 16px var(--tw-shadow-color)',
    },

    colors: {
      white: '#ffffff',
      mobile_menu_background: '#150f36',
      hero_header_color: '#f8e2d4',
      dark_yellow: '#e2bd6B',
      hero_subheader_color: '#6306bf',
      dark_orange: '#fc8505',
      dark_blue: '#324aa8',
      dark_green: '#33611d',
      dark_red:'#802537',
      deep_blue: '#333399'
    },

    images: {
      alt_profile: "./public/assets/images/vecteezy_profile-default-icon-design-template_50018408.jpg"
    },

    backgroundImage: {
      hero_gradient: 'linear-gradient(to bottom, #4A00E0, #8E2DE2)',
      subheader_gradient: 'linear-gradient(to top, #F37335, #FDC830)',
      about_gradient: 'radial-gradient(#ff00cc, #333399)',
      interface_gradient: 'linear-gradient(40deg, #41295a, #2f0743);'/*'radial-gradient( circle farthest-corner at 30% 30%,  rgba(151,41,247,1) 0%, rgba(24,22,39,1) 90% );'*/
    },

    backgroundColor: {
      about_color: '#8F00FF',
      primary_buttons: '#731087',
      chat_color: '#f0c9c9',
      message_color: '#9c6ac4',
    },

    fontFamily: {
      'hero_header': ['system-ui', 'sans-serif'],
      'about-item': ['system-ui', 'sans-serif'],
    },

    animation: {
      'slow-spin' : 'spin 5s linear infinite',
      'glow' : 'wiggle 2s linear infinite',
    },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        }
      }
  },
    plugins: [plugin(function ({ matchUtilities, theme }) {

      matchUtilities(
        {
          'text-shadow': (value) => ({
            textShadow: value,
          }),
        },
        { values: theme('textShadow') }
      )
    }),
    ],
  }
}