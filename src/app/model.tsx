/* She's Maid In ATL — application state + view-model.
   A faithful React port of the reference prototype's single logic class
   (state, seed data, handlers and the renderVals() view-model builder).
   In a real build this per-domain state would move behind an API; here it is
   held in one store exactly as the design handoff describes, so the whole
   three-zone app is clickable end to end. */
import React, { useMemo, useRef, useState } from 'react'
import { Chip, MetaTag, VerifiedBadge } from '../ds/components'
import { residentialQuote, airbnbQuote, type Staging } from '../lib/pricing'
import { CONCIERGE_RATE, conciergeTimeCharge, applyExtension } from '../lib/concierge'
import { WORK_SHOTS, PORTFOLIO_SHOTS } from './portfolioData'

type Any = Record<string, any>

/* ------------------------------------------------------------ seed data -- */
const PEOPLE: Any = {
  ahleyia: { title: 'Ahleyia Kee', sub: 'Founder · your housekeeper', badge: '⭐ 4.98 rating' },
  business: { title: 'She’s Maid In ATL', sub: 'Luxury Housekeeping · the business', badge: 'Official' },
  hartwell: { title: 'CLIENT_NAME', sub: 'Owner · The Hartwell Estate', badge: '2 properties' },
  lead: { title: 'New lead', sub: 'From your digital card link', badge: '🌱 New' },
}
const UNITS: Any[] = [
  { id: '1604', name: 'Unit 1604', sub: 'Airbnb · turnover', low: 3,
    note: '☕ Note: Keep regular coffee stocked — only decaf is there right now.',
    maint: '💡 Maintenance: Vanity light doesn’t work — reported to owner.',
    items: [
      { id: 'a1', icon: '🧻', name: 'Paper towels', sub: 'Below par', low: true, def: 2, level: 22 },
      { id: 'a2', icon: '🧺', name: 'Laundry detergent', sub: 'Below par', low: true, def: 1, level: 30 },
      { id: 'a3', icon: '🍷', name: 'Wine', sub: 'Welcome bottle', low: true, def: 1, level: 15 },
    ] },
  { id: '1403', name: 'Unit 1403', sub: 'Airbnb · turnover', low: 3,
    note: '🔑 Note: Air fresheners & Tilex are under the kitchen sink.',
    maint: '✓ No open maintenance issues.',
    items: [
      { id: 'b1', icon: '🧻', name: 'Paper towels', sub: 'Below par', low: true, def: 2, level: 26 },
      { id: 'b2', icon: '🧺', name: 'Laundry detergent', sub: 'Below par', low: true, def: 1, level: 34 },
      { id: 'b3', icon: '🍷', name: 'Wine', sub: 'Welcome bottle', low: true, def: 1, level: 12 },
    ] },
  { id: '1913', name: 'Unit 1913', sub: 'Airbnb · turnover', low: 3,
    note: '💧 Note: Water filter pitcher lives in the fridge door — refill before you leave.',
    maint: '✓ No open maintenance issues.',
    items: [
      { id: 'c1', icon: '🧻', name: 'Paper towels', sub: 'On the last few rolls', low: true, def: 3, level: 10 },
      { id: 'c2', icon: '🧴', name: 'Bath tissue', sub: '3 rolls left', low: true, def: 2, level: 20 },
      { id: 'c3', icon: '🗑️', name: 'Trash bags', sub: 'Below par', low: true, def: 1, level: 28 },
    ] },
]
const AMEN: Any[] = [
  { id: 'm1', icon: '☕', name: 'Coffee (regular + decaf)', def: 0 },
  { id: 'm2', icon: '🥛', name: 'Coffee creamer', def: 0 },
  { id: 'm3', icon: '🧴', name: 'Body wash', def: 0 },
  { id: 'm4', icon: '🧼', name: 'Hand soap', def: 0 },
  { id: 'm5', icon: '🚿', name: 'Shampoo', def: 0 },
]
const PHASES = [[1, 6], [7, 11], [12, 18], [19, 22], [23, 26]]
const SLOTS = ['8 – 10 AM', '10 AM – 12 PM', '12 – 2 PM', '2 – 4 PM', '4 – 6 PM']
const DAY_BOOKINGS: Any = {
  24: [
    { slot: '10 AM – 12 PM', kind: 'turnover', name: 'Skyline Loft 12B', who: 'Tiana' },
    { slot: '12 – 2 PM', kind: 'turnover', name: 'The Hartwell Estate', who: 'Ahleyia' },
    { slot: '2 – 4 PM', kind: 'res', name: 'Ridgeview Owner’s Home', who: 'Ahleyia' },
  ],
  25: [{ slot: '12 – 2 PM', kind: 'turnover', name: 'Unit 1913', who: null }],
  27: [{ slot: '2 – 4 PM', kind: 'res', name: 'The Hartwell Estate', who: 'Ahleyia' }],
  28: [
    { slot: '8 – 10 AM', kind: 'turnover', name: 'Skyline Loft 12B', who: null },
    { slot: '2 – 4 PM', kind: 'res', name: 'Ridgeview Owner’s Home', who: 'Ahleyia' },
  ],
  29: [{ slot: '10 AM – 12 PM', kind: 'turnover', name: 'Unit 1403', who: 'Tiana' }],
  31: [
    { slot: '10 AM – 12 PM', kind: 'turnover', name: 'Unit 1604', who: 'Ahleyia' },
    { slot: '12 – 2 PM', kind: 'turnover', name: 'Unit 1913', who: 'Tiana' },
  ],
}
const LUX: Any[] = [
  { icon: '🔍', title: '1 · Pre-Clean Walkthrough', total: 6, steps: [
    { id: 'L1', label: 'Notify the owner upon arrival' },
    { id: 'L2', label: 'Walk the scoped spaces & note anything out of place' },
    { id: 'L3', label: 'Check that this week’s scope hasn’t changed' },
    { id: 'L4', label: 'Report missing or damaged items to the owner immediately' },
    { id: 'L5', label: 'Take ‘before’ photos for documentation', photo: true, wash: 'var(--photo-1)', stamp: '📌 Before · 2:06 PM' },
    { id: 'L6', label: 'Confirm the dog gate is closed' },
  ] },
  { icon: '🧺', title: '2 · Laundry Process', total: 5, steps: [
    { id: 'L7', label: 'Strip the primary bed & begin first laundry load' },
    { id: 'L8', label: 'Sort into loads: sheets · pillowcases/duvets · towels' },
    { id: 'L9', label: 'Start the wash before beginning cleaning tasks' },
    { id: 'L10', label: 'Steam sheets & pillowcases for a crisp finish' },
    { id: 'L11', label: 'Fold & stage towels to the household standard' },
  ] },
  { icon: '✨', title: '3 · Cleaning Order', total: 9, steps: [
    { id: 'L12', label: 'Bathrooms first — toilets, tubs, sinks, mirrors, fixtures' },
    { id: 'L13', label: 'Sanitize high-touch surfaces — switches, handles, remotes' },
    { id: 'L14', label: 'Dust high & low; primary suite incl. nightstands & under bed' },
    { id: 'L15', label: 'Marble island — sealed-stone cleaner only' },
    { id: 'L16', label: 'Make beds with fresh linens — wrinkle-free presentation', photo: true, wash: 'var(--photo-2)', stamp: '📌 Staged · 3:41 PM' },
    { id: 'L17', label: 'Clean & disinfect kitchen surfaces, sink & appliances' },
    { id: 'L18', label: 'Wipe dining table, chairs & living-room surfaces' },
    { id: 'L19', label: 'Interior glass & entry doors' },
    { id: 'L20', label: 'Vacuum & mop floors LAST to avoid rework & footprints' },
  ] },
  { icon: '🧴', title: '4 · Restocking & Inventory', total: 5, steps: [
    { id: 'L21', label: 'Refill toiletries — soap, shampoo, toilet paper, tissues' },
    { id: 'L22', label: 'Ensure clean towels, bedding & kitchen essentials are stocked' },
    { id: 'L23', label: 'Return every item to the household’s place' },
    { id: 'L24', label: 'Note any missing or broken items to replace → adds to Supplies' },
    { id: 'L25', label: 'Refill the water filter pitcher' },
  ] },
  { icon: '📋', title: '5 · Final Walkthrough & Owner', total: 6, steps: [
    { id: 'L26', label: 'Final check of all scoped rooms for overlooked spots' },
    { id: 'L27', label: 'Take ‘after’ photos for quality assurance', photo: true, wash: 'var(--photo-4)', stamp: '📌 After · 5:12 PM' },
    { id: 'L28', label: 'Lavender finishing mist on linens & air' },
    { id: 'L29', label: 'Lock doors, turn off lights & confirm the home is secure' },
    { id: 'L30', label: 'Set thermostat to suggested degrees' },
    { id: 'L31', label: 'Send the owner their photo-verified report' },
  ] },
]
const ASST: Any[] = [
  { icon: '🧺', title: '2 · Laundry Process', total: 5, steps: [
    { id: 'A1', label: 'Strip all beds & begin first laundry load' },
    { id: 'A2', label: 'Sort into three loads: sheets · pillowcases/duvets · towels' },
    { id: 'A3', label: 'Start the wash before beginning cleaning tasks (batch it)' },
    { id: 'A4', label: 'Steam sheets & pillowcases for a crisp finish' },
    { id: 'A5', label: 'Fold & stage towels to Airbnb presentation standard' },
  ] },
  { icon: '✨', title: '3 · Cleaning Order', total: 4, steps: [
    { id: 'A6', label: 'Bathrooms first — toilets, tubs, sinks, mirrors, fixtures' },
    { id: 'A7', label: 'Sanitize high-touch surfaces — switches, handles, remotes' },
    { id: 'A8', label: 'Dust high & low; clean bedrooms incl. nightstands & under beds' },
    { id: 'A9', label: 'Vacuum & mop floors LAST to avoid rework & footprints' },
  ] },
  { icon: '🧴', title: '4 · Restocking & Inventory', total: 3, steps: [
    { id: 'A10', label: 'Refill toiletries — soap, shampoo, toilet paper, tissues' },
    { id: 'A11', label: 'Ensure clean towels, bedding & kitchen essentials are stocked' },
    { id: 'A12', label: 'Note any missing or broken items to replace' },
  ] },
]

/* ------------------------------------------------------- initial state -- */
export interface ModelProps { startRole?: 'visitor' | 'cleaner' | 'owner'; showChrome?: boolean; autoFillMethod?: boolean }

function initialState(props: ModelProps): Any {
  const fill = !!props.autoFillMethod
  const checked: Any = {}
  if (fill) for (let i = 1; i <= 26; i++) checked['t' + i] = true
  return {
    role: props.startRole || 'visitor',
    p: 'welcome', c: 'today', o: 'home',
    checked, photos: fill ? { t6: true, t15: true, t21: true, t24: true } : {},
    openPhase: 1, allOpen: false,
    scopes: { 'Whole home': true }, sqft: '1,500–2,500', cadence: 'Biweekly',
    svc: 'std', hours: 4, asst: false,
    scent: 'Eucalyptus-mint', eco: true, staging: 'Standard',
    listingUrl: '', detected: false, consent: false,
    tip: 'No tip', approved: false, jobDone: false,
    unitFilter: 'All units', counts: {},
    sheetOpen: false, toast: '', toastOn: false,
    cTab: 0, oTab: 0, maintStatus: null,
    threadWith: 'ahleyia', draft: '', composeTo: null, composeTopic: null,
    checkin: 'ready', quote: 'new', dispute: 'form', disputeOpen: false,
    flagCat: 'Maintenance', flagNote: '', flagPhoto: false,
    dispCat: 'Missed area', dispNote: '', dispPhoto: false,
    tipAmount: '', offline: false, detectFailed: false, manualName: '',
    beds: '2', baths: '2', emptyJobs: false, emptyHomes: false, emptyMsgs: false,
    cam: null, luxChecked: {}, luxPhotos: {}, luxOpen: 1, asstChecked: {}, asstOpen: 1,
    code: '', tpl: 'turn', gallery: 'clean', galleryFrom: 'report',
    rate: 'form', stars: 5, praise: { 'Staging was perfect': true }, rateNote: '',
    editField: 'phone', editValue: '',
    split: 40, clientFilter: 'All',
    booking: 'b1', notice: 'late', rs: 'form', cx: 'form', mv: 'form',
    newDay: '26', newWindow: '10 AM – 12 PM', rsScope: 'Just this clean',
    addKind: 'addon', addons: {}, addScopeVal: 'Just this visit',
    addHome: 'The Hartwell Estate', addExtraKind: 'Refresh clean',
    cancelReason: 'Guest cancelled', waiverUsed: false, waiverApplied: false,
    moveReason: 'Running behind', moveOption: 'later', moveNote: '',
    navOpen: false, navApp: 'apple', navRemember: false,
    areas: {}, driveTime: 'Up to 35 min',
    assign: {}, calMonth: 0, calDay: 24,
    hist: [], menuOpen: false,
    adminEmail: '', adminPw: '', pwShown: false, adminRemember: true,
    suStep: 1, suName: '', suPhone: '', suEmail: '', suAddress: '', suTerms: false,
    suKind: 'Airbnb host', suScopeMap: {}, suCadenceVal: 'Weekly',
    quoteScopeMap: { 'Main level': true, 'Primary suite': true }, quoteCadenceVal: 'Weekly',
    suHood: 'Midtown', suContactPref: 'Text me', suSourcePref: 'Her card / QR',
    staffStep: 1, staffName: '', verified: {}, cert: {}, taxKind: 'Individual / sole prop',
    standardsMap: {}, setup: { verify: true },
    // Concierge tier (v3): request form + live visit clock + at-cost expenses.
    conciergeSvc: {}, conciergeWindow: 'Tomorrow, 10 AM – 12 PM', conciergeNote: '', conciergeSent: false,
    visitState: 'brief', visitMinutes: 0, expenses: [], expCat: 'Groceries', expAmount: '', expPhoto: false,
    scentOn: true,
    access: { routes: true, checklists: true, supplies: true, ownernotes: true },
    onotif: { reports: true, cleaning: true, supplies: true, summary: false },
    cnotif: { bookings: true, approvals: true, supplies: true },
    threads: {
      ahleyia: [
        { theirs: true, text: 'Good morning! Heading to the Hartwell Estate now — I’ll send photos as I go.', time: '10:52a' },
        { mine: true, text: 'Perfect. Guest checks in at 4 — waters and the welcome note please.', time: '10:58a' },
        { theirs: true, text: 'All set for your 4 PM guest — waters & welcome note staged 🌟', time: '12:31p' },
        { theirs: true, text: 'Kitchen island restaged to your reference photo.', photo: true, stamp: '📌 Kitchen island · 12:20 PM', time: '12:31p' },
      ],
      business: [
        { theirs: true, text: 'Your July service summary is ready — 8 cleans, 100% photo-verified.', time: 'Wed' },
        { theirs: true, text: 'Every report stays in your proof archive. 📋', time: 'Wed' },
      ],
      hartwell: [
        { theirs: true, text: 'Guest is checking in at 4 — thank you for the photos.', time: '11:02a' },
        { mine: true, text: 'On it. Restocking the coffee too — only decaf was there.', time: '11:07a' },
      ],
      lead: [
        { theirs: true, text: 'Hi Ahleyia! I got your card at the Buckhead open house — can you quote a 3-bed Airbnb turnover?', time: '9:40a' },
      ],
    },
  }
}

/* ------------------------------------------------------------- the hook -- */
export function useModel(props: ModelProps) {
  const [state, setState] = useState<Any>(() => initialState(props))
  const toastTimer = useRef<any>(null)
  const codeRef = useRef<HTMLInputElement | null>(null)

  const stateRef = useRef(state); stateRef.current = state
  const s = state

  /* ---- state helpers (mirror this.set / setState / go / back / say) ---- */
  const set = (patch: Any) => setState((st: Any) => ({ ...st, ...(typeof patch === 'function' ? patch(st) : patch) }))
  const viewKey = (st: Any) => st.role + '|' + (st.role === 'visitor' ? st.p : (st.role === 'cleaner' ? st.c : st.o))
  const go = (patch: Any) => setState((st: Any) => {
    const from = { role: st.role, p: st.p, c: st.c, o: st.o }
    const next = { ...st, ...patch }
    const changed = viewKey(next) !== viewKey(st)
    return { ...st, ...patch, ...(changed ? { hist: st.hist.concat([from]).slice(-40) } : {}) }
  })
  const back = () => setState((st: Any) => {
    if (!st.hist.length) {
      return st.role === 'visitor' ? { ...st, p: 'welcome' } : (st.role === 'cleaner' ? { ...st, c: 'today', cTab: 0 } : { ...st, o: 'home', oTab: 0 })
    }
    const prev = st.hist[st.hist.length - 1]
    return { ...st, ...prev, hist: st.hist.slice(0, -1), menuOpen: false }
  })
  const say = (msg: string) => {
    clearTimeout(toastTimer.current)
    setState((st: Any) => ({ ...st, toast: msg, toastOn: true }))
    toastTimer.current = setTimeout(() => setState((st: Any) => ({ ...st, toastOn: false })), 2400)
  }
  const qty = (id: string, def: number) => { const v = s.counts[id]; return v == null ? def : v }
  const setQty = (id: string, v: number) => setState((st: Any) => ({ ...st, counts: { ...st.counts, [id]: Math.max(0, v) } }))
  const doneCount = (from: number, to: number) => { let n = 0; for (let i = from; i <= to; i++) if (s.checked['t' + i]) n++; return n }
  const bookingsFor = (day: number | string) => (DAY_BOOKINGS[day] || []).map((b: Any) => ({ ...b, key: day + '|' + b.slot, who: s.assign[day + '|' + b.slot] || b.who }))
  const startNav = (app: string) => {
    const label = ({ apple: 'Apple Maps', google: 'Google Maps', waze: 'Waze' } as Any)[app] || 'Maps'
    const addr = encodeURIComponent('214 Tuxedo Rd NW, Atlanta, GA')
    const url = app === 'waze' ? 'https://waze.com/ul?q=' + addr + '&navigate=yes'
      : (app === 'google' ? 'https://www.google.com/maps/dir/?api=1&destination=' + addr + '&travelmode=driving'
        : 'https://maps.apple.com/?daddr=' + addr + '&dirflg=d')
    set({ navOpen: false, navApp: app, c: 'checkin', checkin: 'ready' })
    say('Opening ' + label + ' · stop 1 of 3 🚗')
    try { window.open(url, '_blank', 'noopener') } catch { /* preview may block */ }
  }

  /* ---- small JSX builders, mirror this.chip / this.mt / money ---- */
  const chip = (key: any, tone: string, txt: any) => <Chip key={key} tone={tone}>{txt}</Chip>
  const mt = (key: any, icon: any, label: any, value?: any) => <MetaTag key={key} icon={icon} label={label} value={value} />
  const money = (t: string, val: string) => <b style={{ fontSize: '13px', color: t }}>{val}</b>

  const v: Any = useMemo(() => buildView(), [state]) // eslint-disable-line react-hooks/exhaustive-deps

  function buildView(): Any {
    const clientFull = (s.suName || '').trim() || 'James Hartwell'
    const clientParts = clientFull.split(/\s+/)
    const clientFirst = clientParts[0]
    const clientLast = clientParts.length > 1 ? clientParts[clientParts.length - 1] : ''
    const clientInitials = (clientParts[0][0] + (clientLast ? clientLast[0] : '')).toUpperCase()
    const clientEmail = (s.suEmail || '').trim() || 'jh@hartwellgroup.com'
    const v: Any = {
      clientFull, clientFirst, clientGreeting: clientFirst, clientInitials, clientEmail,
      clientPhone: (s.suPhone || '').trim() || '(404) 555-0134',
      goBack: () => back(),
      fieldFit: { boxSizing: 'border-box', width: '100%' },
      menuOpen: s.menuOpen,
      openMenu: () => set({ menuOpen: true }),
      closeMenu: () => set({ menuOpen: false }),
      clientAddress: clientLast ? (s.suName ? clientFull : 'Mr. ' + clientLast) : clientFirst,
      quoteForLine: 'Ridgeview home · prepared for ' + clientFirst + ' today',
      accountTitle: clientFirst + '’s account',
      scheduleTitle: clientFirst + '’s schedule',
      suKind: s.suKind,
      suKindIcon: s.suKind === 'Airbnb host' ? '🏠' : (s.suKind === 'Residential client' ? '🏡' : '👪'),
      suKindSub: s.suKind === 'Airbnb host' ? 'Turnovers between guests' : (s.suKind === 'Residential client' ? 'Your home, kept to your standard' : 'Booked on their behalf'),
      clientTypeLine: (s.suKind || 'Residential client') + ' · client since ' + (s.suName ? 'today' : 'March 2025'),
      yes: true, no: false, n0: 0, n4: 4, n5: 5, n6: 6, n7: 7, n22: 22, n26: 26,
      n38: 38, n60: 60, n64: 64, n66: 66, n110: 110, n130: 130,
      showChrome: props.showChrome !== false,
      isVisitor: s.role === 'visitor', isCleaner: s.role === 'cleaner', isOwner: s.role === 'owner',
      roleLabel: s.role === 'visitor' ? 'Visitor · no account'
        : (s.role === 'cleaner'
          ? (['admin', 'team', 'clients', 'bizsettings', 'area', 'assign', 'calendar'].indexOf(s.c) >= 0 ? 'Ahleyia · admin' : 'Ahleyia · staff')
          : 'Owner · client'),
      goVisitor: () => set({ role: 'visitor', hist: [], menuOpen: false }),
      goCleaner: () => set({ role: 'cleaner', hist: [], menuOpen: false }),
      goOwner: () => set({ role: 'owner', hist: [], menuOpen: false }),
      vWelcome: s.role === 'visitor' && s.p === 'welcome',
      vServices: s.role === 'visitor' && s.p === 'services',
      vPortfolio: s.role === 'visitor' && s.p === 'portfolio',
      vGate: s.role === 'visitor' && s.p === 'gate',
      cToday: s.role === 'cleaner' && s.c === 'today',
      cMap: s.role === 'cleaner' && s.c === 'map',
      cJob: s.role === 'cleaner' && s.c === 'job',
      cSupplies: s.role === 'cleaner' && s.c === 'supplies',
      cShare: s.role === 'cleaner' && s.c === 'share',
      cQuote: s.role === 'cleaner' && s.c === 'quote',
      cProfile: s.role === 'cleaner' && s.c === 'profile',
      oHome: s.role === 'owner' && s.o === 'home',
      oProducts: s.role === 'owner' && s.o === 'products',
      oOnboard: s.role === 'owner' && s.o === 'onboard',
      oReport: s.role === 'owner' && s.o === 'report',
      oSupplies: s.role === 'owner' && s.o === 'supplies',
      oMessages: s.role === 'owner' && s.o === 'messages',
      goWelcome: () => go({ p: 'welcome' }),
      goServices: () => go({ p: 'services' }),
      goPortfolio: () => go({ p: 'portfolio' }),
      goGate: () => go({ p: 'gate' }),
      goToday: () => go({ c: 'today', cTab: 0 }),
      goMap: () => go({ c: 'map' }),
      goJob: () => go({ c: 'job', cTab: 1 }),
      goShare: () => go({ c: 'share' }),
      goQuote: () => go({ c: 'quote' }),
      goProfile: () => go({ c: 'profile', cTab: 3 }),
      goOwnerHome: () => go({ role: 'owner', o: 'home', oTab: 0 }),
      goProducts: () => go({ o: 'products' }),
      goReport: () => go({ o: 'report', oTab: 1 }),
      goOnboard: () => go({ role: 'owner', o: 'onboard' }),
      cleanerTabs: [{ icon: '🏠', label: 'Today' }, { icon: '✅', label: 'Active' }, { icon: '💬', label: 'Inbox' }, { icon: '👤', label: 'My Week' }],
      ownerTabs: [{ icon: '🏡', label: 'Homes' }, { icon: '📋', label: 'Reports' }, { icon: '🧴', label: 'Supplies' }, { icon: '💬', label: 'Messages' }],
      cTab: s.cTab, oTab: s.oTab,
      pickCTab: (i: number) => set({ cTab: i, c: ['today', 'job', 'inbox', 'profile'][i], hist: [], menuOpen: false }),
      pickOTab: (i: number) => set({ oTab: i, o: ['home', 'report', 'supplies', 'messages'][i], hist: [], menuOpen: false }),
      toastOn: s.toastOn, toastMsg: s.toast,
      sheetOpen: s.sheetOpen,
      openCart: () => set({ sheetOpen: true }),
      closeCart: () => set({ sheetOpen: false }),
      sendInstacart: () => { set({ sheetOpen: false, counts: {} }); say('Sent to Instacart 🛒') },
      toastSent: () => say('Card texted 💌'),
      toastCopied: () => say('Link copied 🔗'),
      toastLinens: () => { go({ c: 'supplies', cTab: 2 }); say('Linens order sent to supplier 🛏') },
      badgeNoAccount: chip('b1', 'onBrand', 'No account needed to browse'),
      badgePortfolio: chip('bp', 'onBrand', 'No account needed to browse'),
      portfolioCount: WORK_SHOTS.length + PORTFOLIO_SHOTS.length,
      badgeSafe: chip('b2', 'onBrand', '🔒 Accounts keep both sides safe'),
      badgeStops: chip('b3', 'onBrand', 'Today’s route · 3 stops'),
      badgeTurnover: chip('b4', 'onBrand', 'Turnover clean'),
      badgeStorefront: chip('b5', 'onBrand', 'Your storefront, in their pocket'),
      badgePrivate: chip('b6', 'onBrand', '🔒 Private'),
      badgeEco: chip('b7', 'onBrand', '🌱 Eco-certified housekeeping'),
      badge2min: chip('b8', 'onBrand', 'Add a property · 2 min'),
      badgeVerified: <VerifiedBadge tone="onBrand">✓ Verified clean</VerifiedBadge>,
      badgeReady: <VerifiedBadge tone="verified">✓ Guest-ready</VerifiedBadge>,
      badgeCleaning: <VerifiedBadge tone="pending">⏳ Cleaning now</VerifiedBadge>,
      chipReady: chip('c1', 'refresh', '✓ Ready'),
      chipDone: chip('c2', 'refresh', 'Done'),
      chipToday: chip('c3', 'turn', 'Today'),
      chipDelivered: chip('c4', 'refresh', 'Delivered'),
      chipOneOpen: chip('c5', 'turn', '1 open'),
      chipTwoBr: chip('c6', 'ghost', '2 BR · Airbnb'),
      chipSecure: chip('c7', 'ghost', '🔒 Secure'),
      chipPlant: chip('c8', 'refresh', 'PLANT-BASED'),
      chipEpa: chip('c9', 'refresh', 'EPA-REGISTERED'),
      chipDis: chip('c10', 'refresh', 'DISINFECTANT'),
      time1100: <b style={{ fontSize: '13px' }}>11:00</b>,
      time1230: <b style={{ fontSize: '13px' }}>12:30</b>,
      time200: <b style={{ fontSize: '13px' }}>2:00</b>,
      stopTile: { background: 'var(--gradient-brand)', color: '#fff', fontWeight: 600, fontSize: '15px' },
      akTile: { background: 'var(--gradient-brand)', color: '#fff', fontWeight: 600, fontSize: '13px' },
      smTile: { background: 'var(--gradient-ink)', color: '#fff', fontWeight: 600, fontSize: '13px' },
      metasHartwell: [mt('m1', '🛏', '5 beds'), mt('m2', '🛁', '4.5 baths'), mt('m3', '⏱', 'Window 11–4')],
      metasLoft: [mt('m4', '🛏', '2 beds'), mt('m5', '🛁', '2 baths'), mt('m6', '🏠', 'Airbnb')],
      metasRidge: [mt('m7', '📅', 'Weekly upkeep'), mt('m8', '⏱', 'Anytime 2–6'), mt('m9', '🐾', 'Pet on site')],
      metasReady: [mt('m10', '✓', 'Cleaned today, 12:31 PM'), mt('m11', '📷', '9 proof photos')],
      metasReadyPlus: [mt('m10', '✓', 'Cleaned today, 12:31 PM'), mt('m11', '📷', '9 proof photos'), mt('m20', '📅', 'Next: Mon 11 AM – 1 PM')],
      metasCleaning: [mt('m12', '⏱', 'Guest checks in 3:00 PM'), mt('m13', '👤', 'Ahleyia · on site')],
      metasNext: [mt('m18', '📅', 'Mon, Jul 27'), mt('m19', '⏱', 'Window 11 AM – 1 PM')],
      metasFound: [mt('m14', '🛏', '2 beds'), mt('m15', '🛁', '2 baths'), mt('m16', '🏠', 'Airbnb'), mt('m17', '🖼️', '18 listing photos')],
      proofShots: [{ label: 'Primary suite' }, { label: 'Kitchen' }, { label: 'Living' }, { label: 'Foyer' }],
      reportShots: [{ label: 'Primary suite · 11:58' }, { label: 'Kitchen island · 12:20' }, { label: 'Guest bath · 12:10' }],
      timelineItems: [
        { title: 'Arrived · card charged · 50% released to Ahleyia', sub: '11:06 AM · GPS geofence confirmed · ‘before’ photos taken' },
        { title: 'Laundry started · cleaned in Kee Method order', sub: '11:20 AM · bathrooms → bedrooms → kitchen → floors' },
        { title: 'Beds staged · restaged to listing photos', sub: '12:22 PM · 2 photos' },
        { title: '‘After’ photos · completed & report sent', sub: '12:31 PM · thermostat set to 70° · unit secured', tone: 'orange' },
      ],
      tiers: [
        { name: 'Studio – 1 Bedroom', sub: 'Full Kee Method™ turnover', chip: chip('t1', 'deep', '$95–125') },
        { name: '2 Bedroom', sub: 'Full Kee Method™ turnover', chip: chip('t2', 'deep', '$125–160') },
        { name: '3 Bedroom', sub: 'Full Kee Method™ turnover', chip: chip('t3', 'deep', '$160–185') },
        { name: '4+ Bedroom', sub: 'Full Kee Method™ turnover', chip: chip('t4', 'deep', 'from $185'), last: true },
      ],
    }

    v.scopeOpts = ['Whole home', 'Main level', 'Bathrooms only', 'Kitchen & living', 'Bonus / guest areas', 'A loved one’s home'].map((label) => ({
      label, on: !!s.scopes[label],
      pick: () => setState((st: Any) => ({ ...st, scopes: { ...st.scopes, [label]: !st.scopes[label] } })),
    }))
    v.sqftOpts = ['< 1,500 sq ft', '1,500–2,500', '2,500–4,000', '4,000+'].map((label) => ({ label, on: s.sqft === label, pick: () => set({ sqft: label }) }))
    v.cadenceOpts = ['One-time', 'Weekly', 'Biweekly', 'Monthly'].map((label) => ({ label, on: s.cadence === label, pick: () => set({ cadence: label }) }))
    v.scentOpts = ['Eucalyptus-mint', 'Fresh linen', 'Citrus', 'Lavender', 'Unscented'].map((label) => ({ label, on: s.scent === label, pick: () => set({ scent: label }) }))
    v.stagingOpts = ['Light', 'Standard', 'Heavy'].map((label) => ({ label, on: s.staging === label, pick: () => set({ staging: label }) }))
    // Airbnb 2BR staging price from the tested pricing engine (125 / 142 / 160).
    v.stagePrice = '$' + airbnbQuote(2, s.staging.toLowerCase() as Staging).clientNumber
    v.hourOpts = [2, 3, 4, 5, 6].map((h) => ({ label: h + ' hrs', on: s.hours === h, pick: () => set({ hours: h }) }))
    v.tipOpts = ['$15', '$25', '$40', 'Custom', 'No tip'].map((label) => ({ label, on: s.tip === label, pick: () => set({ tip: label }) }))

    // Kee Method steps
    let doneTotal = 0
    for (let i = 1; i <= 26; i++) {
      const key = 't' + i
      v[key] = !!s.checked[key]
      if (v[key]) doneTotal++
      v['ck' + i] = () => setState((st: Any) => ({ ...st, checked: { ...st.checked, [key]: !st.checked[key] } }))
    }
    ;[6, 15, 21, 24].forEach((i) => {
      const key = 't' + i
      v['p' + i] = !!s.photos[key]
      const label = ({ 6: 'Before photos · foyer', 15: 'Primary suite · beds made', 21: 'Restaged to listing photos', 24: 'After photos · final walk' } as Any)[i]
      v['ap' + i] = () => {
        if (s.photos[key]) { setState((st: Any) => ({ ...st, photos: { ...st.photos, [key]: false } })); return }
        set({ cam: { id: key, kind: 'turn', title: label } })
      }
    })
    v.done = doneTotal
    v.pct = Math.round(doneTotal / 26 * 100)
    PHASES.forEach((r, i) => { v['d' + (i + 1)] = doneCount(r[0], r[1]) })
    for (let i = 1; i <= 5; i++) v['open' + i] = s.allOpen || s.openPhase === i
    for (let i = 1; i <= 5; i++) v['tog' + i] = () => setState((st: Any) => ({ ...st, allOpen: false, openPhase: st.openPhase === i && !st.allOpen ? 0 : i }))
    v.expandLabel = s.allOpen ? 'Collapse all' : 'Expand all'
    v.toggleAll = () => setState((st: Any) => ({ ...st, allOpen: !st.allOpen }))
    v.jobPct = s.jobDone ? 100 : Math.max(35, v.pct)
    v.jobLabel = s.jobDone ? 'Complete · report sent' : 'In progress · Primary suite done'
    v.completeJob = () => {
      if (doneTotal < 26) { say((26 - doneTotal) + ' steps still open — finish those first'); return }
      set({ jobDone: true, c: 'today', cTab: 0 }); say('Owner report sent with your photos 📸')
    }

    // Quote Builder — rate + comfort round-up come from the tested pricing engine
    // (src/lib/pricing). The assistant split stays admin-configurable (30/40/50).
    const rq = residentialQuote(s.hours, { deep: s.svc === 'deep' })
    const rate = rq.rate
    const base = rq.base
    const final = rq.final
    const asstPay = s.asst ? Math.max(50, Math.round(final * s.split / 100)) : 0
    v.svcStd = s.svc === 'std'; v.svcDeep = s.svc === 'deep'
    v.pickStd = () => set({ svc: 'std' }); v.pickDeep = () => set({ svc: 'deep' })
    v.solo = !s.asst; v.withAsst = s.asst
    v.pickSolo = () => set({ asst: false }); v.pickAsst = () => set({ asst: true })
    v.qbRows = [{ label: 'Base · ' + s.hours + 'h × $' + rate, value: '$' + base }]
    v.qbFinal = '$' + final
    v.qbAsst = '$' + asstPay
    v.qbKeep = '$' + (final - asstPay)
    v.asstPillLabel = '+ Assistant (' + s.split + '%)'
    v.asstSplitLabel = 'Assistant (' + s.split + '%, $50 min)'
    v.keepSplitLabel = 'You keep (' + (100 - s.split) + '%)'

    // Owner products
    v.eco = s.eco; v.notEco = !s.eco
    v.pickEco = () => set({ eco: true }); v.pickStdProd = () => set({ eco: false })
    v.savePrefs = () => { go({ o: 'home', oTab: 0 }); say('Preferences saved 🌿') }
    v.listingUrl = s.listingUrl
    v.setListing = (e: any) => set({ listingUrl: e.target.value })
    v.detect = () => {
      const u = s.listingUrl.trim().toLowerCase()
      const known = ['airbnb', 'zillow', 'trulia', 'redfin', 'vrbo'].some((h) => u.indexOf(h) >= 0)
      if (!known) { set({ detectFailed: true, detected: false }); say('Couldn’t read that link — fill it in by hand'); return }
      set({ detected: true, detectFailed: false }); say('Listing detected ✓')
    }
    v.detected = s.detected
    v.consent = s.consent
    v.setConsent = (n: boolean) => set({ consent: n })
    v.addProperty = () => {
      if (!s.consent) { say('Please authorize the payment terms first'); return }
      go({ o: 'home', oTab: 0 }); say('Property added · card saved 💳')
    }
    v.approved = s.approved
    v.approveLabel = s.approved ? '✓ Approved · final 50% released' : 'Approve service & release payment'
    v.finalHalfLabel = s.approved ? '✓ Final 50% released' : 'Final 50% — release on approval'
    v.approve = () => {
      if (s.approved) return
      set({ approved: true })
      say(s.tip && s.tip !== 'No tip' ? 'Approved — final 50% released + tip 💕' : 'Approved — final 50% released 💕')
    }
    v.maintTitle = s.maintStatus === 'self' ? 'Vanity light — you’re handling it' : (s.maintStatus === 'pro' ? 'Vanity light — handyman requested' : 'Vanity light not working')
    v.handleSelf = () => { set({ maintStatus: 'self' }); say('Noted — Ahleyia won’t re-flag it ✓') }
    v.sendHandyman = () => { set({ maintStatus: 'pro' }); say('Handyman requested 🔧') }

    // Supplies
    let cart = 0
    const units = UNITS.map((u) => {
      const items = u.items.map((it: Any, i: number) => {
        cart += qty(it.id, it.def)
        return {
          id: it.id, icon: it.icon, name: it.name, sub: it.sub, level: it.level, def: it.def,
          flag: it.low ? chip('f' + it.id, 'low', 'LOW') : null, last: i === u.items.length - 1,
        }
      })
      return { id: u.id, name: u.name, sub: u.sub, note: u.note, maintLine: u.maint, lowChip: chip('l' + u.id, 'low', u.low + ' low'), items }
    })
    v.amenities = AMEN.map((it, i) => { cart += qty(it.id, it.def); return { id: it.id, icon: it.icon, name: it.name, def: it.def, last: i === AMEN.length - 1 } })
    v.unitFilters = ['All units', '1604', '1403', '1913'].map((label) => ({ label, on: s.unitFilter === label, pick: () => set({ unitFilter: label }) }))
    v.shownUnits = s.unitFilter === 'All units' ? units : units.filter((u) => u.id === s.unitFilter)
    v.cartCount = cart
    v.qty = qty; v.setQty = setQty

    // accounts, inbox, threads, compose
    v.cInbox = s.role === 'cleaner' && s.c === 'inbox'
    v.cSettings = s.role === 'cleaner' && s.c === 'settings'
    v.oAccount = s.role === 'owner' && s.o === 'account'
    v.vThread = (s.role === 'cleaner' && s.c === 'thread') || (s.role === 'owner' && s.o === 'thread')
    v.vCompose = (s.role === 'cleaner' && s.c === 'compose') || (s.role === 'owner' && s.o === 'compose')
    v.goInbox = () => go({ c: 'inbox', cTab: 2 })
    v.goSupplies = () => go({ c: 'supplies' })
    v.goSettings = () => go({ c: 'settings' })
    v.goAccount = () => go({ o: 'account' })
    v.badgeThreeNew = chip('n1', 'onBrand', '3 new')
    v.badgeStaff = chip('n2', 'onBrand', 'Staff account')
    v.badgeClient = chip('n3', 'onBrand', 'Client account')
    v.badgeNewMessage = chip('n4', 'onBrand', '💬 Straight to her phone')
    v.badgePrivateGhost = chip('n5', 'ghost', '🔒 Private')
    v.chipOn = chip('n6', 'refresh', 'On')
    v.jhTile = { background: 'linear-gradient(135deg,#2F6BD6,#33B27A)', color: '#fff', fontWeight: 600, fontSize: '13px' }
    const goThread = (who: string) => set(s.role === 'cleaner' ? { threadWith: who, c: 'thread', draft: '' } : { threadWith: who, o: 'thread', draft: '' })
    v.openAhleyia = () => goThread('ahleyia')
    v.openBusiness = () => goThread('business')
    v.openHartwell = () => goThread('hartwell')
    v.openLead = () => goThread('lead')
    const whoP = PEOPLE[s.threadWith] || PEOPLE.ahleyia
    v.threadTitle = whoP.title === 'CLIENT_NAME' ? v.clientAddress : whoP.title
    v.threadSub = whoP.sub
    v.threadBadge = chip('n7', 'onBrand', whoP.badge)
    v.threadMsgs = (s.threads[s.threadWith] || []).map((m: Any) => ({ text: m.text, time: m.time, photo: !!m.photo, stamp: m.stamp, mine: !!m.mine, theirs: !m.mine }))
    v.backFromThread = () => set(s.role === 'cleaner' ? { c: 'inbox' } : { o: 'messages', oTab: 3 })
    v.backFromCompose = () => set(s.role === 'cleaner' ? { c: 'inbox' } : { o: 'messages', oTab: 3 })
    v.goCompose = () => set(s.role === 'cleaner' ? { c: 'compose', draft: '' } : { o: 'compose', draft: '' })
    v.draft = s.draft
    v.setDraft = (e: any) => set({ draft: e.target.value })
    const push = (target: string, text: string) => {
      const now = new Date()
      let h = now.getHours(); const suffix = h >= 12 ? 'p' : 'a'
      h = h % 12 || 12
      const stamp = h + ':' + String(now.getMinutes()).padStart(2, '0') + suffix
      setState((st: Any) => ({ ...st, threads: { ...st.threads, [target]: (st.threads[target] || []).concat([{ mine: true, text, time: stamp }]) }, draft: '' }))
    }
    v.sendDraft = () => { const txt = s.draft.trim(); if (!txt) { say('Write a message first ✏️'); return } push(s.threadWith, txt); say('Message sent 💬') }
    v.quickReplies = (s.role === 'cleaner'
      ? ['On my way 🚗', 'Photos sent 📸', 'All set — unit secured']
      : ['Thank you! 💕', 'Please add extra towels', 'See you next turnover']
    ).map((label) => ({ label, send: () => { push(s.threadWith, label); say('Message sent 💬') } }))
    v.toastAttach = () => say('Photo attached 📸')
    v.toastAttachReport = () => say('Service report attached 📋')
    const recips = s.role === 'cleaner'
      ? [{ id: 'hartwell', label: v.clientAddress }, { id: 'lead', label: 'New lead' }, { id: 'business', label: 'The business' }]
      : [{ id: 'ahleyia', label: 'Ahleyia Kee' }, { id: 'business', label: 'She’s Maid In ATL' }]
    const toId = s.composeTo || recips[0].id
    v.recipients = recips.map((r) => ({ label: r.label, on: toId === r.id, pick: () => set({ composeTo: r.id }) }))
    const tps = s.role === 'cleaner' ? ['Today’s clean', 'A tailored quote', 'Supplies', 'Maintenance'] : ['This week’s clean', 'Supplies', 'Maintenance', 'Scent & products']
    const topic = s.composeTopic || tps[0]
    v.topics = tps.map((label) => ({ label, on: topic === label, pick: () => set({ composeTopic: label }) }))
    v.composeHint = s.role === 'cleaner' ? 'Your home is guest-ready — photos are in your report…' : 'Could you keep the guest room made up this week…'
    v.starters = (s.role === 'cleaner'
      ? ['Your home is guest-ready 🌟', 'Sending your tailored quote today', 'Two items are running low']
      : ['Could you restock the coffee?', 'Please use the lavender finish', 'Thank you — everything looked perfect']
    ).map((label) => ({ label, pick: () => set({ draft: label }) }))
    v.sendCompose = () => {
      const txt = s.draft.trim(); if (!txt) { say('Add a message before sending ✏️'); return }
      push(toId, txt); set(s.role === 'cleaner' ? { threadWith: toId, c: 'thread' } : { threadWith: toId, o: 'thread' }); say('Message sent 💬')
    }
    v.ownerNotifs = [
      { key: 'reports', label: 'Photo-verified report when a clean is submitted' },
      { key: 'cleaning', label: '“Cleaning now” and “guest-ready” status changes' },
      { key: 'supplies', label: 'Supply approvals & delivery confirmations' },
      { key: 'summary', label: 'Monthly service summary by email' },
    ].map((n) => ({ label: n.label, on: !!s.onotif[n.key], toggle: () => setState((st: Any) => ({ ...st, onotif: { ...st.onotif, [n.key]: !st.onotif[n.key] } })) }))
    v.cleanerNotifs = [
      { key: 'bookings', label: 'New booking requests & leads from my card' },
      { key: 'approvals', label: 'Owner approvals & released payments' },
      { key: 'supplies', label: 'Supply approvals from owners' },
    ].map((n) => ({ label: n.label, on: !!s.cnotif[n.key], toggle: () => setState((st: Any) => ({ ...st, cnotif: { ...st.cnotif, [n.key]: !st.cnotif[n.key] } })) }))
    v.toastInvite = () => say('Invite link copied 💌')
    v.signOut = () => {
      const admin = ['admin', 'team', 'clients', 'bizsettings', 'area', 'assign', 'calendar'].indexOf(s.c) >= 0
      go({ role: 'visitor', p: admin ? 'adminlogin' : 'welcome', hist: [] }); say('Signed out 👋')
    }

    // 24 · arrival check-in
    v.cCheckin = s.role === 'cleaner' && s.c === 'checkin'
    v.goCheckin = () => go({ c: 'checkin', checkin: 'ready' })
    v.ciReady = s.checkin === 'ready'
    v.ciDone = s.checkin === 'done'
    v.ciDeclined = s.checkin === 'declined'
    v.checkinBadge = chip('k1', 'onBrand', s.checkin === 'declined' ? '⏳ Payment held' : (s.checkin === 'done' ? '✓ Checked in · 11:06 AM' : 'You’re within the geofence ✓'))
    v.ciRows = [{ label: 'Owner charged, in full', value: '$220.00' }, { label: 'Your 50%, released now', value: '$110.00' }]
    v.doCheckin = () => { set({ checkin: 'done' }); say('$110 released to you 💰') }
    v.declineDemo = () => { set({ checkin: 'declined' }); say('Card declined — nothing was charged') }
    v.retryCharge = () => { set({ checkin: 'done' }); say('Cleared — $110 released to you 💰') }
    v.chipSent = chip('k2', 'refresh', 'Sent')
    v.chipHeld = chip('k3', 'turn', 'Held')

    // 25 · owner quote received
    v.oQuote = s.role === 'owner' && s.o === 'quote'
    v.goQuoteReceived = () => go({ o: 'quote' })
    v.qNew = s.quote === 'new'
    v.qAccepted = s.quote === 'accepted'
    v.badgeFromAhleyia = chip('q1', 'onBrand', '💌 From Ahleyia')
    const Q_SCOPES = [
      { label: 'Main level', add: 120 }, { label: 'Primary suite', add: 55 }, { label: 'Kitchen & living', add: 45 },
      { label: 'All bathrooms', add: 40 }, { label: 'Bonus / guest areas', add: 35 },
    ]
    let qSum = 0, qPicked = 0
    v.quoteScopes = Q_SCOPES.map((x) => {
      const on = !!s.quoteScopeMap[x.label]
      if (on) { qSum += x.add; qPicked++ }
      return { label: x.label, on, pick: () => setState((t: Any) => ({ ...t, quoteScopeMap: { ...t.quoteScopeMap, [x.label]: !t.quoteScopeMap[x.label] } })) }
    })
    const qMult = ({ Weekly: 1, Biweekly: 1.15, Monthly: 1.3, 'One-time': 1.45 } as Any)[s.quoteCadenceVal] || 1
    const qTotal = qPicked ? Math.round(qSum * qMult / 5) * 5 : 0
    v.quoteCadence = ['Weekly', 'Biweekly', 'Monthly', 'One-time'].map((label) => ({ label, on: s.quoteCadenceVal === label, pick: () => set({ quoteCadenceVal: label }) }))
    v.quoteScopeAction = qPicked ? qPicked + ' chosen' : 'Choose yours'
    v.quotePrice = qPicked ? '$' + qTotal : 'Pick your spaces'
    v.quotePriceSub = qPicked ? '$' + qTotal + ' per clean · ' + s.quoteCadenceVal.toLowerCase() : 'Choose your spaces to see it'
    v.chipIncl = chip('q2', 'refresh', 'Included')
    v.chipNew = chip('q3', 'turn', 'New')
    v.acceptQuote = () => {
      if (!qPicked) { say('Choose the spaces you want cared for'); return }
      if (!s.consent) { say('Please authorize the payment terms first'); return }
      set({ quote: 'accepted' }); say('Booked — welcome aboard 🎉')
    }
    v.declineQuote = () => { go({ o: 'home', oTab: 0 }); say('No problem — the quote stays in your messages') }

    // 26 · flag an issue
    v.cFlag = s.role === 'cleaner' && s.c === 'flag'
    v.goFlag = () => go({ c: 'flag' })
    v.badgeUnit = chip('g1', 'onBrand', 'The Hartwell Estate')
    v.flagCats = ['Damage', 'Low supply', 'Maintenance', 'Guest left something'].map((label) => ({ label, on: s.flagCat === label, pick: () => set({ flagCat: label }) }))
    v.flagNote = s.flagNote
    v.setFlagNote = (e: any) => set({ flagNote: e.target.value })
    v.flagPhoto = s.flagPhoto
    v.noFlagPhoto = !s.flagPhoto
    v.flagPhotoLabel = s.flagPhoto ? 'Photo attached — the owner sees exactly what you see.' : 'Tap to attach a photo. It’s the fastest way to explain.'
    v.attachFlagPhoto = () => { set({ flagPhoto: !s.flagPhoto }); if (!s.flagPhoto) say('Photo attached 📸') }
    v.sendFlag = () => { go({ c: 'job', maintStatus: null, flagNote: '', flagPhoto: false }); say('Owner notified — logged to the unit ⚠️') }

    // 27 · owner dispute
    v.oDispute = s.role === 'owner' && s.o === 'dispute'
    v.goDispute = () => go({ o: 'dispute', dispute: 'form' })
    v.dOpenForm = s.dispute === 'form'
    v.dSent = s.dispute === 'sent'
    v.badgeWeFix = chip('d0', 'onBrand', 'We make it right')
    v.dispCats = ['Missed area', 'Staging off', 'Damage', 'Other'].map((label) => ({ label, on: s.dispCat === label, pick: () => set({ dispCat: label }) }))
    v.dispNote = s.dispNote
    v.setDispNote = (e: any) => set({ dispNote: e.target.value })
    v.dispPhoto = s.dispPhoto
    v.noDispPhoto = !s.dispPhoto
    v.dispPhotoLabel = s.dispPhoto ? 'Photo attached — she’ll see it the moment you send.' : 'A photo helps her fix the right thing, first try.'
    v.attachDispPhoto = () => { set({ dispPhoto: !s.dispPhoto }); if (!s.dispPhoto) say('Photo attached 📸') }
    v.sendDispute = () => { set({ dispute: 'sent', disputeOpen: true }); say('Sent — Ahleyia has it now 💬') }
    v.resolveDispute = () => { go({ disputeOpen: false, dispute: 'form', o: 'report', oTab: 1, approved: true }); say('Settled — final 50% released 💕') }
    v.disputeOpen = s.disputeOpen
    v.chipPaused = chip('d1', 'turn', 'Paused')
    v.autoReleaseLine = s.disputeOpen ? '⏳ Auto-release paused while your note is open' : '⏳ Auto-releases in 47h if no response'

    // owner edit supply list
    v.oEditList = s.role === 'owner' && s.o === 'editlist'
    v.goEditList = () => go({ o: 'editlist' })
    v.goOwnerSupplies = () => go({ o: 'supplies', oTab: 2 })
    v.goMessages = () => go({ o: 'messages', oTab: 3 })
    v.badgeAdjust = chip('e1', 'onBrand', 'Adjust before approving')
    v.ownerCart = [
      { id: 'a1', icon: '🧻', name: 'Paper towels (Bounty, 6pk)', sub: 'Units 1604 · 1403 · 1913', def: 2 },
      { id: 'a2', icon: '🧺', name: 'Laundry detergent (Tide)', sub: 'Units 1604 · 1403', def: 1 },
      { id: 'a3', icon: '🍷', name: 'Wine — welcome bottles', sub: 'Units 1604 · 1403', def: 1 },
      { id: 'c2', icon: '🧴', name: 'Bath tissue (12pk)', sub: 'Unit 1913', def: 2 },
      { id: 'c3', icon: '🗑️', name: 'Trash bags', sub: 'Unit 1913', def: 1 },
    ].map((it, i, arr) => ({ id: it.id, icon: it.icon, name: it.name, sub: it.sub, def: it.def, last: i === arr.length - 1 }))

    // tip custom
    v.tipCustom = s.tip === 'Custom'
    v.tipAmount = s.tipAmount
    v.setTipAmount = (e: any) => set({ tipAmount: e.target.value.replace(/[^0-9]/g, '') })

    // offline
    v.offline = s.offline
    v.offlineLabel = s.offline ? '📴 Offline — tap to reconnect' : '📶 Work offline'
    v.toggleOffline = () => { set({ offline: !s.offline }); say(s.offline ? 'Back online — 4 photos synced ✓' : 'Offline — your checklist keeps working') }

    // empty states
    v.hasJobs = !s.emptyJobs; v.noJobs = s.emptyJobs
    v.hasHomes = !s.emptyHomes; v.noHomes = s.emptyHomes
    v.hasMsgs = !s.emptyMsgs; v.noMsgs = s.emptyMsgs

    // listing-detect failure
    v.detectFailed = s.detectFailed
    v.manualName = s.manualName
    v.setManualName = (e: any) => set({ manualName: e.target.value })
    v.metasPartial = [mt('mp1', '🏠', 'Airbnb'), mt('mp2', '📍', 'Midtown, Atlanta'), mt('mp3', '❓', 'Beds & baths unknown')]
    v.bedOpts = ['1', '2', '3', '4+'].map((label) => ({ label: label + ' bed', on: s.beds === label, pick: () => set({ beds: label }) }))
    v.bathOpts = ['1', '1.5', '2', '2.5+'].map((label) => ({ label: label + ' bath', on: s.baths === label, pick: () => set({ baths: label }) }))
    v.uploadRefs = () => say('4 reference photos uploaded 📷')
    v.manualDone = () => { set({ detectFailed: false, detected: true }); say('Saved — that’s the hard part done ✓') }

    // 28 · luxury home job
    v.cLux = s.role === 'cleaner' && s.c === 'lux'
    v.goLux = () => go({ c: 'lux' })
    v.badgeRefresh = chip('x1', 'onBrand', 'Refresh clean · residential')
    v.n31 = 31; v.n52 = 52
    let luxDone = 0
    v.luxPhases = LUX.map((ph, i) => {
      let d = 0
      const steps = ph.steps.map((st: Any) => {
        const on = !!s.luxChecked[st.id]
        if (on) d++
        return {
          label: st.label, on, photo: !!st.photo, added: !!s.luxPhotos[st.id], wash: st.wash || 'var(--photo-1)', stamp: st.stamp || '',
          toggle: () => setState((t: Any) => ({ ...t, luxChecked: { ...t.luxChecked, [st.id]: !t.luxChecked[st.id] } })),
          add: () => set({ cam: { id: st.id, kind: 'lux', title: st.label } }),
        }
      })
      luxDone += d
      return { icon: ph.icon, title: ph.title, done: d, total: ph.total, steps, open: s.luxOpen === i + 1, toggle: () => setState((t: Any) => ({ ...t, luxOpen: t.luxOpen === i + 1 ? 0 : i + 1 })) }
    })
    v.luxDone = luxDone
    v.luxPct = Math.round(luxDone / 31 * 100)
    v.completeLux = () => { if (luxDone < 31) { say((31 - luxDone) + ' steps still open — finish those first'); return } go({ c: 'today', cTab: 0 }); say('Owner report sent with your photos 📸') }

    // 29 · assistant view
    v.cAssist = s.role === 'cleaner' && s.c === 'assist'
    v.goAssist = () => go({ c: 'assist' })
    v.badgeAssist = chip('y1', 'onBrand', 'Assistant view')
    let asstDone = 0
    v.asstPhases = ASST.map((ph, i) => {
      let d = 0
      const steps = ph.steps.map((st: Any) => { const on = !!s.asstChecked[st.id]; if (on) d++; return { label: st.label, on, toggle: () => setState((t: Any) => ({ ...t, asstChecked: { ...t.asstChecked, [st.id]: !t.asstChecked[st.id] } })) } })
      asstDone += d
      return { icon: ph.icon, title: ph.title, done: d, total: ph.total, steps, open: s.asstOpen === i + 1, toggle: () => setState((t: Any) => ({ ...t, asstOpen: t.asstOpen === i + 1 ? 0 : i + 1 })) }
    })
    v.asstDone = asstDone
    v.asstPct = Math.round(asstDone / 26 * 100)
    v.toastAsstDone = () => { if (asstDone < 12) { say((12 - asstDone) + ' steps still open on your part'); return } go({ c: 'today', cTab: 0 }); say('Ahleyia notified — nice work ✓') }

    // 30 · photo capture overlay
    v.camOpen = !!s.cam
    v.camTitle = s.cam ? s.cam.title : ''
    v.camHint = s.cam && s.cam.kind === 'lux' ? 'Line the frame up with the ghosted reference. The stamp is added for you.' : 'Line the frame up with the ghosted reference — that’s the consistency check.'
    v.closeCam = () => set({ cam: null })
    v.shoot = () => {
      const c = s.cam; if (!c) return
      if (c.kind === 'lux') setState((t: Any) => ({ ...t, luxPhotos: { ...t.luxPhotos, [c.id]: true }, cam: null }))
      else setState((t: Any) => ({ ...t, photos: { ...t.photos, [c.id]: true }, cam: null }))
      say(s.offline ? 'Saved — will sync when you’re back 📸' : 'Photo saved to owner report 📸')
    }

    // 31 · notifications · 32 · splash
    v.vNotifs = s.role === 'visitor' && s.p === 'notifs'
    v.vSplash = s.role === 'visitor' && s.p === 'splash'
    v.pushCards = [
      { icon: '🚗', when: 'now', title: 'Ahleyia is on her way', body: 'She’ll be at The Hartwell Estate around 11:00.' },
      { icon: '✨', when: '2m ago', title: 'Your home is guest-ready ✨', body: '9 proof photos and your report are inside.' },
      { icon: '🧮', when: '18m ago', title: 'Your quote is ready', body: 'Tailored to the spaces you chose. Tap to see it.' },
      { icon: '📋', when: '1h ago', title: 'Approve today’s clean', body: 'Her final half releases on its own in 36 hours.' },
      { icon: '🛒', when: '3h ago', title: 'Supplies approved & ordered', body: '13 items on the way to units 1604, 1403 and 1913.' },
      { icon: '💰', when: 'Wed', title: 'Payout landed: $110', body: 'Your 50% for the Hartwell arrival. Nice work.' },
    ]

    // 39 · verify code
    v.vVerify = s.role === 'visitor' && s.p === 'verify'
    v.goVerify = () => { go({ p: 'verify', code: '' }); say('Code sent to (404) 555-0134 📱') }
    v.badgeCodeSent = chip('v1', 'onBrand', '📱 Code sent')
    v.codeBoxes = [0, 1, 2, 3].map((i) => ({ char: s.code[i] || '', bg: s.code[i] ? 'var(--pink-blush)' : 'var(--surface-cream)', border: s.code.length === i ? 'var(--magenta)' : 'var(--border-default)' }))
    v.code = s.code
    v.codeRef = codeRef
    v.focusCode = () => { if (codeRef.current) codeRef.current.focus() }
    v.setCode = (e: any) => set({ code: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) })
    v.verifyLabel = s.code.length === 4 ? 'Verify & continue' : 'Enter your 4-digit code'
    v.verifyCode = () => { if (s.code.length < 4) { say('Four digits, then you’re in'); return } go({ role: 'owner', o: 'setup', oTab: 0 }); say('Verified — welcome in ✓') }
    v.resendCode = () => { set({ code: '' }); say('New code sent 📱') }

    // 44 · Kee Method template viewer
    v.cTemplate = s.role === 'cleaner' && s.c === 'template'
    v.goTplTurn = () => go({ c: 'template', tpl: 'turn' })
    v.goTplLux = () => go({ c: 'template', tpl: 'lux' })
    const isLux = s.tpl === 'lux'
    v.badgeLocked = chip('t0', 'onBrand', '🔒 Locked content')
    v.tplTitle = isLux ? 'Luxury Home template' : 'Turnover template'
    v.tplSub = isLux ? 'The Kee Method™ · Residential base' : 'The Kee Method™ · Vacation Rental Edition'
    v.tplSteps = isLux ? '31' : '26'
    v.tplPhotos = isLux ? '3' : '4'
    v.tplTabs = [{ id: 'turn', label: 'Turnover' }, { id: 'lux', label: 'Luxury home' }].map((t) => ({ label: t.label, on: s.tpl === t.id, pick: () => set({ tpl: t.id }) }))
    const tplSrc = isLux
      ? LUX.map((p) => ({ icon: p.icon, title: p.title, total: p.total, photos: p.steps.filter((x: Any) => x.photo).length }))
      : [
        { icon: '🔍', title: '1 · Pre-Clean Walkthrough', total: 6, photos: 1 },
        { icon: '🧺', title: '2 · Laundry Process', total: 5, photos: 0 },
        { icon: '✨', title: '3 · Cleaning Order', total: 7, photos: 1 },
        { icon: '🧴', title: '4 · Restocking & Inventory', total: 4, photos: 1 },
        { icon: '📋', title: '5 · Final Walkthrough & Host', total: 4, photos: 1 },
      ]
    v.tplPhases = tplSrc.map((p, i, arr) => ({
      icon: p.icon, title: p.title, last: i === arr.length - 1,
      sub: p.total + ' steps' + (p.photos ? ' · ' + p.photos + ' photo moment' + (p.photos > 1 ? 's' : '') : ''),
      count: chip('tp' + i, 'ghost', String(p.total)),
    }))
    v.tplOpenLabel = isLux ? 'Open the Ridgeview job' : 'Open the Hartwell job'
    v.tplOpenJob = () => set({ c: isLux ? 'lux' : 'job', cTab: isLux ? s.cTab : 1 })

    // 43 · payouts
    v.cPayouts = s.role === 'cleaner' && s.c === 'payouts'
    v.goPayouts = () => go({ c: 'payouts' })
    v.badgeInstant = chip('p0', 'onBrand', '⚡ Instant payouts on')
    v.chipBank = chip('p1', 'ghost', 'Bank ···· 8821')
    v.payouts = [
      { icon: '⏳', name: 'Hartwell Estate · final 50%', sub: 'Today · awaiting the owner’s approval', right: money('var(--orange-deep)', '$110.00') },
      { icon: '⚡', name: 'Hartwell Estate · arrival 50%', sub: 'Today, 11:06 AM · released on check-in', right: money('var(--green-deep)', '$110.00') },
      { icon: '✓', name: 'Skyline Loft 12B', sub: 'Wed · approved in 4 min', right: money('var(--green-deep)', '$142.00') },
      { icon: '💕', name: 'Tip · Mrs. Ridgeview', sub: 'Wed · 100% to you, charged separately', right: money('var(--green-deep)', '$40.00') },
      { icon: '✓', name: 'Ridgeview Owner’s Home', sub: 'Mon · auto-released at 48h', right: money('var(--green-deep)', '$190.00') },
      { icon: '✓', name: 'Unit 1913 turnover', sub: 'Mon · approved same day', right: money('var(--green-deep)', '$125.00'), last: true },
    ]

    // 62 · admin master sign-in
    v.vAdminLogin = s.role === 'visitor' && s.p === 'adminlogin'
    v.goAdminLogin = () => go({ p: 'adminlogin' })
    v.badgeMaster = chip('al0', 'onBrand', '👑 Master account')
    v.adminEmail = s.adminEmail
    v.setAdminEmail = (e: any) => set({ adminEmail: e.target.value })
    v.adminPw = s.adminPw
    v.setAdminPw = (e: any) => set({ adminPw: e.target.value })
    v.pwType = s.pwShown ? 'text' : 'password'
    v.pwToggleLabel = s.pwShown ? 'Hide' : 'Show'
    v.togglePw = () => set({ pwShown: !s.pwShown })
    v.adminRemember = s.adminRemember
    v.setAdminRemember = (n: boolean) => set({ adminRemember: n })
    v.adminMaskedPhone = '(•••) •••-3242'
    v.adminEmailShown = s.adminEmail.trim() || 'ahleyia@atlluxurycleaning.com'
    v.adminSignIn = () => {
      const em = s.adminEmail.trim().toLowerCase()
      if (em.indexOf('@') < 0) { say('Your business email, please'); return }
      if (em.indexOf('atlluxurycleaning.com') < 0) { say('That isn’t the business account — try staff or client sign in'); return }
      if (s.adminPw.length < 6) { say('Password is at least 6 characters'); return }
      go({ role: 'cleaner', c: 'admin' }); say('Welcome back, Ahleyia 👑')
    }
    v.adminForgot = () => say('Reset link sent to your business email 💌')
    v.goStaffSignIn = () => go({ p: 'gate' })

    // 59 · public sign-up
    v.vSignup = s.role === 'visitor' && s.p === 'signup'
    v.goSignup = () => go({ p: 'signup', suStep: 1, code: '' })
    const su = s.suStep
    for (let i = 1; i <= 4; i++) v['su' + i] = su === i
    v.suTitle = ['Create your account', 'Verify your number', 'A few details', 'You’re in'][su - 1]
    v.suSub = ['Two minutes, no password, nothing charged', 'So we know it’s really you', 'Where your reports go, and where she’s cleaning', 'Account created — welcome'][su - 1]
    v.suBadge = chip('su9', 'onBrand', su === 4 ? '✓ Account created' : 'Step ' + su + ' of 4')
    v.suPct = Math.round(su / 4 * 100)
    v.suPctLabel = Math.round(su / 4 * 100) + '%'
    v.suStepLabel = ['You', 'Verify', 'Details', 'Done'][su - 1]
    v.suName = s.suName
    v.setSuName = (e: any) => set({ suName: e.target.value })
    v.suPhone = s.suPhone
    v.setSuPhone = (e: any) => set({ suPhone: e.target.value })
    v.suEmail = s.suEmail
    v.setSuEmail = (e: any) => set({ suEmail: e.target.value })
    v.suAddress = s.suAddress
    v.setSuAddress = (e: any) => set({ suAddress: e.target.value })
    v.suTerms = s.suTerms
    v.setSuTerms = (n: boolean) => set({ suTerms: n })
    v.suPhoneShown = s.suPhone.trim() || '(404) 555-0134'
    v.suEmailShown = s.suEmail.trim() || 'Add an email in Settings'
    v.suAddressShown = s.suAddress.trim() || 'Address saved'
    v.suHoodShown = s.suHood
    v.suWelcome = 'Welcome, ' + (s.suName.trim().split(' ')[0] || 'friend')
    v.chipVerified = chip('su8', 'refresh', '✓ Verified')
    v.suKinds = ['Airbnb host', 'Residential client', 'A loved one’s home'].map((label) => ({ label, on: s.suKind === label, pick: () => set({ suKind: label }) }))
    v.suScopeLabel = s.suKind === 'Airbnb host' ? 'How big is the place?' : 'What should she care for?'
    const SU_SCOPES = s.suKind === 'Airbnb host' ? ['Studio – 1 bed', '2 bed', '3 bed', '4+ bed'] : ['Whole home', 'Main level', 'Kitchen & living', 'Bathrooms only', 'Primary suite']
    v.suScopes = SU_SCOPES.map((label) => ({ label, on: !!s.suScopeMap[label], pick: () => setState((t: Any) => ({ ...t, suScopeMap: { ...t.suScopeMap, [label]: !t.suScopeMap[label] } })) }))
    v.suCadence = (s.suKind === 'Airbnb host' ? ['Every turnover', 'Weekly', 'Biweekly', 'As needed'] : ['Weekly', 'Biweekly', 'Monthly', 'One-time']).map((label) => ({ label, on: s.suCadenceVal === label, pick: () => set({ suCadenceVal: label }) }))
    v.suKindNoteUnused = s.suKind === 'Airbnb host'
      ? 'Turnovers between guests, priced by bedroom count and matched to your check-in and check-out times. You’ll paste your listing link next.'
      : (s.suKind === 'Residential client'
        ? 'Your home, kept to your standard — weekly, biweekly or monthly. Ahleyia quotes it by the spaces you want cared for, as one flat number.'
        : 'Booking on someone else’s behalf. You handle the schedule and billing; we keep their preferences and access notes on the home.')
    v.suHoods = ['Buckhead', 'Midtown', 'Sandy Springs', 'Brookhaven', 'Somewhere else'].map((label) => ({ label, on: s.suHood === label, pick: () => set({ suHood: label }) }))
    v.suContact = ['Text me', 'Call me', 'In-app only'].map((label) => ({ label, on: s.suContactPref === label, pick: () => set({ suContactPref: label }) }))
    v.suSource = ['Her card / QR', 'A friend', 'Instagram', 'Google'].map((label) => ({ label, on: s.suSourcePref === label, pick: () => set({ suSourcePref: label }) }))
    v.suBtnVariant = su === 3 || su === 4 ? 'green' : 'primary'
    v.suNextLabel = ['Text me a code', 'Verify & continue', 'Create my account', 'Add my home'][su - 1]
    v.suBack = () => su > 1 ? go({ suStep: su - 1 }) : go({ p: 'welcome' })
    v.suNext = () => {
      if (su === 1) {
        if (!s.suName.trim()) { say('Your name first'); return }
        if (s.suPhone.replace(/\D/g, '').length < 10) { say('A full mobile number, please'); return }
        set({ suStep: 2, code: '' }); say('Code sent to ' + v.suPhoneShown + ' 📱'); return
      }
      if (su === 2) { if (s.code.length < 4) { say('Four digits, then you’re in'); return } set({ suStep: 3 }); say('Number verified ✓'); return }
      if (su === 3) {
        if (!s.suEmail.trim() || s.suEmail.indexOf('@') < 0) { say('An email for your reports'); return }
        if (!s.suAddress.trim()) { say('Where is she cleaning?'); return }
        if (!s.suTerms) { say('Please agree to the terms to continue'); return }
        set({ suStep: 4 }); say('Account created 🎉'); return
      }
      go({ role: 'owner', o: 'setup', oTab: 0, setup: { verify: true } })
    }

    // 57 · cleaner account builder
    v.vStaffSetup = s.role === 'visitor' && s.p === 'staffsetup'
    v.goStaffSetup = () => go({ p: 'staffsetup', staffStep: 1 })
    const stp = s.staffStep
    for (let i = 1; i <= 5; i++) v['st' + i] = stp === i
    v.staffNotDone = stp < 5
    const STAFF_TITLES = ['Join her team', 'Verify it’s you', 'Get paid', 'Certify in the method', 'You’re in']
    const STAFF_SUBS = ['Accept your invite and set up your account', 'ID and a background check — once, then never again', 'Where your money lands, and when', 'The Kee Method™ · five phases, four photo moments', 'Everything is connected']
    v.staffTitle = STAFF_TITLES[stp - 1]
    v.staffSub = STAFF_SUBS[stp - 1]
    v.staffBadge = chip('ss0', 'onBrand', stp === 5 ? '✓ Ready to work' : 'Step ' + stp + ' of 5')
    v.staffPct = Math.round(stp / 5 * 100)
    v.staffPctLabel = Math.round(stp / 5 * 100) + '%'
    v.staffStepLabel = ['Your invite', 'Identity', 'Payouts', 'Certification', 'Done'][stp - 1]
    v.staffNextLabel = ['Accept & continue', 'Continue', 'Save & continue', 'Finish setup'][stp - 1] || 'Continue'
    v.staffName = s.staffName
    v.setStaffName = (e: any) => set({ staffName: e.target.value })
    v.staffBack = () => stp > 1 ? go({ staffStep: stp - 1 }) : go({ p: 'welcome' })
    v.staffNext = () => {
      if (stp === 1 && !s.staffName.trim()) { say('Your name first — that’s all we need'); return }
      if (stp === 4 && !['method', 'photo', 'eco'].every((k) => s.standardsMap[k])) { say('Tick the three standards to certify'); return }
      set({ staffStep: stp + 1 })
      if (stp === 3) say('Payouts connected ⚡')
    }
    v.verifySteps = [
      { id: 'id', icon: '🪪', name: 'Photo ID', sub: 'Driver’s licence or state ID' },
      { id: 'selfie', icon: '🤳', name: 'Quick selfie', sub: 'Matched to your ID, once' },
      { id: 'ssn', icon: '🔒', name: 'Last 4 of your SSN', sub: 'For the background check only' },
      { id: 'check', icon: '📋', name: 'Background check', sub: 'Third party · 1–3 days · pass or fail only' },
    ].map((x, i, arr) => ({
      icon: x.icon, name: x.name, sub: x.sub, last: i === arr.length - 1,
      right: s.verified[x.id] ? chip('vs' + x.id, 'refresh', '✓ Done') : chip('vs' + x.id, 'ghost', 'Add'),
      go: () => { setState((t: Any) => ({ ...t, verified: { ...t.verified, [x.id]: true } })); say('Saved ✓') },
    }))
    v.taxKinds = ['Individual / sole prop', 'I have an LLC'].map((label) => ({ label, on: s.taxKind === label, pick: () => set({ taxKind: label }) }))
    v.certSteps = [
      { id: 'phases', icon: '📖', name: 'Read the five phases', sub: 'Walkthrough · laundry · cleaning order · restock · final' },
      { id: 'photos', icon: '📷', name: 'The four photo moments', sub: 'Before · beds staged · restaged to listing · after' },
      { id: 'eco', icon: '🌱', name: 'Eco products & scent', sub: 'Simple Green, Benefect, microfiber + steam' },
      { id: 'shadow', icon: '👥', name: 'Clean one home with Ahleyia', sub: 'Scheduled for Tue, Jul 28 · 10 AM' },
      { id: 'standards', icon: '🔑', name: 'Per-home standards', sub: 'Each owner’s rules show at check-in' },
    ].map((x, i, arr) => ({
      icon: x.icon, name: x.name, sub: x.sub, last: i === arr.length - 1,
      right: s.cert[x.id] ? chip('cs' + x.id, 'refresh', '✓') : chip('cs' + x.id, 'ghost', 'Open'),
      go: () => { setState((t: Any) => ({ ...t, cert: { ...t.cert, [x.id]: true } })); say('Marked complete ✓') },
    }))
    v.standards = [
      { key: 'method', label: 'I’ll follow The Kee Method™ in order, on every home.' },
      { key: 'photo', label: 'I’ll take the photo-proof shots — they protect me as much as the owner.' },
      { key: 'eco', label: 'Eco products only. No bleach, no ammonia, ever.' },
    ].map((x) => ({ label: x.label, on: !!s.standardsMap[x.key], toggle: () => setState((t: Any) => ({ ...t, standardsMap: { ...t.standardsMap, [x.key]: !t.standardsMap[x.key] } })) }))
    const certCount = Object.keys(s.cert).filter((k) => s.cert[k]).length
    v.certStatusSub = certCount >= 5 ? 'Certified in The Kee Method™' : 'Shadow clean Tue, Jul 28 · then certified'
    v.certStatusChip = certCount >= 5 ? chip('cst', 'refresh', '✓ Certified') : chip('cst', 'turn', 'In progress')
    v.chipPendingCheck = chip('bgc', 'turn', 'Pending')
    v.standardsOk = ['method', 'photo', 'eco'].every((k) => s.standardsMap[k])
    v.staffDoneCopy = certCount >= 5 ? 'You’re certified and on the schedule. Your first route shows up the night before.' : 'One shadow clean with Ahleyia on Tuesday and you’re fully certified. Your route shows up the night before.'
    v.enterStaffApp = () => { go({ role: 'cleaner', c: 'today', cTab: 0 }); say('Welcome to the team 🎉') }

    // 58 · owner account builder
    v.oSetup = s.role === 'owner' && s.o === 'setup'
    v.goSetup = () => go({ o: 'setup' })
    v.goOwnerSetup = () => go({ role: 'owner', o: 'setup', oTab: 0 })
    v.previewStaffSetup = () => { go({ role: 'visitor', p: 'staffsetup', staffStep: 1 }); say('Certification invite sent 💌') }
    const tileDone = { background: 'var(--gradient-eco)', color: '#fff', fontWeight: 600, fontSize: '15px' }
    const tileTodo = { background: 'var(--surface-cream)', color: 'var(--ink-soft)', fontWeight: 600, fontSize: '15px' }
    const SETUP = [
      { id: 'verify', name: 'Verify your number', sub: 'One-tap code · no password to remember', go: () => go({ role: 'visitor', p: 'verify', code: '' }) },
      { id: 'property', name: 'Add your property', sub: 'Paste a listing link and we read the details', go: () => go({ o: 'onboard' }) },
      { id: 'requirements', name: 'Set your standard', sub: 'Products, scent and your house rules', go: () => go({ o: 'products' }) },
      { id: 'card', name: 'Save a credit card', sub: 'Charged once on arrival — never twice', go: () => go({ o: 'edit', editField: 'card', editValue: '' }) },
      { id: 'reference', name: 'Upload reference photos', sub: 'How each room should look after every clean', go: () => go({ o: 'gallery', gallery: 'reference', galleryFrom: 'setup' }) },
    ]
    const setupDone = SETUP.filter((x) => s.setup[x.id]).length
    v.setupSteps = SETUP.map((x, i, arr) => {
      const done = !!s.setup[x.id]
      return {
        icon: done ? '✓' : String(i + 1), tile: done ? tileDone : tileTodo, name: x.name, sub: x.sub, last: i === arr.length - 1,
        right: done ? chip('su' + x.id, 'refresh', 'Done') : '›',
        go: () => { setState((t: Any) => ({ ...t, setup: { ...t.setup, [x.id]: true } })); x.go() },
      }
    })
    v.setupTitle = setupDone >= SETUP.length ? 'You’re all set, ' + clientFirst : 'Finish your account, ' + clientFirst
    v.setupSub = setupDone >= SETUP.length ? 'Everything Ahleyia needs is in place' : 'About 5 minutes, and she can start'
    v.setupBadge = chip('su0', 'onBrand', setupDone + ' of ' + SETUP.length + ' done')
    v.setupPct = Math.round(setupDone / SETUP.length * 100)
    v.setupLeft = setupDone >= SETUP.length ? 'Complete' : (SETUP.length - setupDone) + ' left'
    v.setupRight = Math.round(setupDone / SETUP.length * 100) + '%'
    v.setupCountChip = setupDone >= SETUP.length ? chip('su1', 'refresh', 'Complete') : chip('su1', 'turn', (SETUP.length - setupDone) + ' left')
    v.setupComplete = setupDone >= SETUP.length
    v.setupIncomplete = setupDone < SETUP.length
    v.setupPrimaryLabel = setupDone >= SETUP.length ? 'See my homes' : 'Continue setup'
    v.setupPrimary = () => {
      if (setupDone >= SETUP.length) { go({ o: 'home', oTab: 0 }); return }
      const next = SETUP.filter((x) => !s.setup[x.id])[0]
      setState((t: Any) => ({ ...t, setup: { ...t.setup, [next.id]: true } })); next.go()
    }

    // 51–54 · owner booking management
    v.oSchedule = s.role === 'owner' && s.o === 'schedule'
    v.oReschedule = s.role === 'owner' && s.o === 'reschedule'
    v.oAddService = s.role === 'owner' && s.o === 'addservice'
    v.oCancel = s.role === 'owner' && s.o === 'cancel'
    v.goSchedule = () => go({ o: 'schedule' })
    v.badgeUpcoming = chip('sc0', 'onBrand', '3 booked')
    v.chipThisWeek = chip('sc1', 'ghost', 'Next 7 days')
    v.chipFree = chip('sc2', 'refresh', 'No fee')
    v.chipHalf = chip('sc3', 'turn', '50%')
    v.chipNoCharge = chip('sc4', 'refresh', 'No fee')
    v.chipConfirmed = chip('sc5', 'refresh', 'Confirmed')
    v.waiverChip = s.waiverUsed ? chip('sc6', 'ghost', 'Used') : chip('sc6', 'refresh', 'Available')
    v.waiverSub = s.waiverUsed ? 'Used this year — it comes back on your anniversary' : 'Drop a late-notice fee once a year, no questions asked'
    const BOOKINGS = [
      { id: 'b1', name: 'Skyline Loft 12B', service: 'Turnover · guest checks in 3:00 PM', when: 'Tomorrow', window: '10 AM – 12 PM', notice: 'late', price: 142, note: '⏱ Two-hour arrival window. Matched to your guest times — she’s out before check-in.', chipTone: 'turn', chipText: 'Tomorrow' },
      { id: 'b2', name: 'The Hartwell Estate', service: 'Weekly upkeep · main level & suites', when: 'Mon, Jul 27', window: '11 AM – 1 PM', notice: 'early', price: 220, note: '🔑 Your standard is saved: Egyptian cotton, towels in thirds, diffuser on, 70°.', chipTone: 'deep', chipText: 'Monday' },
      { id: 'b3', name: 'Ridgeview Owner’s Home', service: 'Refresh clean · scoped spaces', when: 'Tue, Jul 28', window: '2 PM – 4 PM', notice: 'early', price: 190, note: '🐾 Dog gate stays closed. Basement isn’t in your scope.', chipTone: 'deep', chipText: 'Tuesday' },
    ]
    const bk = BOOKINGS.filter((b) => b.id === s.booking)[0] || BOOKINGS[0]
    v.bookings = BOOKINGS.map((b) => ({
      name: b.name, service: b.service, note: b.note, chip: chip('bk' + b.id, b.chipTone, b.chipText),
      metas: [mt('bm1' + b.id, '📅', b.when), mt('bm2' + b.id, '⏱', b.window)],
      reschedule: () => go({ o: 'reschedule', booking: b.id, notice: b.notice, rs: 'form' }),
      addService: () => go({ o: 'addservice', booking: b.id, addKind: 'addon' }),
      cancel: () => go({ o: 'cancel', booking: b.id, notice: b.notice, cx: 'form', waiverApplied: false }),
    }))
    v.bookingLine = bk.name + ' · ' + bk.when + ' · ' + bk.window
    const lateNotice = s.notice === 'late'
    const staffSide = s.cancelReason === 'Ahleyia asked to move it'
    v.staffReason = staffSide
    v.noticeBadge = chip('nb0', 'onBrand', lateNotice ? 'Inside 24 hours' : 'More than 24 hours away')
    v.noticeChip = lateNotice ? chip('nb1', 'turn', 'Late notice') : chip('nb1', 'refresh', 'Free window')
    v.noticeTone = lateNotice ? 'warn' : 'eco'
    v.noticeIcon = lateNotice ? '⏳' : '✓'
    v.noticeCopy = lateNotice
      ? 'This clean is inside 24 hours. Moving it is free as long as she can fill the slot — pick a new time and she confirms in minutes. If she can’t, the 50% holding fee applies.'
      : 'You’re more than a day out, so this is free to move. Nothing is charged until she arrives.'
    const DAYS = [['Sat', '25'], ['Sun', '26'], ['Mon', '27'], ['Tue', '28'], ['Wed', '29'], ['Thu', '30'], ['Fri', '31'], ['Sat', '1']]
    v.dayOpts = DAYS.map((d) => { const on = s.newDay === d[1]; return { dow: d[0], day: d[1], bg: on ? 'var(--pink-blush)' : 'var(--surface-cream)', border: on ? 'var(--magenta)' : 'var(--border-default)', color: on ? 'var(--magenta-deep)' : 'var(--ink)', pick: () => set({ newDay: d[1] }) } })
    v.windowOpts = ['8 – 10 AM', '10 AM – 12 PM', '12 – 2 PM', '2 – 4 PM', '4 – 6 PM'].map((label) => ({ label, on: s.newWindow === label, pick: () => set({ newWindow: label }) }))
    v.scopeRs = ['Just this clean', 'This one and after'].map((label) => ({ label, on: s.rsScope === label, pick: () => set({ rsScope: label }) }))
    v.rsForm = s.rs === 'form'
    v.rsDone = s.rs === 'done'
    v.rsConfirmLabel = 'Move to Jul ' + s.newDay + ' · ' + s.newWindow
    v.rsNewWhen = 'July ' + s.newDay + ' · ' + s.newWindow
    v.goReschedule = () => go({ o: 'reschedule', rs: 'form' })
    v.confirmReschedule = () => { set({ rs: 'done' }); say('Moved — Ahleyia has been told 📅') }
    v.rsDoneCopy = (s.rsScope === 'This one and after' ? 'Your recurring cleans now run on this day and window. ' : 'Just this visit moved — your usual day is unchanged. ') + 'She’ll text when she’s on her way.'
    v.rsChargeLine = lateNotice ? 'No fee — she filled the slot' : 'No fee — more than 24 hours out'
    v.rsChargeChip = chip('rs1', 'refresh', '$0')

    // add services
    const ADDONS = [
      { id: 'fridge', icon: '🍎', name: 'Inside the fridge', sub: 'Emptied, wiped, deodorised', price: 35 },
      { id: 'oven', icon: '🔥', name: 'Inside the oven', sub: 'Racks and glass, eco degreaser', price: 45 },
      { id: 'windows', icon: '🪟', name: 'Interior windows', sub: 'Glass, sills and tracks', price: 60 },
      { id: 'laundry', icon: '🧺', name: 'Extra laundry load', sub: 'Washed, steamed and folded', price: 25 },
      { id: 'restock', icon: '🛒', name: 'Restock run', sub: 'She shops your list before arriving', price: 30 },
      { id: 'patio', icon: '🪴', name: 'Patio or balcony', sub: 'Swept, furniture wiped', price: 40 },
      { id: 'scent', icon: '🍃', name: 'Signature scent refresh', sub: 'Diffuser topped up, linen mist', price: 8 },
    ]
    v.addExtraClean = s.addKind === 'clean'
    v.goAddClean = () => go({ o: 'addservice', addKind: 'clean' })
    v.addTitle = s.addKind === 'clean' ? 'Book an extra clean' : 'Add a service'
    v.addSub = s.addKind === 'clean' ? 'A one-off, on top of your usual cadence' : bk.name + ' · ' + bk.when
    v.badgeAddOn = chip('ao0', 'onBrand', s.addKind === 'clean' ? 'One-off booking' : 'Flat add-on pricing')
    v.homeOpts = ['The Hartwell Estate', 'Skyline Loft 12B'].map((label) => ({ label, on: s.addHome === label, pick: () => set({ addHome: label }) }))
    v.extraKinds = ['Refresh clean', 'Deep clean', 'Turnover'].map((label) => ({ label, on: s.addExtraKind === label, pick: () => set({ addExtraKind: label }) }))
    let addSum = 0
    v.addOns = ADDONS.map((a, i, arr) => {
      const on = !!s.addons[a.id]
      if (on) addSum += a.price
      return { icon: a.icon, name: a.name, sub: a.sub, last: i === arr.length - 1, flag: on ? chip('af' + a.id, 'refresh', '✓ ADDED') : null, right: money(on ? 'var(--green-deep)' : 'var(--ink)', '+$' + a.price), toggle: () => setState((t: Any) => ({ ...t, addons: { ...t.addons, [a.id]: !t.addons[a.id] } })) }
    })
    const cleanBase = s.addExtraKind === 'Deep clean' ? 320 : (s.addExtraKind === 'Turnover' ? 142 : 220)
    const addBase = s.addKind === 'clean' ? cleanBase : bk.price
    v.addRows = s.addKind === 'clean'
      ? [{ label: s.addExtraKind + ' · ' + s.addHome, value: '$' + cleanBase }, { label: 'Services added', value: '+$' + addSum }]
      : [{ label: 'Your clean, as booked', value: '$' + bk.price }, { label: 'Services added', value: '+$' + addSum }]
    v.addTotal = '$' + (addBase + addSum)
    v.addTotalLabel = s.addScopeVal === 'Every visit' ? 'Per visit, from now on' : 'This visit'
    v.addScope = ['Just this visit', 'Every visit'].map((label) => ({ label, on: s.addScopeVal === label, pick: () => set({ addScopeVal: label }) }))
    v.addConfirmLabel = s.addKind === 'clean' ? 'Book it · ' + v.addTotal : 'Add to this clean · ' + v.addTotal
    v.confirmAddOns = () => {
      if (s.addKind !== 'clean' && addSum === 0) { say('Pick a service to add first'); return }
      go({ o: 'schedule' }); say(s.addKind === 'clean' ? 'Extra clean booked 📅' : 'Added — she’ll allow the extra time ✓')
    }

    // cancel
    v.cxForm = s.cx === 'form'
    v.cxDone = s.cx === 'done'
    v.cancelReasons = ['Guest cancelled', 'Travel plans changed', 'Home is occupied', 'Ahleyia asked to move it', 'Other'].map((label) => ({ label, on: s.cancelReason === label, pick: () => set({ cancelReason: label, waiverApplied: false }) }))
    const feeDue = lateNotice && !staffSide && !s.waiverApplied
    const feeVal = Math.round(bk.price * 0.5)
    v.feeAmount = feeDue ? '$' + feeVal : '$0'
    v.feeColor = feeDue ? 'var(--orange-deep)' : 'var(--green-deep)'
    v.feeExplainer = staffSide
      ? 'Nothing, because the change came from her side. Your card isn’t touched and your waiver stays unused.'
      : (!lateNotice ? 'Nothing. You’re more than 24 hours out, so your card is never charged.'
        : (s.waiverApplied ? 'Nothing — your courtesy waiver covered the late-notice fee.'
          : 'Half of the service. Inside 24 hours she’s already turned away other work for your window, so the 50% keeps her whole. Move it instead and there’s no fee.'))
    v.canWaive = feeDue && !s.waiverUsed
    v.waiverApplied = s.waiverApplied
    v.useWaiver = () => { set({ waiverApplied: true, waiverUsed: true }); say('Waiver applied — no fee 🎁') }
    v.cancelConfirmLabel = feeDue ? 'Cancel and pay $' + feeVal : 'Cancel this clean · no fee'
    v.confirmCancel = () => { if (!s.cancelReason) { say('Let her know what changed first'); return } set({ cx: 'done' }); say(feeDue ? 'Cancelled · $' + feeVal + ' charged' : 'Cancelled — no fee') }
    v.cxDoneCopy = staffSide ? 'Ahleyia is finding you a new time now — you’ll get first pick, usually same or next day.' : (feeDue ? 'She’s been told. The 50% holding fee is the only charge for this visit.' : 'She’s been told, and nothing was charged.')
    v.cxChargeLine = feeDue ? '$' + feeVal + ' holding fee' : 'No charge'
    v.cxChargeSub = feeDue ? '50% of the service · inside 24 hours' : (s.waiverApplied ? 'Courtesy waiver applied' : 'Cancelled with notice')
    v.cxChargeChip = feeDue ? chip('cx1', 'turn', 'Charged') : chip('cx1', 'refresh', '$0')
    v.cxNextSub = s.rsScope === 'This one and after' ? 'Your recurring cleans continue as normal' : 'Mon, Jul 27 · 11 AM – 1 PM, as usual'

    // 55 · cleaner-side move / hand-off
    v.cMove = s.role === 'cleaner' && s.c === 'move'
    v.goMove = () => go({ c: 'move', mv: 'form' })
    v.mvForm = s.mv === 'form'
    v.mvDone = s.mv === 'done'
    v.badgeYourSide = chip('mv0', 'onBrand', 'No charge to the owner')
    v.moveReasons = ['Running behind', 'Car trouble', 'Not well', 'Family emergency', 'Double-booked'].map((label) => ({ label, on: s.moveReason === label, pick: () => set({ moveReason: label }) }))
    v.moveOptions = [
      { id: 'later', icon: '⏱', name: 'Push the window today', sub: 'Same day, 2 – 4 PM instead of 10 – 12', right: '2 – 4 PM' },
      { id: 'tomorrow', icon: '📅', name: 'Move to tomorrow', sub: 'First window, 8 – 10 AM', right: 'Sat 8 AM' },
      { id: 'tiana', icon: 'TJ', name: 'Send Tiana instead', sub: 'Certified in The Kee Method™ · your split applies', right: 'Today' },
    ].map((o, i, arr) => ({ icon: o.icon, name: o.name, sub: o.sub, last: i === arr.length - 1, right: s.moveOption === o.id ? chip('mo' + o.id, 'refresh', '✓ ' + o.right) : chip('mo' + o.id, 'ghost', o.right), pick: () => set({ moveOption: o.id }) }))
    v.moveNote = s.moveNote
    v.setMoveNote = (e: any) => set({ moveNote: e.target.value })
    v.movePlaceholder = s.moveOption === 'tiana' ? 'Tiana is covering your clean today — same standard, same photos…' : 'So sorry — running behind this morning. Can I come 2–4 instead?'
    v.moveConfirmLabel = s.moveOption === 'tiana' ? 'Send Tiana & notify the owner' : 'Move it & notify the owner'
    v.confirmMove = () => { if (!s.moveOption) { say('Pick how you want to cover it'); return } set({ mv: 'done' }); say('Owner notified — no charge to them ✓') }
    v.mvDoneCopy = s.moveOption === 'tiana' ? 'Tiana has the job, the home’s standard and the photo steps. The owner knows she’s coming.' : 'The owner has the new window and knows there’s no charge for the change.'

    // 47–50 · admin side
    v.aDash = s.role === 'cleaner' && s.c === 'admin'
    v.aTeam = s.role === 'cleaner' && s.c === 'team'
    v.aClients = s.role === 'cleaner' && s.c === 'clients'
    v.aSettings = s.role === 'cleaner' && s.c === 'bizsettings'
    v.isAdmin = ['admin', 'team', 'clients', 'bizsettings'].indexOf(s.c) >= 0
    v.notAdmin = !v.isAdmin
    v.goAdmin = () => go({ c: 'admin' })
    v.goTeam = () => go({ c: 'team' })
    v.goClients = () => go({ c: 'clients' })
    v.goBizSettings = () => go({ c: 'bizsettings' })
    v.exitAdmin = () => go({ c: 'today', cTab: 0 })
    v.badgeAdminOnly = chip('ad0', 'onBrand', '👑 Admin only')
    v.badgeBook = chip('ad1', 'onBrand', 'Your book of business')
    v.chipJulyBiz = chip('ad2', 'ghost', 'July 2026')
    v.chipTwoOpen = chip('ad3', 'turn', '3 open')
    v.chipDo = chip('ad4', 'turn', 'Do it')
    v.chipWatch = chip('ad5', 'ghost', 'Tracking')
    v.chipOneAsst = chip('ad6', 'ghost', '1 assistant')
    v.chipCertified = chip('ad7', 'refresh', '✓ Certified')
    v.chipYou = chip('ad8', 'deep', 'You')
    v.chipTwoPeople = chip('ad9', 'ghost', '2 people')
    v.chipNine = chip('ad10', 'ghost', '9 accounts')
    v.splitOpts = [30, 40, 50].map((n) => ({ label: n + '%', on: s.split === n, pick: () => set({ split: n }) }))
    v.splitLine = 'On a $' + final + ' job she takes $' + Math.max(50, Math.round(final * s.split / 100)) + ' (min $50) and you keep $' + (final - Math.max(50, Math.round(final * s.split / 100))) + '. She only ever sees her own number.'
    v.accessRows = [
      { key: 'routes', label: 'Assigned routes & job details', note: '' },
      { key: 'checklists', label: 'The Kee Method™ checklists & photo steps', note: '' },
      { key: 'supplies', label: 'Supply par levels & flagging low items', note: '' },
      { key: 'ownernotes', label: 'Owner house-standard notes', note: '' },
      { key: 'rates', label: 'Rates, quotes & client billing', note: 'Admin only — can’t be granted', locked: true },
    ].map((a) => ({ label: a.label, note: a.note, locked: !!a.locked, on: a.locked ? false : !!s.access[a.key], toggle: a.locked ? () => say('Rates and billing stay admin-only 🔒') : () => setState((t: Any) => ({ ...t, access: { ...t.access, [a.key]: !t.access[a.key] } })) }))

    // 60 · assign jobs
    v.aAssign = s.role === 'cleaner' && s.c === 'assign'
    v.goAssign = () => go({ c: 'assign' })
    const WEEK = [24, 25, 27, 28, 29, 31]
    const DOW: Any = { 24: 'Fri, Jul 24', 25: 'Sat, Jul 25', 27: 'Mon, Jul 27', 28: 'Tue, Jul 28', 29: 'Wed, Jul 29', 31: 'Fri, Jul 31' }
    const ASSIGNEES = [{ id: 'Ahleyia', label: 'Ahleyia' }, { id: 'Tiana', label: 'Tiana' }, { id: 'Both', label: 'Both (shared)' }]
    const NOTES: Any = {
      'The Hartwell Estate': 'Owner asks for Ahleyia here — Egyptian cotton and hospital corners.',
      'Ridgeview Owner’s Home': 'Dog on site and a dressing room that’s off limits — brief whoever goes.',
      'Skyline Loft 12B': 'Guest checks in at 3, so this one can’t run late.',
      'Unit 1913': 'Second set of linens is on site, so no waiting on laundry.',
      'Unit 1604': 'Keep regular coffee stocked — only decaf is there.',
      'Unit 1403': 'Air fresheners and Tilex live under the kitchen sink.',
    }
    const weekJobs: Any[] = []
    WEEK.forEach((d) => bookingsFor(d).forEach((b: Any) => weekJobs.push({ ...b, day: d, dayLabel: DOW[d] })))
    let unassigned = 0, assigned = 0
    v.assignJobs = weekJobs.map((j) => {
      if (j.who) assigned++; else unassigned++
      const clash = weekJobs.filter((o) => o.key !== j.key && o.day === j.day && o.slot === j.slot && o.who && o.who === j.who).length > 0
      return {
        name: j.name,
        service: (j.kind === 'turnover' ? 'Turnover' : 'Residential clean') + ' · ' + j.dayLabel,
        statusChip: j.who ? chip('as' + j.key, 'refresh', '✓ ' + j.who) : chip('as' + j.key, 'low', 'UNASSIGNED'),
        metas: [mt('am1' + j.key, '📅', j.dayLabel), mt('am2' + j.key, '⏱', j.slot), mt('am3' + j.key, j.kind === 'turnover' ? '🏠' : '🏡', j.kind === 'turnover' ? 'Turnover' : 'Residential')],
        options: ASSIGNEES.map((a) => ({ label: a.label, on: j.who === a.id, pick: () => { setState((t: Any) => ({ ...t, assign: { ...t.assign, [j.key]: a.id } })); say(j.name + ' → ' + a.label + ' ✓') } })),
        note: clash ? 'Double-booked: ' + j.who + ' already has another home in this window.' : (j.who ? NOTES[j.name] || 'Standard visit — the home’s notes show at check-in.' : 'Nobody on this one yet. ' + (NOTES[j.name] || '')),
        noteBg: clash ? 'var(--tint-orange)' : (j.who ? 'var(--tint-green)' : 'var(--tint-orange)'),
        noteLine: clash ? 'var(--tint-orange-line)' : (j.who ? 'var(--tint-green-line)' : 'var(--tint-orange-line)'),
        noteColor: clash ? 'var(--orange-deep)' : (j.who ? 'var(--green-deep)' : 'var(--orange-deep)'),
      }
    })
    v.unassignedCount = String(unassigned)
    v.assignedCount = String(assigned)
    v.badgeUnassigned = chip('as0', 'onBrand', unassigned ? unassigned + ' still to assign' : '✓ All assigned')
    v.assignRowSub = unassigned ? unassigned + ' clean' + (unassigned > 1 ? 's' : '') + ' waiting on you' : 'Everything is assigned'
    v.assignRowChip = unassigned ? chip('ar9', 'low', String(unassigned)) : '›'
    v.publishLabel = unassigned ? 'Assign the remaining ' + unassigned : 'Send the week to the team'
    v.publishAssignments = () => { if (unassigned) { say(unassigned + ' clean' + (unassigned > 1 ? 's' : '') + ' still need someone'); return } go({ c: 'admin' }); say('Week sent to the team 📅') }

    // 61 · calendar
    v.vCalendar = (s.role === 'cleaner' && s.c === 'calendar') || (s.role === 'owner' && s.o === 'calendar')
    v.calIsAdmin = s.role === 'cleaner'
    v.calIsOwner = s.role === 'owner'
    v.goCalendar = () => go(s.role === 'owner' ? { o: 'calendar' } : { c: 'calendar' })
    v.calTitle = s.role === 'owner' ? 'Pick a day' : 'Booking calendar'
    v.calSub = s.role === 'owner' ? 'Open days for your next clean' : 'Every clean, and who has it'
    v.calBadge = chip('cal0', 'onBrand', s.role === 'owner' ? 'Her open days' : 'July 2026 · 14 cleans')
    v.calDows = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    const MONTHS = ['July 2026', 'August 2026']
    v.calMonth = MONTHS[s.calMonth] || MONTHS[0]
    v.calPrev = () => set({ calMonth: Math.max(0, s.calMonth - 1) })
    v.calNext = () => set({ calMonth: Math.min(MONTHS.length - 1, s.calMonth + 1) })
    const TODAY = 24
    const bookingsOn = (d: number) => s.calMonth === 0 ? bookingsFor(d) : []
    const dayBookings = bookingsOn(s.calDay)
    const busy = dayBookings.map((b: Any) => b.slot)
    const openSlots = SLOTS.filter((x) => busy.indexOf(x) < 0)
    const dayFull = openSlots.length === 0
    const pickedSlot = busy.indexOf(s.newWindow) < 0 ? s.newWindow : (openSlots[0] || null)
    const lead = s.calMonth === 0 ? 3 : 6
    const daysN = 31
    const dotColor = (k: string) => k === 'turnover' ? 'var(--magenta)' : 'var(--green)'
    const cells: Any[] = []
    for (let i = 0; i < lead; i++) cells.push({ day: '', dots: [], bg: 'transparent', border: 'transparent', color: 'var(--text-muted)', cursor: 'default', opacity: '1', weight: '400', pick: () => {} })
    for (let d = 1; d <= daysN; d++) {
      const list = bookingsOn(d)
      const full = list.length >= SLOTS.length
      const past = s.calMonth === 0 && d < TODAY
      const sel = s.calDay === d && s.calMonth === 0
      const dots = s.role === 'owner' ? list.map(() => 'var(--ink-soft)').slice(0, 3) : list.map((b: Any) => dotColor(b.kind)).slice(0, 3)
      if (s.role === 'cleaner' && list.filter((b: Any) => !b.who).length) dots.push('var(--orange)')
      cells.push({
        day: String(d), dots: dots.slice(0, 4),
        bg: sel ? 'var(--pink-blush)' : (list.length ? 'var(--surface-cream)' : 'var(--surface-card)'),
        border: sel ? 'var(--magenta)' : 'var(--border-default)', color: sel ? 'var(--magenta-deep)' : 'var(--ink)',
        cursor: past ? 'default' : 'pointer', opacity: past ? '.35' : (full ? '.45' : '1'), weight: sel ? '600' : '400',
        pick: past ? () => {} : () => set({ calDay: d, calMonth: s.calMonth }),
      })
    }
    v.calCells = cells
    v.calDayTitle = s.role === 'owner' ? 'July ' + s.calDay + ' · her times' : 'July ' + s.calDay
    v.calDayChip = dayFull ? chip('cd0', 'turn', 'Fully booked') : chip('cd0', 'refresh', openSlots.length + (s.role === 'owner' ? ' times open' : ' windows free'))
    if (s.role === 'owner') {
      v.calDayRows = SLOTS.map((slot, i, arr) => {
        const isBusy = busy.indexOf(slot) >= 0
        const chosen = pickedSlot === slot
        return { icon: isBusy ? '🔒' : '✓', tile: null, name: slot, sub: isBusy ? 'Booked' : 'Available · two-hour arrival window', right: isBusy ? chip('co' + i, 'ghost', 'Booked') : (chosen ? chip('co' + i, 'refresh', '✓ Chosen') : chip('co' + i, 'refresh', 'Open')), last: i === arr.length - 1, go: isBusy ? null : () => set({ newWindow: slot }) }
      })
    } else {
      v.calDayRows = dayBookings.length
        ? dayBookings.map((b: Any, i: number, arr: Any[]) => ({ icon: b.kind === 'turnover' ? '🏠' : '🏡', tile: null, name: b.name, sub: b.slot + ' · ' + (b.who || 'needs assigning'), right: b.who ? chip('cr' + i, 'refresh', b.who) : chip('cr' + i, 'low', 'ASSIGN'), last: i === arr.length - 1, go: () => go({ c: 'assign' }) }))
        : [{ icon: '✨', name: 'Nothing booked yet', sub: 'Five two-hour windows open', right: chip('cr9', 'refresh', 'Open'), last: true, go: null }]
    }
    v.calBookLabel = dayFull ? 'Pick another day' : 'Book July ' + s.calDay + ' · ' + pickedSlot
    v.calBook = () => { if (dayFull) { say('That day is fully booked — try another'); return } go({ o: 'schedule' }); say('Booked · July ' + s.calDay + ', ' + pickedSlot + ' 📅') }

    // service area
    v.aArea = s.role === 'cleaner' && s.c === 'area'
    v.goArea = () => go({ c: 'area' })
    const AREAS = [
      { id: 'buckhead', name: 'Buckhead', sub: 'Luxury homes · 4 clients' },
      { id: 'midtown', name: 'Midtown', sub: 'Airbnb turnovers · 3 clients' },
      { id: 'sandy', name: 'Sandy Springs', sub: 'Residential weekly · 2 clients' },
      { id: 'vahi', name: 'Virginia-Highland', sub: 'Quote out · 1 lead' },
      { id: 'brookhaven', name: 'Brookhaven', sub: 'No clients yet' },
      { id: 'decatur', name: 'Decatur', sub: 'No clients yet' },
      { id: 'westside', name: 'West Midtown', sub: 'No clients yet' },
      { id: 'marietta', name: 'Marietta', sub: 'Outside your drive time' },
    ]
    const areaOn = (id: string) => s.areas[id] !== false && (s.areas[id] || ['buckhead', 'midtown', 'sandy', 'vahi', 'brookhaven', 'decatur'].indexOf(id) >= 0)
    v.areaRows = AREAS.map((a, i, arr) => { const on = areaOn(a.id); return { icon: on ? '📍' : '○', name: a.name, sub: a.sub, last: i === arr.length - 1, right: on ? chip('ar' + a.id, 'refresh', 'On') : chip('ar' + a.id, 'ghost', 'Off'), toggle: () => setState((t: Any) => ({ ...t, areas: { ...t.areas, [a.id]: !areaOn(a.id) } })) } })
    v.badgeAreaCount = chip('ar0', 'onBrand', AREAS.filter((a) => areaOn(a.id)).length + ' neighborhoods on')
    v.chipDriveTime = chip('ar1', 'ghost', s.driveTime)
    v.driveOpts = ['Up to 20 min', 'Up to 35 min', 'Up to 50 min'].map((label) => ({ label, on: s.driveTime === label, pick: () => set({ driveTime: label }) }))
    v.saveArea = () => { go({ c: 'bizsettings' }); say('Service area saved 📍') }
    v.toastAssets = () => say('Brand assets downloading 📦')
    const cTile = { background: 'var(--gradient-brand)', color: '#fff', fontWeight: 600, fontSize: '13px' }
    const allClients = [
      { icon: clientInitials, tile: cTile, name: clientFull, sub: '2 properties · weekly + turnovers · since Mar 2025', right: money('var(--ink)', '$4,180'), kind: 'active' },
      { icon: 'MR', tile: cTile, name: 'Mrs. Ridgeview', sub: '1 home · weekly refresh · since Jan 2026', right: money('var(--ink)', '$3,040'), kind: 'active' },
      { icon: 'DL', tile: cTile, name: 'Deshaun L.', sub: '3 Airbnb units · turnovers · since Nov 2025', right: money('var(--ink)', '$5,260'), kind: 'active' },
      { icon: '🌱', name: 'Buckhead lead', sub: '3-bed Airbnb · asked for a quote today', flag: chip('cl1', 'low', 'QUOTE OUT'), right: money('var(--orange-deep)', 'Send'), kind: 'quote', go: () => go({ c: 'quote' }) },
      { icon: '🌱', name: 'Virginia-Highland lead', sub: 'Residential · main level weekly', flag: chip('cl2', 'low', 'QUOTE OUT'), right: money('var(--orange-deep)', 'Send'), kind: 'quote', go: () => go({ c: 'quote' }) },
      { icon: 'PK', tile: cTile, name: 'Priya K.', sub: '1 home · monthly · last clean Apr 2026', right: money('var(--text-muted)', '$820'), kind: 'lapsed' },
    ]
    v.clientFilters = ['All', 'Recurring', 'Quotes out', 'Lapsed'].map((label) => ({ label, on: s.clientFilter === label, pick: () => set({ clientFilter: label }) }))
    const wanted = ({ Recurring: 'active', 'Quotes out': 'quote', Lapsed: 'lapsed' } as Any)[s.clientFilter]
    const shownClients = wanted ? allClients.filter((c) => c.kind === wanted) : allClients
    v.clientRows = shownClients.map((c, i, arr) => ({ icon: c.icon, tile: c.tile || null, name: c.name, sub: c.sub, flag: c.flag || null, right: c.right, last: i === arr.length - 1, go: c.go || null }))

    // 45 · tax documents
    v.cTax = s.role === 'cleaner' && s.c === 'tax'
    v.goTaxDocs = () => go({ c: 'tax' })
    v.badgeTaxYear = chip('tx0', 'onBrand', '2026 · in progress')
    v.chipDownload = chip('tx1', 'refresh', 'Download')
    v.chipPending = chip('tx2', 'ghost', 'Jan 2027')
    v.taxMonths = [
      { icon: 'Jul', name: 'July 2026', sub: '14 cleans · 3 tips', right: money('var(--ink)', '$8,420') },
      { icon: 'Jun', name: 'June 2026', sub: '31 cleans · 9 tips', right: money('var(--ink)', '$11,180') },
      { icon: 'May', name: 'May 2026', sub: '28 cleans · 7 tips', right: money('var(--ink)', '$9,640') },
      { icon: 'Apr', name: 'April 2026', sub: '26 cleans · 6 tips', right: money('var(--ink)', '$8,905'), last: true },
    ]
    v.toastDownload = () => say('Downloaded 🧾')
    v.toastEmailTax = () => say('Sent to your accountant 💌')

    // 46 · owner edit account detail
    v.oEdit = s.role === 'owner' && s.o === 'edit'
    v.editPhone = s.editField === 'phone'
    v.editEmail = s.editField === 'email'
    v.editCard = s.editField === 'card'
    v.editTitle = s.editField === 'card' ? 'Replace your card' : (s.editField === 'email' ? 'Change your email' : 'Change your number')
    v.editSub = s.editField === 'card' ? 'Credit cards only · your billing terms don’t change' : (s.editField === 'email' ? 'Where your reports and receipts land' : 'How you sign in, and how she reaches you')
    v.editBadge = chip('ed0', 'onBrand', s.editField === 'card' ? '🔒 Secure' : 'Account detail')
    v.editSaveLabel = s.editField === 'card' ? 'Save new card' : 'Save changes'
    v.editValue = s.editValue
    v.setEditValue = (e: any) => set({ editValue: e.target.value })
    v.goEditPhone = () => go({ o: 'edit', editField: 'phone', editValue: '' })
    v.goEditEmail = () => go({ o: 'edit', editField: 'email', editValue: '' })
    v.goEditCard = () => go({ o: 'edit', editField: 'card', editValue: '' })
    v.saveEdit = () => { if (!s.editValue.trim()) { say('Fill in the new detail first ✏️'); return } go({ o: 'account' }); say(s.editField === 'card' ? 'New card saved 💳' : (s.editField === 'email' ? 'Email updated ✓' : 'Number updated — code sent 📱')) }

    // 40 · gallery
    v.oGallery = s.role === 'owner' && s.o === 'gallery'
    v.goGallery = () => go({ o: 'gallery', gallery: 'clean', galleryFrom: 'report' })
    v.goRefSets = () => go({ o: 'gallery', gallery: 'reference', galleryFrom: 'account' })
    const isRef = s.gallery === 'reference'
    v.galleryTitle = isRef ? 'Reference photo sets' : 'Proof of service'
    v.gallerySub = isRef ? 'How each room should look after every clean' : 'The Hartwell Estate · today, 11:06 AM – 12:31 PM'
    v.galleryBadge = chip('gl0', 'onBrand', isRef ? 'Your standard' : '9 photos · timestamped')
    v.galleryTabs = [{ id: 'clean', label: 'Today’s clean' }, { id: 'reference', label: 'Reference set' }].map((t) => ({ label: t.label, on: s.gallery === t.id, pick: () => set({ gallery: t.id }) }))
    const gwashes = ['var(--photo-1)', 'var(--photo-2)', 'var(--photo-3)', 'var(--photo-4)']
    v.galleryShots = (isRef
      ? [['Primary suite', 'Reference'], ['Guest bedroom', 'Reference'], ['Kitchen island', 'Reference'], ['Living room', 'Reference'], ['Foyer', 'Reference'], ['Guest bath', 'Reference']]
      : [['Foyer · before', '11:06 AM'], ['Primary suite · before', '11:08 AM'], ['Primary suite · staged', '11:58 AM'], ['Guest bedroom · staged', '12:04 PM'], ['Guest bath', '12:10 PM'], ['Kitchen island', '12:20 PM'], ['Restaged to listing', '12:22 PM'], ['Living room · after', '12:29 PM'], ['Foyer · after', '12:31 PM']]
    ).map((g, i) => ({ label: g[0], stamp: '📌 ' + g[1], wash: gwashes[i % 4] }))
    v.galleryNote = isRef ? 'Every clean is checked against these. Replace a shot any time your styling changes — Ahleyia sees the new standard on her next visit.' : 'Timestamped as they were taken, kept in your archive. Nothing is retouched or reordered.'
    v.galleryBackLabel = s.galleryFrom === 'setup' ? 'Back to setup' : (s.galleryFrom === 'account' ? 'Back to my account' : 'Back to the report')
    v.galleryBack = () => set(s.galleryFrom === 'setup' ? { o: 'setup' } : (s.galleryFrom === 'account' ? { o: 'account' } : { o: 'report', oTab: 1 }))

    // 41 · rate & thank
    v.oRate = s.role === 'owner' && s.o === 'rate'
    v.goRate = () => go({ o: 'rate', rate: 'form' })
    v.rateForm = s.rate === 'form'
    v.rateSent = s.rate === 'sent'
    v.badgeRate = chip('r0', 'onBrand', '⭐ 4.98 rating')
    v.stars = [1, 2, 3, 4, 5].map((n) => ({ filter: n <= s.stars ? 'none' : 'grayscale(1) opacity(.35)', pick: () => set({ stars: n }) }))
    v.rateWord = ['Tell her what to fix', 'Tell her what to fix', 'Room to grow', 'Very good', 'Exactly right'][s.stars - 1]
    v.praiseChips = ['Staging was perfect', 'Smelled incredible', 'Every detail', 'Great communication', 'On time'].map((label) => ({ label, on: !!s.praise[label], pick: () => setState((t: Any) => ({ ...t, praise: { ...t.praise, [label]: !t.praise[label] } })) }))
    v.rateNote = s.rateNote
    v.setRateNote = (e: any) => set({ rateNote: e.target.value })
    v.rateTipLine = s.tip && s.tip !== 'No tip' ? 'Your ' + (s.tip === 'Custom' ? '$' + (s.tipAmount || '0') : s.tip) + ' tip is already on its way — 100% to Ahleyia, charged separately.' : 'Want to add a tip? You can from the service report — 100% to Ahleyia, charged separately.'
    v.rateSummary = s.stars + ' star' + (s.stars > 1 ? 's' : '') + ' · ' + Object.keys(s.praise).filter((k) => s.praise[k]).length + ' highlights'
    v.sendRating = () => { set({ rate: 'sent' }); say('Thank you sent to Ahleyia ⭐') }

    // 42 · receipts
    v.oReceipts = s.role === 'owner' && s.o === 'receipts'
    v.goReceipts = () => go({ o: 'receipts' })
    v.badgeOneCharge = chip('rc0', 'onBrand', 'One charge per clean')
    v.chipJuly = chip('rc1', 'ghost', 'July 2026')
    v.receipts = [
      { icon: '💳', name: 'The Hartwell Estate', sub: 'Today, 11:06 AM · charged in full on arrival', right: money('var(--ink)', '$220.00') },
      { icon: '💕', name: 'Tip · Ahleyia', sub: 'Today · separate charge, 100% to her', right: money('var(--ink)', '$25.00') },
      { icon: '🛒', name: 'Instacart supplies', sub: 'Jul 17 · 11 items · Unit 1913', right: money('var(--ink)', '$84.20') },
      { icon: '💳', name: 'Skyline Loft 12B', sub: 'Jul 17 · charged in full on arrival', right: money('var(--ink)', '$284.00') },
      { icon: '💳', name: 'Ridgeview Owner’s Home', sub: 'Jul 14 · charged in full on arrival', right: money('var(--ink)', '$380.00') },
      { icon: '🛒', name: 'Instacart supplies', sub: 'Jul 10 · 7 items · Unit 1604', right: money('var(--ink)', '$52.75'), last: true },
    ]
    v.toastEmailReceipts = () => say('Receipts emailed to ' + clientEmail + ' 💌')

    // rewired hand-offs
    v.navOpen = s.navOpen
    v.navStopLine = 'Stop 1 of 3 · The Hartwell Estate, 214 Tuxedo Rd NW'
    v.openNav = () => { if (s.navApp && s.navRemember) { startNav(s.navApp); return } set({ navOpen: true }) }
    v.closeNav = () => set({ navOpen: false })
    v.navRemember = s.navRemember
    v.setNavRemember = (n: boolean) => set({ navRemember: n })
    v.navApps = [
      { id: 'apple', icon: '🗺️', name: 'Apple Maps', sub: 'Installed · your default' },
      { id: 'google', icon: '📍', name: 'Google Maps', sub: 'Installed' },
      { id: 'waze', icon: '🚗', name: 'Waze', sub: 'Installed · live traffic & police' },
    ].map((a, i, arr) => ({ icon: a.icon, name: a.name, sub: a.sub, last: i === arr.length - 1, right: s.navApp === a.id && s.navRemember ? chip('nv' + a.id, 'refresh', 'Default') : '›', go: () => startNav(a.id) }))
    v.copyAddress = () => { set({ navOpen: false }); say('Address copied 🔗') }
    v.sendQuote = () => { push('lead', 'Your tailored quote for the spaces you chose: ' + '$' + final + '. Everything included — happy to walk you through it.'); go({ threadWith: 'lead', c: 'thread' }); say('Tailored quote sent 💌') }

    // ---- concierge tier (v3) — $70/hr, at cost, receipt required, request→confirm ----
    v.conciergeRateLabel = '$' + CONCIERGE_RATE + '/hr'
    // Owner · Request concierge
    v.oConcierge = s.role === 'owner' && s.o === 'concierge'
    v.goConcierge = () => go({ o: 'concierge' })
    v.conciergeSent = s.conciergeSent
    v.conciergeServices = [
      { id: 'receiving', icon: '📦', name: 'Product receiving & delivery', desc: 'Received on your behalf, stored, brought to the unit when needed.' },
      { id: 'storeRun', icon: '🛍️', name: 'Store-bound run', desc: 'Last-minute shopping delivered to the property.' },
      { id: 'guestDelivery', icon: '🎁', name: 'Guest deliveries', desc: 'Coordinated for your guests, not just you.' },
      { id: 'grocery', icon: '🍎', name: 'Grocery concierge', desc: 'Ordered or shopped, brought inside, and put away before you land.' },
      { id: 'coHosting', icon: '🔑', name: 'Co-hosting support', desc: 'In-person welcome, check-in help, on-call co-host.' },
    ].map((x) => ({ ...x, on: !!s.conciergeSvc[x.id], toggle: () => setState((t: Any) => ({ ...t, conciergeSvc: { ...t.conciergeSvc, [x.id]: !t.conciergeSvc[x.id] } })) }))
    v.conciergeWindows = ['Tomorrow, 10 AM – 12 PM', 'Tomorrow, 2 – 4 PM', 'Sat, 9 – 11 AM'].map((label) => ({ label, on: s.conciergeWindow === label, pick: () => set({ conciergeWindow: label }) }))
    v.conciergeNote = s.conciergeNote
    v.setConciergeNote = (e: any) => set({ conciergeNote: e.target.value })
    v.conciergeChosen = Object.keys(s.conciergeSvc).filter((k) => s.conciergeSvc[k])
    v.conciergeChosenLabels = v.conciergeServices.filter((x: Any) => x.on).map((x: Any) => x.name)
    v.sendConciergeRequest = () => {
      if (!v.conciergeChosen.length) { say('Pick at least one service she can help with'); return }
      set({ conciergeSent: true }); say('Request sent — she’ll confirm your window 💌')
    }
    v.changeConciergeRequest = () => set({ conciergeSent: false })
    // Cleaner · Concierge visit
    v.cConcierge = s.role === 'cleaner' && s.c === 'conciergeVisit'
    v.goConciergeVisit = () => go({ c: 'conciergeVisit', visitState: 'brief', visitMinutes: 0, expenses: [] })
    v.visitBrief = s.visitState === 'brief'
    v.visitOnClock = s.visitState === 'clock'
    v.visitClosed = s.visitState === 'closed'
    v.startClock = () => set({ visitState: 'clock', visitMinutes: 15 })
    v.visitMinutes = s.visitMinutes
    v.visitTimeLabel = Math.floor(s.visitMinutes / 60) + 'h ' + (s.visitMinutes % 60) + 'm'
    v.visitCharge = '$' + conciergeTimeCharge(s.visitMinutes).toFixed(2)
    v.addTime = (d: number) => { try { set({ visitMinutes: applyExtension(s.visitMinutes, d, 'cleaner') }) } catch { /* floor */ } }
    v.expCats = ['Groceries', 'Linens', 'Toiletries', 'Décor', 'Other'].map((label) => ({ label, on: s.expCat === label, pick: () => set({ expCat: label }) }))
    v.expAmount = s.expAmount
    v.setExpAmount = (e: any) => set({ expAmount: e.target.value.replace(/[^0-9.]/g, '') })
    v.expPhoto = s.expPhoto
    v.attachExpPhoto = () => { set({ expPhoto: !s.expPhoto }); if (!s.expPhoto) say('Receipt photographed 📸') }
    v.addExpense = () => {
      const amt = parseFloat(s.expAmount || '0')
      if (!amt) { say('Enter the receipt total first'); return }
      // The rule, in the UI and enforced again server-side.
      if (!s.expPhoto) { say('The photo is the owner’s proof — no receipt, no reimbursement'); return }
      setState((t: Any) => ({ ...t, expenses: t.expenses.concat([{ cat: t.expCat, amount: amt }]), expAmount: '', expPhoto: false }))
      say('Expense added — reimbursed at cost 🧾')
    }
    v.removeExpense = (i: number) => setState((t: Any) => ({ ...t, expenses: t.expenses.filter((_: any, k: number) => k !== i) }))
    v.expenses = s.expenses.map((x: Any, i: number) => ({ ...x, amountLabel: '$' + x.amount.toFixed(2), remove: () => v.removeExpense(i) }))
    const reimbursedSum = s.expenses.reduce((n: number, x: Any) => n + x.amount, 0)
    const timeCharge = conciergeTimeCharge(s.visitMinutes)
    v.visitReimbursed = '$' + reimbursedSum.toFixed(2)
    v.visitTotal = '$' + (timeCharge + reimbursedSum).toFixed(2)
    v.visitTimeCharge = '$' + timeCharge.toFixed(2)
    v.closeVisit = () => { set({ visitState: 'closed' }); say('Visit closed — receipt sent 💕') }

    // Products & scent — the +$8 eco finish is a working billing toggle now.
    v.scentOn = s.scentOn
    v.toggleScent = () => { set({ scentOn: !s.scentOn }); say(s.scentOn ? 'Scent line removed' : 'Eco finish + scent added 🌿') }
    v.scentConsequence = s.scentOn
      ? 'Billed as its own line — Eco finish + signature scent · $8.00 — inside the single arrival charge. Never buried in the service price.'
      : 'Your receipts won’t show a scent line, and nothing extra is charged.'

    // menu — every destination, one tap away
    const item = (icon: string, name: string, sub: string, goFn: () => void) => ({ icon, name, sub, go: () => { set({ menuOpen: false }); goFn() } })
    const close = (arr: Any[]) => arr.map((x, i, a) => ({ ...x, last: i === a.length - 1, right: '›' }))
    const MENUS: Any = {
      visitor: { title: 'She’s Maid In ATL', sub: 'Everything you can do before you have an account', groups: [
        { title: 'Browse', items: close([
          item('🏠', 'Welcome', 'Her studio, at a glance', () => go({ p: 'welcome' })),
          item('🧺', 'Her services', 'Turnover tiers and residential care', () => go({ p: 'services' })),
          item('🖼️', 'Her work', 'After-service photos from real homes', () => go({ p: 'portfolio' })),
          item('🌱', 'Products & scent', 'Eco, non-toxic, and why', () => go({ role: 'owner', o: 'products' })),
        ]) },
        { title: 'Get started', items: close([
          item('✍️', 'Create an account', 'Two minutes, nothing charged', () => go({ p: 'signup', suStep: 1, code: '' })),
          item('🔑', 'Client sign in', 'Your number and a texted code', () => go({ p: 'gate' })),
          item('🧼', 'Join her team', 'For cleaners with an invite', () => go({ p: 'staffsetup', staffStep: 1 })),
        ]) },
      ] },
      cleaner: { title: 'Your day & your business', sub: 'Ahleyia Kee · founder and lead housekeeper', groups: [
        { title: 'Working', items: close([
          item('🏠', 'Today’s route', '3 properties today', () => go({ c: 'today', cTab: 0 })),
          item('📍', 'Route map', 'Stops, drive times and windows', () => go({ c: 'map' })),
          item('📌', 'Arrival check-in', 'Charge, then your 50% releases', () => go({ c: 'checkin', checkin: 'ready' })),
          item('✅', 'Active clean', 'The Kee Method™, step by step', () => go({ c: 'job', cTab: 1 })),
          item('🏡', 'Luxury home clean', 'Residential, 31 steps', () => go({ c: 'lux' })),
          item('⚠️', 'Flag an issue', 'Damage, low supply or maintenance', () => go({ c: 'flag' })),
          item('⏱', 'Move or hand off a job', 'No charge to the owner', () => go({ c: 'move', mv: 'form' })),
          item('📅', 'Booking calendar', 'Every clean, and who has it', () => go({ c: 'calendar' })),
          item('📌', 'Assign jobs', 'Who’s taking each clean', () => go({ c: 'assign' })),
          item('🧴', 'Supplies', 'Par levels and reordering', () => go({ c: 'supplies', cTab: 2 })),
          item('👥', 'Assistant’s view', 'What Tiana sees on a shared job', () => go({ c: 'assist' })),
          item('💫', 'Concierge visit', 'Her time & receipts — not a clean', () => go({ c: 'conciergeVisit', visitState: 'brief', visitMinutes: 0, expenses: [] })),
        ]) },
        { title: 'Getting paid', items: close([
          item('👤', 'My week', 'Cleans, earnings and schedule', () => go({ c: 'profile', cTab: 3 })),
          item('🏦', 'Payouts', 'Every release, in order', () => go({ c: 'payouts' })),
          item('🧾', 'Tax documents', '1099s and yearly summaries', () => go({ c: 'tax' })),
          item('🧮', 'Quote Builder', 'Your pricing rules, made tappable', () => go({ c: 'quote' })),
        ]) },
        { title: 'Messages', items: close([
          item('💌', 'Inbox', 'Owners, leads and the business', () => go({ c: 'inbox' })),
          item('✏️', 'New message', 'Write to an owner or a lead', () => go({ c: 'compose', draft: '' })),
          item('🔗', 'Your digital card', 'QR to scan, or text the link', () => go({ c: 'share' })),
        ]) },
        { title: 'Business', items: close([
          item('👑', 'Business dashboard', 'Billing, people, pricing', () => go({ c: 'admin' })),
          item('👥', 'Team & certification', 'Splits and what they can see', () => go({ c: 'team' })),
          item('🏡', 'Clients & properties', 'Your book of business', () => go({ c: 'clients' })),
          item('📋', 'Kee Method™ templates', 'Turnover and luxury home', () => go({ c: 'template', tpl: 'turn' })),
          item('📍', 'Service area', 'Where you take work', () => go({ c: 'area' })),
          item('⚙️', 'Settings', 'Your account and notifications', () => go({ c: 'settings' })),
          item('🔐', 'Master login & security', 'Business email, password, two-step', () => go({ role: 'visitor', p: 'adminlogin' })),
        ]) },
      ] },
      owner: { title: clientFirst + '’s account', sub: 'Your homes, your standard, your proof', groups: [
        { title: 'Your homes', items: close([
          item('🏡', 'Homes', 'Status, proof and history', () => go({ o: 'home', oTab: 0 })),
          item('📅', 'Schedule', 'Reschedule, add a service, cancel', () => go({ o: 'schedule' })),
          item('🗓️', 'Her open days', 'Pick a day for your next clean', () => go({ o: 'calendar' })),
          item('➕', 'Add a property', 'Paste a listing link', () => go({ o: 'onboard' })),
          item('✅', 'Account setup', 'Finish anything outstanding', () => go({ o: 'setup' })),
        ]) },
        { title: 'Every clean', items: close([
          item('📋', 'Service report', 'Photos, timeline and approval', () => go({ o: 'report', oTab: 1 })),
          item('🖼️', 'All proof photos', 'Timestamped, kept for you', () => go({ o: 'gallery', gallery: 'clean', galleryFrom: 'report' })),
          item('📷', 'Reference photos', 'How your rooms should look', () => go({ o: 'gallery', gallery: 'reference', galleryFrom: 'account' })),
          item('⭐', 'Rate & thank Ahleyia', 'She reads every one', () => go({ o: 'rate', rate: 'form' })),
          item('💬', 'Something’s not right', 'She comes back to fix it', () => go({ o: 'dispute', dispute: 'form' })),
        ]) },
        { title: 'Home & supplies', items: close([
          item('🌱', 'Products & scent', 'Eco products and your finish', () => go({ o: 'products' })),
          item('💫', 'Request concierge', 'Her time — a hands-free lifestyle', () => go({ o: 'concierge' })),
          item('🧴', 'Supplies', 'Approve what your units need', () => go({ o: 'supplies', oTab: 2 })),
          item('🧮', 'Your tailored quote', 'From Ahleyia', () => go({ o: 'quote' })),
        ]) },
        { title: 'Account', items: close([
          item('👤', 'Your account', 'Details, card and archive', () => go({ o: 'account', oTab: 0 })),
          item('🧾', 'Receipts', 'One charge per clean', () => go({ o: 'receipts' })),
          item('💳', 'Replace your card', 'Credit cards only', () => go({ o: 'edit', editField: 'card', editValue: '' })),
          item('💌', 'Messages', 'Ahleyia and the studio', () => go({ o: 'messages', oTab: 3 })),
        ]) },
      ] },
    }
    const menu = MENUS[s.role]
    v.menuTitle = menu.title
    v.menuSub = menu.sub
    v.menuGroups = menu.groups

    const jump = (role: string, key: string, extra?: Any) => () => {
      const patch: Any = { role, cam: null, emptyJobs: false, emptyHomes: false, emptyMsgs: false, ...(extra || {}) }
      patch[role === 'visitor' ? 'p' : (role === 'cleaner' ? 'c' : 'o')] = key
      if (role === 'cleaner') { const ci = ['today', 'job', 'inbox', 'profile'].indexOf(key); patch.cTab = ci >= 0 ? ci : (key === 'thread' || key === 'compose' ? 2 : s.cTab) }
      if (role === 'owner') { const oi = ['home', 'report', 'supplies', 'messages'].indexOf(key); patch.oTab = oi >= 0 ? oi : (key === 'thread' || key === 'compose' ? 3 : s.oTab) }
      patch.hist = []; patch.menuOpen = false
      set(patch)
      try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch { /* noop */ }
    }
    v.tour = [
      { title: 'Clients & guests', items: [
        { n: 1, label: 'Welcome / storefront', go: jump('visitor', 'welcome') },
        { n: 2, label: 'Her services + quote start', go: jump('visitor', 'services') },
        { n: 65, label: 'Her work · portfolio', go: jump('visitor', 'portfolio') },
        { n: 3, label: 'Account gate', go: jump('visitor', 'gate') },
        { n: 31, label: 'Notifications', go: jump('visitor', 'notifs') },
        { n: 32, label: 'Icon & opening screen', go: jump('visitor', 'splash') },
        { n: 39, label: 'Verify your code', go: jump('visitor', 'verify', { code: '' }) },
        { n: 59, label: 'Create an account', go: jump('visitor', 'signup', { suStep: 1, code: '' }) },
        { n: 59, label: 'Sign-up details', go: jump('visitor', 'signup', { suStep: 3 }) },
        { n: 62, label: 'Business sign in', go: jump('visitor', 'adminlogin') },
        { n: 57, label: 'New cleaner setup', go: jump('visitor', 'staffsetup', { staffStep: 1 }) },
      ] },
      { title: 'Ahleyia · working & business', items: [
        { n: 4, label: 'Today’s route', go: jump('cleaner', 'today') },
        { n: 5, label: 'Route map', go: jump('cleaner', 'map') },
        { n: 24, label: 'Arrival check-in', go: jump('cleaner', 'checkin', { checkin: 'ready' }) },
        { n: 6, label: 'Active clean (Kee Method™)', go: jump('cleaner', 'job') },
        { n: 24, label: 'Card declined at check-in', go: jump('cleaner', 'checkin', { checkin: 'declined' }) },
        { n: 26, label: 'Flag an issue', go: jump('cleaner', 'flag') },
        { n: 28, label: 'Luxury home clean', go: jump('cleaner', 'lux') },
        { n: 29, label: 'Assistant view', go: jump('cleaner', 'assist') },
        { n: 63, label: 'Concierge visit', go: jump('cleaner', 'conciergeVisit', { visitState: 'brief', visitMinutes: 0, expenses: [] }) },
        { n: 30, label: 'Taking a proof photo', go: jump('cleaner', 'job', { cam: { id: 't15', kind: 'turn', title: 'Primary suite · beds made' } }) },
        { n: 33, label: 'Working offline', go: jump('cleaner', 'job', { offline: true }) },
        { n: 34, label: 'No jobs today', go: jump('cleaner', 'today', { emptyJobs: true }) },
        { n: 35, label: 'Inbox clear', go: jump('cleaner', 'inbox', { emptyMsgs: true }) },
        { n: 43, label: 'Payout history', go: jump('cleaner', 'payouts') },
        { n: 44, label: 'Kee Method™ templates', go: jump('cleaner', 'template', { tpl: 'turn' }) },
        { n: 45, label: 'Tax documents', go: jump('cleaner', 'tax') },
        { n: 47, label: 'Business dashboard', go: jump('cleaner', 'admin') },
        { n: 48, label: 'Team & certification', go: jump('cleaner', 'team') },
        { n: 49, label: 'Clients & properties', go: jump('cleaner', 'clients') },
        { n: 50, label: 'Business settings', go: jump('cleaner', 'bizsettings') },
        { n: 55, label: 'Move or hand off a job', go: jump('cleaner', 'move', { mv: 'form' }) },
        { n: 56, label: 'Service area', go: jump('cleaner', 'area') },
        { n: 60, label: 'Assign jobs', go: jump('cleaner', 'assign') },
        { n: 61, label: 'Booking calendar', go: jump('cleaner', 'calendar') },
      ] },
      { title: 'Owners', items: [
        { n: 15, label: 'Your homes', go: jump('owner', 'home') },
        { n: 16, label: 'Service report & approval', go: jump('owner', 'report') },
        { n: 17, label: 'Supplies & maintenance', go: jump('owner', 'supplies') },
        { n: 18, label: 'Messages', go: jump('owner', 'messages') },
        { n: 19, label: 'Message thread', go: jump('owner', 'thread') },
        { n: 20, label: 'New message', go: jump('owner', 'compose') },
        { n: 21, label: 'Products & scent', go: jump('owner', 'products') },
        { n: 64, label: 'Request concierge', go: jump('owner', 'concierge') },
        { n: 22, label: 'Add a property (onboarding)', go: jump('owner', 'onboard') },
        { n: 23, label: 'Your account', go: jump('owner', 'account') },
        { n: 25, label: 'Quote received', go: jump('owner', 'quote', { quote: 'new' }) },
        { n: 25, label: 'Quote accepted', go: jump('owner', 'quote', { quote: 'accepted' }) },
        { n: 27, label: 'Something’s not right', go: jump('owner', 'dispute', { dispute: 'form' }) },
        { n: 27, label: 'Payment release paused', go: jump('owner', 'report', { disputeOpen: true, dispute: 'sent' }) },
        { n: 36, label: 'Edit reorder list', go: jump('owner', 'editlist') },
        { n: 37, label: 'Listing link not read', go: jump('owner', 'onboard', { detectFailed: true, detected: false }) },
        { n: 38, label: 'No properties yet', go: jump('owner', 'home', { emptyHomes: true }) },
        { n: 40, label: 'All proof photos', go: jump('owner', 'gallery', { gallery: 'clean', galleryFrom: 'report' }) },
        { n: 40, label: 'Reference photo sets', go: jump('owner', 'gallery', { gallery: 'reference', galleryFrom: 'account' }) },
        { n: 41, label: 'Rate & thank Ahleyia', go: jump('owner', 'rate', { rate: 'form' }) },
        { n: 42, label: 'Receipts', go: jump('owner', 'receipts') },
        { n: 46, label: 'Replace a card', go: jump('owner', 'edit', { editField: 'card', editValue: '' }) },
        { n: 58, label: 'New client setup', go: jump('owner', 'setup', { setup: { verify: true } }) },
        { n: 58, label: 'Owner setup complete', go: jump('owner', 'setup', { setup: { verify: true, property: true, requirements: true, card: true, reference: true } }) },
        { n: 51, label: 'Schedule', go: jump('owner', 'schedule') },
        { n: 61, label: 'Pick a day to book', go: jump('owner', 'calendar') },
        { n: 52, label: 'Reschedule (late notice)', go: jump('owner', 'reschedule', { booking: 'b1', notice: 'late', rs: 'form' }) },
        { n: 53, label: 'Add services', go: jump('owner', 'addservice', { addKind: 'addon', booking: 'b1' }) },
        { n: 53, label: 'Book an extra clean', go: jump('owner', 'addservice', { addKind: 'clean' }) },
        { n: 54, label: 'Cancel: inside 24h (50%)', go: jump('owner', 'cancel', { booking: 'b1', notice: 'late', cx: 'form', cancelReason: 'Guest cancelled', waiverApplied: false }) },
        { n: 54, label: 'Cancelled by Ahleyia · no fee', go: jump('owner', 'cancel', { booking: 'b1', notice: 'late', cx: 'form', cancelReason: 'Ahleyia asked to move it' }) },
        { n: 54, label: 'Cancelled with notice · no fee', go: jump('owner', 'cancel', { booking: 'b2', notice: 'early', cx: 'form', cancelReason: 'Travel plans changed' }) },
      ] },
    ]

    return v
  }

  return { state, set, go, back, say, v }
}
