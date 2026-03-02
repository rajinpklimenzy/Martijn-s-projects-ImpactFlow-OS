# Impact 24x7 — Requirements Implementation Plan

This document maps the **First Update** (Quick Create modal + styling) and **Second Update** (sidebar, CRM, pipeline, schedule, search, notifications, feedback, empty states) to the codebase and provides a phased implementation plan.

---

# FIRST UPDATE — Quick Create Modal & Styling

**Primary file:** `impactflow-os/components/QuickCreateModal.tsx`

---

## 1. SAVE Button — Brand Indigo

| Requirement | Current | Change |
|-------------|---------|--------|
| Background | `bg-slate-900` (~#1a1a2e) | `#4F46E5` (brand indigo) |
| Border radius | `rounded-[24px]` (pill) | `rounded-lg` (8px) |
| Label | "SAVE" (uppercase) | "Save" (sentence case) |
| Hover | `hover:bg-indigo-700` | `hover:bg-[#4338CA]` (darker indigo) |

**Location:** ~L2136–2142 (footer buttons).

**Implementation:**
- Replace submit button `className`: use `bg-[#4F46E5]` (or Tailwind `bg-indigo-600` if it matches), `rounded-lg`, `text-transform: none` (ensure no `uppercase`/`tracking-[0.25em]`), text "Save".
- Add explicit hover: `hover:bg-[#4338CA]` (indigo-700 is close; verify hex).

---

## 2. Labels — Sentence Case, Not ALL-CAPS

| Requirement | Current | Change |
|-------------|---------|--------|
| Labels | `text-[10px] font-black uppercase tracking-[0.15em]` | `text-[13px] font-medium text-[#6B7280]`, no uppercase |
| Copy | "NAME", "ORGANIZATION", "EXPECTED CLOSE DATE", "COMPLIANCE (UAE PDPL)" | "Name", "Organization", "Expected close date", "Compliance (UAE PDPL)" |

**Locations:** Multiple `<label>` elements (e.g. ~L950–951, 988–989, 1032, 1105, 1110, 1100, 1095, 1169, 1175, 1180, 1227, etc.). Also section heading "Compliance (UAE PDPL)" ~L1100.

**Implementation:**
- Add a shared class for modal labels, e.g. `label className="text-[13px] font-medium text-[#6B7280]"` and remove `uppercase`, `tracking-[0.15em]`, `font-black`, `text-[10px]`.
- Replace label text with sentence case (e.g. "Name", "Organization", "Expected close date", "Compliance (UAE PDPL)", "How did you get this contact?", "Event / context", "Consent status", "Phone Number", "Role / Title", "Email").

---

## 3. Remove "WORKSPACE UPDATE" Subtitle

| Requirement | Current | Change |
|-------------|---------|--------|
| Subtitle | `<p className="...">WORKSPACE UPDATE</p>` | Remove. Optionally add single line: "Add to your Sales Pipeline" with `text-[13px] text-[#9CA3AF]`. |

**Location:** ~L909–910 (header block).

**Implementation:**
- Delete the `<p>` with "WORKSPACE UPDATE".
- Optionally add helper text: e.g. `<p className="text-[13px] text-[#9CA3AF] mt-0.5">Add to your Sales Pipeline</p>` (only when type is deal, or always—per product decision).

---

## 4. Tab Bar — Match App Pill/Toggle Pattern

| Requirement | Current | Change |
|-------------|---------|--------|
| Container | `flex bg-slate-100 p-1 rounded-[20px] border border-slate-200` | Remove surrounding border/container styling; tabs as standalone pills. |
| Active tab | Custom segment style | `background: #4F46E5; color: white; border-radius: 20px; padding: 6px 16px` (match "All Contacts" filled). |
| Inactive | Current | `background: transparent; color: #6B7280; cursor: pointer`. |
| UX | Always show all tabs | When opened from context (e.g. "+ New Deal"), pre-select that tab; consider hiding tab bar when `lockedType` is set (already partially there). |

**Location:** ~L916–936 (tab bar div and buttons).

**Implementation:**
- Remove outer wrapper border/background: use a simple `flex gap-2` (or similar) with no pill container.
- Active: `bg-[#4F46E5] text-white rounded-[20px] py-1.5 px-4`.
- Inactive: `bg-transparent text-[#6B7280] hover:text-slate-700`.
- Ensure when modal is opened with `initialType`/`lockedType`, that tab is pre-selected and tab bar is hidden (logic may already exist; verify in `App.tsx`, `CompanyRecordPage.tsx`, `ContactRecordPage.tsx`).

---

## 5. Tighten Spacing & Field Density

| Requirement | Current | Change |
|-------------|---------|--------|
| Row gap | `space-y-8` / `gap-8` (~32px) | 20px (e.g. `space-y-5` or `gap-5`) |
| Input padding | `px-6 py-4` (~14px 18px) | `px-3.5 py-2.5` (10px 14px) |
| Input font-size | `text-sm` | `text-[14px]` |
| Input border | various | `border border-[#E5E7EB] rounded-lg` (8px) |
| Focus | ring/indigo | `focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10` (or equivalent) |
| Goal | — | Deal form visible without scroll on 768px height viewport |

**Locations:** Form container ~L915 (`space-y-8`), grid ~L946 (`gap-8`), and every input/select/textarea in the modal (many with `px-6 py-4 rounded-[20px]`).

**Implementation:**
- Form: change `space-y-8` to `space-y-5`, grid `gap-8` to `gap-5`.
- Create consistent input classes: `px-3.5 py-2.5 text-[14px] border border-[#E5E7EB] rounded-lg focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/10`. Replace existing input/select/textarea classes in bulk (keep error-state overrides).
- Reduce modal body padding if needed (e.g. `p-8` → `p-6`) and reduce `max-h-[75vh]` only if content still fits; test at 768px height.

---

## 6. Header Icon — Outline Style or Remove

| Requirement | Current | Change |
|-------------|---------|--------|
| Icon block | Solid `bg-indigo-600 rounded-[20px]` with white icon | **(A)** Outline icon only: stroke 1.5, color #4F46E5, 24px, no background. **(B)** Remove icon; keep title "New Opportunity" (or dynamic title). |

**Location:** ~L900–907 (header icon div).

**Implementation:**
- Option A: Replace the rounded div with an icon-only element, e.g. `<Building2 className="w-6 h-6 text-[#4F46E5]" strokeWidth={1.5} />` (no wrapper background).
- Option B: Remove the icon block entirely and keep only the title (and optional helper text from §3).

---

## 7. Brand-Colored Top Accent

| Requirement | Current | Change |
|-------------|---------|--------|
| Modal container | `rounded-[48px]`, no top border | `border-top: 4px solid #4F46E5`, `border-radius: 12px`, `box-shadow: 0 20px 60px rgba(0,0,0,0.15)`. |

**Location:** ~L898 — outer modal div: `className="bg-white rounded-[48px] w-full max-w-2xl shadow-2xl overflow-hidden ..."`.

**Implementation:**
- Add `border-t-4 border-t-[#4F46E5]`, change `rounded-[48px]` to `rounded-xl` (12px), replace shadow with `shadow-[0_20px_60px_rgba(0,0,0,0.15)]`.

---

## 8. Cancel Button — Ghost Style

| Requirement | Current | Change |
|-------------|---------|--------|
| Label | "CANCEL" | "Cancel" |
| Style | Plain text, uppercase | Ghost: `border border-[#E5E7EB] rounded-lg py-2.5 px-6 text-[#6B7280]` (10px 24px ≈ py-2.5 px-6). |
| Layout | Left (flex-1) vs Save right | Keep; ensure Cancel left, Save right. |

**Location:** ~L2134–2135.

**Implementation:**
- Cancel button: `className="... border border-[#E5E7EB] rounded-lg py-2.5 px-6 text-[#6B7280] hover:bg-slate-50 transition-colors"`, text "Cancel", remove `uppercase` and `tracking-[0.2em]`.

---

## 9. Upload/Attach Area — Match App Card Depth

| Requirement | Current | Change |
|-------------|---------|--------|
| Default | `border-2 border-dashed border-slate-200`, various bg | `border border-dashed border-[#D1D5DB] rounded-lg bg-[#F9FAFB]`. |
| Drag-over | — | On drag-over: `border-[#4F46E5] bg-[#EEF2FF]`. |

**Location:** ~L2084–2100 (label + inner div for "Attach Image to Note").

**Implementation:**
- Update inner div to: `border border-dashed border-[#D1D5DB] rounded-lg bg-[#F9FAFB]`.
- Add state for drag-over (e.g. `isDragOver`) and `onDragEnter`/`onDragLeave`/`onDragOver` (prevent default) and `onDrop`; when `isDragOver`, apply `border-[#4F46E5] bg-[#EEF2FF]`.

---

## 10. Typo Fix

| Requirement | Current | Change |
|-------------|---------|--------|
| Tab label | "INVOCE" | "INVOICE" |

**Location:** ~L933: `{tab === 'invoice' ? 'INVOCE' : tab.toUpperCase()}`.

**Implementation:**
- Change to `{tab === 'invoice' ? 'Invoice' : ...}` (sentence case per §4) or at minimum "INVOICE". Prefer sentence case "Invoice" to match other tab styling.

---

# SECOND UPDATE — App-Wide Improvements

---

## 1. Sidebar — Collapsible, Icon-Only, Shortcuts

**Files:** `impactflow-os/App.tsx` (sidebar layout, hamburger, state), `impactflow-os/constants.tsx` (nav groups).

**Requirements:**
- Collapsible sidebar: icon-only rail (e.g. 56px) toggled by hamburger; full width ~240px when expanded.
- Default collapsed sub-sections; persist expand/collapse state (`localStorage` or user preferences).
- Keyboard shortcuts for top-level nav (e.g. G+D for Dashboard).
- CSS transition for width (240px ↔ 56px).
- Tooltips for icon-only mode.
- Responsive: auto-collapse sidebar below 1024px.

**Implementation plan:**
1. Add state: `sidebarCollapsed` (boolean), optionally `sidebarSectionsExpanded` (object keyed by section).
2. Persist in `localStorage`: `sidebarCollapsed`, `sidebarSectionsExpanded`.
3. Sidebar container: `width: sidebarCollapsed ? 56 : 240`, `transition: width 0.2s ease`.
4. When collapsed: show only icons; wrap nav items in a tooltip component (e.g. title or Radix/Tooltip).
5. Register keyboard shortcuts (e.g. `useEffect` with `document.addEventListener('keydown', ...)` or use a small hotkeys library): e.g. `G then D` → Dashboard; map other top-level routes.
6. In `App.tsx`, add `useEffect` for viewport: if `window.innerWidth < 1024`, set sidebar to collapsed (or force collapsed on small screens and allow expand as overlay).
7. Ensure hamburger toggles `sidebarCollapsed` and is visible when sidebar is expanded/collapsed.

---

## 2. Contact Detail — Left Panel Clipping & Layout

**Files:** `impactflow-os/components/ContactRecordPage.tsx`, `impactflow-os/components/common/PropertyPanel.tsx`, `impactflow-os/components/RecordPageLayout.tsx`, `impactflow-os/components/CRM.tsx` (drawer).

**Requirements:**
- Move "About This Contact" into a right-side drawer (toggleable) or use responsive two-column with min-widths and wrapping.
- Property labels: full-width, truncation + tooltip on hover.
- Sliding drawer: right panel, ~320px, fixed or grid.
- Toggle button with state persistence per session.

**Implementation plan:**
1. **Option A (drawer):** In `RecordPageLayout.tsx`, treat "left" as the main content and "right" as the About panel; or introduce a dedicated right drawer that shows PropertyPanel, toggle via a header button. State: `aboutPanelOpen` (persist in sessionStorage).
2. **Option B (two-column):** Left column with `min-width` (e.g. 260px) and `ResizeObserver` or CSS so it doesn’t shrink below; use `text-overflow: ellipsis; overflow: hidden; white-space: nowrap` on labels and `title={label}` or a tooltip component for full text.
3. In `PropertyPanel.tsx`: ensure each label has a wrapper with `min-width: 0`, truncation, and tooltip/title.
4. Add a "Toggle About" button in the contact header; persist open/closed in `sessionStorage` keyed by route or user.

---

## 3. CRM List Views — Pagination, Sorting, Bulk Actions

**File:** `impactflow-os/components/CRM.tsx`.

**Requirements:**
- Pagination: 25/50/100 per page or virtual scrolling.
- Sortable column headers with sort direction indicators.
- Sticky bulk action bar when rows selected (merge, delete, assign owner, export).
- Saved/smart views (filters, sort, columns) stored per user.

**Implementation plan:**
1. **API:** Add or use existing list API with `?page=1&limit=25&sort=name&order=asc`; ensure backend supports it.
2. **State:** `page`, `limit`, `sort`, `order`, `selectedIds` (set of contact/company ids).
3. **UI:** Pagination controls below table (Previous/Next, page size selector, optional page numbers). Column headers clickable to set `sort`/`order` and show arrow indicator.
4. **Virtualization:** For 1000+ rows, use `react-window` or `@tanstack/react-virtual` on the list container.
5. **Bulk bar:** When `selectedIds.size > 0`, render a sticky bar (`position: sticky; bottom: 0`) with "Merge", "Delete", "Assign owner", "Export"; wire to APIs.
6. **Saved views:** Backend CRUD for view configs (filters, sort, columns); frontend dropdown or sidebar to load/save view; store current view id in URL or state.

---

## 4. Deal Pipeline — Totals, Drag Feedback, Currency, List View

**File:** `impactflow-os/components/Pipeline.tsx`.

**Requirements:**
- Revenue subtotal per stage column header: `SUM(deal.amount)` per stage (with currency handling).
- Drag handles and drop zone highlighting; onDragStart visual (elevation/shadow).
- Normalize currency (backend conversion or user preferred currency).
- List/table view toggle for pipeline.

**Implementation plan:**
1. **Totals:** For each stage, compute `sum(deal.amount)` (filter by currency or convert to base); render in stage header (e.g. "Discovery (9) · $45,000").
2. **Drag:** Use existing DnD (e.g. `draggingDealId`); add `onDragStart` to apply a class (e.g. `opacity-90 shadow-lg scale-105`) to the dragged card; on drop targets use `isOver` to add a border/background highlight.
3. **Currency:** Backend endpoint or mapping for exchange rates; display in user preference or base currency; optionally show original currency in tooltip.
4. **List view:** Add view mode state (kanban | list); list view renders same deals in a `<table>` with columns (Name, Company, Amount, Stage, etc.); reuse same data and stage update logic.

---

## 5. Contact/Company Detail — Inline Editing

**Files:** `impactflow-os/components/common/PropertyPanel.tsx`, `impactflow-os/components/common/InlineEditField.tsx`, contact/company record pages and APIs.

**Requirements:**
- All property values click-to-edit inline (hover: pencil icon; click: input/select).
- Auto-save on blur; optimistic update; undo toast (5s window).

**Implementation plan:**
1. **InlineEditField:** Already used in PropertyPanel; ensure every editable property has `onSave` and toggles between span and input/select on click; hover shows pencil.
2. **API:** `PATCH /contacts/:id` and `PATCH /companies/:id` with body `{ fieldName: value }` for single-field updates.
3. **Optimistic update:** Update local state on save; on API error revert and show error toast.
4. **Toast:** Add toast component with "Undo" that reverts last change and re-sends previous value within 5s (debounced save so undo cancels or reverts).
5. **Validation:** Email regex, phone format, required fields in InlineEditField or parent.

---

## 6. Schedule Page — Time Zone & Calendar Density

**File:** `impactflow-os/components/Schedule.tsx`; `constants.tsx` for timezones.

**Requirements:**
- Auto-scroll to current time or first event on load.
- "Today's Deliverables" in collapsible section or sidebar.
- Working hours (e.g. 9–18) by default; dim non-working hours; expand to full 24h.
- Multi-timezone support (e.g. secondary timezone).

**Implementation plan:**
1. On mount, find DOM element for current hour (or first event); call `scrollIntoView({ block: 'center' })`.
2. Wrap "Today's Deliverables" in a collapsible component; persist open/closed in `localStorage`.
3. User prefs: `workingHoursStart`, `workingHoursEnd` (e.g. 9, 18); default view to that range; CSS dim non-working rows; toggle "Show full day".
4. Use `Intl.DateTimeFormat` with `timeZone` for secondary timezone; add a selector in header or settings and show a second column or label for secondary zone.

---

## 7. Global Search — Command Palette

**File:** `impactflow-os/App.tsx` (search bar); new component for command palette.

**Requirements:**
- Global command palette (Cmd+K / Ctrl+K) searching across modules.
- Categorized results (Contacts, Companies, Deals, Tasks) with inline previews.
- Keep current "Search Current View" as filter within list views.

**Implementation plan:**
1. New component: `CommandPalette.tsx` — full-width overlay, fixed, input with debounce 300ms.
2. Backend: unified `GET /search?q=term` querying Firestore/Postgres/Elasticsearch across entities; return grouped results (contacts, companies, deals, tasks).
3. Frontend: on Cmd+K open palette; arrow keys + Enter to select; show result groups with short preview (e.g. name, subtype).
4. Recent searches in `localStorage`, show when input empty.
5. Keep existing header search as-is but ensure it only filters current view when on list pages; document placeholder "Search current view" vs "Search everywhere (⌘K)".

---

## 8. Notification Bell — Dropdown Context

**Files:** `impactflow-os/App.tsx` (bell, badge), `impactflow-os/components/NotificationsDropdown.tsx`.

**Requirements:**
- Dropdown on bell click: recent notifications, grouped by type; mark as read, dismiss, "mark all read".
- Link each item to source (deal, task, contact).
- Real-time: Firestore `onSnapshot` or WebSocket; badge from `unreadCount`.

**Implementation plan:**
1. Ensure `NotificationsDropdown` is rendered and positioned below bell; max-height 400px, scrollable.
2. Data model: `{ id, type, title, body, sourceType, sourceId, read, createdAt }`.
3. API: `PATCH /notifications/:id/read`, `PATCH /notifications/mark-all-read`; badge from `unreadCount` query or local count.
4. Each row: link to `/${sourceType}/${sourceId}` or equivalent; actions: mark read, dismiss.
5. Optional: real-time subscription for new notifications and badge update.

---

## 9. Feedback Widget — Less Intrusive

**File:** `impactflow-os/components/BugReportWidget.tsx`.

**Requirements:**
- Move from fixed right-edge tab to small floating button (bottom-right) or into help/settings menu.
- Optionally show contextually (e.g. after completing an action or after 5 min session).

**Implementation plan:**
1. Replace fixed tab with a FAB: `position: fixed; bottom: 24px; right: 24px`; small icon button that opens same panel.
2. Optional: feature flag or env to show/hide; trigger after N minutes or after specific events (e.g. deal won); store "feedback shown" in session to avoid repeated prompts.

---

## 10. Empty States & Onboarding

**Files:** `impactflow-os/components/ProductsServices.tsx`, `impactflow-os/components/Pipeline.tsx`, `impactflow-os/components/Dashboard.tsx`, `impactflow-os/components/common/SatisfactionWidget.tsx`, NPS in CRM/record pages; nav in `constants.tsx`; optional onboarding in `PlaybookInstanceView.tsx` / `PlaybookBuilder.tsx` or new dashboard checklist.

**Requirements:**
- Rich empty states: illustration, heading, description, CTA.
- First-run onboarding checklist (e.g. "Configure CRM pipeline", "Create proposal template"); persist in user profile.
- "Coming Soon" sections: hide from nav or grey out with badge; avoid bare "This section is in development".

**Implementation plan:**
1. **Empty state component:** Reusable `EmptyState.tsx`: prop for illustration (or icon), heading, description, CTA button; use in Products & Services, NPS (when no data), Shared Inbox, etc.
2. **Products & Services:** Replace "This section is in development" with EmptyState + "Coming Soon" badge; in nav, add `disabled` or badge "Coming Soon" and `opacity-0.5 pointer-events-none` or hide.
3. **NPS:** When no data, show friendly empty state instead of "--"; use SatisfactionWidget to drive content.
4. **Onboarding:** Add `onboardingSteps: { step1: boolean, ... }` to user profile; dashboard checklist component that shows steps and marks complete via API; show on first run (e.g. when all steps false).
5. **Feature flags:** `isModuleEnabled('products')` (or similar) to conditionally show/disable nav items and hide or grey "Coming Soon" sections.

---

# Implementation Order (Suggested)

**Phase 1 — Quick wins (First Update):**  
1 → 10 (typo) → 3 (subtitle) → 2 (labels) → 8 (Cancel) → 1 (Save) → 4 (tabs) → 5 (spacing) → 6 (icon) → 7 (accent) → 9 (upload).

**Phase 2 — High-impact app (Second Update):**  
2 (contact panel) → 5 (inline edit) → 8 (notifications) → 9 (feedback widget) → 10 (empty states).

**Phase 3 — Data and navigation:**  
1 (sidebar) → 7 (command palette) → 3 (CRM pagination/sort/bulk) → 4 (pipeline totals/drag/list view) → 6 (schedule).

Dependencies: API changes for pagination, PATCH contact/company, notifications, and search should be planned in parallel with front-end work.
