# Linear Tab Bar — Agent Instructions

You are implementing the Linear Tab Bar animation from `react-native-motion`. This is a multi-part animation: a glassmorphic pill tab bar with pill-to-menu morph, liquid glass stretch, touch-tracking glow, search mode transitions, and staggered menu reveals.

## Animation Specification

- **Type**: Glassmorphic tab bar with morph, stretch, and search transitions
- **Libraries**: React Native Reanimated, React Native Gesture Handler, react-native-keyboard-controller, expo-blur, expo-haptics, expo-linear-gradient, react-native-svg, @react-native-masked-view/masked-view, lucide-react-native, react-native-safe-area-context, react-native-worklets
- **Pill-to-menu morph**: Spring-based with scaleX squeeze curve (dips to 0.7 at 15%, recovers to 1.0 at 85%)
- **Liquid glass stretch**: Damped elastic deformation with directional stretch and cross-axis compression
- **Glow overlay**: SVG radial gradient following touch, two-phase fade (appear → ripple out)
- **Menu stagger**: 40ms in / 10ms out per item, 250ms / 80ms durations
- **API conventions**: Use `.get()`/`.set()` on shared values (not `.value`) for React Compiler compatibility. Use `scheduleOnRN` from `react-native-worklets` instead of `runOnJS`.

## Types and Constants

```tsx
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  type SharedValue,
  type AnimatedStyle,
} from 'react-native-reanimated'
import { Gesture, GestureDetector, type ComposedGesture } from 'react-native-gesture-handler'
import { scheduleOnRN } from 'react-native-worklets'
import * as Haptics from 'expo-haptics'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg'

// Layout
const SCREEN_WIDTH = Dimensions.get('window').width
const TAB_BAR_HORIZONTAL_PADDING = 16
const TAB_BAR_GAP = 12
const PILL_HEIGHT = 52
const PILL_BORDER_RADIUS = PILL_HEIGHT / 2
const SEARCH_BUTTON_SIZE = 52
const TOTAL_WIDTH = SCREEN_WIDTH - 2 * TAB_BAR_HORIZONTAL_PADDING
const PILL_WIDTH = TOTAL_WIDTH - TAB_BAR_GAP - SEARCH_BUTTON_SIZE
const MENU_HEIGHT = 420
const MENU_BORDER_RADIUS = 38
const MENU_ITEM_HEIGHT = 48
const ICON_SIZE = 22
const ICON_STROKE_WIDTH = 3
const ICON_PADDING = 4
const CIRCLE_SIZE = PILL_HEIGHT - 8

// Tab zones
const MAX_SWITCHABLE_TAB = 2
const TABS_START = ICON_PADDING
const TABS_END = PILL_WIDTH - ICON_PADDING - CIRCLE_SIZE
const TAB_ZONE_WIDTH = (TABS_END - TABS_START) / 3
const MENU_DRAG_THRESHOLD = -50

// Spring configs
const SPRING = { damping: 24, stiffness: 170, mass: 1 }
const SPRING_BOUNCY = { damping: 22, stiffness: 250, mass: 0.6 }
const SPRING_MENU_OPEN = { damping: 14, stiffness: 170, mass: 0.7 }
const SPRING_MENU_CLOSE = { damping: 22, stiffness: 120, mass: 0.9 }
```

## Implementation Steps

### Step 1: constants.ts — Layout, theme, springs, and liquid glass transform

Define all layout constants, color theme, spring configs, and the `liquidGlassTransform` worklet function.

The liquid glass transform:
1. Applies a subtle press scale (1.0 → 1.02)
2. Computes damped overflow: `sign * MAX_PULL * (1 - 1 / (|overflow| / MAX_PULL + 1))`
3. Stretches along the drag axis proportional to damped overflow
4. Compresses along the cross axis (Poisson-ratio-like effect)
5. Returns a transform array with translateX/Y and scaleX/Y

```tsx
export function liquidGlassTransform(
  pressed: number,
  overflowX: number,
  overflowY: number,
  halfW: number,
  halfH: number,
) {
  "worklet";
  const pressScale = interpolate(pressed, [0, 1], [1, 1.02]);
  // Damped rubber-band for each axis
  const signX = overflowX < 0 ? -1 : 1;
  const dampedX = signX * MAX_PULL * (1 - 1 / (Math.abs(overflowX) / MAX_PULL + 1));
  // ... same for Y
  // Stretch along drag, compress cross-axis
  const stretchX = interpolate(|dampedX|, [0, MAX_PULL], [0, 0.1], "clamp");
  const compressX = interpolate(|dampedY|, [0, MAX_PULL], [0, 0.12], "clamp");
  return {
    transform: [
      { translateX: signX * halfW * stretchX },
      { translateY: signY * halfH * stretchY },
      { scaleX: pressScale * (1 + stretchX) * (1 - compressX) },
      { scaleY: pressScale * (1 + stretchY) * (1 - compressY) },
    ],
  };
}
```

### Step 2: GlassMaterial.tsx — Frosted glass component

A reusable glass material component with:
1. `BlurView` (tint: "dark", intensity: 40) as the base
2. `LinearGradient` overlay (top: 11% white → bottom: 5% white)
3. `MaskedView` with a 1px border ring mask, filled with a gradient (bright top → dim middle → medium bottom)
4. Children rendered absolutely on top

Supports both static `borderRadius` (number) and animated `borderRadius` (SharedValue<number>). Detects via duck-typing: `typeof borderRadius === 'object' && 'get' in borderRadius`.

### Step 3: GlowOverlay — Touch-tracking radial glow (in SearchBar.tsx)

An SVG-based radial gradient that follows the touch point:
- Rendered as a fixed-size square (e.g., 200px for pill, 120px for search)
- Positioned via translateX/Y from touchX/touchY shared values
- Two-phase glowProgress:
  - Phase 1 (0→1): Appears instantly at 20% opacity
  - Phase 2 (1→2): Fades to 0 while scaling up 4x (ripple effect)

### Step 4: TabIcon.tsx — Individual tab icon with hover/active states

Each icon has:
- A `Gesture.Tap()` that sets touch position, triggers press scale, glow, and haptics
- Active background (shown when `isActive` and no tab is hovered)
- Hover background (shown when `hoveredTab === index`)
- Menu collapse animation: all icons translate toward pill center and scale to 0.3 during menu open
- Search collapse: non-first icons fade/scale to 0 and their flex shrinks to 0

The 4th icon (index 3, ChevronsUpDown) is circular instead of flex-filling.

### Step 5: TabBarPill.tsx — Glass pill container

Wraps the icons row and menu panel inside `GlassMaterial`:
- Outer `GestureDetector` with the composed pan gesture
- `liquidGlassTransform` applied as outer animated style (disabled when menu is open)
- `pillAnimatedStyle` controls width/height/borderRadius/scaleX for the morph
- `GlowOverlay` rendered inside the pill for touch-tracking glow

### Step 6: SearchBar.tsx — Search button, close button

**SearchButton**: Starts as a 52px circle, expands to full-width search bar on toggle.
- Height animates from 52 → 42 (more compact in search mode)
- Search icon slides from centered to left-aligned
- TextInput fades in at 40-80% of search progress
- Auto-focuses when search activates

**CloseSearchButton**: Slides in from right during search mode.
- Width animates from 0 → 42, marginLeft from 0 → 12
- Scale + translateX entrance animation
- Same glass material and glow overlay treatment

Both buttons use `Gesture.Race(pan, tap)` — pan for stretch effect, tap for toggle.

### Step 7: MenuPanel.tsx — Staggered menu items

The menu content renders absolutely inside the pill (visible when pill morphs to menu height):
- Header with username + chevron + settings icon
- Divider
- 7 menu items (Inbox, My Issues, Favorites, Projects, Views, Teams, Settings)

Uses `useAnimatedReaction` watching `menuProgress`:
- On open (progress > 0.1, going up): Stagger all elements in top-to-bottom with 40ms delays
- On close (progress < 0.95, going down): Stagger out bottom-to-top with 10ms delays
- Each item animates opacity (0→1) and translateY (-10→0)

### Step 8: TabBar.tsx — Main component with hooks

Three custom hooks:
1. **useTabBarAnimation**: Manages searchProgress, menuProgress, activeTab state, and the pill animated style (morph logic)
2. **usePillGestures**: Composes `Gesture.Simultaneous(LongPress, Pan)` for the pill. Handles tab detection, overflow tracking, drag-to-menu trigger, and tab selection on release
3. **useSearchGestures**: Composes `Gesture.Race(Pan, Tap)` for search/close buttons

The main component:
- Uses `useSafeAreaInsets` for bottom padding
- Uses `useReanimatedKeyboardAnimation` for keyboard-aware positioning
- Renders the pill, search button, and close button in a row
- Adds an `absoluteFill` Pressable backdrop when menu is open for dismiss

## Key Code Patterns

### Pill-to-menu morph curve
The scaleX during morph isn't linear — it follows `[0, 0.15, 0.5, 0.85] → [1, 0.7, 0.85, 1]`. This creates a distinctive squeeze-then-expand that gives the morph physicality.

### Mutual exclusion between modes
Search and menu modes are mutually exclusive. Both toggle functions check the other's progress before proceeding. This prevents visual conflicts.

### Drag-to-open menu
When panning upward past -50px threshold on the pill, the menu opens. This is tracked with `menuTriggeredByDrag` to prevent tab selection on the same gesture's end.

### Pending tab pattern
Tab selection from pan gestures uses a `pendingTab` shared value + `scheduleOnRN(applyPendingTab)` to bridge from the worklet to React state safely.

### Glow two-phase pattern
The glow overlay tracks a progress from 0→1→2. 0→1 is instant (finger down), 1→2 is animated over 300ms (finger up ripple). The style splits on `progress <= 1` to handle both phases.

## Common Pitfalls

- **Use `Gesture.Simultaneous()` for long press + pan on the pill.** The long press detects touch-down, the pan tracks movement. `Gesture.Race()` would kill one of them.
- **Use `Gesture.Race()` for search button tap + pan.** Here you want one or the other, not both.
- **Guard menu/search mutual exclusion.** Always check the other mode's progress before toggling.
- **The liquid glass stretch uses damped overflow.** Raw overflow values would feel jarring — the damping formula creates natural rubber-band physics.
- **Menu stagger is asymmetric.** 40ms in, 10ms out. This makes closing feel snappier than opening.
- **GlassMaterial border radius duck-typing.** Check `'get' in borderRadius` to determine if it's a shared value. This avoids TypeScript generics overhead.
- **Use `scheduleOnRN` from `react-native-worklets`** instead of `runOnJS` for all JS callbacks from gesture handlers.
- **Use `.get()` and `.set()` on shared values** instead of `.value` for React Compiler compatibility.
- **Cancel running animations before starting new ones.** Call `cancelAnimation()` on shared values before setting new targets, especially for the glow and overflow springs.
- **The keyboard animation uses `useReanimatedKeyboardAnimation`** from `react-native-keyboard-controller`, not the built-in Reanimated keyboard hook.
