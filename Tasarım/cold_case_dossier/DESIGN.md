---
name: Cold Case Dossier
colors:
  surface: '#0f1413'
  surface-dim: '#0f1413'
  surface-bright: '#353a38'
  surface-container-lowest: '#0a0f0d'
  surface-container-low: '#181d1b'
  surface-container: '#1c211f'
  surface-container-high: '#262b29'
  surface-container-highest: '#313634'
  on-surface: '#dfe4e0'
  on-surface-variant: '#d7c2b8'
  inverse-surface: '#dfe4e0'
  inverse-on-surface: '#2c312f'
  outline: '#9f8d84'
  outline-variant: '#52443c'
  surface-tint: '#ffb68d'
  primary: '#ffb68d'
  on-primary: '#502406'
  primary-container: '#c3815c'
  on-primary-container: '#481e01'
  inverse-primary: '#88502f'
  secondary: '#bdcac0'
  on-secondary: '#28332c'
  secondary-container: '#434e47'
  on-secondary-container: '#b3bfb5'
  tertiary: '#aecfb3'
  on-tertiary: '#1a3623'
  tertiary-container: '#79987f'
  on-tertiary-container: '#132f1d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbc9'
  primary-fixed-dim: '#ffb68d'
  on-primary-fixed: '#331200'
  on-primary-fixed-variant: '#6c3a1a'
  secondary-fixed: '#d9e6db'
  secondary-fixed-dim: '#bdcac0'
  on-secondary-fixed: '#131e18'
  on-secondary-fixed-variant: '#3e4942'
  tertiary-fixed: '#caebce'
  tertiary-fixed-dim: '#aecfb3'
  on-tertiary-fixed: '#04210f'
  on-tertiary-fixed-variant: '#314d38'
  background: '#0f1413'
  on-background: '#dfe4e0'
  surface-variant: '#313634'
  paper-base: '#E8DDC5'
  paper-light: '#F4EBDD'
  charcoal-desk: '#1C211F'
  charcoal-elevated: '#252B29'
  olive-dossier: '#303B34'
  olive-subtle: '#222B25'
  rust-accent: '#A86B47'
  alert-crimson: '#B94B42'
  stamp-green: '#65836B'
typography:
  headline-xl:
    fontFamily: Space Mono
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Space Mono
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Space Mono
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Mono
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 26px
    letterSpacing: 0em
  headline-sm:
    fontFamily: Space Mono
    fontSize: 15px
    fontWeight: '700'
    lineHeight: 22px
    letterSpacing: 0.02em
  body-lg:
    fontFamily: Newsreader
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Newsreader
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Newsreader
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Space Mono
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Space Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.08em
  label-sm:
    fontFamily: Space Mono
    fontSize: 10px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The aesthetic is built upon an analog archive, forensic desk, and cold investigation atmosphere from the 1970–1990 era. It channels institutional bureaucracy, dim desk lighting, cardstock manila folders, microfiche catalogs, and early computer terminals without descending into pastiche or horror tropes.

The emotional tone balances quiet suspense, calculated paranoia, and clinical observation. The user is cast as the perpetrator manipulating the investigation from within, navigating a dense desktop environment of tangible evidence cards, dossier drawers, and static forensic plates.

Stylistically, the interface blends tactical minimalism with brutalist archive elements:
- Clean 1px structural framing evoking index cards and filing partitions.
- Textural references to aged stationery, oxidized metal classification tags, and carbon paper.
- Rigid, dependable geometric grid structures that translate cleanly to React and Tailwind CSS.

## Colors
The color hierarchy establishes an authentic archival desk experience:

- **Neutral Dark Canvas (`#1C211F` / `#252B29`):** Acts as the primary desk and terminal background, reducing optical fatigue while giving foreground evidence cards tactile presence.
- **Secondary Olive (`#303B34` / `#222B25`):** Reserved for file folder tabs, panel headers, container backgrounds, and inactive archive slots.
- **Paper & Document Surfaces (`#E8DDC5` / `#F4EBDD`):** Applied to active inspection cards, forensic reports, modal sheets, and dialogue scripts. Metaphorically represents physical evidence laid across the dark work surface.
- **Primary Rust / Copper (`#A86B47`):** Represents interactive priority—primary buttons, focal timeline steps, hotspot hover triggers, and highlighted evidence links.
- **Functional Semantics:**
  - `alert-crimson` (`#B94B42`): Critical decisions, danger warnings, irreversible actions, and classified notices.
  - `stamp-green` (`#65836B`): Confirmed objectives, resolved leads, verified testimonies, and status confirmations.

## Typography
The system employs a deliberate duality between administrative metadata and long-form narrative:

- **Metadata, Dossier Labels, Timestamps, and Hotspots (`Space Mono`):** Delivers the cold, calibrated feel of police teletypes, typewriter indexes, and early dossier cataloging. Used strictly in uppercase for labels (`label-md`, `label-sm`) with tracked letter spacing to maintain clarity on darkened backgrounds.
- **Narrative, Statements, Incident Cards, and Dialogues (`Newsreader`):** Provides authentic book and document typography, ensuring extensive witness accounts and case logs can be read without eye strain. Set at standard 16px to 18px body sizes with generous line height.

## Layout & Spacing
The layout follows an 8px base rhythm, structured as a fixed workstation split:

### Desktop Split (1440px / 1280px Target)
- **Top Utility Rail:** Fixed 64px height (`h-16`) running full viewport width. Anchors case title, current chronological marker (`GÜN 02 • 14:35`), and system actions.
- **Scene Canvas (Left ~72%):** Houses the primary static scene visual inside an `object-contain` container. The hotspot coordinate system anchors to this bounding box using percentage-based absolute positioning.
- **Dossier Control Panel (Right ~28%, 340px–380px fixed width):** High-density vertical sidebar containing tabbed navigation (`HARİTA`, `ENVANTER`, `DEFTER`, `KİŞİLER`).
- **Gutter & Margins:** 24px (`space-lg`) between major panels, preserving a strict desk surface gap.

### Mobile Reflow (390px - 768px)
- The scene canvas occupies the top view with an aspect ratio constraint (minimum 4:3, optimal 16:9).
- The right dossier panel transforms into a bottom drawer (`min-h-[48px]`, expandable to a full-screen bottom sheet with an accessible drag tab).
- Modals, incident cards, and dialogue prompts convert into bottom-anchored sheets with fixed bottom actions and scrollable narrative bodies.

## Elevation & Depth
Depth is created through archival layering and tactile paper stacking rather than modern blurry drop shadows:

- **Level 0 (Desk Surface):** Raw charcoal background (`#1C211F`) with a subtle 1px border grid pattern.
- **Level 1 (Filing Containers & Panels):** Olive-charcoal surface (`#222B25`) framed by a crisp border (`1px solid #303B34`).
- **Level 2 (Active Cards & Floating Sheets):** High-contrast paper tint (`#E8DDC5`) resting atop the dark base. Casts a sharp, dense shadow (`box-shadow: 0 4px 0 0 rgba(0, 0, 0, 0.45)`) that mirrors physical cardboard weight.
- **Level 3 (Modal Overlays & Critical Decisions):** Full backdrop blackout with opacity (`rgba(12, 16, 14, 0.85)`), elevating the decision card into high-contrast focus.
- **Borders & Dividers:** All structural boundaries rely on 1px solid hairline rules resembling ledger lines.

## Shapes
A disciplined, near-square shape geometry (`roundedness: 1` — 4px / `0.25rem` base radius) evokes physical card stock, index tabs, and vintage archive boxes. 

- Interactive buttons, form inputs, tabs, and hotpot tooltips maintain `rounded-sm` (2px) to `rounded` (4px).
- Badges and category tags use notched or squared edges. Full pill radii (`rounded-full`) are reserved exclusively for circular hotspot markers and pin indicators on the city map.

## Components

### Buttons
- **Primary:** Rust background (`bg-[#A86B47]`), dark text (`text-[#1C211F]`), font `Space Mono`, uppercase, tracking-wider. Subtle bottom offset border (`border-b-2 border-[#76472C]`). Hover states lighten to `#BA7A53`; active states compress the bottom border.
- **Secondary / Filing:** Olive charcoal background (`bg-[#303B34]`), paper-light text (`text-[#E8DDC5]`), border `1px solid #45534B`. Hover state brightens border and text.
- **Ghost:** Transparent background, `Space Mono` text, underline on hover.
- **Danger:** Crimson background (`bg-[#B94B42]`), cream text (`text-[#F4EBDD]`).
- **Disabled State:** Reduced opacity (`opacity-40`), grayscale filter, cursor not-allowed, with clear contextual failure tooltips when clicked.

### Hotspot Indicators
- Circular pin (28px × 28px) with a glowing, high-contrast border (`border-2 border-[#E8DDC5] bg-[#1C211F]/80`).
- Hover/focus reveals an attached archival tag label with object name and interaction prompt (`[E] İNCELE`).
- Touch fallback: In mobile views, overlapping or nearby hotspots provide an optional list overlay anchored beneath the scene visual.

### Navigation Tabs (Dossier Panel)
- Tab headers mimic file folder tabs stacked along the top of the sidebar.
- Inactive tabs: Dark olive background (`bg-[#222B25]`), muted text (`text-[#8C9891]`), border bottom `1px solid #303B34`.
- Active tab: Raised slightly, lighter paper-tint or olive container (`bg-[#303B34]`), high-contrast text (`text-[#F4EBDD]`), bottom border seamlessly removed.

### Cards & Dossier Slots
- **Item Card (Envanter):** Compact 1:1 or 4:3 card with dark border, object preview placeholder, and monospace item code. Selection outlines the card with a 1px rust border.
- **Incident / Decision Card:** Centered floating container on paper base (`#E8DDC5`), charcoal text (`#1C211F`), accompanied by an optional photographic or sketch preview slot (16:9).
- **Log Entry (Defter):** Monospace timestamp header (`02. GÜN - 14:10`) followed by `Newsreader` narrative text and archival status tags.

### Inputs, Checkboxes & Radios
- Decisions are presented as radio card options (multi-line selectable rows with clear active border tint and check indicator). No free text entry.
- Hotspot action selection presents a clean list of context buttons: `İncele`, `Al`, `Kullan`, `Göster`.