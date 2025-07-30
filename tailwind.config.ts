import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    fontFamily: {
      sans: ['geist'],
      mono: ['geist-mono'],
    },
    extend: {
      screens: {
        'toast-mobile': '600px',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
          alpha: 'hsl(var(--card-bg-alpha))',
          solid: 'hsl(var(--card-bg-solid))',
          hover: 'hsl(var(--card-hover-bg))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          focus: 'hsl(var(--destructive-focus-bg))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        label: {
          text: 'hsl(var(--label-text))',
        },
        button: {
          alpha: 'hsl(var(--button-bg-alpha))',
          hover: 'hsl(var(--button-hover-bg))',
          outline: {
            hover: 'hsl(var(--button-hover))',
          },
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        chat: {
          input: {
            button: {
              border: 'hsl(var(--chat-input-button-border))',
              hover: 'hsl(var(--chat-input-button-hover))',
            },
            textarea: {
              border: 'hsl(var(--chat-input-textarea-border))',
            },
          },
        },
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        spreadsheet: {
          bg: 'hsl(var(--spreadsheet-bg))',
          header: 'hsl(var(--spreadsheet-header-bg))',
          text: 'hsl(var(--spreadsheet-text))',
          border: 'hsl(var(--spreadsheet-border))',
        },
        code: {
          block: {
            bg: 'hsl(var(--code-block-bg))',
            border: 'hsl(var(--code-block-border))',
            text: 'hsl(var(--code-block-text))',
          },
          inline: {
            bg: 'hsl(var(--code-inline-bg))',
          },
        },
        documentPreview: {
          border: {
            DEFAULT: 'hsl(var(--document-preview-border))',
            dark: 'hsl(var(--document-preview-border-dark))',
          },
          skeleton: {
            bg: 'hsl(var(--document-preview-skeleton-bg))',
          },
        },
        artifact: {
          border: {
            light: 'hsl(var(--artifact-border-light))',
            dark: 'hsl(var(--artifact-border-dark))',
          },
          skeleton: {
            bg: 'hsl(var(--artifact-skeleton-bg))',
          },
        },
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
    ({ addVariant }: any) => {
      // Add a "gilesta" variant
      addVariant('gilesta', '.gilesta &');
    },
  ],
};
export default config;
