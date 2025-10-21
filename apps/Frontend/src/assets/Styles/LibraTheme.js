import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const LibraTheme = definePreset(Aura, {
  semantic: {
    colors: {
      primary: {
        color: 'var(--color-sunset-300)',          // main accent
        contrastColor: 'var(--color-night-100)',   // text color on primary
        hoverColor: 'var(--color-sunset-400)',
        activeColor: 'var(--color-sunset-200)',
      },
      surface: {
        color: 'var(--color-timberwolf-900)',      // background for surfaces/cards
        hoverColor: 'var(--color-timberwolf-800)',
        borderColor: 'var(--color-timberwolf-400)',
        textColor: 'var(--color-night-500)',
      },
      success: {
        color: 'var(--color-lion-400)',
        contrastColor: '#fff'
      },
      info: {
        color: 'var(--color-ochre-400)',
        contrastColor: '#fff'
      },
      warning: {
        color: 'var(--color-sunset-400)',
        contrastColor: '#000'
      },
      danger: {
        color: '#d14343',
        contrastColor: '#fff'
      }
    }
  },

  dark: {
    semantic: {
      colors: {
        primary: {
          color: 'var(--color-sunset-200)',
          contrastColor: '#fff'
        },
        surface: {
          color: 'var(--color-night-300)',
          textColor: 'var(--color-timberwolf-800)'
        }
      }
    }
  },

  components: {
    button: {
      root: {
        borderRadius: '0.75rem',
        paddingY: '0.75rem',
        paddingX: '1.25rem',
        fontWeight: '600'
      }
    },
    inputtext: {
      root: {
        borderRadius: '0.75rem',
        background: 'var(--color-timberwolf-800)',
        color: 'var(--color-night-600)',
        focusRing: {
          width: '2px',
          color: 'var(--color-sunset-200)',
        },
        focusBorderColor: 'var(--color-sunset-300)'
      }
    },
    card: {
      root: {
        background: 'var(--color-timberwolf-900)',
        borderColor: 'var(--color-timberwolf-400)',
        color: 'var(--color-night-500)'
      }
    }
  }
});

export default LibraTheme;
