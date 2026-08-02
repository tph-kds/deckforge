# Shortcut Help and Discoverability

Keyboard behavior is a product feature only when end users can discover it.

Read `assets/shortcut-help-manifest.json`.

## Required UI

Provide:

- a Help or Keyboard Shortcuts button in the editor;
- a shortcut hint in presenter controls;
- an accessible modal/dialog grouped by context;
- shortcut labels in menus and tooltips;
- a command palette for editor actions when the project supports it.

The dialog must be reachable by keyboard, trap focus while open, close with Escape, restore focus to the opener, and remain readable at narrow widths.

## Minimum editor shortcuts

- undo and redo;
- copy, paste, duplicate, delete;
- arrow-key nudge and modified larger nudge;
- select all and multi-select;
- group/ungroup where supported;
- bring forward/send backward;
- command palette;
- save;
- present from current slide;
- open shortcut help.

## Minimum presenter shortcuts

- next and previous build/slide;
- first and last slide;
- overview;
- fullscreen;
- speaker notes/view;
- blackout;
- timer;
- jump to slide;
- open shortcut help;
- exit presenter/fullscreen.

## Conflict rules

Do not intercept shortcuts while the user is typing in an input, textarea, select, or rich-text editor unless the shortcut is explicitly scoped. Avoid overriding browser/system shortcuts without strong justification.

## Onboarding

On first launch, show a quiet one-time hint such as “Press ? for shortcuts”. Do not show a blocking tutorial every time.
