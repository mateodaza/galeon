# Galeon Design System

> Mercury-inspired elegance with emerald warmth. Light mode first, institutional yet approachable.

## Design Philosophy

**"Hidden in Plain Sight"** - Like the San José treasure at 600m depth, visible on sonar but unreachable. Our UI should feel:

- **Elegant** - Mercury-style minimal, not Stripe-corporate
- **Warm** - Emerald accents evoke deep sea, Colombian heritage
- **Trustworthy** - Light mode for institutional appeal
- **Simple** - Complex crypto, simple interface

### Current State & Migration

> **Note:** The current app uses a dark theme (zinc-900 backgrounds). This design system defines our target light-first approach. Migration will happen in Phase 1 by updating `globals.css` and removing forced dark classes.

**Migration steps:**

1. Replace `bg-zinc-900` / `bg-zinc-950` with `bg-background`
2. Replace `text-zinc-*` with semantic `text-primary` / `text-secondary` / `text-muted`
3. Replace `border-zinc-*` with `border` / `border-subtle`
4. Remove `dark:*` utilities (we're light-only for hackathon)

---

## Color System

### Light Mode (Default)

| Token                      | Hex       | Usage                |
| -------------------------- | --------- | -------------------- |
| `--color-background`       | `#FBFCFD` | Page background      |
| `--color-surface`          | `#F4F4F8` | Cards, panels        |
| `--color-surface-elevated` | `#FFFFFF` | Modals, dropdowns    |
| `--color-text-primary`     | `#1A1A23` | Headings, body text  |
| `--color-text-secondary`   | `#6B6B7B` | Labels, descriptions |
| `--color-text-muted`       | `#9CA3AF` | Placeholders, hints  |
| `--color-border`           | `#E4E4EC` | Card borders         |
| `--color-border-subtle`    | `#F0F0F5` | Dividers             |

### Dark Mode

| Token                      | Hex       | Usage                |
| -------------------------- | --------- | -------------------- |
| `--color-background`       | `#141418` | Page background      |
| `--color-surface`          | `#1E1E24` | Cards, panels        |
| `--color-surface-elevated` | `#28282F` | Modals, dropdowns    |
| `--color-text-primary`     | `#EDEDF3` | Headings, body text  |
| `--color-text-secondary`   | `#A1A1AA` | Labels, descriptions |
| `--color-text-muted`       | `#71717A` | Placeholders, hints  |
| `--color-border`           | `#2E2E36` | Card borders         |
| `--color-border-subtle`    | `#232329` | Dividers             |

### Accent Colors (Emerald - San José Deep Sea)

| Token                   | Light     | Dark      | Usage                         |
| ----------------------- | --------- | --------- | ----------------------------- |
| `--color-accent`        | `#10B981` | `#34D399` | Primary actions, links        |
| `--color-accent-hover`  | `#059669` | `#6EE7B7` | Hover states                  |
| `--color-accent-muted`  | `#D1FAE5` | `#134E4A` | Badges, tags (see note below) |
| `--color-accent-subtle` | `#ECFDF5` | `#0F3D36` | Backgrounds                   |

> **Dark mode accent contrast:** The muted/subtle dark values (`#134E4A`, `#0F3D36`) are backgrounds, not text. Pair them with `--color-accent` text (`#34D399`) for proper contrast (5.2:1). Never use these as text colors on dark backgrounds.

### Semantic Colors

| Token             | Value     | Usage                                  |
| ----------------- | --------- | -------------------------------------- |
| `--color-success` | `#10B981` | Payment complete, verification passed  |
| `--color-warning` | `#F59E0B` | Pending actions, low balance           |
| `--color-error`   | `#EF4444` | Failed transactions, validation errors |
| `--color-info`    | `#3B82F6` | Informational messages                 |

---

## Accessibility

### Contrast Requirements (WCAG 2.1 AA)

| Element Type            | Minimum Ratio  | Tested Pairs                      |
| ----------------------- | -------------- | --------------------------------- |
| Body text               | 4.5:1          | `#1A1A23` on `#FBFCFD` = 14.7:1 ✓ |
| Large text (≥18px bold) | 3:1            | `#6B6B7B` on `#FBFCFD` = 5.8:1 ✓  |
| UI components           | 3:1            | `#10B981` on `#FBFCFD` = 3.2:1 ✓  |
| Disabled text           | No requirement | `#9CA3AF` used for placeholders   |

**Dark mode pairs:**

- `#EDEDF3` on `#141418` = 13.5:1 ✓
- `#34D399` on `#141418` = 8.1:1 ✓

### Focus States

All interactive elements must have visible focus indicators:

```css
/* Default focus ring */
.focus-ring {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* For dark backgrounds */
.focus-ring-light {
  outline: 2px solid white;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.3);
}
```

**Never remove focus outlines without providing an alternative.**

### Reduced Motion

Respect user preferences for reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Motion library usage:**

```typescript
// apps/web/lib/animations.ts
import { useReducedMotion } from 'motion/react'

export function useAnimationPreset(preset: MotionProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return { initial: false, animate: false }
  }

  return preset
}
```

### Keyboard Navigation

- All interactive elements reachable via Tab
- Logical tab order (follows visual layout)
- Escape closes modals/dropdowns
- Enter/Space activates buttons
- Arrow keys navigate lists/menus

### Screen Readers

- Use semantic HTML (`<button>`, `<nav>`, `<main>`)
- Add `aria-label` for icon-only buttons
- Use `aria-live` for dynamic content updates
- Hide decorative elements with `aria-hidden="true"`

---

## Typography

### Font Stack

```css
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Scale

| Name      | Size            | Weight | Usage             |
| --------- | --------------- | ------ | ----------------- |
| `display` | 48px / 3rem     | 700    | Hero headlines    |
| `h1`      | 36px / 2.25rem  | 700    | Page titles       |
| `h2`      | 24px / 1.5rem   | 600    | Section headers   |
| `h3`      | 20px / 1.25rem  | 600    | Card titles       |
| `body`    | 16px / 1rem     | 400    | Paragraphs        |
| `body-sm` | 14px / 0.875rem | 400    | Secondary text    |
| `caption` | 12px / 0.75rem  | 500    | Labels, hints     |
| `mono`    | 14px / 0.875rem | 400    | Addresses, hashes |

---

## Spacing & Layout

### Spacing Scale

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
```

### Border Radius

| Token           | Value  | Usage           |
| --------------- | ------ | --------------- |
| `--radius-sm`   | 8px    | Buttons, inputs |
| `--radius-md`   | 12px   | Cards           |
| `--radius-lg`   | 16px   | Modals, panels  |
| `--radius-xl`   | 24px   | Hero sections   |
| `--radius-full` | 9999px | Avatars, badges |

### Shadows

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.08);
--shadow-glass: 0 4px 30px rgba(0, 0, 0, 0.05);
```

---

## Glassmorphism

Use sparingly for elevated, floating elements.

### Glass Card

```css
.glass-card {
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-glass);
}
```

### Tokens

| Token                | Light                      | Dark                       |
| -------------------- | -------------------------- | -------------------------- |
| `--glass-background` | `rgba(244, 244, 248, 0.7)` | `rgba(30, 30, 36, 0.8)`    |
| `--glass-blur`       | `12px`                     | `12px`                     |
| `--glass-border`     | `rgba(255, 255, 255, 0.3)` | `rgba(255, 255, 255, 0.1)` |

### Where to Use

- Port cards (on colored backgrounds)
- Payment modals
- Fog wallet cards
- Toast notifications
- Floating action panels

### Where NOT to Use

- Data tables (readability)
- Navigation (clarity)
- Form inputs (accessibility)
- Long-form text areas

### Legibility on Busy Backgrounds

Glass effects can hurt legibility when placed over images, patterns, or complex gradients.

**Guidelines:**

1. **Increase blur** on busy backgrounds: Use `--glass-blur: 20px` instead of 12px
2. **Darken the glass** slightly: `rgba(244, 244, 248, 0.85)` for more opacity
3. **Add text shadow** to critical text:
   ```css
   .glass-text-safe {
     text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
   }
   ```
4. **Prefer solid cards** for content-heavy areas
5. **Test on real content** - don't approve designs with placeholder backgrounds

**Safe patterns for glass:**

- Solid gradient backgrounds (emerald to teal)
- Simple noise textures
- Subtle pattern overlays with low contrast

**Avoid glass over:**

- Hero images
- Maps or complex data visualizations
- User-uploaded content (unpredictable)

---

## Components

### Buttons

| Variant     | Style                   | Usage             |
| ----------- | ----------------------- | ----------------- |
| Primary     | Emerald bg, white text  | Main CTAs         |
| Secondary   | Border only, text color | Secondary actions |
| Ghost       | No border, subtle hover | Tertiary actions  |
| Destructive | Red bg                  | Delete, cancel    |

**Primary button with subtle gradient:**

```css
.btn-primary {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
}
```

### Cards

| Variant     | Style                       | Usage                    |
| ----------- | --------------------------- | ------------------------ |
| Default     | Surface bg, subtle border   | General content          |
| Glass       | Glassmorphism               | Featured items, floating |
| Outlined    | Border only, transparent bg | Lists, grids             |
| Interactive | Hover lift effect           | Clickable items          |

### Inputs

- Clean, minimal border
- Focus ring in accent color
- Label above, hint below
- Error state with red border + message

---

## Motion & Animation

### Library: Motion (Framer Motion)

Install: `pnpm add motion`

### Timing Functions

```css
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Duration

| Token               | Value | Usage            |
| ------------------- | ----- | ---------------- |
| `--duration-fast`   | 150ms | Hovers, focus    |
| `--duration-normal` | 250ms | Transitions      |
| `--duration-slow`   | 400ms | Page transitions |

### Animation Presets

```typescript
// apps/web/lib/animations.ts

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.25 },
}

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2 },
}

export const cardHover = {
  whileHover: {
    y: -4,
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.1)',
  },
  transition: { duration: 0.2 },
}

export const glassLift = {
  whileHover: {
    y: -2,
    backdropFilter: 'blur(16px)',
    boxShadow: '0 8px 32px rgba(16, 185, 129, 0.15)',
  },
}
```

### Micro-interactions

- **Button press**: Scale to 0.98 on tap
- **Card hover**: Lift 4px, increase shadow
- **Glass hover**: Increase blur, emerald glow
- **Success**: Checkmark draw + confetti burst
- **Loading**: Subtle pulse or shimmer

---

## Icons

### Library: Lucide

Install: `pnpm add lucide-react`

### Usage

```tsx
import { Anchor, Send, Eye, Shield } from 'lucide-react'
;<Anchor className="h-5 w-5 text-emerald-500" />
```

### Custom Nautical Icons (To Create)

| Icon               | Usage                |
| ------------------ | -------------------- |
| `ship` / `galleon` | Logo, brand          |
| `port`             | Port feature         |
| `fog` / `mist`     | Fog Mode             |
| `treasure-chest`   | Success, collection  |
| `compass`          | Navigation, guidance |
| `anchor`           | Port, stability      |
| `wave`             | Transaction flow     |

---

## Tool Stack

| Tool                      | Purpose              | Install                        |
| ------------------------- | -------------------- | ------------------------------ |
| **shadcn/ui**             | Component primitives | `npx shadcn@latest init`       |
| **Motion**                | Animations           | `pnpm add motion`              |
| **Lucide**                | Icons                | `pnpm add lucide-react`        |
| **clsx + tailwind-merge** | Class utilities      | `pnpm add clsx tailwind-merge` |

### shadcn/ui Integration Strategy

The repo already has custom components (`wallet-button.tsx`, page-specific components). Here's how to integrate:

**Components to ADD from shadcn/ui:**

- `button` - Replace inline button styles with consistent variants
- `input` - Form inputs with validation states
- `dialog` - Modals (payment confirmation, etc.)
- `toast` / `sonner` - Notifications
- `dropdown-menu` - Wallet menu, settings
- `skeleton` - Loading states

**Components to KEEP as custom:**

- `wallet-button.tsx` - Wraps Reown AppKit, keep custom
- `port-card.tsx` - Domain-specific, custom design
- `glass-card.tsx` - Custom glassmorphism wrapper
- Page-specific layouts - Custom to our flow

**Approach:**

1. Initialize shadcn/ui with our theme tokens
2. Copy primitives (`button`, `input`, etc.) to `components/ui/`
3. Customize copied components to match design system
4. Build feature components using primitives
5. Existing custom components stay, but adopt new tokens

---

## Implementation Plan

### Current Status

> **Landing page complete.** The homepage uses the new dark glass theme with cyan accents. Other pages still need migration.

**Active color scheme (landing):**

- Background: Dark gradient with ocean imagery
- Glass cards: `bg-slate-900/50 backdrop-blur-xl border-white/20`
- Primary buttons: `bg-cyan-600/80 hover:bg-cyan-500/80`
- Text: `text-white`, `text-cyan-100/80`, `text-cyan-300`

### Phase 1: Foundation ✅

**Files created/modified:**

1. `apps/web/app/globals.css` - Tailwind @theme tokens
2. `apps/web/lib/utils.ts` - cn() helper
3. `apps/web/lib/animations.ts` - Motion presets
4. `apps/web/components/ui/` - shadcn components

**Tasks:**

- [x] Set up Tailwind v4 @theme with design tokens
- [x] Initialize shadcn/ui with custom theme
- [x] Install Motion and create animation presets
- [x] Install Lucide icons
- [ ] Create theme toggle component (light/dark) - _Deferred, dark-only for hackathon_

### Phase 2: Core Components ✅

**Components built:**

- [x] `Button` - shadcn/ui with custom variants
- [x] `Card` - Default and glass variants
- [x] `GlassCard` - Glassmorphism wrapper (`components/ui/glass-card.tsx`)
- [x] `Input` - shadcn/ui base
- [ ] `Dialog` / `Modal` - With glass background
- [ ] `Toast` - With Motion animations
- [ ] `Badge` - Status indicators
- [ ] `Skeleton` - Loading states with shimmer

### Phase 3: Layout Components (Partial)

- [ ] `AppShell` - Main layout wrapper for dashboard
- [x] `FloatingNav` - Glass navbar with mobile hamburger menu
- [ ] `Sidebar` - Dashboard navigation
- [ ] `PageHeader` - Title, breadcrumbs
- [ ] `Container` - Max-width wrapper

### Phase 4: Feature Components

- [x] `PortCard` - Basic version exists (`components/port-card.tsx`)
- [ ] `FogWalletCard` - Fog wallet display
- [ ] `PaymentForm` - Amount, recipient input
- [ ] `TransactionRow` - Transaction list item
- [ ] `AddressDisplay` - Truncated with copy
- [ ] `BalanceDisplay` - Formatted with token icon

### Phase 5: Pages

- [x] Homepage/Landing - New design system with glass theme
- [ ] About page - Update to match landing style
- [ ] Dashboard (`/dashboard`) - Needs full redesign
- [ ] Ports page (`/dashboard/ports`) - Needs glass cards
- [ ] Setup/onboarding (`/setup`) - Needs glass forms
- [ ] Payment page (`/pay/[portId]`) - Needs glass payment form
- [ ] Collect page (`/collect`) - Needs transaction styling
- [ ] Verify page (`/verify`) - Needs status indicators

### Phase 6: Polish

- [x] Landing page animations (Motion presets)
- [x] Mobile responsive navbar
- [ ] Page transitions between routes
- [ ] Loading states everywhere
- [ ] Success animations
- [ ] Error states
- [ ] Empty states
- [ ] Responsive refinements for all pages

---

## Remaining Work

### High Priority (Core Functionality)

1. **Dashboard shell** - Create `AppShell` layout with sidebar navigation
2. **Setup page** - Glass forms for port creation
3. **Payment page** - Glass payment form with amount input
4. **Collect page** - Transaction list with status indicators

### Medium Priority (Polish)

5. **About page** - Migrate to glass theme
6. **Port cards** - Update to match landing glass style
7. **Form components** - Glass-styled inputs, selects
8. **Toast notifications** - For transaction feedback

### Low Priority (Nice to Have)

9. **Page transitions** - Smooth route animations
10. **Loading skeletons** - Shimmer effects
11. **Empty states** - Illustrations for no-data views
12. **Success animations** - Confetti, checkmarks

---

## Migration Guide: Page-by-Page

### Converting a page to glass theme:

1. **Background**: Add ocean gradient or use `bg-slate-950`
2. **Cards**: Replace `bg-card` with `GlassCard` component
3. **Text colors**:
   - Headings: `text-white`
   - Body: `text-cyan-100/80`
   - Muted: `text-cyan-100/50`
4. **Borders**: Use `border-white/20` or `border-white/10`
5. **Buttons**: Use `bg-cyan-600/80` for primary actions
6. **Inputs**: Add `bg-white/5 border-white/20 text-white`

### Example conversion:

```tsx
// Before (semantic colors)
<div className="bg-card border rounded-lg p-4">
  <h2 className="text-foreground">Title</h2>
  <p className="text-muted-foreground">Description</p>
  <Button>Action</Button>
</div>

// After (glass theme)
<GlassCard>
  <GlassCardContent>
    <h2 className="text-white">Title</h2>
    <p className="text-cyan-100/70">Description</p>
    <button className="bg-cyan-600/80 text-white rounded-full px-4 py-2">
      Action
    </button>
  </GlassCardContent>
</GlassCard>
```

---

## File Structure

```
apps/web/
├── app/
│   ├── globals.css           # @theme tokens, base styles
│   ├── layout.tsx            # Theme provider
│   └── ...
├── components/
│   ├── ui/                   # shadcn/ui (copied, customized)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── glass-card.tsx        # Custom glass component
│   ├── theme-toggle.tsx      # Light/dark switch
│   ├── app-shell.tsx         # Main layout
│   ├── header.tsx
│   ├── sidebar.tsx
│   └── ...
├── lib/
│   ├── utils.ts              # cn() helper
│   └── animations.ts         # Motion presets
└── styles/
    └── fonts.ts              # Font configuration
```

---

## Tailwind v4 Configuration

```css
/* apps/web/app/globals.css */

@import 'tailwindcss';

@theme {
  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Light mode colors */
  --color-background: #fbfcfd;
  --color-surface: #f4f4f8;
  --color-surface-elevated: #ffffff;

  --color-text-primary: #1a1a23;
  --color-text-secondary: #6b6b7b;
  --color-text-muted: #9ca3af;

  --color-border: #e4e4ec;
  --color-border-subtle: #f0f0f5;

  /* Emerald accent */
  --color-accent: #10b981;
  --color-accent-hover: #059669;
  --color-accent-muted: #d1fae5;
  --color-accent-subtle: #ecfdf5;

  /* Semantic */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;

  /* Glass */
  --glass-background: rgba(244, 244, 248, 0.7);
  --glass-blur: 12px;
  --glass-border: rgba(255, 255, 255, 0.3);

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.08);
  --shadow-glass: 0 4px 30px rgba(0, 0, 0, 0.05);

  /* Animation */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  @theme {
    --color-background: #141418;
    --color-surface: #1e1e24;
    --color-surface-elevated: #28282f;

    --color-text-primary: #ededf3;
    --color-text-secondary: #a1a1aa;
    --color-text-muted: #71717a;

    --color-border: #2e2e36;
    --color-border-subtle: #232329;

    --color-accent: #34d399;
    --color-accent-hover: #6ee7b7;
    --color-accent-muted: #134e4a;
    --color-accent-subtle: #0f3d36;

    --glass-background: rgba(30, 30, 36, 0.8);
    --glass-border: rgba(255, 255, 255, 0.1);
  }
}

/* Base styles */
@layer base {
  html {
    font-family: var(--font-sans);
    background-color: var(--color-background);
    color: var(--color-text-primary);
  }

  ::selection {
    background-color: var(--color-accent-muted);
    color: var(--color-text-primary);
  }
}
```

---

## Resources

- [Mercury](https://mercury.com/) - Primary inspiration
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [Motion](https://motion.dev/) - Animation library
- [Lucide](https://lucide.dev/) - Icon library
- [Tailwind v4 @theme](https://tailwindcss.com/docs/theme) - Design tokens
- [Glassmorphism Guide](https://www.nngroup.com/articles/glassmorphism/) - Best practices

---

## Brand Assets (To Create)

- [ ] Logo - Ship/galleon mark
- [ ] Favicon - Simplified ship icon
- [ ] OG image - Social preview
- [ ] Custom icons - Nautical set
- [ ] Illustrations - Onboarding, empty states
