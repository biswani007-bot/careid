# CareID Doctor Web — Design System Audit
**Analysis Date:** November 2026  
**Figma Canvas:** `Doctror_web` (`0:1`)  
**Design Tokens File:** `src/styles/tokens.ts`  
**Tailwind Configuration:** `tailwind.config.ts`

---

## 1. Color Palette & Semantic Tokens

The CareID design system relies on a distinctive dual-brand harmony: an **Electric Violet / Deep Navy Purple** primary gradient paired with a **Clinical Healthcare Teal** accent.

### Primary Brand Palette
| Token Name | Hex / Value | Figma Usage | Code Token | Tailwind Class |
|------------|-------------|-------------|------------|----------------|
| **Electric Violet** | `#a44cff` | Primary CTA Gradient Start | `colors.brand.gradientStart` | `care-purple-light` |
| **Deep Royal Purple** | `#5b14b8` | Primary CTA Gradient End, Active Rings | `colors.brand.gradientEnd` | `care-purple` |
| **Deep Violet** | `#3f1d8b` | Header Accents, Avatar Backgrounds | `colors.brand.solidDark` | `care-purple-dark` |
| **Dark Navy Purple** | `#28006d` | High-contrast Heading Text, Auth Brand | `colors.brand.deepNavy` | `care-purple-deep` |
| **Lavender Accent** | `#ab8efd` | Secondary highlights, active text | `colors.brand.accentLight` | `care-purple-accent` |
| **Subtle Purple Tint** | `rgba(40, 0, 109, 0.05)` | Card gradient overlays | `colors.brand.subtleBg` | Inline style / arbitrary |

### Healthcare Clinical Accent (Teal / Cyan)
| Token Name | Hex / Value | Figma Usage | Code Token | Tailwind Class |
|------------|-------------|-------------|------------|----------------|
| **Medical Deep Teal** | `#006971` | HIPAA badges, In-Session status, Encrypted tags | `colors.teal.primary` | `care-teal` |
| **Cyan Light** | `#76f1ff` | Success status badges, telemetry pills | `colors.teal.light` | `care-teal-light` |
| **Teal Subtle Bg** | `rgba(0, 105, 113, 0.05)` | Health record header highlights | `colors.teal.subtleBg` | Inline style / arbitrary |
| **Teal Border** | `rgba(0, 105, 113, 0.2)` | Active clinical container outlines | `colors.teal.border` | Inline style / arbitrary |

### Surfaces & Neutral Backgrounds
| Token Name | Hex / Value | Figma Usage | Code Token | Tailwind Class |
|------------|-------------|-------------|------------|----------------|
| **Workspace Surface** | `#f8f9fa` | Main portal canvas background | `colors.surface.workspace` | `bg-care-bg-workspace` |
| **Sidebar Surface** | `#f3f4f5` | Side navigation bar background | `colors.surface.sidebar` | `bg-care-bg-sidebar` |
| **Card Surface** | `#ffffff` | Panel, card, and modal background | `colors.surface.card` | `bg-care-bg-card` |
| **Overlay Blur** | `rgba(255, 255, 255, 0.95)` | Floating auth card backdrop | `colors.surface.overlay` | `backdrop-blur-[5px]` |

### Text Hierarchy
| Hierarchy Level | Hex / Value | Font Weight | Line Height | Usage in Figma |
|-----------------|-------------|-------------|-------------|----------------|
| **Primary Text** | `#191c1d` | 600 / 700 / 400 | 1.25 – 1.5 | Titles, section headings, table text |
| **Secondary Text** | `#494552` | 500 / 400 | 1.4 – 1.5 | Subtitles, table headers, metadata |
| **Muted Text** | `#7a7583` | 400 / 500 | 1.3 | Input icons, timestamps, secondary borders |
| **Subtle Text** | `#cbc4d4` | 400 | 1.0 | Placeholder inputs, disabled labels |
| **Inverse Text** | `#ffffff` | 500 / 600 | 1.0 | Primary gradient button labels |

### Status Tokens
| Semantic Role | Text Color | Background Color | Border Color |
|---------------|------------|------------------|--------------|
| **Critical / High Urgency** | `#ba1a1a` | `#ffdad6` | `rgba(186, 26, 26, 0.3)` |
| **Success / Verified** | `#006971` | `#76f1ff` | `rgba(0, 105, 113, 0.3)` |
| **Warning / Pending** | `#b45309` | `#fef3c7` | `rgba(245, 158, 11, 0.3)` |
| **Info / Scheduled** | `#3f1d8b` | `#ede9fe` | `rgba(63, 29, 139, 0.2)` |

---

## 2. Typography System

The authoritative typeface across all 48 Figma screens is **Plus Jakarta Sans**.

### Typography Scale
| Role | Font Size | Line Height | Letter Spacing | Font Weight | Figma Elements |
|------|-----------|-------------|----------------|-------------|----------------|
| **Stat / KPI Number** | `40px` (2.5rem) | `48px` | `-0.8px` | Bold (700) | Dashboard KPI counters (18, 5, 2, 14) |
| **Hero Title** | `36px` (2.25rem) | `44px` | `-0.8px` | Bold (700) | OTP hero graphic ("Enterprise-Grade...") |
| **Heading 1 (H1)** | `32px` (2rem) | `40px` | `-0.8px` | SemiBold (600) | Page titles ("Patients", "Health Records") |
| **Heading 2 (H2)** | `24px` (1.5rem) | `32px` | `-0.4px` | SemiBold (600) | Auth card titles ("Welcome Back") |
| **Heading 3 (H3)** | `20px` (1.25rem) | `28px` | `-0.2px` | SemiBold (600) | Section card titles ("Clinical Indication") |
| **Subheading** | `18px` (1.125rem)| `24px` | `0px` | Medium (500) | Category headers |
| **Body Large** | `16px` (1rem) | `24px` | `0px` | Regular (400) | Auth subtitle, clinical notes |
| **Body Default** | `14px` (0.875rem)| `20px` | `0.1px` | Regular (400) | Table cells, form field inputs |
| **Body Medium** | `14px` (0.875rem)| `20px` | `0.1px` | Medium (500) | Table row emphasis, nav item labels |
| **Caption / Badge** | `12px` (0.75rem)| `16px` | `0.5px` | Medium (500) | Status pills, metadata tags |
| **Overline** | `11px` (0.6875rem)| `16px` | `0.8px` | SemiBold (600) | Table column headers ("MRN", "CPT") |

---

## 3. Spacing, Dimensions & Elevation

### Spacing System (8pt Grid)
The design strictly follows an 8px grid system, using standard increments:
- `4px` (`gap-1` / `p-1`): Inner icon gaps, tight badge padding
- `8px` (`gap-2` / `p-2`): Field margins, pill padding
- `12px` (`gap-3` / `p-3`): Card sub-element spacing
- `16px` (`gap-4` / `p-4`): Table cell padding, card inner padding
- `24px` (`gap-6` / `p-6`): Section separation, sidebar padding
- `32px` (`gap-8` / `p-8`): Major form group separation
- `40px` (`gap-10` / `p-10`): Auth card block margins
- `48px` (`p-12`): Full-page section gutters

### Component Dimensions
- **Topbar Height:** `64px` (Clinical Portal) / `80px` (Auth Screens)
- **Sidebar Width:** `256px` (`w-64`) / In Figma: `260px`
- **Max Content Width:** `1440px` (standard) / `1576px` (Medical Records 1:12893 & 1:13265)
- **Floating Auth Card:** `480px` width × `601px` height (Login) / `526.5px` height (OTP)
- **Primary CTA Button Height:** `56px` (`h-14`) for full-width action buttons; `40px` (`h-10`) for in-page buttons
- **Input Height:** `56px` to `58px` (`h-14` / `h-[58px]`)

### Border Radius Hierarchy
| Radius Value | Tailwind Class | Application |
|--------------|----------------|-------------|
| `24px` | `rounded-[24px]` | Floating Auth Cards (`1:15`, `1:81`) |
| `20px` | `rounded-card` / `rounded-[20px]` | Clinical panels, metric summary cards |
| `16px` | `rounded-2xl` | Modal dialogs, image viewer containers |
| `12px` | `rounded-xl` | Form inputs, select boxes, table rows |
| `8px` | `rounded-lg` | Action buttons, filter chips |
| `9999px` | `rounded-full` | Primary pill buttons, status badges, avatars |

### Shadows & Elevation
- **Auth Card Elevation:** `0px 2px 32px 0px rgba(40, 0, 109, 0.08)`
- **Panel / Card Default:** `0px 2px 8px 0px rgba(0, 0, 0, 0.05)`
- **Card Hover Elevation:** `0px 4px 16px 0px rgba(0, 0, 0, 0.08)`
- **Topbar Subtle Separation:** `0px 1px 2px 0px rgba(0, 0, 0, 0.05)`
- **Primary Button Glow:** `0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.1)`

---

## 4. Discrepancy Analysis: Design Tokens vs Existing Code

1. **Arbitrary Values vs Token Classes:**
   - Although `tailwind.config.ts` declares semantic names (`care-purple`, `care-teal`, `care-text-primary`), pages frequently bypass them with hardcoded arbitrary classes:
     - `text-[#191c1d]` instead of `text-care-text-primary`
     - `border-[#cbc4d4]` instead of `border-care-border-input`
     - `bg-[#f8f9fa]` instead of `bg-care-bg-workspace`
     - `bg-gradient-to-b from-[#a44cff] to-[#5b14b8]` inlined in over 25 distinct files!
2. **Missing Button & Input Primitives:**
   - Because there is no centralized `<Button />` or `<Input />` component, when button styles need updating, developers must edit dozens of separate page files.
3. **Viewport Width Discrepancy:**
   - Frames `1:12893` and `1:13265` are designed at **1576px width** in Figma. The current React layout wraps everything inside `max-w-[1440px]`, causing columns in the Medical Records and Clinical Note pages to be compressed or wrapped prematurely.

