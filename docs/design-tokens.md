# LinguaAI Design Tokens

Sprint 2 establishes the shared visual foundation used by application pages and Storybook.

## Colour

| Token                               | Value     | Usage                                             |
| ----------------------------------- | --------- | ------------------------------------------------- |
| `ink.950` / `--bg-primary`          | `#0A0E1A` | App background, starfield base                    |
| `brand.primary` / `--color-primary` | `#1A73E8` | Primary actions, user message start               |
| `brand.accent` / `--color-accent`   | `#00E5FF` | Focus glow, streaming state, selected accents     |
| `brand.purple` / `--color-purple`   | `#7C4DFF` | Secondary glow, user message end, premium accents |
| `signal.success`                    | `#45F5A5` | Success and ready states                          |
| `signal.warning`                    | `#FFD166` | Attention states                                  |
| `signal.danger`                     | `#FF6B7A` | Validation and destructive states                 |

## Typography

| Token          | Stack                              | Usage                                     |
| -------------- | ---------------------------------- | ----------------------------------------- |
| `font-display` | Orbitron, Space Grotesk, system-ui | Product mark, numeric or identity moments |
| `font-sans`    | Inter, Noto Sans SC, system-ui     | Interface text and multilingual fallback  |
| `font-mono`    | Space Grotesk, ui-monospace        | Compact metadata and technical labels     |

The tokens define the requested PRD font families without requiring runtime network font loading.

## Surfaces

| Token/Class          | Value                                       | Usage                                       |
| -------------------- | ------------------------------------------- | ------------------------------------------- |
| `.glass-panel`       | blurred translucent panel with white border | Character cards, chat bubbles, dense panels |
| `rounded-control`    | `12px`                                      | Buttons and inputs                          |
| `rounded-bubble`     | `12px`                                      | User message bubbles                        |
| `shadow-glow`        | blue/cyan glow                              | Primary CTA and selected interactive states |
| `shadow-glow-cyan`   | cyan glow                                   | Active streaming and focus accents          |
| `shadow-glow-purple` | purple glow                                 | selected character accents                  |

## Motion

| Token                  | Usage                                    |
| ---------------------- | ---------------------------------------- |
| `animate-pulse-aura`   | Speaking avatar breathing glow           |
| `animate-cursor-blink` | Streaming message cursor                 |
| `animate-drift`        | Low-cost atmospheric background fallback |

Motion is disabled through `prefers-reduced-motion` to protect accessibility and low-power devices.
