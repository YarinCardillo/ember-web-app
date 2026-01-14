Implement premium vintage UI overhaul for Ember Amp.

This is a comprehensive UI enhancement to give Ember Amp a premium analog hardware feel. I'm attaching two HTML reference files (ember-ui-concepts.html and ember-ui-enhancements.html) that contain all the CSS patterns to follow.

## Overview of Changes

1. Add decorative screws to all card corners
2. Rename EQUALIZER → TONE STACK
3. Replace flat LEDs with jewel-style indicators
4. Add brushed metal knobs with conic-gradient
5. Add pilot lights (green pulsing LED) next to toggles when section is active
6. Add section dividers with centered text
7. Improve toggle switches with 3D styling
8. Replace OUTPUT section with LCD display panel
9. Add embossed logo with ventilation slots in header area
10. Use serif font (Instrument Serif or Georgia) for section titles
11. Warmer color palette (browns instead of pure grays)

---

## 1. DECORATIVE SCREWS (all cards)

Add to each card/section component, positioned absolute at corners:
```css
.screw {
  position: absolute;
  width: 8px;
  height: 8px;
  background: radial-gradient(circle at 30% 30%, #2a2520, #1a1815);
  border-radius: 50%;
  border: 1px solid #3a3530;
}

.screw::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(45deg);
  width: 4px;
  height: 1px;
  background: #0a0a0a;
}

/* Positions */
.screw.tl { top: 8px; left: 8px; }
.screw.tr { top: 8px; right: 8px; }
.screw.bl { bottom: 8px; left: 8px; }
.screw.br { bottom: 8px; right: 8px; }
```

---

## 2. RENAME EQUALIZER → TONE STACK

Simple text change. Update the section title from "EQUALIZER" to "TONE STACK".

---

## 3. JEWEL LED INDICATORS

Replace flat circular LEDs with jewel-style indicators throughout the app:
```css
.jewel-led {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid #2a2520;
  position: relative;
}

/* Highlight reflection */
.jewel-led::before {
  content: '';
  position: absolute;
  top: 1px;
  left: 1px;
  width: 3px;
  height: 3px;
  background: rgba(255,255,255,0.4);
  border-radius: 50%;
}

/* Color variants */
.jewel-led.green {
  background: radial-gradient(circle at 30% 30%, #4ade80, #166534);
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.6);
}

.jewel-led.amber {
  background: radial-gradient(circle at 30% 30%, #F5A524, #92400e);
  box-shadow: 0 0 8px rgba(245, 165, 36, 0.6);
}

.jewel-led.red {
  background: radial-gradient(circle at 30% 30%, #ef4444, #991b1b);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
}

.jewel-led.off {
  background: radial-gradient(circle at 30% 30%, #2a2520, #1a1815);
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);
}
```

---

## 4. BRUSHED METAL KNOBS

Replace current knob styling with brushed metal effect:
```css
.knob-brushed {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    #252520 0deg, #353530 20deg,
    #252520 40deg, #353530 60deg,
    #252520 80deg, #353530 100deg,
    #252520 120deg, #353530 140deg,
    #252520 160deg, #353530 180deg,
    #252520 200deg, #353530 220deg,
    #252520 240deg, #353530 260deg,
    #252520 280deg, #353530 300deg,
    #252520 320deg, #353530 340deg,
    #252520 360deg
  );
  position: relative;
  box-shadow: 
    0 4px 8px rgba(0,0,0,0.4),
    inset 0 1px 2px rgba(255,255,255,0.05),
    inset 0 -2px 4px rgba(0,0,0,0.2);
}

/* Center cap with amber ring */
.knob-brushed::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 18px;
  height: 18px;
  background: radial-gradient(circle, #151510 0%, #0a0a08 100%);
  border-radius: 50%;
  border: 1px solid #F5A524;
  box-shadow: 0 0 8px rgba(245, 165, 36, 0.2);
}

/* Indicator line */
.knob-indicator {
  position: absolute;
  top: 5px;
  left: 50%;
  transform: translateX(-50%);
  width: 3px;
  height: 10px;
  background: #F5A524;
  border-radius: 2px;
  box-shadow: 0 0 6px rgba(245, 165, 36, 0.8);
}
```

---

## 5. PILOT LIGHTS

Add a small green pulsing LED next to each section toggle when the section is enabled:
```css
.pilot-light {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 6px #22c55e, 0 0 12px rgba(34, 197, 94, 0.4);
  animation: pilot-pulse 2s ease-in-out infinite;
}

@keyframes pilot-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
```

Position it to the LEFT of the toggle switch in each section header.

---

## 6. SECTION DIVIDERS

Add optional dividers within sections to separate sub-groups:
```css
.section-divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 20px 0;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, #2a2520, transparent);
}

.divider-text {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 10px;
  color: #4a4540;
  letter-spacing: 3px;
  text-transform: uppercase;
}
```

---

## 7. 3D TOGGLE SWITCHES

Replace flat toggles with more tactile 3D styling:
```css
.toggle-3d {
  width: 44px;
  height: 24px;
  background: linear-gradient(180deg, #1a1815 0%, #0a0908 100%);
  border-radius: 12px;
  position: relative;
  border: 1px solid #2a2520;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.4);
  cursor: pointer;
  transition: all 0.2s ease;
}

/* Inactive thumb (left side) */
.toggle-3d::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  background: linear-gradient(180deg, #3a3530 0%, #2a2520 100%);
  border-radius: 50%;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.3);
  transition: all 0.2s ease;
}

/* Active state */
.toggle-3d.active {
  border-color: rgba(245, 165, 36, 0.3);
}

.toggle-3d.active::before {
  left: 23px;
  background: linear-gradient(180deg, #F5A524 0%, #b45309 100%);
  box-shadow: 0 0 8px rgba(245, 165, 36, 0.5), 0 2px 4px rgba(0,0,0,0.3);
}
```

---

## 8. OUTPUT SECTION → EMBER MASTER PANEL

Replace the entire OUTPUT section with a premium master panel that combines the embossed logo, ventilation, and LCD display:

Structure:
┌─────────────────────────────────────────────────┐
│ ⊗                                             ⊗ │
│                                                 │
│                    EMBER                        │  ← embossed logo
│           ANALOG WARMTH SIMULATOR               │  ← tagline
│                                                 │
│    ═══  ═══  ═══  ═══  ═══  ═══  ═══  ═══      │  ← ventilation slots
│                                                 │
│  ─────────────── Master Section ──────────────  │  ← section divider
│                                                 │
│         ┌─────────────────────────┐             │
│         │      OUTPUT LEVEL       │             │  ← LCD display
│         │                         │             │
│         │       -12.4 dBFS        │             │
│         │                         │             │
│         └─────────────────────────┘             │
│                                                 │
│              ●        ●        ○                │  ← jewel LEDs
│            SIGNAL   ACTIVE    CLIP              │
│                                                 │
│ ⊗                                             ⊗ │
└─────────────────────────────────────────────────┘

CSS:

/* Embossed logo */
.logo-embossed {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 32px;
  font-weight: 400;
  letter-spacing: 8px;
  color: #2a2520;
  text-shadow: 
    0 1px 0 rgba(255,255,255,0.05),
    0 -1px 0 rgba(0,0,0,0.3);
  text-align: center;
}

.tagline {
  font-size: 9px;
  letter-spacing: 4px;
  color: #3a3530;
  text-transform: uppercase;
  text-align: center;
  margin-top: 4px;
}

/* Ventilation slots */
.ventilation {
  display: flex;
  gap: 4px;
  justify-content: center;
  margin: 16px 0;
}

.vent-slot {
  width: 40px;
  height: 4px;
  background: #0a0908;
  border-radius: 2px;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.8);
}

/* LCD Display */
.lcd-display {
  background: #0a0908;
  border: 2px solid #1a1815;
  border-radius: 8px;
  padding: 16px 24px;
  max-width: 280px;
  margin: 0 auto;
  box-shadow: 
    inset 0 4px 12px rgba(0,0,0,0.8),
    0 1px 0 rgba(255,255,255,0.03);
}

.lcd-label {
  font-size: 10px;
  color: #4a4540;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.lcd-value {
  font-family: 'Space Grotesk', monospace;
  font-size: 28px;
  color: #F5A524;
  text-shadow: 0 0 10px rgba(245, 165, 36, 0.5);
}

.lcd-unit {
  font-size: 12px;
  color: #8b7355;
  margin-left: 4px;
}

The LCD should display real-time output level from the output analyser node. Below it, add three jewel LEDs:
- SIGNAL (green): lights when audio is flowing  
- ACTIVE (amber): lights when audio engine is running
- CLIP (red): lights when output exceeds 0 dBFS

This panel replaces the current OUTPUT section entirely. Remove the Device selector, Gain slider, Clipper meter, Master slider, and LED bar meter.

## 10. SECTION TITLE STYLING

Update all section titles (INPUT, TONE STACK, TUBES, OUTPUT) to use serif font:
```css
.section-title {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 15px;
  font-weight: 400;
  letter-spacing: 3px;
  color: #c9a66b;
}
```

---

## 11. CARD BACKGROUND UPDATE

Update card backgrounds to use warmer tones:
```css
.card-premium {
  background: linear-gradient(180deg, #1a1815 0%, #12100e 100%);
  border: 1px solid #2a2520;
  border-radius: 12px;
  position: relative;
  box-shadow: 
    0 8px 32px rgba(0,0,0,0.4),
    inset 0 1px 0 rgba(255,255,255,0.02);
}
```

---

## 12. VALUE DISPLAY PILLS

Wrap knob values in subtle pill containers:
```css
.value-pill {
  font-size: 11px;
  color: #F5A524;
  background: rgba(0,0,0,0.4);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid rgba(245, 165, 36, 0.2);
}
```

---

## Font Import

Add to index.html or global CSS:
```css
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Space+Grotesk:wght@400;500;600&display=swap');
```

---

## Files to modify

- src/index.css or tailwind config (global styles, CSS variables)
- src/components/ui/Knob.tsx (brushed metal styling)
- src/components/ui/Toggle.tsx (3D toggle)
- src/components/ui/JewelLed.tsx (create new component)
- src/components/ui/SectionDivider.tsx (create new component)
- src/components/ui/LcdDisplay.tsx (create new component)
- src/components/ui/Screw.tsx (create new component)
- src/components/stages/InputStage.tsx (add screws, pilot light)
- src/components/stages/EqualizerStage.tsx → rename to ToneStackStage.tsx
- src/components/stages/TubesStage.tsx (add screws, pilot light, jewel LEDs)
- src/components/stages/OutputStage.tsx (replace with LCD display layout)
- src/components/Header.tsx (embossed logo, ventilation)
- src/App.tsx (update component imports if renamed)

## Reference Files

See attached HTML files for visual reference and exact CSS values:
- ember-ui-concepts.html
- ember-ui-enhancements.html

## Priority Order

1. Card backgrounds + screws (foundation)
2. Brushed metal knobs (biggest visual impact)
3. Section titles to serif font
4. OUTPUT → LCD display
5. Jewel LEDs
6. Toggle 3D styling
7. Pilot lights
8. Section dividers
9. Header embossed logo + ventilation
10. Value pills
