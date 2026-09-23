# Performance Anti-Pattern Catalog — Frontend

Reference material for `code-reviewer:performance-review`. Load this file when
the PR touches frontend (React / bundler / DOM) code. Backend patterns live in
the sibling file `performance-patterns-backend.md`; load that one instead, or
both only when the PR genuinely touches both stacks.

Companion file: `performance-guide.md` in this same directory holds
language-agnostic before/after code examples for the generic cases (N+1,
indexes, eager loading, pagination, memory leaks, large allocations, algorithmic
complexity, sequential API calls, caching). It does not overlap substantively
with this file — use the guide for worked examples, this catalog for detection.

## Index

| § | Section |
|---|---------|
| 8 | Request Waterfalls & Network |
| 9 | Bundle Size & Code Splitting |
| 10 | React Re-render Patterns |
| 11 | DOM & Rendering Performance |
| 12 | Frontend Memory Leaks |
| 13 | State Management Performance |

---

## Frontend Performance Patterns

### 8. Request Waterfalls & Network (CRITICAL severity)

Network patterns that cause cascading delays — ranked as the highest-impact
frontend performance issue by Vercel (2-10x improvement potential).

**What to grep for:** `useEffect` with `fetch`/`axios` where parent fetches
data that child needs before its own fetch, sequential `await` in effects,
missing `AbortController`, no loading/error boundaries.

**Patterns to flag:**

| Pattern | What It Looks Like | Why It's Dangerous | Severity |
|---------|-------------------|-------------------|----------|
| **Client-side request waterfalls** | Parent `useEffect` fetches data → renders child → child `useEffect` fetches its data → renders grandchild → ... | Each level adds a full network round trip. 3 levels × 200ms = 600ms sequential delay. Hoist fetches or use parallel data loading (React Server Components, `Promise.all`, route-level loaders). | CRITICAL |
| **No request cancellation on unmount** | `useEffect(() => { fetch(url)... }, [])` without `AbortController` cleanup | Navigating away before fetch completes → state update on unmounted component (memory leak) + wasted bandwidth. | HIGH |
| **Missing request deduplication** | Same endpoint called by multiple components independently | 5 components mounting = 5 identical requests. Use SWR, React Query, or a shared data layer with caching. | HIGH |
| **Over-fetching** | Fetching full entity when only 2-3 fields are needed | Wastes bandwidth, increases parse time, fills memory. Request only needed fields (GraphQL, sparse fieldsets, dedicated endpoints). | MEDIUM |
| **Missing pagination for large lists** | `fetch('/api/items')` without limit/offset | Returns all records → large payload → slow parse → high memory. Always paginate or use infinite scroll with cursor. | HIGH |

### 9. Bundle Size & Code Splitting (CRITICAL severity)

Bundle patterns that cause slow initial page loads — ranked critical by Vercel
alongside request waterfalls.

**What to grep for:** `import _ from 'lodash'` (full library), barrel imports
(`import { x } from './components'`), missing `React.lazy`, large dependencies
in `package.json`, missing dynamic `import()`.

**Patterns to flag:**

| Pattern | What It Looks Like | Why It's Dangerous | Severity |
|---------|-------------------|-------------------|----------|
| **Full library imports** | `import _ from 'lodash'` (200KB), `import moment from 'moment'` (300KB) | Entire library in bundle even if using 1 function. Use `lodash-es/debounce`, `date-fns`, or native alternatives. | CRITICAL |
| **Barrel file imports** | `import { Button } from './components'` where `components/index.ts` re-exports 50 components | Barrel files prevent tree-shaking — bundler pulls in everything re-exported. Import directly: `import { Button } from './components/Button'`. | HIGH |
| **Missing code splitting** | Large route components imported statically | Entire app loads on first page. Use `React.lazy(() => import('./HeavyPage'))` + `<Suspense>` for route-level splitting. | HIGH |
| **Heavy deps not lazy-loaded** | `import ChartJS from 'chart.js'` at top of file used in one tab | 200KB library loaded on every page visit. Use dynamic `import()` to load only when the tab is visible. | HIGH |
| **CommonJS in frontend** | `require()` or `module.exports` in frontend code | Prevents tree-shaking. Use ES modules (`import`/`export`). | MEDIUM |

### 10. React Re-render Patterns (HIGH severity)

Unnecessary re-renders that cause visible UI sluggishness, especially in lists,
tables, and data-heavy components.

**What to grep for:** Inline object/array literals in JSX props (`style={{...}}`,
`options={[...]}`), inline arrow functions as props, `useState` for derived
values, missing `React.memo` on list items, `useEffect` updating state
immediately.

**Patterns to flag:**

| Pattern | What It Looks Like | Why It's Dangerous | Severity |
|---------|-------------------|-------------------|----------|
| **Inline objects/arrays in JSX** | `<Comp style={{color: 'red'}} />`, `<Comp items={[1,2,3]} />` | New reference every render → breaks `React.memo` / `shouldComponentUpdate`. Extract to `useMemo` or module-level constant. | HIGH |
| **Inline functions as props** | `<Button onClick={() => handleClick(id)} />` inside a mapped list | New function every render for every list item → all items re-render. Use `useCallback` or extract a memoized child component. | HIGH |
| **Derived state in useEffect** | `useEffect(() => { setFiltered(items.filter(...)) }, [items])` | Causes double render (state update triggers re-render). Compute during render with `useMemo`: `const filtered = useMemo(() => items.filter(...), [items])`. | HIGH |
| **State too high in tree** | Top-level component holds state that only one leaf needs | Updating that state re-renders the entire subtree. Push state down to the closest component that needs it. | MEDIUM |
| **Component defined inside component** | `function Parent() { function Child() { return ... } return <Child /> }` | `Child` is a new component type every render → full unmount/remount (destroys state, DOM). Define components at module level. | HIGH |
| **Missing React.memo on expensive list items** | `items.map(item => <ExpensiveRow data={item} />)` without memo | Parent re-render re-renders ALL list items even if data unchanged. Wrap `ExpensiveRow` in `React.memo`. | MEDIUM |
| **Index as key in dynamic lists** | `items.map((item, i) => <Row key={i} />)` when items can reorder/add/remove | React reuses components by index → stale state, incorrect animations, lost input. Use stable unique IDs as keys. | HIGH |

### 11. DOM & Rendering Performance (HIGH severity)

Patterns that cause layout thrashing, expensive reflows, or blocked main thread.

**What to grep for:** `offsetWidth`, `offsetHeight`, `getBoundingClientRect`,
`scrollTop`, `clientWidth` in loops, `document.querySelectorAll` in render
functions, large lists without virtualization.

**Patterns to flag:**

| Pattern | What It Looks Like | Why It's Dangerous | Severity |
|---------|-------------------|-------------------|----------|
| **Layout thrashing** | Read layout prop → write style → read layout prop → write style (in a loop) | Each read after a write forces the browser to synchronously recalculate layout. 100 iterations = 100 forced reflows → UI freezes. Batch all reads, then all writes. | HIGH |
| **Large lists without virtualization** | Rendering 1000+ DOM nodes (table rows, cards, items) | Large DOM trees consume memory and slow all layout operations. Use `react-window`, `react-virtuoso`, or `@tanstack/virtual` to render only visible items. | HIGH |
| **Animating layout properties** | `transition: width 0.3s`, `animation` on `top`, `left`, `height` | Layout properties trigger reflow on every frame. Animate `transform` and `opacity` only — they run on the GPU compositor thread. | MEDIUM |
| **Expensive computation in render** | `items.filter().sort().map()` on every render without memoization | Runs O(n log n) sort on every keystroke/interaction. Wrap in `useMemo` with appropriate deps. | MEDIUM |

### 12. Frontend Memory Leaks (HIGH severity)

Patterns that cause browser memory to grow continuously, eventually crashing
tabs or degrading performance.

**What to grep for:** `addEventListener` without corresponding `removeEventListener`,
`setInterval`/`setTimeout` without cleanup, WebSocket/EventSource subscriptions
without close, `useEffect` without cleanup return.

**Patterns to flag:**

| Pattern | What It Looks Like | Why It's Dangerous | Severity |
|---------|-------------------|-------------------|----------|
| **useEffect without cleanup** | `useEffect(() => { window.addEventListener('resize', handler) }, [])` — no return function | Listener accumulates on every mount/remount. Return a cleanup: `return () => window.removeEventListener('resize', handler)`. | HIGH |
| **Intervals/timeouts not cleared** | `useEffect(() => { setInterval(poll, 5000) }, [])` without `clearInterval` | Interval keeps firing after unmount → state updates on unmounted component, memory accumulation. | HIGH |
| **Subscriptions not unsubscribed** | WebSocket, Firebase, RxJS subscriptions opened in useEffect without close | Connection stays open, events keep firing, closures hold component references. | HIGH |
| **Async operations on unmounted** | `useEffect(() => { fetch(url).then(data => setState(data)) }, [])` | If component unmounts before fetch completes, `setState` on unmounted component. Use `AbortController` or a mounted ref. | MEDIUM |

### 13. State Management Performance (MEDIUM severity)

State patterns that cause unnecessary work across the component tree.

**What to grep for:** `createContext` with large objects, `useContext` in many
components, Redux store with everything in one slice, `useState` where `useRef`
suffices.

**Patterns to flag:**

| Pattern | What It Looks Like | Why It's Dangerous | Severity |
|---------|-------------------|-------------------|----------|
| **Broad context re-renders** | `<ThemeContext.Provider value={{theme, user, settings, notifications}}>` | ANY property change re-renders ALL consumers. Split into focused contexts (ThemeContext, UserContext) or use selector patterns. | HIGH |
| **Missing selector pattern** | `const store = useStore()` then `store.items.length` | Subscribes to entire store — re-renders on any store change, not just `items`. Use selectors: `useSelector(s => s.items.length)`. | MEDIUM |
| **useState for non-render data** | `const [scrollPos, setScrollPos] = useState(0)` updated on every scroll event | Every `setState` triggers a re-render. If the value doesn't affect rendering, use `useRef`. | MEDIUM |
| **Remote state in client store** | Manually managing server data in Redux/useState instead of SWR/React Query | Loses caching, deduplication, revalidation, optimistic updates. Use a server state library for server data. | MEDIUM |

