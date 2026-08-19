import type { Config } from "tailwindcss";

/** Token-backed colour: keeps `bg-accent/10` and friends working. */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: token("background"),
        surface: {
          DEFAULT: token("surface"),
          muted: token("surface-muted"),
        },
        border: token("border"),
        foreground: token("foreground"),
        muted: token("muted"),
        accent: {
          DEFAULT: token("accent"),
          hover: token("accent-hover"),
          contrast: token("accent-contrast"),
        },
        icon: {
          trigger: token('icon-trigger'),
          alias: token('icon-alias'),
          script: token('icon-script'),
          timer: token('icon-timer'),
          key: token('icon-key'),
          button: token('icon-button'),
          folder: token('icon-folder'),
          image: token('icon-image'),
          file: token('icon-file'),
        },
        success: token("success"),
        danger: token("danger"),
        warning: token("warning"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
      },
      typography: {
        DEFAULT: {
          css: {
            "--tw-prose-body": "rgb(var(--foreground))",
            "--tw-prose-headings": "rgb(var(--foreground))",
            "--tw-prose-bold": "rgb(var(--foreground))",
            "--tw-prose-links": "rgb(var(--accent))",
            "--tw-prose-quotes": "rgb(var(--muted))",
            "--tw-prose-bullets": "rgb(var(--border))",
            "--tw-prose-hr": "rgb(var(--border))",
            "--tw-prose-code": "rgb(var(--foreground))",
            "--tw-prose-captions": "rgb(var(--muted))",
            "--tw-prose-counters": "rgb(var(--muted))",
            maxWidth: "none",
            code: {
              backgroundColor: "rgb(var(--surface-muted))",
              borderRadius: "0.375rem",
              padding: "0.125rem 0.375rem",
              fontWeight: "500",
            },
            "code::before": { content: '""' },
            "code::after": { content: '""' },
            pre: {
              backgroundColor: "rgb(var(--surface-muted))",
              color: "rgb(var(--foreground))",
              border: "1px solid rgb(var(--border))",
            },
          },
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
  ],
} satisfies Config;
