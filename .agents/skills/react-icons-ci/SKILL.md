---
name: react-icons-ci
description: "Enforce Aphelion's icon standard: use only Circum Icons from react-icons/ci when adding, changing, reviewing, or migrating UI icons in this project. Use for buttons, navigation, inputs, status feedback, and any icon import."
---

# React Icons CI for Aphelion

Use only icons exported by `react-icons/ci`. Do not introduce or import icons from `lucide-react`, another `react-icons` family, inline SVG, emoji, or a different icon package for application UI.

## Setup

Ensure the dependency exists before using it:

```bash
npm install react-icons
```

Import each icon directly from the allowed family:

```tsx
import { CiSearch, CiSettings, CiUser } from "react-icons/ci"
```

Use the icon component directly. Do not wrap it in a custom SVG component or re-export it through an icon map unless a shared component API requires that shape.

## Choose icons by context

| UI context | Use | Examples |
| --- | --- | --- |
| Primary navigation | A concrete destination or feature icon next to the label | `CiHome`, `CiUser`, `CiSettings` |
| Icon-only buttons | A universally recognizable action with an accessible label | `CiSearch`, `CiMenuBurger`, `CiTrash` |
| Inputs | An icon only when it clarifies the input action or state | `CiSearch`, `CiMail`, `CiLock`, `CiViewList` |
| Password visibility | A visible/hidden pair that reflects the current action | `CiViewBoard` only if it accurately communicates the action; otherwise prefer a text control |
| Status and validation | Semantic feedback next to supporting text, never icon alone | `CiCircleCheck`, `CiWarning`, `CiCircleInfo` |
| Theme controls | The currently available theme action, with a label | `CiLight`, `CiDark` |
| Data actions | An explicit, familiar action icon with a text label when space permits | `CiEdit`, `CiTrash`, `CiExport`, `CiImport`, `CiSaveDown1` |
| External/contact links | The destination's CI icon only when available; otherwise use text | `CiMail`, `CiPhone`, `CiGlobe` |

If no CI icon communicates the meaning clearly, use a text label. Do not substitute an icon from another library.

## Implementation patterns

### Button with a label

Keep text for important or potentially ambiguous actions. Follow the project's button conventions and mark inline icons with `data-icon`.

```tsx
import { CiSaveDown1 } from "react-icons/ci"

<Button type="submit">
  <CiSaveDown1 data-icon="inline-start" aria-hidden="true" />
  Save changes
</Button>
```

### Icon-only button

Provide an `aria-label`; hide the decorative icon from assistive technology.

```tsx
import { CiMenuBurger } from "react-icons/ci"

<Button variant="ghost" size="icon" aria-label="Open navigation">
  <CiMenuBurger aria-hidden="true" />
</Button>
```

### Input action

Use the project's input group primitives. Keep the label accessible.

```tsx
import { CiSearch } from "react-icons/ci"

<InputGroup>
  <InputGroupInput aria-label="Search posts" placeholder="Search posts" />
  <InputGroupAddon align="inline-end">
    <CiSearch aria-hidden="true" />
  </InputGroupAddon>
</InputGroup>
```

### Status message

Pair the icon with text and semantic styling. Never rely on icon shape or color alone.

```tsx
import { CiCircleCheck } from "react-icons/ci"

<p className="flex items-center gap-2 text-sm" role="status">
  <CiCircleCheck aria-hidden="true" />
  Profile saved
</p>
```

## Constraints

- Prefer labels over icons when an action is unfamiliar, destructive, irreversible, or high consequence.
- Add `aria-label` to every icon-only interactive control; use `aria-hidden="true"` for decorative icons.
- Keep icon size consistent with the surrounding component. Do not add arbitrary per-icon sizing classes inside shared UI components.
- Use one icon to express one action. Do not decorate headings, cards, or every navigation item without a usability reason.
- When editing an existing icon import, migrate it to an equivalent `react-icons/ci` icon when one is clear. Otherwise replace it with accessible text rather than another icon library.
- Do not alter brand logos, user-uploaded assets, illustrations, or favicon files; this rule applies to application UI icons.
