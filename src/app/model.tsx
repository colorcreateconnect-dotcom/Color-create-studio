/* She's Maid In ATL — application state + view-model.
   A faithful React port of the reference prototype's single logic class
   (state, seed data, handlers and the renderVals() view-model builder).
   In a real build this per-domain state would move behind an API; here it is
   held in one store exactly as the design handoff describes, so the whole
   three-zone app is clickable end to end. */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Chip, MetaTag, VerifiedBadge } from '../ds/components'
import { residentialQuote, airbnbQuote, type Staging } from '../lib/pricing'
import { CONCIERGE_RATE, conciergeTimeCharge, applyExtension } from '../lib/concierge'
import { groupSteps, checklistProgress } from '../lib/checklist'
import { SLOTS, windowFor, slotHours } from '../lib/schedule'
import { parseInviteInput, INVITE_PARSE_MESSAGE } from '../lib/inviteLink'
import { viewsFor, mayRunBusiness } from '../lib/views'
import { busyWindows, dayAvailability, dayIsFull, mergeBusy, busyMinutesBetween } from '../lib/availability'
import { checkPhoto, photoKeyFor, photoNonce, missingProof, PHOTO_REJECT_MESSAGE } from '../lib/photo'
import { uploadProof } from '../lib/storage'
import {
  isLow, lowItems, shortBy, reorderLines, tally, groceryPart, supplierPart, STARTER_SUPPLIES,
} from '../lib/supplies'
import { getGroceryAdapter } from '../lib/grocery'
import { SCENTS, scentLabel, scentValue, isEco, productValue, prefsLine, productsSubtitle } from '../lib/prefs'
import { WORK_SHOTS, PORTFOLIO_SHOTS } from './portfolioData'
import {
  backendActive, hydrate, getPosition, errMsg, parseTip,
  signInWithPassword, signUpWithPassword, signOut as beSignOut, api, getData, threadKeyForOwner,
} from './backend'
import { isSquareConfigured } from '../lib/config'
import { pushSupport, enablePush, disablePush, currentEndpoint } from '../lib/push'

type Any = Record<string, any>

/* Parked between signing up and being able to act on it: Supabase may hold a
   new account back for email confirmation, and the studio can only be created
   once there is a session to create it against. Holds the studio name they
   typed, or '' for "use my own name". */
const PRO_INTENT = 'smia-start-my-studio'

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
export interface ModelProps { startRole?: 'visitor' | 'cleaner' | 'owner'; showChrome?: boolean; autoFillMethod?: boolean; inviteToken?: string; openLink?: string; liveApp?: boolean }

function initialState(props: ModelProps): Any {
  const fill = !!props.autoFillMethod
  const checked: Any = {}
  if (fill) for (let i = 1; i <= 26; i++) checked['t' + i] = true
  return {
    role: props.startRole || 'visitor',
    p: props.inviteToken ? 'invite' : 'welcome', c: 'today', o: 'home',
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
    tpl: 'turn', gallery: 'clean', galleryFrom: 'report',
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
    hist: [], menuOpen: false, acctOpen: false,
    // Bringing her existing book of business in: her "add a client" form, and
    // the invitation an existing client opens.
    ncName: '', ncPhone: '', ncEmail: '', ncProperty: '', ncAddress: '',
    ncType: 'residential', ncBeds: '', ncBaths: '', ncPrice: '', ncCadence: 'Weekly',
    ncError: '', newClientLink: '', newClientName: '', ncConsent: false, newClientId: '', inviteTexted: null,
    nsName: '', nsPhone: '', nsEmail: '', nsConsent: false, nsError: '',
    newStaffLink: '', newStaffName: '', newStaffId: '',
    inviteToken: props.inviteToken || '', inviteLoading: !!props.inviteToken,
    inviteEntry: '', inviteEntryErr: '',
    invitePreview: null, inviteError: '', inviteFormError: '', inviteDone: false,
    inviteEmail: '', invitePw: '', invitePwShown: false, inviteBusy: false,
    adminEmail: '', adminPw: '', pwShown: false, adminRemember: true,
    suStep: 1, suName: '', suPhone: '', suEmail: '', suPw: '', suPwShown: false, suErr: '',
    suNeedsConfirm: false, suAddress: '', suTerms: false,
    // Has the client changed the products/scent pickers this visit? Until they
    // do, the screen shows what is actually stored on their home.
    ecoTouched: false, scentTouched: false,
    // A housekeeper starting their own book, rather than a client booking one.
    proName: '', proEmail: '', proPw: '', proPwShown: false, proStudio: '',
    proTerms: false, proErr: '', proDone: false, proNeedsConfirm: false,
    suKind: 'Airbnb host', suScopeMap: {}, suCadenceVal: 'Weekly',
    quoteScopeMap: { 'Main level': true, 'Primary suite': true }, quoteCadenceVal: 'Weekly',
    suHood: 'Midtown', suContactPref: 'Text me', suSourcePref: 'Her card / QR',
    staffStep: 1, staffName: '', verified: {}, cert: {}, taxKind: 'Individual / sole prop',
    standardsMap: {}, setup: {},
    // Concierge tier (v3): request form + live visit clock + at-cost expenses.
    conciergeSvc: {}, conciergeWindow: 'Tomorrow, 10 AM – 12 PM', conciergeNote: '', conciergeSent: false,
    visitState: 'brief', visitMinutes: 0, expenses: [], expCat: 'Groceries', expAmount: '', expPhoto: false,
    scentOn: true,
    // Live-backend slice — populated by hydrate() when Supabase is configured;
    // stays empty in the sandbox/demo so every screen runs on seed data.
    gateEmail: '', gatePw: '', gatePwShown: false, gateErr: '',
    beReady: false, beSignedIn: false, beUser: null, beCard: null,
    beJobs: [], beProps: [], beClients: [], beStaff: [], beBlocks: [], beOrg: null, beActiveJobId: null, beBusy: false,
    beMsgs: [], beQuotes: [], beReports: [], beCharges: [], beThreadOwner: null,
    // The real checklist: rows of job_steps for the job that's open, ticked
    // straight into Postgres. beStepsJobId is what the effect watches.
    beSteps: [], beStepsJobId: null, beStepsBusy: false, beStepsErr: '', bePhaseOpen: 1,
    // Proof photos: which step is uploading, and the short-lived links that let
    // the checklist show a thumbnail. Never persisted — they expire.
    bePhotoBusy: '', bePhotoUrls: {},
    // Par-level inventory, loaded per home.
    beSupplies: [], beSuppliesReady: false, beSupplyBusy: '',
    // Manual property entry (staff adding a home for a client they already have)
    npOwner: '', npName: '', npKind: 'residential', npArea: '', npBeds: '', npBaths: '', npErr: '',
    // Live scheduling: which month/day of the real calendar is in view
    calYM: null, calPick: null, calProp: '',
    avDay: '', avReason: '', avWhole: false, avSlot: '10 AM – 12 PM', avErr: '',
    access: { routes: true, checklists: true, supplies: true, ownernotes: true },
    onotif: { reports: true, cleaning: true, supplies: true, summary: false },
    cnotif: { bookings: true, approvals: true, supplies: true },
    // Notifications: real rows, plus this device's push state.
    beNotices: [], beNoticesReady: false, pushState: 'default', pushOn: false,
    pushKey: '', pushReady: false, pushBusy: false, pushMsg: '',
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
  /* ---- notifications ---- */
  /** "now", "12m ago", "3h ago", "Wed" — how a notice is stamped in the feed. */
  const agoLabel = (iso: string) => {
    const t = new Date(iso).getTime()
    if (isNaN(t)) return ''
    const mins = Math.floor((Date.now() - t) / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return mins + 'm ago'
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return hrs + 'h ago'
    const d = new Date(t)
    const days = Math.floor(hrs / 24)
    return days < 7 ? d.toLocaleDateString([], { weekday: 'short' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  /** Where tapping a notice lands. `link` is a route key the server chose from
   *  a fixed set — never a URL, so a notice can't navigate anywhere arbitrary. */
  const openNotice = (n: Any) => {
    if (!n.read) {
      setState((st: Any) => ({ ...st, beNotices: st.beNotices.map((x: Any) => x.id === n.id ? { ...x, read: true } : x) }))
      getData().markNotificationsRead([n.id]).catch(() => { /* stays unread next load */ })
    }
    const st = stateRef.current
    const owner = st.beUser?.role === 'owner'
    const link = String(n.link || '')
    if (link.startsWith('job:')) { go({ role: 'cleaner', c: 'job', cTab: 1, beStepsJobId: link.slice(4) }); return }
    switch (link) {
      case 'report': go(owner ? { role: 'owner', o: 'report', oTab: 1 } : { role: 'cleaner', c: 'today', cTab: 0 }); return
      case 'schedule': go(owner ? { role: 'owner', o: 'schedule' } : { role: 'cleaner', c: 'calendar' }); return
      case 'card': go({ role: 'owner', o: 'edit', editField: 'card', editValue: '' }); return
      case 'payouts': go({ role: 'cleaner', c: 'payouts' }); return
      case 'clients': go({ role: 'cleaner', c: 'clients' }); return
      case 'quote': go(owner ? { role: 'owner', o: 'quote' } : { role: 'cleaner', c: 'quote' }); return
      case 'messages': go(owner ? { role: 'owner', o: 'messages', oTab: 3 } : { role: 'cleaner', c: 'inbox', cTab: 2 }); return
      default:
        if (n.jobId) { go({ role: 'cleaner', c: 'job', cTab: 1, beStepsJobId: n.jobId }); return }
        go(owner ? { role: 'owner', o: 'home', oTab: 0 } : { role: 'cleaner', c: 'today', cTab: 0 })
    }
  }

  const chip = (key: any, tone: string, txt: any) => <Chip key={key} tone={tone}>{txt}</Chip>
  const mt = (key: any, icon: any, label: any, value?: any) => <MetaTag key={key} icon={icon} label={label} value={value} />
  const money = (t: string, val: string) => <b style={{ fontSize: '13px', color: t }}>{val}</b>

  const v: Any = useMemo(() => buildView(), [state]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Hydrate the signed-in identity + card + jobs from the real backend on load.
     No-ops entirely when no backend is configured, so the demo is untouched. */
  useEffect(() => {
    if (!backendActive()) return
    let alive = true
    hydrate().then((h) => {
      if (!alive) return
      setState((st: Any) => {
        const patch: Any = {
          ...st, beReady: true, beSignedIn: h.signedIn, beUser: h.user,
          beCard: h.card, beJobs: h.jobs, beProps: h.properties, beClients: h.clients, beStaff: h.staff, beBlocks: h.blocks, beOrg: h.org, beActiveJobId: h.activeJobId ?? null,
          beMsgs: h.messages, beQuotes: h.quotes, beReports: h.reports, beCharges: h.charges,
        }
        // Land a signed-in user in their own zone — but only from the default
        // visitor landing, so a deliberate deep-link (?role=…) is respected.
        if (h.signedIn && h.user && st.role === 'visitor' && st.p === 'welcome') {
          if (h.user.role === 'owner') { patch.role = 'owner'; patch.o = 'home'; patch.oTab = 0 }
          else { patch.role = 'cleaner'; patch.c = h.user.role === 'org_admin' ? 'admin' : 'today'; patch.cTab = 0 }
        }
        return patch
      })
    }).catch(() => { if (alive) setState((st: Any) => ({ ...st, beReady: true })) })
    return () => { alive = false }
  }, [])

  /* Finish setting up a housekeeper who signed up to run their own book.
     Signing up can only ever produce a client — the database trigger will not
     let anyone name their own role — so the studio is created afterwards, by a
     function, against their own token. It happens here rather than inline
     because Supabase may hold a new account back for email confirmation: no
     session comes back from signup, and the promotion has to wait until they
     actually sign in. The intent is parked in localStorage until it can run. */
  useEffect(() => {
    if (!backendActive() || !state.beSignedIn || !state.beUser) return
    // Already somewhere — either it worked, or they were invited into a studio.
    if (state.beUser.role !== 'owner' || state.beUser.orgId) return
    let intent: string | null = null
    try { intent = window.localStorage.getItem(PRO_INTENT) } catch { return }
    if (intent == null) return
    let alive = true
    const clear = () => { try { window.localStorage.removeItem(PRO_INTENT) } catch { /* private mode */ } }
    api.becomeContractor(intent ? { studioName: intent } : {})
      .then(() => hydrate())
      .then((h) => {
        clear()
        if (!alive) return
        setState((st: Any) => ({
          ...st, beUser: h.user, beJobs: h.jobs, beProps: h.properties,
          beClients: h.clients, beStaff: h.staff, beBlocks: h.blocks, beOrg: h.org,
          role: 'cleaner', c: 'admin', cTab: 0, p: 'welcome',
        }))
        say('Your studio is live 🎉')
      })
      .catch(() => {
        // A stale flag, or they're already in someone's studio. Drop it rather
        // than retry on every load — this must never become a loop.
        clear()
      })
    return () => { alive = false }
  }, [state.beSignedIn, state.beUser?.id, state.beUser?.role, state.beUser?.orgId])

  /* A notification was tapped. Two ways in: the app was closed and the service
     worker opened it with ?open=<link>, or the app was already open and the SW
     posted the link to it. Both land in the same place, once we know who is
     signed in — the same route means different screens for a client and staff. */
  useEffect(() => {
    if (!state.beSignedIn || !state.beUser) return
    const link = props.openLink
    if (!link) return
    openNotice({ id: '', link, jobId: null, read: true })
    // Don't re-fire on the next render, and don't leave it in the address bar.
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('open')
      window.history.replaceState({}, '', url.toString())
    } catch { /* not fatal */ }
  }, [state.beSignedIn, state.beUser?.id])

  /* The service worker forwards a tap that arrived while the app was open. */
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return
    const onMsg = (e: MessageEvent) => {
      const d: any = e.data || {}
      if (d.type === 'open-link' && d.link) openNotice({ id: '', link: d.link, jobId: null, read: true })
    }
    navigator.serviceWorker.addEventListener('message', onMsg)
    return () => navigator.serviceWorker.removeEventListener('message', onMsg)
  }, [])

  /* Notices for whoever is signed in. Reloaded on sign-in and whenever the
     service worker says a push just arrived, so the feed and the badge agree
     with what landed on the phone. */
  useEffect(() => {
    if (!backendActive() || !state.beSignedIn || !state.beUser) return
    let alive = true
    const load = () => {
      getData().notifications(40)
        .then((rows) => { if (alive) setState((st: Any) => ({ ...st, beNotices: rows, beNoticesReady: true })) })
        .catch(() => { if (alive) setState((st: Any) => ({ ...st, beNoticesReady: true })) })
    }
    load()
    // The SW forwards a tap on a notification, and tells us when one arrives
    // while the app is open.
    const onSw = (e: MessageEvent) => {
      const d: any = e.data || {}
      if (d.type === 'open-link') { load(); return }
      if (d.type === 'push-received') load()
    }
    navigator.serviceWorker?.addEventListener?.('message', onSw)
    // Coming back to the app is the other moment the feed can be stale.
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      navigator.serviceWorker?.removeEventListener?.('message', onSw)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [state.beSignedIn, state.beUser?.id])

  /* What this device can do about notifications, and whether it already is.
     Asks the server for the VAPID public key once; with no keys configured the
     app simply never offers to turn push on. */
  useEffect(() => {
    if (!backendActive() || !state.beSignedIn) return
    let alive = true
    ;(async () => {
      const cfg = await api.pushConfig()
      const endpoint = await currentEndpoint()
      if (!alive) return
      setState((st: Any) => ({
        ...st, pushReady: true, pushKey: cfg.publicKey,
        pushSupported: cfg.pushConfigured, pushState: pushSupport(), pushOn: !!endpoint,
      }))
    })()
    return () => { alive = false }
  }, [state.beSignedIn])

  /* The open job's real checklist. Loads whenever a different job is opened;
     ticks are written back one row at a time by toggleLiveStep below. */
  useEffect(() => {
    const jobId = s.beStepsJobId
    if (!backendActive() || !jobId) return
    let alive = true
    setState((st: Any) => ({ ...st, beStepsBusy: true, beStepsErr: '' }))
    getData().liveJobSteps(jobId)
      .then((rows) => {
        if (!alive) return
        setState((st: Any) => (st.beStepsJobId === jobId ? { ...st, beSteps: rows, beStepsBusy: false } : st))
      })
      .catch((e) => {
        if (!alive) return
        setState((st: Any) => (st.beStepsJobId === jobId
          ? { ...st, beSteps: [], beStepsBusy: false, beStepsErr: errMsg(e, 'Couldn’t load this checklist') }
          : st))
      })
    return () => { alive = false }
  }, [s.beStepsJobId])

  /* Thumbnails for the proof already taken on this clean.
     The bucket is private, so there is no URL to store — each one is signed for
     a few minutes when the screen opens, and again after a photo is taken. A
     failure here costs a thumbnail and nothing else: the checklist still shows
     that the photo exists, because that fact comes from the step row. */
  useEffect(() => {
    const jobId = s.beStepsJobId
    if (!backendActive() || !jobId) return
    const keys = (s.beSteps || []).map((r: Any) => r.photoKey).filter(Boolean)
    if (!keys.length) return
    let alive = true
    getData().jobPhotos(jobId)
      .then(async (photos) => {
        const wanted = photos.filter((p) => keys.indexOf(p.storageKey) >= 0)
        if (!wanted.length || !alive) return
        const r = await api.photoUrls(wanted.map((p) => p.id))
        if (!alive) return
        const byId: Any = {}
        r.photos.forEach((p) => { byId[p.id] = p.url })
        const byKey: Any = {}
        wanted.forEach((p) => { if (byId[p.id]) byKey[p.storageKey] = byId[p.id] })
        setState((st: Any) => (st.beStepsJobId === jobId
          ? { ...st, bePhotoUrls: { ...st.bePhotoUrls, ...byKey } }
          : st))
      })
      .catch(() => { /* thumbnails are a nicety; the proof itself is recorded */ })
    return () => { alive = false }
  }, [s.beStepsJobId, (s.beSteps || []).map((r: Any) => r.photoKey || '').join(',')])

  /* The real par-level inventory for the homes in view.
     Loaded once the properties are known, and reloaded when they change. RLS
     scopes it: a client sees their own homes' cupboards, staff see their org's. */
  useEffect(() => {
    if (!backendActive() || !state.beSignedIn) return
    const ids = (state.beProps || []).map((p: Any) => p.id)
    if (!ids.length) { setState((st: Any) => ({ ...st, beSuppliesReady: true })); return }
    let alive = true
    getData().supplyItems(ids)
      .then((rows) => { if (alive) setState((st: Any) => ({ ...st, beSupplies: rows, beSuppliesReady: true })) })
      .catch(() => { if (alive) setState((st: Any) => ({ ...st, beSuppliesReady: true })) })
    return () => { alive = false }
  }, [state.beSignedIn, (state.beProps || []).map((p: Any) => p.id).join(',')])

  /* An invitation was opened — from the link she sent, or from a code the
     person pasted in. Either way the token is the credential, so this runs
     before any sign-in. */
  useEffect(() => {
    const token = state.inviteToken
    if (!token) return
    let alive = true
    if (!backendActive()) {
      setState((st: Any) => ({
        ...st, inviteLoading: false,
        invitePreview: { studio: 'She’s Maid In ATL', fullName: 'Mrs. Ridgeview', email: null, phone: null,
          properties: [{ name: 'Ridgeview Home', neighborhood: 'Sandy Springs', type: 'residential', beds: 4, baths: 3 }],
          agreedPrice: 380, cadence: 'Weekly' },
      }))
      return
    }
    api.invitePreview(token)
      .then((p) => { if (alive) setState((st: Any) => ({ ...st, inviteLoading: false, invitePreview: p, inviteEmail: p.email || '' })) })
      .catch((e) => { if (alive) setState((st: Any) => ({ ...st, inviteLoading: false, inviteError: errMsg(e, 'That link isn’t valid any more.') })) })
    return () => { alive = false }
  }, [state.inviteToken]) // eslint-disable-line react-hooks/exhaustive-deps

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
      phoneSub: 'How she reaches you on the day',
      signInLine: (s.suEmail || '').trim() || 'jh@hartwellgroup.com',
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
      // Review-only. They exist for the ?chrome=1 showcase, which is off on a
      // live build; guarded here too so nothing can call them into a role the
      // signed-in account doesn't have.
      goVisitor: () => { if (!props.liveApp) set({ role: 'visitor', hist: [], menuOpen: false }) },
      goCleaner: () => { if (!props.liveApp) set({ role: 'cleaner', hist: [], menuOpen: false }) },
      goOwner: () => { if (!props.liveApp) set({ role: 'owner', hist: [], menuOpen: false }) },
      vWelcome: s.role === 'visitor' && s.p === 'welcome',
      vServices: s.role === 'visitor' && s.p === 'services',
      vPortfolio: s.role === 'visitor' && s.p === 'portfolio',
      vGate: s.role === 'visitor' && s.p === 'gate',
      cToday: s.role === 'cleaner' && s.c === 'today',
      cMap: s.role === 'cleaner' && s.c === 'map',
      cJob: s.role === 'cleaner' && s.c === 'job',
      cSupplies: s.role === 'cleaner' && s.c === 'supplies',
      cShare: s.role === 'cleaner' && s.c === 'share',
      cQuote: false, // set below, once the role is known
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
      goQuote: () => {}, // set below, once the role is known
      goProfile: () => go({ c: 'profile', cTab: 3 }),
      goOwnerHome: () => go({ role: 'owner', o: 'home', oTab: 0 }),
      goProducts: () => go({ o: 'products' }),
      goReport: () => go({ o: 'report', oTab: 1 }),
      goOnboard: () => go({ role: 'owner', o: 'onboard' }),
      cleanerTabs: [{ icon: '🏠', label: 'Today' }, { icon: '✅', label: 'Active' }, { icon: '💬', label: 'Inbox' }, { icon: '👤', label: 'My Week' }],
      ownerTabs: [{ icon: '🏡', label: 'Homes' }, { icon: '📋', label: 'Reports' }, { icon: '🧴', label: 'Supplies' }, { icon: '💬', label: 'Messages' }],
      cTab: s.cTab, oTab: s.oTab,
      // The Active tab opens whatever job is actually in play. On a live account
      // that means the real one — never the seed showcase clean.
      pickCTab: (i: number) => set((st: Any) => ({
        cTab: i, c: ['today', 'job', 'inbox', 'profile'][i], hist: [], menuOpen: false,
        ...(i === 1 && !st.beStepsJobId && st.beActiveJobId ? { beStepsJobId: st.beActiveJobId } : {}),
      })),
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

    /* ================= who is signed in =================================
       One place the whole app reads its identity from. Live accounts get their
       own name, initials and role; with no backend it stays the seed persona so
       the demo still reads as Ahleyia's studio.

       This exists because the name was hardcoded in a dozen places: every
       cleaner she hires saw "Ahleyia Kee · Founder" on their own profile, and
       every client's home said "James". */
    const signedInUser = backendActive() && s.beSignedIn ? s.beUser : null
    const nameFromEmail = (email?: string) => {
      const local = (email || '').split('@')[0].split(/[.+_-]/).filter(Boolean)
      if (!local.length) return ''
      return local.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }
    const initialsOf = (name: string) => {
      const parts = name.trim().split(/\s+/).filter(Boolean)
      if (!parts.length) return '·'
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    const myRole: string = signedInUser?.role || (s.role === 'owner' ? 'owner' : 'org_admin')
    const iAmAdmin = myRole === 'org_admin'
    const iAmCleanerOnly = myRole === 'cleaner'
    const seedStaffName = 'Ahleyia Kee'
    const myName = signedInUser
      ? (signedInUser.fullName || nameFromEmail(signedInUser.email) || 'Your account')
      : (s.role === 'owner' ? clientFull : seedStaffName)
    v.me = {
      name: myName,
      first: myName.split(' ')[0],
      initials: signedInUser ? initialsOf(myName) : (s.role === 'owner' ? clientInitials : 'AK'),
      email: signedInUser?.email || (s.role === 'owner' ? clientEmail : 'ahleyia@atlluxurycleaning.com'),
      phone: signedInUser?.phone || (s.role === 'owner' ? undefined : '404.259.3242'),
      role: myRole,
      // The same rule the view switcher uses, so the menu, the screens and the
      // switcher can never disagree about what this account is.
      isAdmin: mayRunBusiness({ liveApp: backendActive(), signedIn: !!signedInUser, role: (signedInUser?.role as any) ?? null })
        || (!signedInUser && s.role !== 'owner'),   // the demo persona owns the business
      isCleanerOnly: signedInUser ? iAmCleanerOnly : false,
      isOwner: myRole === 'owner',
      // What it says under their name on their own profile.
      title: signedInUser
        ? (iAmAdmin ? 'Founder · Lead Housekeeper' : (iAmCleanerOnly ? 'Housekeeper · Kee Method™ certified' : 'Client'))
        : (s.role === 'owner' ? 'Client' : 'Founder · Lead Housekeeper'),
    }
    v.meName = v.me.name
    v.meInitials = v.me.initials
    v.meTitle = v.me.title
    v.meIsAdmin = v.me.isAdmin
    v.meIsCleanerOnly = v.me.isCleanerOnly
    v.meLine = v.me.title + (v.me.phone ? ' · ' + v.me.phone : '')
    // "Ahleyia · admin" was baked in. Say who is actually signed in.
    const adminView = ['admin', 'team', 'clients', 'bizsettings', 'area', 'assign', 'calendar'].indexOf(s.c) >= 0
    v.roleLabel = s.role === 'visitor'
      ? 'Visitor · no account'
      : (s.role === 'cleaner'
        ? v.me.first + ' · ' + (adminView && v.me.isAdmin ? 'admin' : 'staff')
        : v.me.first + ' · client')
    v.meFirst = v.me.first
    // Her chips are the founder's; a cleaner she hired gets their own.
    v.meChips = v.me.isAdmin
      ? [chip('me1', 'turn', '⭐ 4.98 rating'), chip('me2', 'ghost', '312 cleans'), chip('me3', 'deep', '👑 Admin')]
      : [chip('me1', 'refresh', '✓ Kee Method™ certified'), chip('me2', 'ghost', 'Housekeeper')]
    // Real team, so "1 assistant" isn't a fixture on an account with three.
    const myTeam: Any[] = backendActive() && s.beSignedIn ? (s.beStaff || []) : []
    const others = myTeam.filter((u: Any) => u.id !== s.beUser?.id)
    v.teamSub = backendActive() && s.beSignedIn
      ? (others.length
        ? others.length + (others.length === 1 ? ' other person' : ' others') + ' · splits · access'
        : 'Just you so far · add someone')
      : '1 assistant · splits · access'
    // The real team on the Team screen. Someone she added who hasn't claimed
    // their link yet is shown as invited rather than as a working cleaner.
    if (backendActive() && s.beSignedIn) {
      v.liveTeam = others.map((u: Any) => {
        const nm = (u.fullName || nameFromEmail(u.email) || 'Team member').trim()
        const invited = u.onboardingState === 'invited'
        return {
          id: u.id, name: nm, initials: initialsOf(nm),
          sub: (u.role === 'org_admin' ? 'Admin & housekeeper' : 'Housekeeper')
            + (invited ? ' · invite not claimed yet' : ''),
          chip: invited ? chip('tm' + u.id, 'low', 'Invite sent') : chip('tm' + u.id, 'refresh', '✓ Active'),
        }
      })
      v.liveTeamEmpty = others.length === 0
    }

    /* ================= the real day: jobs, checklist, scheduling =========
       These read rows that exist in Postgres. With no backend configured
       `liveWork` is false, every live field below stays undefined, and the
       screens fall back to the seed showcase — the demo is untouched. */
    const liveWork = backendActive() && s.beSignedIn && !!s.beUser
    const liveStaffWork = liveWork && s.beUser.role !== 'owner'
    const propById: Any = {}
    ;(s.beProps || []).forEach((p: Any) => { propById[p.id] = p })
    const clientById: Any = {}
    ;(s.beClients || []).forEach((c: Any) => { clientById[c.id] = c })
    const clientName = (id: string) => {
      const u = clientById[id]
      return (u?.fullName || (u?.email || '').split('@')[0] || 'Client').trim()
    }
    const jobType = (j: Any) => j.type === 'turnover' ? 'Turnover' : (j.type === 'deep' ? 'Deep clean' : 'Refresh clean')
    const jobTone = (j: Any) => j.type === 'turnover' ? 'turn' : 'refresh'
    const timeOf = (iso?: string) => {
      if (!iso) return null
      const d = new Date(iso)
      if (isNaN(d.getTime())) return null
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    }
    // "Jul 30, 12:31 PM" — used where a report has to say exactly when.
    const fullWhen = (iso?: string) => {
      if (!iso) return ''
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return ''
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', '
        + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    }
    const dayKey = (iso?: string) => {
      if (!iso) return ''
      const d = new Date(iso)
      if (isNaN(d.getTime())) return ''
      return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()
    }
    const PROGRESS: Any = { scheduled: 0, in_progress: 55, complete: 100, cancelled: 0 }
    const PROGRESS_LABEL: Any = { scheduled: 'Not started', in_progress: 'In progress', complete: 'Complete · report sent', cancelled: 'Cancelled' }

    v.scopeOpts = ['Whole home', 'Main level', 'Bathrooms only', 'Kitchen & living', 'Bonus / guest areas', 'A loved one’s home'].map((label) => ({
      label, on: !!s.scopes[label],
      pick: () => setState((st: Any) => ({ ...st, scopes: { ...st.scopes, [label]: !st.scopes[label] } })),
    }))
    v.sqftOpts = ['< 1,500 sq ft', '1,500–2,500', '2,500–4,000', '4,000+'].map((label) => ({ label, on: s.sqft === label, pick: () => set({ sqft: label }) }))
    v.cadenceOpts = ['One-time', 'Weekly', 'Biweekly', 'Monthly'].map((label) => ({ label, on: s.cadence === label, pick: () => set({ cadence: label }) }))
    /* The client's own standard for their own home. On a live account it is
       read from the `properties` row; `scentTouched` lets an unsaved pick win
       over the stored value while they are still on the screen. */
    const liveOwnerNow = backendActive() && s.beSignedIn && s.beUser?.role === 'owner'
    const prefHomes: Any[] = liveOwnerNow ? (s.beProps || []) : []
    const prefHome = prefHomes[0] || null
    const storedScent = prefHome ? scentLabel(prefHome.signatureScent) : null
    const effScent = s.scentTouched || !storedScent ? s.scent : storedScent
    v.scentOpts = SCENTS.map((code) => scentLabel(code)).map((label) => ({ label, on: effScent === label, pick: () => set({ scent: label, scentTouched: true }) }))
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

    /* ---- Products & scent ----
       How a home is cleaned is the client's own choice about their own home, so
       on a live account it comes from — and goes back to — the `properties`
       row, not from seed state. Before this, the screen was pure showcase: it
       announced a fictional home in its header ("Skyline Loft 12B"), offered
       toggles that started from demo defaults rather than the client's actual
       standard, and said "Preferences saved 🌿" while saving nothing.
       Telling someone their choice was recorded when it wasn't is the worst of
       those three. */
    // The preference is per home. With one home this edits that one; the screen
    // says as much when there are several, rather than silently editing the first.
    const liveHomes = prefHomes
    const liveEco = prefHome ? isEco(prefHome.productPreference) : null

    v.eco = liveEco == null ? s.eco : (s.ecoTouched ? s.eco : liveEco)
    v.notEco = !v.eco
    v.pickEco = () => set({ eco: true, ecoTouched: true })
    v.pickStdProd = () => set({ eco: false, ecoTouched: true })
    v.productsSubtitle = liveOwnerNow
      ? productsSubtitle(liveHomes.map((p: Any) => p.name))
      : 'Skyline Loft 12B · how your home is cleaned'
    v.productsMultiple = liveHomes.length > 1
    // The one-line summary on the home screen, from the same source.
    v.prefsLine = prefHome
      ? prefsLine(prefHome.productPreference, prefHome.signatureScent)
      : prefsLine(s.eco ? 'eco_non_toxic' : 'standard_disinfectant', scentValue(s.scent))
    v.savePrefs = async () => {
      if (!liveOwnerNow || !prefHome) { go({ o: 'home', oTab: 0 }); say('Preferences saved 🌿'); return }
      const scentPick = effScent
      try {
        set({ beBusy: true })
        // Every home this client owns, so the standard is theirs and not a
        // per-property surprise on the next booking.
        await Promise.all(liveHomes.map((p: Any) => getData().setPropertyPrefs(p.id, {
          productPreference: productValue(v.eco),
          signatureScent: scentValue(scentPick),
        })))
        const fresh = await getData().properties(s.beUser.id).catch(() => null)
        setState((t: Any) => ({
          ...t, beBusy: false, ecoTouched: false, scentTouched: false,
          ...(fresh ? { beProps: fresh } : {}),
        }))
        go({ o: 'home', oTab: 0 })
        say('Preferences saved 🌿')
      } catch (e) {
        set({ beBusy: false })
        say(errMsg(e, 'Couldn’t save that just now'))
      }
    }
    v.listingUrl = s.listingUrl
    v.setListing = (e: any) => set({ listingUrl: e.target.value })
    v.detect = () => {
      const u = s.listingUrl.trim().toLowerCase()
      const known = ['airbnb', 'zillow', 'trulia', 'redfin', 'vrbo'].some((h) => u.indexOf(h) >= 0)
      if (!known) { set({ detectFailed: true, detected: false }); say('Couldn’t read that link — fill it in by hand'); return }
      set({ detected: true, detectFailed: false }); say('Listing detected ✓')
    }
    // The listing-URL detection step is a showcase flow — it announces a
    // specific Midtown loft. A live client adds a home manually.
    v.detected = s.detected && !(backendActive() && s.beSignedIn)
    v.consent = s.consent
    v.setConsent = (n: boolean) => set({ consent: n })
    v.addProperty = async () => {
      if (!s.consent) { say('Please authorize the payment terms first'); return }
      const liveOwner = backendActive() && s.beSignedIn && s.beUser?.role === 'owner'
      if (!liveOwner) { go({ o: 'home', oTab: 0 }); say('Property added · card saved 💳'); return }
      const u = s.beUser || {}
      if (!u.id || !u.orgId) { say('Your account isn’t linked to the business yet — ask the studio'); return }
      const url = (s.listingUrl || '').toLowerCase()
      const type = /airbnb|vrbo/.test(url) ? 'airbnb' : 'residential'
      const name = (s.manualName || '').trim() || (s.suHood ? s.suHood + ' home' : 'My home')
      try {
        set({ beBusy: true })
        await getData().createProperty({
          orgId: u.orgId, ownerId: u.id, name, type,
          neighborhood: s.suHood || undefined,
          beds: parseInt(s.beds, 10) || undefined, baths: parseInt(s.baths, 10) || undefined,
          sourceUrl: s.listingUrl || undefined,
          productPreference: s.eco ? 'eco_non_toxic' : 'standard_disinfectant',
        })
        const props = await getData().properties(u.id)
        setState((t: Any) => ({ ...t, beBusy: false, beProps: props, o: 'home', oTab: 0, hist: [], listingUrl: '', manualName: '', detected: false, detectFailed: false, consent: false }))
        say('Property added ✓')
      } catch (e) { set({ beBusy: false }); say(errMsg(e, 'Couldn’t add the property — try again')) }
    }
    v.approved = s.approved
    v.approveLabel = s.approved ? '✓ Approved · final 50% released' : 'Approve service & release payment'
    v.finalHalfLabel = s.approved ? '✓ Final 50% released' : 'Final 50% — release on approval'
    v.approve = async () => {
      if (s.approved) return
      if (!backendActive() || !s.beActiveJobId) {
        set({ approved: true })
        say(s.tip && s.tip !== 'No tip' ? 'Approved — final 50% released + tip 💕' : 'Approved — final 50% released 💕')
        return
      }
      try {
        set({ beBusy: true })
        const base = s.beJobs.find((j: Any) => j.id === s.beActiveJobId)?.clientAmount ?? 0
        const tip = parseTip(s.tip, base)
        const r = await api.approve({ jobId: s.beActiveJobId, tip })
        setState((st: Any) => ({ ...st, beBusy: false, approved: true }))
        say(r.tipCharged ? 'Approved — final 50% released + tip 💕' : 'Approved — final 50% released 💕')
      } catch (e) { set({ beBusy: false }); say(errMsg(e, 'Approval failed — try again')) }
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

    /* ---- the real cupboard, and the trip to Instacart ----
       Nobody types a shopping list. Each home holds a par level per item and a
       count of what is actually there; the gap is the reorder. Two things it is
       deliberately NOT: it does not place an order (there is no Instacart
       partnership, and payment stays the owner's own inside their own account),
       and it does not send linens to a supermarket — those are supplierOnly and
       route to the linen supplier instead.

       The link is an ordinary https://instacart.com address, which is what makes
       it open the APP: those are universal links, so a phone with Instacart
       installed hands the URL to it, and one without falls back to the web. An
       instacart:// scheme would do the first and fail the second. */
    if (backendActive() && s.beSignedIn) {
      const grocer = getGroceryAdapter()
      const all: Any[] = s.beSupplies || []
      const props: Any[] = s.beProps || []
      const open = (url: string) => {
        // Leaves the app on a phone, which is the point — they finish in
        // Instacart. noopener so the opened tab can't reach back in.
        try { window.open(url, '_blank', 'noopener,noreferrer') } catch { say('Couldn’t open Instacart just now') }
      }

      const setOnHand = (row: Any, n: number) => {
        const next = Math.max(0, Math.round(n))
        setState((st: Any) => ({
          ...st, beSupplies: st.beSupplies.map((x: Any) => x.id === row.id ? { ...x, onHand: next } : x),
        }))
        getData().setSupplyOnHand(row.id, next).catch((e: any) => {
          // Put the count back — the number on screen must not disagree with
          // the number in the database.
          setState((st: Any) => ({
            ...st, beSupplies: st.beSupplies.map((x: Any) => x.id === row.id ? { ...x, onHand: row.onHand } : x),
          }))
          say(errMsg(e, 'Couldn’t save that count'))
        })
      }

      const sendToInstacart = async (propertyId: string, name: string) => {
        const mine = all.filter((x: Any) => x.propertyId === propertyId)
        const toBuy = groceryPart(mine as any)
        if (!toBuy.length) { say('Nothing below par at ' + name + ' ✓'); return }
        const handoff = grocer.buildHandoff(toBuy.map((i) => ({ name: i.name, quantity: shortBy(i) })))
        // Recorded first, so there's a history even if they abandon the cart.
        try {
          await getData().createReorder({
            propertyId, status: 'flagged',
            items: reorderLines(mine as any),
          })
        } catch { /* the handoff still happens — the list is the point */ }
        open(handoff.url)
        say(handoff.itemCount + (handoff.itemCount === 1 ? ' item' : ' items') + ' → Instacart 🛒')
      }

      const seedFor = async (propertyId: string, name: string) => {
        try {
          setState((st: Any) => ({ ...st, beSupplyBusy: propertyId }))
          const rows = await getData().seedSupplies(propertyId, STARTER_SUPPLIES as any)
          setState((st: Any) => ({ ...st, beSupplyBusy: '', beSupplies: st.beSupplies.concat(rows) }))
          say(rows.length + ' items set up for ' + name + ' ✓')
        } catch (e) {
          setState((st: Any) => ({ ...st, beSupplyBusy: '' }))
          say(errMsg(e, 'Couldn’t set that inventory up'))
        }
      }

      const liveUnits = props.map((p: Any) => {
        const mine = all.filter((x: Any) => x.propertyId === p.id)
        const t = tally(mine as any)
        const low = lowItems(mine as any)
        const linens = supplierPart(mine as any)
        return {
          id: p.id,
          name: p.name || 'Home',
          sub: (p.neighborhood ? '📍 ' + p.neighborhood + ' · ' : '')
            + (mine.length ? mine.length + ' tracked' : 'No inventory yet'),
          lowChip: mine.length
            ? (t.low ? chip('sl' + p.id, 'low', t.low + ' low') : chip('sl' + p.id, 'refresh', 'At par'))
            : chip('sl' + p.id, 'ghost', 'Not set up'),
          note: mine.length
            ? (t.low
              ? 'Count what’s in the cupboard — anything under its par level goes on the list.'
              : 'Everything is at par. Nothing to send.')
            : 'This home has no inventory yet. Set up the standard par-stock and adjust it as you go.',
          // Linens are a supplier order, not groceries; said out loud so nobody
          // goes looking for sheet sets at a supermarket.
          maintLine: linens.length
            ? '🛏 ' + linens.length + (linens.length === 1 ? ' linen item' : ' linen items')
              + ' below par — those go to the linen supplier, not Instacart.'
            : '🛏 Linens at par.',
          items: mine.map((it: Any, i: number) => ({
            id: it.id, icon: it.icon || '🧴', name: it.name,
            sub: 'Par ' + it.parLevel + ' · ' + it.onHand + ' on hand'
              + (isLow(it as any) ? ' · short ' + shortBy(it as any) : ''),
            flag: isLow(it as any) ? chip('sf' + it.id, 'low', 'LOW') : null,
            level: null,
            onHand: it.onHand,
            setOnHand: (n: number) => setOnHand(it, n),
            // One tap per line is how a list is actually shopped — a single
            // search box cannot hold fifteen different products.
            openItem: it.supplierOnly ? null : () => open(grocer.buildItemLink({ name: it.name, quantity: shortBy(it as any) })),
            supplierOnly: !!it.supplierOnly,
            last: i === mine.length - 1,
          })),
          empty: mine.length === 0,
          busy: s.beSupplyBusy === p.id,
          seed: () => seedFor(p.id, p.name || 'this home'),
          send: () => sendToInstacart(p.id, p.name || 'this home'),
          canSend: t.grocery > 0,
          sendLabel: t.grocery
            ? 'Send ' + t.grocery + (t.grocery === 1 ? ' item' : ' items') + ' to Instacart'
            : 'Nothing below par',
        }
      })

      v.liveSupplies = true
      v.liveSuppliesReady = s.beSuppliesReady
      v.liveUnits = liveUnits
      v.liveNoHomes = props.length === 0
      const allT = tally(all as any)
      v.liveSupplyNote = props.length === 0
        ? 'Add a home first — inventory is tracked per home.'
        : (allT.total === 0
          ? 'No inventory yet. Set up a home’s standard par-stock below, then count what’s actually there.'
          : (allT.low
            ? allT.low + (allT.low === 1 ? ' item' : ' items') + ' below par'
              + (allT.supplier ? ' · ' + allT.supplier + ' of them linens (supplier, not Instacart)' : '')
              + '. Tap a line to open it in Instacart, or send the whole list.'
            : 'Every home is at par. Nothing to reorder.'))
      v.liveSupplyTone = props.length === 0 || allT.total === 0 ? 'pink' : (allT.low ? 'warn' : 'money')
      v.liveInstacartNote = 'Instacart opens in its own app. You pick the store, the delivery window and pay there — nothing is charged through this app, and no card is shared with it.'
    }

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

    /* ---- live messaging: one real thread per client, both sides ----
       thread_key = owner:<ownerId>. RLS lets the owner read rows where
       owner_id = self, and staff read every row in the org, so the same rows
       serve both sides of the conversation. */
    const liveOwnerMsg = backendActive() && s.beSignedIn && s.beUser?.role === 'owner'
    const liveStaffMsg = backendActive() && s.beSignedIn && !!s.beUser && s.beUser.role !== 'owner'
    if (liveOwnerMsg || liveStaffMsg) {
      const me = s.beUser
      const fmt = (iso: string) => {
        const d = new Date(iso); let h = d.getHours(); const suf = h >= 12 ? 'p' : 'a'
        h = h % 12 || 12
        return h + ':' + String(d.getMinutes()).padStart(2, '0') + suf
      }
      const rows = (s.beMsgs || []).map((m: Any) => ({
        text: m.body, time: fmt(m.createdAt), photo: false, stamp: undefined,
        mine: m.senderId === me.id, theirs: m.senderId !== me.id,
      }))
      v.threadMsgs = rows
      v.hasMsgs = true; v.noMsgs = false

      // Who the thread belongs to: the owner themself, or the client staff picked.
      const threadOwnerId = liveOwnerMsg ? me.id : (s.beThreadOwner || null)
      const clientOf = (id: string) => (s.beClients || []).find((c: Any) => c.id === id)
      const nameOf = (u: Any) => u ? (u.fullName || (u.email || '').split('@')[0] || u.phone || 'Client') : 'Client'

      if (liveStaffMsg) {
        // Inbox = one row per real client; opening loads that client's thread.
        const openClientThread = async (cid: string) => {
          set({ beThreadOwner: cid, c: 'thread', draft: '', beBusy: true })
          try {
            const msgs = await getData().messages(threadKeyForOwner(cid))
            setState((t: Any) => ({ ...t, beMsgs: msgs, beBusy: false }))
          } catch (e) { set({ beBusy: false }); say(errMsg(e, 'Couldn’t load that conversation')) }
        }
        v.inboxRows = (s.beClients || []).map((c: Any, i: number, arr: Any[]) => ({
          icon: (nameOf(c)[0] || 'C').toUpperCase(), iconStyle: v.jhTile, name: nameOf(c),
          sub: c.email || c.phone || 'Client', right: '›', last: i === arr.length - 1,
          onClick: () => openClientThread(c.id),
        }))
        v.threadTitle = nameOf(clientOf(threadOwnerId as string))
        v.threadSub = 'Client · your conversation'
      } else {
        v.threadTitle = 'She’s Maid In ATL'
        v.threadSub = 'Ahleyia & the studio'
        const last = rows[rows.length - 1]
        v.liveThreadPreview = last ? last.text : 'Start the conversation — she reads every message'
        v.liveThreadWhen = last ? last.time : ''
      }
      v.threadBadge = chip('lm0', 'onBrand', rows.length ? rows.length + ' message' + (rows.length === 1 ? '' : 's') : 'New conversation')

      const sendLive = async (text: string) => {
        const ownerId = threadOwnerId
        if (!me?.orgId) { say('Your account isn’t linked to the business yet'); return }
        if (!ownerId) { say('Pick a client to write to first'); return }
        try {
          set({ beBusy: true })
          await getData().sendMessage({ orgId: me.orgId, threadKey: threadKeyForOwner(ownerId), senderId: me.id, ownerId, body: text })
          const msgs = await getData().messages(threadKeyForOwner(ownerId))
          setState((t: Any) => ({ ...t, beMsgs: msgs, draft: '', beBusy: false }))
          say('Message sent 💬')
        } catch (e) { set({ beBusy: false }); say(errMsg(e, 'Couldn’t send that message')) }
      }
      v.sendLiveMessage = sendLive
      v.sendDraft = () => { const t = s.draft.trim(); if (!t) { say('Write a message first ✏️'); return } sendLive(t) }
      v.quickReplies = (liveStaffMsg
        ? ['On my way 🚗', 'Photos sent 📸', 'All set — unit secured']
        : ['Thank you! 💕', 'Please add extra towels', 'See you next turnover']
      ).map((label) => ({ label, send: () => sendLive(label) }))
      v.sendCompose = () => { const t = s.draft.trim(); if (!t) { say('Add a message before sending ✏️'); return } sendLive(t) }
    }
    /* ---- what each person wants to hear about ----
       The toggles write `users.notify_prefs`, which is the same map the server
       checks before it sends anything. Absent means yes, so turning something
       ON deletes the key rather than storing true — a person who never touched
       a toggle and a person who turned everything back on behave identically. */
    const prefBucket = (which: 'onotif' | 'cnotif') => (which === 'onotif' ? s.onotif : s.cnotif)
    const savePref = (which: 'onotif' | 'cnotif', key: string, next: boolean) => {
      setState((st: Any) => ({ ...st, [which]: { ...st[which], [key]: next } }))
      if (!backendActive() || !s.beUser?.id) return
      // Merge over whatever the account already had: this screen only shows
      // some of the keys, and it must not wipe the others.
      const merged: Any = { ...(s.beUser.notifyPrefs || {}) }
      if (next) delete merged[key]; else merged[key] = false
      getData().saveNotifyPrefs(s.beUser.id, merged)
        .then(() => setState((st: Any) => ({ ...st, beUser: { ...st.beUser, notifyPrefs: merged } })))
        .catch((e: any) => {
          setState((st: Any) => ({ ...st, [which]: { ...st[which], [key]: !next } }))
          say(errMsg(e, 'Couldn’t save that setting'))
        })
    }
    const prefRow = (which: 'onotif' | 'cnotif') => (n: { key: string; label: string }) => {
      // Live accounts read the saved map; the demo reads its own local state.
      const live = backendActive() && !!s.beUser
      const on = live ? (s.beUser.notifyPrefs || {})[n.key] !== false : !!prefBucket(which)[n.key]
      return { label: n.label, on, toggle: () => savePref(which, n.key, !on) }
    }
    v.ownerNotifs = [
      { key: 'reports', label: 'Photo-verified report when a clean is submitted' },
      { key: 'cleaning', label: '“On her way”, “cleaning now” and “guest-ready”' },
      { key: 'approvals', label: 'When a clean is waiting on your approval' },
      { key: 'bookings', label: 'When a clean is booked or moved' },
      { key: 'supplies', label: 'Supply approvals & delivery confirmations' },
      { key: 'summary', label: 'Monthly service summary by email' },
    ].map(prefRow('onotif'))
    v.cleanerNotifs = [
      { key: 'bookings', label: 'New booking requests & leads from my card' },
      { key: 'approvals', label: 'Owner approvals & released payments' },
      { key: 'payouts', label: 'Payouts released to you' },
      { key: 'clients', label: 'When a client finishes setting up their account' },
      { key: 'supplies', label: 'Supply approvals from owners' },
    ].map(prefRow('cnotif'))
    /* ---- turning notifications on for THIS device ----
       Web Push is per browser, not per account: a notice reaches whichever
       devices have registered. The notification row exists either way, so
       declining here costs you nothing except the phone buzzing. */
    v.pushReady = s.pushReady
    v.pushOn = s.pushOn
    v.pushBusy = s.pushBusy
    v.pushMsg = s.pushMsg
    v.pushOffered = backendActive() && s.pushReady && !!s.pushSupported && s.pushState !== 'unsupported'
    v.pushNeedsInstall = s.pushState === 'needs-install'
    v.pushBlocked = s.pushState === 'denied'
    v.pushLabel = s.pushOn ? 'Notifications are on' : 'Turn on notifications'
    v.pushSub = s.pushOn
      ? 'This device buzzes for “on her way”, reports and approvals.'
      : (s.pushState === 'needs-install'
        ? 'Add the app to your home screen first — iPhone only allows it there.'
        : (s.pushState === 'denied'
          ? 'Blocked in your browser settings. Your notices still appear in the app.'
          : 'Get them on your phone, not just in the app.'))
    v.togglePush = async () => {
      if (s.pushBusy) return
      if (s.pushOn) {
        set({ pushBusy: true, pushMsg: '' })
        const endpoint = await disablePush()
        if (endpoint) { try { await api.unregisterPush(endpoint) } catch { /* row goes on the next send */ } }
        setState((t: Any) => ({ ...t, pushBusy: false, pushOn: false }))
        say('Notifications off for this device')
        return
      }
      set({ pushBusy: true, pushMsg: '' })
      const r = await enablePush(s.pushKey)
      if (!r.ok) {
        const why = r.reason === 'denied'
          ? 'Your browser is blocking notifications — turn them on for this site in its settings.'
          : (r.reason === 'needs-install'
            ? 'On iPhone, add the app to your home screen first, then turn this on.'
            : (r.reason === 'no-key'
              ? 'Notifications aren’t set up on the server yet.'
              : (r.detail || 'Couldn’t turn on notifications')))
        setState((t: Any) => ({ ...t, pushBusy: false, pushState: pushSupport(), pushMsg: why }))
        return
      }
      try {
        await api.registerPush(r.subscription)
        setState((t: Any) => ({ ...t, pushBusy: false, pushOn: true, pushState: 'granted', pushMsg: '' }))
        say('Notifications on 🔔')
      } catch (e) {
        setState((t: Any) => ({ ...t, pushBusy: false, pushMsg: errMsg(e, 'Couldn’t register this device') }))
      }
    }

    v.toastInvite = () => say('Invite link copied 💌')
    v.signOut = async () => {
      const admin = ['admin', 'team', 'clients', 'bizsettings', 'area', 'assign', 'calendar'].indexOf(s.c) >= 0
      if (backendActive()) { try { await beSignOut() } catch { /* local session already cleared */ } }
      setState((t: Any) => ({
        ...t, beSignedIn: false, beUser: null, beCard: null, beJobs: [], beProps: [], beActiveJobId: null,
        role: 'visitor', p: admin ? 'adminlogin' : 'welcome', hist: [], menuOpen: false,
      }))
      say('Signed out 👋')
    }

    // 24 · arrival check-in
    v.cCheckin = s.role === 'cleaner' && s.c === 'checkin'
    v.goCheckin = () => go({ c: 'checkin', checkin: 'ready' })
    v.ciReady = s.checkin === 'ready'
    v.ciDone = s.checkin === 'done'
    v.ciDeclined = s.checkin === 'declined'
    v.checkinBadge = chip('k1', 'onBrand', s.checkin === 'declined' ? '⏳ Payment held' : (s.checkin === 'done' ? '✓ Checked in · 11:06 AM' : 'You’re within the geofence ✓'))
    v.ciRows = [{ label: 'Owner charged, in full', value: '$220.00' }, { label: 'Your 50%, released now', value: '$110.00' }]
    v.doCheckin = async () => {
      if (!backendActive() || !s.beActiveJobId) { set({ checkin: 'done' }); say('$110 released to you 💰'); return }
      try {
        set({ beBusy: true }); say('Confirming you’re at the property…')
        const device = await getPosition()
        const r = await api.checkIn({ jobId: s.beActiveJobId, device })
        setState((st: Any) => ({ ...st, beBusy: false, checkin: 'done' }))
        say('$' + r.arrivalReleased.toFixed(2) + ' released to you 💰')
      } catch (e: any) {
        set({ beBusy: false })
        if (e?.code === 'CAPTURE_FAILED' || e?.code === 'NON_CREDIT') { set({ checkin: 'declined' }); say(errMsg(e)) }
        else say(errMsg(e, 'Check-in failed — try again'))
      }
    }
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

    /* ---- live quotes (client side) — the real quote Ahleyia sent ----
       Quotes are staff-write only under RLS, so accepting replies on the
       thread rather than writing the quote row from the browser. */
    if (backendActive() && s.beSignedIn && s.beUser?.role === 'owner') {
      const live = (s.beQuotes || [])[0]
      v.liveQuote = live || null
      // No real quote yet → the screen must not show the seed "Ridgeview home ·
      // prepared for James". An honest empty state instead.
      v.quoteEmpty = !live
      if (live) {
        v.quotePrice = '$' + Number(live.clientAmount).toFixed(0)
        v.quotePriceSub = '$' + Number(live.clientAmount).toFixed(0) + ' per clean' + (live.cadence ? ' · ' + live.cadence : '')
        v.quoteScopeAction = 'From Ahleyia'
        v.qAccepted = live.status === 'accepted' || s.quote === 'accepted'
        v.qNew = !v.qAccepted
        v.acceptQuote = async () => {
          if (!s.consent) { say('Please authorize the payment terms first'); return }
          set({ quote: 'accepted' })
          if (v.sendLiveMessage) await v.sendLiveMessage('I accept the quote of $' + Number(live.clientAmount).toFixed(0) + '. Ready to book.')
          say('Accepted — Ahleyia has been notified 🎉')
        }
      }
    }

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

    // The stamp on a photo the client just attached — the actual time, not a
    // fixed one from the showcase.
    v.nowStamp = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

    const liveSignedIn = backendActive() && s.beSignedIn
    /* Rates. On a live account, no per-studio pricing is stored yet, so showing
       "$50/hr floor · deep $65" states a specific price the cleaner never set.
       A live account is prompted to set their own; the demo keeps the example
       figures so the showcase reads fully. */
    if (liveSignedIn) {
      v.rateRuleLine = 'Set your residential pricing'
      v.rateStdLine = 'Tap to set your standard rate'
      v.rateDeepLine = 'Tap to set your deep-clean rate'
      v.rateRulesLine = 'Not set yet — tap to set your rates'
    } else {
      v.rateRuleLine = 'Residential pricing — the $50/hr rule, made tappable'
      v.rateStdLine = '$50/hr floor · starting default'
      v.rateDeepLine = '$65/hr · starting default'
      v.rateRulesLine = '$50/hr floor · deep $65 · 40% assistant split · defaults'
    }

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

    // ---- live data (owner) — real properties from the signed-in account ----
    // When live, the Home screen reads real properties (or the empty state);
    // otherwise it keeps the seed showcase, so the demo is unchanged.
    v.liveOwner = backendActive() && s.beSignedIn && s.beUser?.role === 'owner'

    /* ---- the business's own name, wherever the studio is shown ----
       "She's Maid In ATL" was hardcoded on the admin dashboard, business
       settings and the share card. That is Ahleyia's studio — but an
       independent cleaner running their own book has their own studio name, and
       the app never loaded it. Now it comes from the signed-in account's
       organization; the seed name stays only for the design showcase. */
    v.bizName = liveSignedIn ? (s.beOrg?.name || 'Your studio') : 'She’s Maid In ATL'
    v.bizContactEmail = liveSignedIn ? (s.beOrg?.contactEmail || s.beUser?.email || '') : 'AtlLuxuryCleaning.com'
    v.bizContactPhone = liveSignedIn ? (s.beOrg?.contactPhone || s.beUser?.phone || '') : '404.259.3242'
    if (liveSignedIn) {
      // Business settings, from what the studio actually has — not the seed
      // studio's bank, contact, neighborhoods and "You & Tiana".
      const staffN = (s.beStaff || []).length || 1
      const clientN = (s.beClients || []).length
      const hoods = Array.from(new Set((s.beProps || []).map((p: Any) => p.neighborhood).filter(Boolean)))
      v.bizLive = true
      v.bizSubtitle = v.bizName + (s.beUser?.role === 'org_admin' ? '' : '')
      v.bizBankLine = 'Not set up yet — payments switch on when you connect a payout account'
      v.bizCardLine = v.bizContactEmail || v.bizContactPhone || 'Add your contact details'
      v.bizAreaLine = hoods.length ? hoods.slice(0, 4).join(' · ') : 'Add a client to set your area'
      v.bizStaffLine = staffN <= 1 ? 'Just you for now' : staffN + ' people · routes, checklists, own pay'
      v.bizClientsLine = clientN === 0 ? 'No clients yet' : clientN + (clientN === 1 ? ' account' : ' accounts') + ' · their own homes only'
      v.bizBrandName = v.bizName
    } else {
      v.bizLive = false
      v.bizSubtitle = 'She’s Maid In ATL · Metro Atlanta'
      v.bizBankLine = 'Bank ···· 8821 · instant payouts on'
      v.bizCardLine = 'AtlLuxuryCleaning.com · 404.259.3242'
      v.bizAreaLine = 'Buckhead · Midtown · Sandy Springs · +3'
      v.bizStaffLine = 'You & Tiana · routes, checklists, own pay'
      v.bizClientsLine = '9 accounts · their own homes only'
      v.bizBrandName = 'She’s M.I.A Housekeeping'
    }
    // The digital card shows the account's OWN studio + contact, not Ahleyia's.
    const shareWho = liveSignedIn ? (v.me?.name || 'You') : 'Ahleyia Kee'
    const shareReach = [v.bizContactEmail, v.bizContactPhone].filter(Boolean).join(' · ')
    v.shareContact = liveSignedIn
      ? (shareWho + (shareReach ? ' · ' + shareReach : ''))
      : 'AtlLuxuryCleaning.com · Ahleyia Kee · 404.259.3242'
    v.sharePromo = liveSignedIn
      ? ('They get: “' + shareWho + ' with ' + v.bizName + ' — see my services & book: [link]”')
      : 'They get: “Ahleyia with She’s Maid In ATL — see my services & get your tailored quote: [link]”'

    /* ---- the client's Service Report, from their own cleans ----
       This screen was entirely showcase: it announced "The Hartwell Estate ·
       Today, 12:31 PM", claimed 26/26 steps and 9 proof photos, and stated that
       a card had been charged $220 — to a client who has never been charged
       anything, because payments are deferred. Inventing a charge is the worst
       of it, so the money block now tells the truth or says nothing. */
    if (v.liveOwner) {
      const mine: Any[] = (s.beJobs || []).slice().sort((a: Any, b: Any) =>
        String(b.windowStart || '').localeCompare(String(a.windowStart || '')))
      // The report is about a finished clean. An in-progress one has nothing to
      // report yet, and saying otherwise is how a report stops being evidence.
      const done = mine.filter((j: Any) => j.status === 'complete')
      const job = done[0] || null
      const prop = job ? (s.beProps || []).find((p: Any) => p.id === job.propertyId) : null
      // reports are hydrated already and carry the counts the screen needs
      const rep = job ? (s.beReports || []).find((r: Any) => r.jobId === job.id) || null : null
      const charged = job ? (s.beCharges || []).filter((c: Any) => c.jobId === job.id) : []

      v.liveReport = true
      v.reportEmpty = !job
      v.reportSubtitle = job
        ? (prop?.name || 'Your home') + ' · ' + (fullWhen(job.finishedAt || job.windowEnd || job.windowStart) || 'recently')
        : 'No completed cleans yet'
      v.reportSteps = rep && rep.stepsTotal ? rep.stepsDone + '/' + rep.stepsTotal : '—'
      const shotCount = rep ? Number(rep.photoCount || 0) : 0
      v.reportPhotoCount = String(shotCount)
      v.reportHasPhotos = shotCount > 0
      v.reportGalleryLabel = shotCount ? 'See all ' + shotCount : ''
      v.reportRefMatch = !!rep?.referenceMatch
      // Payments are not switched on. Rather than describe a charge that never
      // happened, say what is actually true for this clean.
      v.reportCharged = charged.length
        ? charged.map((c: Any) => ({ label: c.kind || 'Charge', amount: '$' + Number(c.amount || 0).toFixed(2) }))
        : []
      v.reportMoneyLine = charged.length
        ? 'Charged once on arrival, as agreed. Approving releases the rest — it never charges again.'
        : 'Nothing has been charged for this clean. Card payments switch on when the studio connects its payment account.'
      v.reportEmptyLine = 'Once a clean is finished, its photos, timeline and Kee Method™ checklist arrive here — and stay, so you always have the record.'
    }
    if (v.liveOwner) {
      const homes = (s.beProps || []).map((p: Any, i: number) => {
        const bb = [p.beds ? p.beds + ' bed' : null, p.baths ? p.baths + ' bath' : null].filter(Boolean).join(' · ')
        const typeLabel = p.type === 'airbnb' ? 'Airbnb' : (p.type === 'residential' ? 'Residential' : 'Home')
        return {
          key: p.id || i,
          name: p.name,
          sub: [p.neighborhood, typeLabel].filter(Boolean).join(' · ') || typeLabel,
          metas: [mt('lh' + i + 'a', '🛏', bb || 'Details pending'), mt('lh' + i + 'b', '🏠', typeLabel)],
          badge: chip('lh' + i, 'onBrand', 'No cleans yet'),
        }
      })
      v.ownerHomes = homes
      v.hasHomes = homes.length > 0
      v.noHomes = homes.length === 0
      v.ownerEmailReal = s.beUser?.email || ''
      // Greet + identify the real account, not the seed persona.
      const en = (s.beUser?.email || '').split('@')[0].split(/[.+]/)[0]
      const liveName = s.beUser?.fullName || (en ? en.charAt(0).toUpperCase() + en.slice(1) : 'You')
      v.clientGreeting = liveName
      v.clientFull = liveName
      v.clientInitials = liveName.slice(0, 2).toUpperCase()
      v.accountTitle = liveName + '’s account'
      // The seed persona leaked into a couple of headings ("James's schedule").
      const liveFirst = liveName.split(' ')[0]
      v.scheduleTitle = liveFirst + '’s schedule'
      v.clientAddress = liveName
      if (s.beUser?.email) v.clientEmail = s.beUser.email
      // No phone on the account is the normal case now — signing in never used
      // one. Say so instead of showing a seed number.
      v.clientPhone = s.beUser?.phone || 'No number yet'
      v.phoneSub = s.beUser?.phone
        ? 'How she reaches you on the day'
        : 'Optional — add one and she can text you on the day'
      v.signInLine = s.beUser?.email || 'Your email'
      v.clientTypeLine = 'Client · ' + (s.beUser?.email || '')
      v.livePropsLine = homes.length ? homes.map((h: Any) => h.name).join(' · ') : 'None yet — add your first'
      v.livePropCount = homes.length + (homes.length === 1 ? ' property' : ' properties')
      // Real card on file (from save-card / hydrate), else none.
      v.liveCard = s.beCard ? { brand: s.beCard.brand, last4: s.beCard.last4, line: (s.beCard.brand || 'Card') + ' ···· ' + s.beCard.last4 } : null
    }

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

    /* ---- 31 · notifications ----
       On a live account this is the real feed: rows written by the studio and
       by the functions, newest first, with the unread ones marked. In the demo
       it stays the lock-screen showcase below. */
    v.vNotifs = s.role === 'visitor' && s.p === 'notifs'
    v.vSplash = s.role === 'visitor' && s.p === 'splash'
    v.vNotices = (s.role === 'owner' && s.o === 'notices') || (s.role === 'cleaner' && s.c === 'notices')
    v.goNotices = () => go(s.role === 'owner' ? { o: 'notices' } : { c: 'notices' })
    const liveNotices = backendActive() && s.beSignedIn && !!s.beUser
    if (liveNotices) {
      const rows: Any[] = s.beNotices || []
      const ICON_FOR: Any = {
        on_the_way: '🚗', arrived: '✨', report_ready: '📋', approval_due: '📋',
        booked: '📅', quote_ready: '🧮', message: '💬', invite_claimed: '👤',
        payout: '💰', supplies: '🛒', card_declined: '💳',
      }
      v.liveNoticeFeed = true
      v.feedCards = rows.map((n: Any) => ({
        id: n.id, icon: ICON_FOR[n.kind] || '✨',
        when: agoLabel(n.createdAt), title: n.title, body: n.body || '',
        unread: !n.read, open: () => openNotice(n),
      }))
      v.feedUnread = rows.filter((n: Any) => !n.read).length
      v.feedBadge = v.feedUnread
        ? chip('nt0', 'turn', v.feedUnread + ' unread')
        : chip('nt0', 'onBrand', 'All caught up')
      v.feedSub = s.pushOn
        ? 'On this phone and in the app'
        : 'Everything the app has told you'
      // A quiet nudge at the top of Home / Today when something is waiting.
      v.unreadNudge = v.feedUnread
        ? { count: v.feedUnread, label: v.feedUnread === 1 ? '1 new notification' : v.feedUnread + ' new notifications', go: () => go(s.beUser?.role === 'owner' ? { role: 'owner', o: 'notices' } : { role: 'cleaner', c: 'notices' }) }
        : null
      v.feedEmpty = s.beNoticesReady && rows.length === 0
      v.feedLoading = !s.beNoticesReady
      v.markAllRead = async () => {
        if (!rows.some((n: Any) => !n.read)) return
        setState((st: Any) => ({ ...st, beNotices: st.beNotices.map((n: Any) => ({ ...n, read: true })) }))
        try { await getData().markNotificationsRead() } catch { /* they'll still show unread next load */ }
      }
    }
    v.pushCards = [
      { icon: '🚗', when: 'now', title: 'Ahleyia is on her way', body: 'She’ll be at The Hartwell Estate around 11:00.' },
      { icon: '✨', when: '2m ago', title: 'Your home is guest-ready ✨', body: '9 proof photos and your report are inside.' },
      { icon: '🧮', when: '18m ago', title: 'Your quote is ready', body: 'Tailored to the spaces you chose. Tap to see it.' },
      { icon: '📋', when: '1h ago', title: 'Approve today’s clean', body: 'Her final half releases on its own in 36 hours.' },
      { icon: '🛒', when: '3h ago', title: 'Supplies approved & ordered', body: '13 items on the way to units 1604, 1403 and 1913.' },
      { icon: '💰', when: 'Wed', title: 'Payout landed: $110', body: 'Your 50% for the Hartwell arrival. Nice work.' },
    ]
    // Demo (no backend): the notifications screen shows the same showcase
    // notices as the lock-screen mock, so it is never an empty shell.
    if (!liveNotices) {
      v.feedCards = v.pushCards.map((p: Any, i: number) => ({
        id: 'demo' + i, icon: p.icon, when: p.when, title: p.title, body: p.body,
        unread: i < 3, open: () => say('Opens straight to what it’s about'),
      }))
      v.feedUnread = 3
      v.feedBadge = chip('nt0', 'turn', '3 unread')
      v.feedSub = 'Everything the app has told you'
      v.markAllRead = () => say('All caught up ✓')
    }

    /* ---- client & staff sign-in: email + password ----
       Texted one-time codes are gone. They needed an SMS provider wired up
       and a per-message cost before anyone could get in at all, and a client
       whose account Ahleyia created already sets a password on their invite
       link — so a password is the thing they actually have. */
    v.gateEmail = s.gateEmail
    v.setGateEmail = (e: any) => set({ gateEmail: e.target.value })
    v.gatePw = s.gatePw
    v.setGatePw = (e: any) => set({ gatePw: e.target.value })
    v.gatePwType = s.gatePwShown ? 'text' : 'password'
    v.gatePwToggle = s.gatePwShown ? 'Hide' : 'Show'
    v.toggleGatePw = () => set({ gatePwShown: !s.gatePwShown })
    v.gateErr = s.gateErr
    v.beBusy = s.beBusy
    v.gateSignIn = async () => {
      const em = (s.gateEmail || '').trim().toLowerCase()
      if (em.indexOf('@') < 0) { set({ gateErr: 'Your email address, please.' }); return }
      if ((s.gatePw || '').length < 6) { set({ gateErr: 'Your password is at least 6 characters.' }); return }
      if (!backendActive()) { set({ gateErr: '' }); go({ role: 'owner', o: 'setup', oTab: 0 }); say('Welcome back ✓'); return }
      try {
        set({ beBusy: true, gateErr: '' })
        await signInWithPassword(em, s.gatePw)
        const h = await hydrate()
        setState((st: Any) => ({
          ...st, beBusy: false, gatePw: '', beSignedIn: true, beUser: h.user, beCard: h.card,
          beJobs: h.jobs, beProps: h.properties, beClients: h.clients, beActiveJobId: h.activeJobId ?? null,
          beMsgs: h.messages, beQuotes: h.quotes, beReports: h.reports, beCharges: h.charges,
        }))
        const r = h.user?.role
        if (r === 'owner') go({ role: 'owner', o: 'home', oTab: 0 })
        else go({ role: 'cleaner', c: r === 'org_admin' ? 'admin' : 'today', cTab: 0 })
        say('Welcome back ✓')
      } catch (e) { set({ beBusy: false, gateErr: errMsg(e, 'That email and password didn’t match') }) }
    }

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
    // The template is the Kee Method reference (product content). Its "open a
    // job" shortcut points at seed homes, so on a live account it becomes "open
    // your current clean" and routes to the real checklist.
    v.tplShowOpen = !liveSignedIn
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
    v.adminEmailShown = s.adminEmail.trim() || 'ahleyia@atlluxurycleaning.com'
    v.adminSignIn = async () => {
      const em = s.adminEmail.trim().toLowerCase()
      if (em.indexOf('@') < 0) { say('Your business email, please'); return }
      if (s.adminPw.length < 6) { say('Password is at least 6 characters'); return }
      if (!backendActive()) {
        if (em.indexOf('atlluxurycleaning.com') < 0) { say('That isn’t the business account — try staff or client sign in'); return }
        go({ role: 'cleaner', c: 'admin' }); say('Welcome back, Ahleyia 👑'); return
      }
      try {
        set({ beBusy: true })
        await signInWithPassword(em, s.adminPw)
        const h = await hydrate()
        setState((st: Any) => ({ ...st, beBusy: false, beSignedIn: true, beUser: h.user, beCard: h.card, beJobs: h.jobs, beActiveJobId: h.activeJobId ?? null }))
        // Route by the user's real role: a client (owner) who signs in here still
        // lands in the client view, not the admin one.
        const r = h.user?.role
        if (r === 'owner') { go({ role: 'owner', o: 'home', oTab: 0 }); say('Welcome back 💕') }
        else { go({ role: 'cleaner', c: r === 'org_admin' ? 'admin' : 'today', cTab: 0 }); say('Welcome back 👑') }
      } catch (e) { set({ beBusy: false }); say(errMsg(e, 'That sign-in didn’t work')) }
    }
    v.adminForgot = () => say('Reset link sent to your business email 💌')
    v.goStaffSignIn = () => go({ p: 'gate' })

    // 59 · public sign-up — email + a password they choose. No texted code.
    v.vSignup = s.role === 'visitor' && s.p === 'signup'
    v.goSignup = () => go({ p: 'signup', suStep: 1 })
    const su = s.suStep
    for (let i = 1; i <= 3; i++) v['su' + i] = su === i
    v.suTitle = ['Create your account', 'A few details', 'You’re in'][su - 1]
    v.suSub = ['Two minutes, and nothing charged', 'Where your reports go, and where she’s cleaning', 'Account created — welcome'][su - 1]
    v.suBadge = chip('su9', 'onBrand', su === 3 ? '✓ Account created' : 'Step ' + su + ' of 3')
    v.suPct = Math.round(su / 3 * 100)
    v.suPctLabel = Math.round(su / 3 * 100) + '%'
    v.suStepLabel = ['You', 'Details', 'Done'][su - 1]
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
    v.suPw = s.suPw
    v.setSuPw = (e: any) => set({ suPw: e.target.value })
    v.suPwType = s.suPwShown ? 'text' : 'password'
    v.suPwToggle = s.suPwShown ? 'Hide' : 'Show'
    v.toggleSuPw = () => set({ suPwShown: !s.suPwShown })
    v.suErr = s.suErr
    v.suConfirmNote = s.suNeedsConfirm
    v.suBtnVariant = su >= 2 ? 'green' : 'primary'
    v.suNextLabel = ['Continue', 'Create my account', 'Add my home'][su - 1]
    v.suBack = () => su > 1 ? go({ suStep: su - 1 }) : go({ p: 'welcome' })
    v.suNext = async () => {
      if (su === 1) {
        if (!s.suName.trim()) { set({ suErr: 'Your name first.' }); return }
        if (!s.suEmail.trim() || s.suEmail.indexOf('@') < 0) { set({ suErr: 'An email for your reports.' }); return }
        if ((s.suPw || '').length < 8) { set({ suErr: 'Pick a password of at least 8 characters.' }); return }
        set({ suStep: 2, suErr: '' }); return
      }
      if (su === 2) {
        if (!s.suAddress.trim()) { set({ suErr: 'Where is she cleaning?' }); return }
        if (!s.suTerms) { set({ suErr: 'Please agree to the terms to continue.' }); return }
        if (!backendActive()) { set({ suStep: 3, suErr: '' }); say('Account created 🎉'); return }
        // Creates a real auth user. The DB trigger gives them a `users` row as
        // an owner with no org — Ahleyia connects them to the studio.
        try {
          set({ beBusy: true, suErr: '' })
          const r = await signUpWithPassword(s.suEmail.trim().toLowerCase(), s.suPw, { full_name: s.suName.trim() })
          if (r.needsConfirmation) {
            setState((t: Any) => ({ ...t, beBusy: false, suStep: 3, suNeedsConfirm: true }))
            say('Check your email to confirm 💌'); return
          }
          const h = await hydrate()
          setState((t: Any) => ({
            ...t, beBusy: false, suStep: 3, suPw: '', suNeedsConfirm: false,
            beSignedIn: true, beUser: h.user, beCard: h.card, beJobs: h.jobs, beProps: h.properties,
          }))
          say('Account created 🎉')
        } catch (e) { set({ beBusy: false, suErr: errMsg(e, 'Couldn’t create that account') }) }
        return
      }
      go({ role: 'owner', o: 'setup', oTab: 0, setup: { verify: true } })
    }

    // 57 · cleaner account builder
    /* ---- "I'm a cleaner with an invite" ----
       She adds a cleaner, which provisions their account and produces a
       one-time link. If they have the link they just open it. If they only have
       the code (she read it out, it got mangled by a messaging app), this takes
       it and drops them into the same claim flow.

       There is deliberately no way for a stranger to create a staff account for
       themselves: anyone who could would be inside her business, able to read
       client homes and access notes. Her invitation IS the authorization. */
    v.vInviteEntry = s.role === 'visitor' && s.p === 'invitecode'
    v.goInviteEntry = () => go({ p: 'invitecode', inviteEntry: '', inviteEntryErr: '' })
    v.inviteEntry = s.inviteEntry
    v.setInviteEntry = (e: any) => set({ inviteEntry: e.target.value, inviteEntryErr: '' })
    v.inviteEntryErr = s.inviteEntryErr
    v.useInviteCode = () => {
      // Accepts the whole link, a link with tracking parameters, or the bare
      // code. See src/lib/invite.ts — tested, so a mistyped code is caught here
      // rather than sent to the server as a guess.
      const r = parseInviteInput(s.inviteEntry)
      if (!r.ok) { set({ inviteEntryErr: INVITE_PARSE_MESSAGE[r.reason] }); return }
      setState((t: Any) => ({ ...t, inviteToken: r.token, inviteLoading: true, inviteError: '', invitePreview: null, p: 'invite', inviteEntryErr: '' }))
    }

    /* ---- "I clean for a living" — their own book, not her team ----
       The invite flow above is for someone Ahleyia hires: she authorizes them,
       and they work her jobs. This is for an independent contractor who found
       the app on their own. Nobody hired them, so nobody has to authorize them
       — but they don't join her studio either. They get their own, with one
       person in it, and their client book is theirs. She never sees it.

       Signing up cannot make you staff (0011: the trigger ignores any role in
       the metadata, precisely so a stranger can't ask to be an admin). So this
       creates an ordinary account and then calls `become-contractor`, which
       creates a NEW organization — never an existing one — and promotes them
       inside it. */
    v.vProSignup = s.role === 'visitor' && s.p === 'prosignup'
    v.goProSignup = () => go({
      p: 'prosignup', proName: '', proEmail: '', proPw: '', proStudio: '',
      proTerms: false, proErr: '', proDone: false, proNeedsConfirm: false,
    })
    v.proName = s.proName
    v.setProName = (e: any) => set({ proName: e.target.value, proErr: '' })
    v.proEmail = s.proEmail
    v.setProEmail = (e: any) => set({ proEmail: e.target.value, proErr: '' })
    v.proPw = s.proPw
    v.setProPw = (e: any) => set({ proPw: e.target.value, proErr: '' })
    v.proPwType = s.proPwShown ? 'text' : 'password'
    v.proPwToggle = s.proPwShown ? 'Hide' : 'Show'
    v.toggleProPw = () => set({ proPwShown: !s.proPwShown })
    v.proStudio = s.proStudio
    v.setProStudio = (e: any) => set({ proStudio: e.target.value, proErr: '' })
    v.proTerms = s.proTerms
    // Takes the new value from the checkbox rather than flipping a captured
    // one — same shape as the client sign-up's terms box.
    v.setProTerms = (n: boolean) => set({ proTerms: n, proErr: '' })
    v.proErr = s.proErr
    v.proDone = s.proDone
    v.proNeedsConfirm = s.proNeedsConfirm
    // What their studio will be called, shown back to them before they commit.
    v.proStudioShown = s.proStudio.trim()
      || ((s.proName || '').trim() ? (s.proName || '').trim() + '’s housekeeping' : 'My housekeeping')
    v.proBtnLabel = s.beBusy ? 'Setting up…' : 'Start my studio'
    v.proSubmit = async () => {
      if (!s.proName.trim()) { set({ proErr: 'Your name first.' }); return }
      if (!s.proEmail.trim() || s.proEmail.indexOf('@') < 0) { set({ proErr: 'An email — it’s your sign-in.' }); return }
      if ((s.proPw || '').length < 8) { set({ proErr: 'Pick a password of at least 8 characters.' }); return }
      if (!s.proTerms) { set({ proErr: 'Please agree to the terms to continue.' }); return }
      if (!backendActive()) { set({ proDone: true, proErr: '' }); say('Studio created 🎉'); return }
      try {
        set({ beBusy: true, proErr: '' })
        // Parked first: if Supabase holds the account back for confirmation the
        // promotion has to happen on their first real sign-in instead.
        try { window.localStorage.setItem(PRO_INTENT, s.proStudio.trim()) } catch { /* private mode */ }
        const r = await signUpWithPassword(s.proEmail.trim().toLowerCase(), s.proPw, { full_name: s.proName.trim() })
        if (r.needsConfirmation) {
          setState((t: Any) => ({ ...t, beBusy: false, proDone: true, proNeedsConfirm: true, proPw: '' }))
          say('Check your email to confirm 💌'); return
        }
        const res = await api.becomeContractor(s.proStudio.trim() ? { studioName: s.proStudio.trim() } : {})
        try { window.localStorage.removeItem(PRO_INTENT) } catch { /* private mode */ }
        const h = await hydrate()
        setState((t: Any) => ({
          ...t, beBusy: false, proDone: true, proPw: '', proNeedsConfirm: false,
          proStudio: res.studioName,
          beSignedIn: true, beUser: h.user, beCard: h.card, beJobs: h.jobs,
          beProps: h.properties, beClients: h.clients, beStaff: h.staff, beBlocks: h.blocks, beOrg: h.org,
        }))
        say('Your studio is live 🎉')
      } catch (e) {
        try { window.localStorage.removeItem(PRO_INTENT) } catch { /* private mode */ }
        set({ beBusy: false, proErr: errMsg(e, 'Couldn’t set that up') })
      }
    }
    // Into their own business side — the same app Ahleyia runs, their numbers.
    v.proEnter = () => go({ role: 'cleaner', c: 'admin', cTab: 0, p: 'welcome' })

    v.vStaffSetup = s.role === 'visitor' && s.p === 'staffsetup'
    v.goStaffSetup = () => go({ p: 'invitecode', inviteEntry: '', inviteEntryErr: '' })
    v.previewStaffWalkthrough = () => go({ p: 'staffsetup', staffStep: 1 })
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
    // The walkthrough is what setting up LOOKS like. On a live deployment it
    // cannot hand out a working account — that comes from claiming her
    // invitation — so it says so instead of dropping them into someone's day.
    v.staffWalkthroughOnly = backendActive() && !s.beSignedIn
    v.enterStaffApp = () => {
      if (v.staffWalkthroughOnly) { go({ p: 'invitecode', inviteEntry: '', inviteEntryErr: '' }); return }
      go({ role: 'cleaner', c: 'today', cTab: 0 }); say('Welcome to the team 🎉')
    }
    v.enterStaffLabel = v.staffWalkthroughOnly ? 'Set up with my invitation' : 'Open my working day'

    // 58 · owner account builder
    v.oSetup = s.role === 'owner' && s.o === 'setup'
    v.goSetup = () => go({ o: 'setup' })
    v.goOwnerSetup = () => go({ role: 'owner', o: 'setup', oTab: 0 })
    v.previewStaffSetup = () => go({ role: 'visitor', p: 'staffsetup', staffStep: 1 })
    const tileDone = { background: 'var(--gradient-eco)', color: '#fff', fontWeight: 600, fontSize: '15px' }
    const tileTodo = { background: 'var(--surface-cream)', color: 'var(--ink-soft)', fontWeight: 600, fontSize: '15px' }
    const SETUP = [
      { id: 'notify', name: 'Turn on notifications', sub: 'On her way · report ready · approvals', go: () => go({ o: 'notices' }) },
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
    // The real account's first name when signed in, the seed persona otherwise.
    const firstName = String(v.clientGreeting || clientFirst).split(' ')[0]
    v.setupTitle = setupDone >= SETUP.length ? 'You’re all set, ' + firstName : 'Finish your account, ' + firstName
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
    // Handing a clean off is only real if there IS someone to hand it to. The
    // seed offered "Send Tiana instead" — a fake assistant. On a live account
    // the option only appears when the studio actually has another cleaner, and
    // it names them; a solo cleaner just sees the reschedule choices.
    const otherCleaners = liveSignedIn
      ? (s.beStaff || []).filter((u: Any) => u.role === 'cleaner' && u.id !== s.beUser?.id && u.fullName)
      : [{ id: 'tiana', fullName: 'Tiana Jones' }]
    const handoff = otherCleaners[0] || null
    const baseMoveOptions = [
      { id: 'later', icon: '⏱', name: 'Push the window today', sub: 'A later window the same day', right: 'Later today' },
      { id: 'tomorrow', icon: '📅', name: 'Move to tomorrow', sub: 'First window, 8 – 10 AM', right: 'Tomorrow' },
    ]
    if (handoff) baseMoveOptions.push({ id: 'handoff', icon: '🧽', name: 'Send ' + handoff.fullName.split(' ')[0] + ' instead', sub: 'Certified in The Kee Method™', right: 'Today' })
    v.moveOptions = baseMoveOptions.map((o, i, arr) => ({ icon: o.icon, name: o.name, sub: o.sub, last: i === arr.length - 1, right: s.moveOption === o.id ? chip('mo' + o.id, 'refresh', '✓ ' + o.right) : chip('mo' + o.id, 'ghost', o.right), pick: () => set({ moveOption: o.id }) }))
    const handoffName = handoff ? handoff.fullName.split(' ')[0] : ''
    v.moveNote = s.moveNote
    v.setMoveNote = (e: any) => set({ moveNote: e.target.value })
    v.movePlaceholder = s.moveOption === 'handoff' ? handoffName + ' is covering your clean today — same standard, same photos…' : 'So sorry — running behind this morning. Can I come to a later window instead?'
    v.moveConfirmLabel = s.moveOption === 'handoff' ? 'Send ' + handoffName + ' & notify the owner' : 'Move it & notify the owner'
    v.confirmMove = () => { if (!s.moveOption) { say('Pick how you want to cover it'); return } set({ mv: 'done' }); say('Owner notified — no charge to them ✓') }
    v.mvDoneCopy = s.moveOption === 'handoff' ? handoffName + ' has the job, the home’s standard and the photo steps. The owner knows they’re coming.' : 'The owner has the new window and knows there’s no charge for the change.'

    /* 47–50 · admin side.
       Gated on the ROLE, not on where the state happens to be: the menu hides
       these destinations from a cleaner, and a cleaner whose state somehow
       lands on one of them gets their own day instead of the studio's books. */
    const mayAdmin = v.me.isAdmin
    v.aDash = mayAdmin && s.role === 'cleaner' && s.c === 'admin'
    v.aTeam = mayAdmin && s.role === 'cleaner' && s.c === 'team'
    // A contractor's own book is theirs — the Clients screen is scoped below.
    v.aClients = s.role === 'cleaner' && s.c === 'clients'
    v.aSettings = mayAdmin && s.role === 'cleaner' && s.c === 'bizsettings'
    // Rates, margins and the assistant split live in the Quote Builder. The
    // Team screen says these "can't be granted" — so they are the admin's.
    v.cQuote = mayAdmin && s.role === 'cleaner' && s.c === 'quote'
    v.goQuote = () => { if (mayAdmin) go({ c: 'quote' }) }
    v.isAdmin = mayAdmin && ['admin', 'team', 'clients', 'bizsettings'].indexOf(s.c) >= 0
    v.notAdmin = !v.isAdmin
    v.goAdmin = () => { if (mayAdmin) go({ c: 'admin' }) }
    v.goTeam = () => { if (mayAdmin) go({ c: 'team' }) }
    v.goClients = () => { if (mayAdmin) go({ c: 'clients' }) }
    v.goBizSettings = () => { if (mayAdmin) go({ c: 'bizsettings' }) }
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
    v.aAssign = mayAdmin && s.role === 'cleaner' && s.c === 'assign'
    v.goAssign = () => { if (v.me.isAdmin) go({ c: 'assign' }) }
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
    v.calBook = async () => {
      if (dayFull) { say('That day is fully booked — try another'); return }
      const live = backendActive() && s.beSignedIn && !!s.beUser
      // Booking creates a real job (server-side; jobs have no client INSERT).
      // Owners book their own property; staff book for the selected client.
      const isOwn = s.beUser?.role === 'owner'
      const target = isOwn
        ? (s.beProps || [])[0]
        : (s.beProps || []).find((p: Any) => p.ownerId === s.beThreadOwner) || (s.beProps || [])[0]
      if (!live || !target) {
        go({ o: 'schedule' }); say('Booked · July ' + s.calDay + ', ' + pickedSlot + ' 📅'); return
      }
      // Turn the chosen window on the chosen July day into real timestamps.
      const y = new Date().getFullYear()
      const { start: startAt, end: endAt } = windowFor(y, 6, Number(s.calDay), String(pickedSlot))
      try {
        set({ beBusy: true })
        const r = await api.bookClean({
          propertyId: target.id,
          windowStart: startAt.toISOString(),
          windowEnd: endAt.toISOString(),
          staging: 'standard',
        })
        const h = await hydrate()
        setState((t: Any) => ({
          ...t, beBusy: false, beJobs: h.jobs, beProps: h.properties, beActiveJobId: h.activeJobId ?? null,
          ...(isOwn ? { o: 'schedule' } : { c: 'today', cTab: 0 }), hist: [],
        }))
        say('Booked · July ' + s.calDay + ' · $' + Number(r.clientAmount).toFixed(0) + ' 📅')
      } catch (e) { set({ beBusy: false }); say(errMsg(e, 'Couldn’t book that day — try again')) }
    }

    /* ================= a contractor's availability =======================
       Two sources, one answer: the cleans they are booked on — their own
       clients AND the ones the studio gave them, because it is one person — and
       the hours they have blocked with no job behind them.

       The rule lives in src/lib/availability.ts and is tested there. This turns
       it into the calendar and the "my availability" screen, and `book-clean`
       applies the same rule server-side so a stale calendar can't double-book
       anyone. */
    const myId = s.beUser?.id
    const myWork = liveWork
      ? (s.beJobs || []).filter((j: Any) => j.cleanerId === myId || j.createdBy === myId)
      : []
    const myBusy = liveWork
      ? busyWindows(
        myWork.map((j: Any) => ({
          id: j.id, windowStart: j.windowStart, windowEnd: j.windowEnd, status: j.status,
          propertyName: propById[j.propertyId]?.name || null,
        })),
        (s.beBlocks || []).map((b: Any) => ({ id: b.id, startsAt: b.startsAt, endsAt: b.endsAt, reason: b.reason })),
      )
      : []

    if (liveStaffWork) {
      const today0 = new Date(); today0.setHours(0, 0, 0, 0)
      const weekEnd = today0.getTime() + 7 * 864e5
      v.myBusyCount = myBusy.length
      v.myHoursBooked = Math.round(busyMinutesBetween(myBusy, today0.getTime(), weekEnd) / 60)
      v.myBlocks = (s.beBlocks || [])
        .slice()
        .sort((a: Any, b: Any) => String(a.startsAt).localeCompare(String(b.startsAt)))
        .map((b: Any, i: number, arr: Any[]) => {
          const from = new Date(b.startsAt), to = new Date(b.endsAt)
          const allDay = from.getHours() === 0 && to.getTime() - from.getTime() >= 864e5 - 1
          const day = from.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
          return {
            id: b.id, icon: '🚫', name: day,
            sub: (allDay ? 'All day' : (timeOf(b.startsAt) + '–' + timeOf(b.endsAt))) + (b.reason ? ' · ' + b.reason : ''),
            last: i === arr.length - 1,
            remove: () => removeBlock(b.id),
          }
        })
      v.myBusyRows = mergeBusy(myBusy).map((w, i, arr) => {
        const d = new Date(w.start)
        return {
          icon: '📅',
          name: d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
          sub: d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '–'
            + new Date(w.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          last: i === arr.length - 1,
        }
      })
    }

    const removeBlock = (id: string) => {
      setState((t: Any) => ({ ...t, beBlocks: t.beBlocks.filter((b: Any) => b.id !== id) }))
      getData().removeAvailabilityBlock(id).catch((e: any) => {
        say(errMsg(e, 'Couldn’t free that up — try again'))
        hydrate().then((h) => setState((t: Any) => ({ ...t, beBlocks: h.blocks }))).catch(() => {})
      })
    }

    /* ---- "I'm not available" — a day or a window, with no job behind it ---- */
    v.aAvail = s.role === 'cleaner' && s.c === 'avail'
    v.goAvail = () => go({ c: 'avail', avDay: '', avErr: '' })
    v.badgeAvail = chip('av0', 'onBrand', 'Your calendar')
    v.avDay = s.avDay
    v.setAvDay = (e: any) => set({ avDay: e.target.value, avErr: '' })
    v.avReason = s.avReason
    v.setAvReason = (e: any) => set({ avReason: e.target.value })
    v.avWholeDay = s.avWhole
    v.setAvWholeDay = (n: boolean) => set({ avWhole: n })
    v.avWindows = SLOTS.map((label) => ({ label, on: s.avSlot === label, pick: () => set({ avSlot: label }) }))
    v.avErr = s.avErr
    v.blockTime = async () => {
      const raw = (s.avDay || '').trim()
      if (!raw) { set({ avErr: 'Pick the date you’re not available.' }); return }
      const [y, m, d] = raw.split('-').map((x: string) => parseInt(x, 10))
      if (!y || !m || !d) { set({ avErr: 'That date didn’t read — use the picker.' }); return }
      let startAt: Date, endAt: Date
      if (s.avWhole) {
        startAt = new Date(y, m - 1, d, 0, 0, 0)
        endAt = new Date(y, m - 1, d + 1, 0, 0, 0)
      } else {
        const w = windowFor(y, m - 1, d, String(s.avSlot || SLOTS[1]))
        startAt = w.start; endAt = w.end
      }
      if (!backendActive() || !s.beUser?.id || !s.beUser?.orgId) {
        set({ avErr: '', avDay: '' }); say('Marked unavailable ✓'); return
      }
      try {
        set({ beBusy: true, avErr: '' })
        const b = await getData().addAvailabilityBlock({
          orgId: s.beUser.orgId, cleanerId: s.beUser.id,
          startsAt: startAt.toISOString(), endsAt: endAt.toISOString(),
          reason: (s.avReason || '').trim() || (s.avWhole ? 'Not working' : 'Unavailable'),
        })
        setState((t: Any) => ({ ...t, beBusy: false, beBlocks: t.beBlocks.concat([b]), avDay: '', avReason: '' }))
        say(s.avWhole ? 'Day marked unavailable ✓' : 'Window marked unavailable ✓')
      } catch (e) { set({ beBusy: false, avErr: errMsg(e, 'Couldn’t save that') }) }
    }

    /* ---- the real booking calendar ----
       Replaces the July-2026 fixture with actual months and the org's actual
       jobs. Staff see every clean in the org and who has it; an owner sees
       their own bookings (RLS gives them nothing else) and claims a window,
       which creates a real job through book-clean. */
    if (liveWork) {
      const now = new Date()
      const ym = s.calYM || { y: now.getFullYear(), m: now.getMonth() }
      const first = new Date(ym.y, ym.m, 1)
      const daysIn = new Date(ym.y, ym.m + 1, 0).getDate()
      const isThisMonth = ym.y === now.getFullYear() && ym.m === now.getMonth()
      const picked = s.calPick && s.calPick <= daysIn ? s.calPick : (isThisMonth ? now.getDate() : 1)
      const monthLabel = first.toLocaleDateString([], { month: 'long', year: 'numeric' })
      const step = (n: number) => {
        const d = new Date(ym.y, ym.m + n, 1)
        // Never page back past the current month — those days can't be booked.
        if (d.getFullYear() < now.getFullYear() || (d.getFullYear() === now.getFullYear() && d.getMonth() < now.getMonth())) return
        set({ calYM: { y: d.getFullYear(), m: d.getMonth() }, calPick: null })
      }
      // A contractor's calendar is their own work — the cleans assigned to them
      // and the ones they booked for their own clients. The studio owner sees
      // the organization's.
      const live = (s.beJobs || []).filter((j: Any) =>
        j.status !== 'cancelled' && j.windowStart
        && (v.me.isAdmin || s.beUser?.role === 'owner'
          || j.cleanerId === s.beUser?.id || j.createdBy === s.beUser?.id))
      const onDay = (d: number) => live.filter((j: Any) => dayKey(j.windowStart) === ym.y + '-' + (ym.m + 1) + '-' + d)
      const pickedJobs = onDay(picked)
      /* Which windows are actually free.
         For staff this is their real availability — every clean they are on,
         their own clients and the studio's, plus time off. For a client it is
         just their own bookings, because they cannot see the studio's calendar
         (RLS, correctly) and the studio confirms. */
      const dayBusy = liveStaffWork
        ? myBusy
        : busyWindows(pickedJobs.map((j: Any) => ({
          id: j.id, windowStart: j.windowStart, windowEnd: j.windowEnd, status: j.status,
          propertyName: propById[j.propertyId]?.name || null,
        })))
      const dayWindows = dayAvailability(ym.y, ym.m, picked, SLOTS, slotHours, dayBusy)
      const freeLabels = dayWindows.filter((w) => w.free).map((w) => w.label)
      const taken = (slot: string) => !freeLabels.includes(slot)
      const openSlotsLive = freeLabels
      const fullDay = dayIsFull(dayWindows)
      const chosenSlot = openSlotsLive.indexOf(s.newWindow) >= 0 ? s.newWindow : (openSlotsLive[0] || null)
      // Why a window can't be taken, so the row says something useful.
      const whyBusy: Record<string, string> = {}
      dayWindows.forEach((w) => { if (w.conflict) whyBusy[w.label] = w.conflict.reason })

      v.calMonth = monthLabel
      v.calPrev = () => step(-1)
      v.calNext = () => step(1)
      v.calBadge = chip('cal0', 'onBrand', live.length + (live.length === 1 ? ' clean booked' : ' cleans booked'))
      const cellsLive: Any[] = []
      for (let i = 0; i < first.getDay(); i++) cellsLive.push({ day: '', dots: [], bg: 'transparent', border: 'transparent', color: 'var(--text-muted)', cursor: 'default', opacity: '1', weight: '400', pick: () => {} })
      for (let d = 1; d <= daysIn; d++) {
        const list = onDay(d)
        const past = isThisMonth && d < now.getDate()
        const sel = d === picked
        const dots = (s.role === 'owner'
          ? list.map(() => 'var(--ink-soft)')
          : list.map((j: Any) => j.type === 'turnover' ? 'var(--magenta)' : 'var(--green)')).slice(0, 3)
        if (s.role !== 'owner' && list.some((j: Any) => !j.cleanerId)) dots.push('var(--orange)')
        cellsLive.push({
          day: String(d), dots: dots.slice(0, 4),
          bg: sel ? 'var(--pink-blush)' : (list.length ? 'var(--surface-cream)' : 'var(--surface-card)'),
          border: sel ? 'var(--magenta)' : 'var(--border-default)', color: sel ? 'var(--magenta-deep)' : 'var(--ink)',
          cursor: past ? 'default' : 'pointer', opacity: past ? '.35' : '1', weight: sel ? '600' : '400',
          pick: past ? () => {} : () => set({ calPick: d }),
        })
      }
      v.calCells = cellsLive
      const dayLabel = new Date(ym.y, ym.m, picked).toLocaleDateString([], { month: 'long', day: 'numeric' })
      v.calDayTitle = s.role === 'owner' ? dayLabel + ' · her times' : dayLabel
      v.calDayChip = fullDay ? chip('cd0', 'turn', 'Fully booked') : chip('cd0', 'refresh', openSlotsLive.length + (s.role === 'owner' ? ' times open' : ' windows free'))
      if (s.role === 'owner') {
        v.calDayRows = SLOTS.map((slot, i, arr) => {
          const isBusy = taken(slot)
          const chosen = chosenSlot === slot
          return { icon: isBusy ? '🔒' : '✓', tile: null, name: slot, sub: isBusy ? (whyBusy[slot] || 'Booked') : 'Available · two-hour arrival window', right: isBusy ? chip('co' + i, 'ghost', 'Booked') : (chosen ? chip('co' + i, 'refresh', '✓ Chosen') : chip('co' + i, 'refresh', 'Open')), last: i === arr.length - 1, go: isBusy ? null : () => set({ newWindow: slot }) }
        })
      } else {
        // Their windows, free and busy, so "when am I free on the 12th" is one
        // glance rather than arithmetic against a list of jobs.
        v.calWindowRows = dayWindows.map((w, i, arr) => ({
          icon: w.free ? '✓' : '🔒', name: w.label,
          sub: w.free ? 'Free' : (w.conflict?.reason || 'Busy'),
          right: w.free ? chip('cw' + i, 'refresh', 'Free') : chip('cw' + i, 'ghost', 'Busy'),
          last: i === arr.length - 1,
        }))
        v.calFreeCount = freeLabels.length
        v.calDayRows = pickedJobs.length
          ? pickedJobs.map((j: Any, i: number, arr: Any[]) => {
            const p = propById[j.propertyId] || {}
            return {
              icon: j.type === 'turnover' ? '🏠' : '🏡', tile: null,
              name: p.name || 'Property',
              sub: (timeOf(j.windowStart) || 'Time TBC') + ' · ' + (j.cleanerId ? clientName(j.ownerId) : 'needs assigning'),
              right: j.cleanerId ? chip('cr' + i, 'refresh', 'Assigned') : chip('cr' + i, 'low', 'ASSIGN'),
              last: i === arr.length - 1,
              go: () => go({ role: 'cleaner', c: 'job', cTab: 1, beStepsJobId: j.id }),
            }
          })
          : [{ icon: '✨', name: 'Nothing booked yet', sub: 'Five two-hour windows open', right: chip('cr9', 'refresh', 'Open'), last: true, go: null }]
      }

      // Which home is being booked. An owner picks from their own; staff pick
      // any property in the org, so a clean can be put on the calendar for a
      // client who called instead of tapping.
      const bookable = (s.beProps || [])
      v.calProps = bookable.map((p: Any) => ({
        label: p.name + (liveStaffWork && p.ownerId ? ' · ' + clientName(p.ownerId) : ''),
        on: s.calProp ? s.calProp === p.id : bookable[0]?.id === p.id,
        pick: () => set({ calProp: p.id }),
      }))
      const target = bookable.find((p: Any) => p.id === s.calProp) || bookable[0] || null
      v.calNoProps = bookable.length === 0
      v.calBookLabel = fullDay ? 'Pick another day' : 'Book ' + dayLabel + ' · ' + chosenSlot
      v.calBook = async () => {
        if (fullDay) { say('That day is fully booked — try another'); return }
        if (!target) { say(liveStaffWork ? 'Add a property first' : 'No home on your account yet'); return }
        const { start: startAt, end: endAt } = windowFor(ym.y, ym.m, picked, String(chosenSlot))
        try {
          set({ beBusy: true })
          const r = await api.bookClean({
            propertyId: target.id,
            windowStart: startAt.toISOString(),
            windowEnd: endAt.toISOString(),
            staging: 'standard',
          })
          const h = await hydrate()
          setState((t: Any) => ({
            ...t, beBusy: false, beJobs: h.jobs, beProps: h.properties, beActiveJobId: h.activeJobId ?? null,
            ...(s.beUser.role === 'owner' ? { o: 'schedule' } : { c: 'today', cTab: 0 }), hist: [],
          }))
          say('Booked · ' + dayLabel + ' · $' + Number(r.clientAmount).toFixed(0) + ' 📅')
        } catch (e) { set({ beBusy: false }); say(errMsg(e, 'Couldn’t book that day — try again')) }
      }
    }

    /* ---- an owner's real schedule ----
       The seed screen lists three showcase bookings. On a live account it
       lists the jobs that exist. Reschedule / add / cancel open the real
       thread with the ask written for them — Ahleyia moves it, which is how
       it actually works. */
    if (liveWork && s.beUser.role === 'owner') {
      const mine = (s.beJobs || [])
        .filter((j: Any) => j.status !== 'cancelled' && j.status !== 'complete')
        .sort((a: Any, b: Any) => String(a.windowStart || '').localeCompare(String(b.windowStart || '')))
      const askAbout = (j: Any, text: string) => () => {
        const when = j.windowStart ? new Date(j.windowStart).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) : 'my next clean'
        const p = propById[j.propertyId] || {}
        set({ threadWith: 'ahleyia', o: 'thread', draft: text.replace('{when}', when).replace('{home}', p.name || 'my home') })
      }
      v.badgeUpcoming = chip('sc0', 'onBrand', mine.length + (mine.length === 1 ? ' booked' : ' booked'))
      v.bookings = mine.map((j: Any) => {
        const p = propById[j.propertyId] || {}
        const d = j.windowStart ? new Date(j.windowStart) : null
        const when = d && !isNaN(d.getTime()) ? d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : 'Date to confirm'
        const win = timeOf(j.windowStart) ? timeOf(j.windowStart) + ' – ' + (timeOf(j.windowEnd) || '') : 'Window to confirm'
        return {
          name: p.name || 'Your home',
          service: jobType(j) + (j.ecoFinish === false ? '' : ' · eco finish'),
          note: '⏱ Two-hour arrival window. She texts when she’s on her way.',
          chip: chip('bk' + j.id, j.type === 'turnover' ? 'turn' : 'deep', j.status === 'in_progress' ? 'In progress' : when),
          metas: [mt('bm1' + j.id, '📅', when), mt('bm2' + j.id, '⏱', win), mt('bm3' + j.id, '💳', '$' + Number(j.clientAmount || 0).toFixed(0))],
          reschedule: askAbout(j, 'Could we move my clean on {when}?'),
          addService: askAbout(j, 'Could we add a service to {home} on {when}?'),
          cancel: askAbout(j, 'I need to cancel my clean on {when} — sorry for the notice.'),
        }
      })
      v.liveNoBookings = mine.length === 0
    }

    // service area
    v.aArea = mayAdmin && s.role === 'cleaner' && s.c === 'area'
    v.goArea = () => { if (v.me.isAdmin) go({ c: 'area' }) }
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
    if (liveSignedIn) {
      // The service area is the neighborhoods the studio actually has homes in,
      // not the seed's fake "Buckhead · 4 clients". Empty until they add one.
      const hoods = Array.from(new Set((s.beProps || []).map((p: Any) => p.neighborhood).filter(Boolean))) as string[]
      v.areaLive = true
      v.areaEmpty = hoods.length === 0
      v.areaRows = hoods.map((name, i, arr) => ({
        icon: '📍', name, sub: 'A home you clean here', last: i === arr.length - 1,
        right: chip('ar' + i, 'refresh', 'On'), toggle: () => {},
      }))
      v.areaEmptyLine = 'No service area yet. It fills in from where your clients’ homes are — add a client and their home, and their neighborhood shows up here.'
    } else {
      v.areaLive = false
      v.areaRows = AREAS.map((a, i, arr) => { const on = areaOn(a.id); return { icon: on ? '📍' : '○', name: a.name, sub: a.sub, last: i === arr.length - 1, right: on ? chip('ar' + a.id, 'refresh', 'On') : chip('ar' + a.id, 'ghost', 'Off'), toggle: () => setState((t: Any) => ({ ...t, areas: { ...t.areas, [a.id]: !areaOn(a.id) } })) } })
    }
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
    /* ---- live cleaner day + business numbers ----
       Jobs are created server-side (RLS has no client INSERT for jobs), so a
       live account with no scheduled work shows the honest empty route and
       real counts rather than the seed showcase. */
    if (backendActive() && s.beSignedIn && !!s.beUser && s.beUser.role !== 'owner') {
      const ljobs = s.beJobs || []
      v.hasJobs = ljobs.length > 0
      v.noJobs = ljobs.length === 0
      v.liveTodayCount = String(ljobs.length)
      v.liveClientCount = String((s.beClients || []).length)
      v.livePropCountAll = String((s.beProps || []).length)
      v.liveQuoteCount = String((s.beQuotes || []).length)
      v.todayLine = ljobs.length
        ? ljobs.length + (ljobs.length === 1 ? ' property on today’s route' : ' properties on today’s route')
        : 'No cleans scheduled yet'
    }

    if (liveWork) {
      const today = new Date()
      const todayKey = dayKey(today.toISOString())
      // A cleaner works their own route; the admin sees the whole studio's.
      // RLS lets staff read every org job (the calendar needs that), so the
      // narrowing is here, where the difference actually matters.
      const visible = (s.beJobs || []).filter((j: Any) =>
        v.me.isAdmin || s.beUser?.role === 'owner'
        || j.cleanerId === s.beUser?.id || j.createdBy === s.beUser?.id)
      const allJobs = visible.filter((j: Any) => j.status !== 'cancelled')
      const jobsToday = allJobs.filter((j: Any) => dayKey(j.windowStart) === todayKey)
      // Nothing today? Show what IS next rather than an empty screen that
      // reads like the app is broken.
      const upcoming = allJobs
        .filter((j: Any) => j.windowStart && new Date(j.windowStart).getTime() >= today.getTime())
        .sort((a: Any, b: Any) => String(a.windowStart).localeCompare(String(b.windowStart)))
      const shown = jobsToday.length ? jobsToday : upcoming.slice(0, 3)
      v.liveJobCards = shown.map((j: Any) => {
        const p = propById[j.propertyId] || {}
        const start = timeOf(j.windowStart), end = timeOf(j.windowEnd)
        // Guest-out / guest-in are a turnover's whole reason for being timed;
        // a residential clean just has an arrival window.
        const isTurn = j.type === 'turnover'
        const metas: any[] = []
        if (!isTurn && start) metas.push(mt('lj' + j.id + 'w', '⏱', 'Window ' + start + '–' + (end || '')))
        if (p.beds) metas.push(mt('lj' + j.id + 'b', '🛏', p.beds + ' bed'))
        if (p.baths) metas.push(mt('lj' + j.id + 'a', '🛁', p.baths + ' bath'))
        if (liveStaffWork && j.ownerId) metas.push(mt('lj' + j.id + 'o', '👤', clientName(j.ownerId)))
        if (!j.cleanerId && liveStaffWork) metas.push(mt('lj' + j.id + 'u', '⚠️', 'Needs assigning'))
        return {
          id: j.id,
          name: p.name || 'Property',
          address: '📍 ' + (p.neighborhood || 'Metro Atlanta'),
          type: jobType(j), tone: jobTone(j),
          guestOut: isTurn ? (start || undefined) : undefined,
          guestIn: isTurn ? (end || undefined) : undefined,
          metas,
          progress: PROGRESS[j.status] ?? 0,
          progressLabel: PROGRESS_LABEL[j.status] || 'Scheduled',
          open: () => go({ role: 'cleaner', c: 'job', cTab: 1, beStepsJobId: j.id }),
        }
      })
      v.liveHasJobsToday = jobsToday.length > 0
      v.liveNextLabel = jobsToday.length ? 'Today’s route' : (upcoming.length ? 'Coming up' : 'Nothing booked yet')
      v.liveTodayCount = String(jobsToday.length)
      if (liveStaffWork) {
        // This person's week — used by both a plain cleaner (their second tile)
        // and an admin (their money screens). Computed for everyone; the
        // isAdmin split below is only about which SECOND TILE the Today screen
        // shows, not about who gets honest money screens.
        const weekEnd = today.getTime() + 7 * 864e5
        const thisWeek = allJobs.filter((j: Any) => {
          const t = j.windowStart ? new Date(j.windowStart).getTime() : 0
          return t >= today.getTime() - 864e5 && t <= weekEnd
        })
        v.liveWeekCount = String(thisWeek.length)

        /* ---- money screens, when there is no money path ----
           Payouts, Tax and the week's earnings were showing $4,280 released,
           $110 awaiting approval and $58,140 of yearly income. None of it is
           real: card payments are deferred, so nothing has ever been charged or
           released. Invented earnings are worse than a blank screen — a
           contractor could plan around them, and a 1099 figure especially is not
           something to make up. A live account gets the truth instead.
           Applies to EVERY live staff account, admin or not — an independent
           cleaner running their own studio is exactly who was still seeing the
           fake $4,280. */
        v.liveMoney = true
        v.liveMoneyOff = true
        v.liveMoneyLine = 'Payments aren’t switched on yet. Nothing has been charged to a client and nothing has been released to you — so there is nothing to show here. Your cleans and their times are all recorded, and become the record the moment payments go live.'
        v.liveEarningsValue = '—'
        v.liveEarningsLabel = 'Not enabled yet'
        // Photo-verified: the share of this week's finished cleans that actually
        // carry proof, rather than a flat 100%.
        const wk = thisWeek.filter((j: Any) => j.status === 'complete')
        const withProof = wk.filter((j: Any) => (s.beReports || []).some((r: Any) => r.jobId === j.id && Number(r.photoCount || 0) > 0))
        v.livePhotoVerified = wk.length ? Math.round(withProof.length / wk.length * 100) + '%' : '—'

        /* ---- the inbox, from real threads ----
           It listed a Hartwell conversation and a $110 payout notice, to a
           contractor who has neither. A thread per client they actually work
           with, and an honest empty state before that. */
        v.liveInbox = true
        const seenOwner: Record<string, boolean> = {}
        v.liveThreads = (s.beJobs || [])
          .filter((j: Any) => j.ownerId && (j.cleanerId === s.beUser?.id || j.createdBy === s.beUser?.id))
          .filter((j: Any) => (seenOwner[j.ownerId] ? false : (seenOwner[j.ownerId] = true)))
          .map((j: Any) => {
            const who = clientName(j.ownerId) || 'Client'
            return {
              id: j.ownerId,
              name: who,
              initials: who.split(' ').filter(Boolean).slice(0, 2).map((x: string) => x[0]).join('').toUpperCase() || '?',
              preview: (propById[j.propertyId]?.name || 'Their home'),
              when: timeOf(j.windowStart) || '',
              open: () => go({ c: 'thread', threadWith: 'owner:' + j.ownerId, draft: '' }),
            }
          })

        // The client count is the studio's number, shown to an admin. A plain
        // cleaner's second Today tile is their own week instead.
        if (!v.me.isAdmin) {
          v.liveClientCount = null
        }
        v.hasJobs = shown.length > 0
        v.noJobs = shown.length === 0
        v.todayLine = jobsToday.length
          ? today.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
            + ' · ' + jobsToday.length + (jobsToday.length === 1 ? ' property' : ' properties') + ' on today’s route'
          : (upcoming.length ? 'Nothing today — your next clean is below' : 'No cleans scheduled yet')
        // The route map, the assign screen and the seed check-in banner all
        // describe homes that don't exist on a live account.
        v.hideSeedRoute = true

        /* ---- the business dashboard, on real numbers ---- */
        v.chipJulyBiz = chip('ad2', 'ghost', today.toLocaleDateString([], { month: 'long', year: 'numeric' }))
        v.liveJobCountAll = String(allJobs.length)
        const needAssign = allJobs.filter((j: Any) => !j.cleanerId && j.status === 'scheduled')
        const toInvite = (s.beClients || []).filter((c: Any) => c.onboardingState === 'invited')
        const openQuotes = (s.beQuotes || []).filter((q: Any) => q.status === 'sent' || q.status === 'draft')
        const needs: Any[] = []
        if (needAssign.length) needs.push({
          icon: '📌', name: needAssign.length + (needAssign.length === 1 ? ' clean needs assigning' : ' cleans need assigning'),
          sub: needAssign.map((j: Any) => (propById[j.propertyId]?.name || 'Property')).slice(0, 2).join(' · '),
          right: chip('nu1', 'turn', 'Do it'), go: () => go({ c: 'calendar' }),
        })
        if (toInvite.length) needs.push({
          icon: '💌', name: toInvite.length + (toInvite.length === 1 ? ' client hasn’t claimed their link' : ' clients haven’t claimed their links'),
          sub: toInvite.map((c: Any) => clientName(c.id)).slice(0, 2).join(' · '),
          right: chip('nu2', 'ghost', 'Resend'), go: () => go({ c: 'clients' }),
        })
        if (openQuotes.length) needs.push({
          icon: '🧮', name: openQuotes.length + (openQuotes.length === 1 ? ' quote out' : ' quotes out'),
          sub: 'Waiting on the client to accept', right: chip('nu3', 'ghost', 'Tracking'), go: () => go({ c: 'quote' }),
        })
        if ((s.beProps || []).length === 0) needs.push({
          icon: '🏠', name: 'Add your first home', sub: 'A client’s property is what everything hangs off',
          right: chip('nu4', 'turn', 'Do it'), go: () => go({ c: 'addprop', npErr: '' }),
        })
        v.liveNeeds = needs.map((r, i) => ({ ...r, last: i === needs.length - 1 }))
        v.liveNeedsChip = needs.length ? chip('ad3', 'turn', needs.length + ' open') : chip('ad3', 'refresh', '✓ All clear')
        v.liveTeamSub = 'Splits · certification · who can see what'
      }
      // Open the Kee Method for whichever job is actually in play.
      const openable = shown[0] || allJobs[0]
      if (openable) v.goJob = () => go({ role: 'cleaner', c: 'job', cTab: 1, beStepsJobId: s.beActiveJobId || openable.id })
      // "Move this job" is reachable from the real checklist, so its header must
      // name the clean actually being moved, not the showcase loft.
      const moving = (s.beJobs || []).find((j: Any) => j.id === s.beStepsJobId) || openable
      if (moving) {
        v.moveSubtitle = (propById[moving.propertyId]?.name || 'This clean')
          + ' · ' + (timeOf(moving.windowStart) ? 'window ' + timeOf(moving.windowStart) : 'time to be confirmed')
      }
    }

    /* ---- the checklist a cleaner actually works from ---- */
    const openJob = liveWork && s.beStepsJobId
      ? (s.beJobs || []).find((j: Any) => j.id === s.beStepsJobId) || null
      : null
    // True for every live cleaner, job open or not — the seed showcase
    // checklist must never appear on a real account.
    v.liveChecklist = liveStaffWork
    v.liveNoOpenJob = liveStaffWork && !openJob
    if (openJob) {
      const prop = propById[openJob.propertyId] || {}
      const rows: Any[] = s.beSteps || []
      const { done: doneN, total: totalN, pct: livePct } = checklistProgress(rows as any)
      const toggleStep = (row: Any) => {
        const next = !row.completed
        setState((st: Any) => ({ ...st, beSteps: st.beSteps.map((x: Any) => x.id === row.id ? { ...x, completed: next } : x) }))
        getData().setJobStep(row.id, next).then(() => {
          // The first tick IS the start of the clean — no separate "start"
          // button to forget. A failure here is cosmetic; the tick is saved.
          if (!next || openJob.status !== 'scheduled') return
          const at = new Date().toISOString()
          getData().setJobStatus(openJob.id, { status: 'in_progress', startedAt: at }).then(() => {
            setState((st: Any) => ({ ...st, beJobs: st.beJobs.map((j: Any) => j.id === openJob.id ? { ...j, status: 'in_progress' } : j) }))
          }).catch(() => { /* status catches up on the next load */ })
        }).catch((e: any) => {
          // Put the tick back where it was — the row on screen must never
          // disagree with the row in the database.
          setState((st: Any) => ({ ...st, beSteps: st.beSteps.map((x: Any) => x.id === row.id ? { ...x, completed: !next } : x) }))
          say(errMsg(e, 'Couldn’t save that step — try again'))
        })
      }
      /* ---- proof photos ----
         The Kee Method has photo moments, and a moment is only proof if it is
         actually captured. The file goes phone → private bucket directly (the
         storage policy accepts a key only inside this studio's folder), then a
         small call records it against the step. Nothing here decides whether
         the photo may ever be published: `attach-photo` writes marketing
         consent false every time, and the phase — not the person holding the
         phone — decides whether it is a 'before' shot. */
      const uploadStepPhoto = async (row: Any, file: any) => {
        const check = checkPhoto(file)
        if (!check.ok) { say(PHOTO_REJECT_MESSAGE[check.reason!]); return }
        const orgId = s.beUser?.orgId
        if (!orgId) { say('Your studio isn’t set up yet'); return }
        setState((st: Any) => ({ ...st, bePhotoBusy: row.id }))
        try {
          const key = photoKeyFor({
            orgId, jobId: openJob.id, stepId: row.id, ext: check.ext!, nonce: photoNonce(),
          })
          await uploadProof(key, file, file.type)
          // Where it was taken is worth having and never worth blocking on —
          // a basement with no signal must not cost the photo.
          const at = new Date().toISOString()
          const pos = await getPosition().catch(() => null)
          const r = await api.attachPhoto({
            jobId: openJob.id, stepRowId: row.id, storageKey: key,
            takenAt: at, lat: pos?.lat, lng: pos?.lng,
          })
          setState((st: Any) => ({
            ...st, bePhotoBusy: '',
            beSteps: st.beSteps.map((x: Any) => x.id === row.id
              ? { ...x, photoKey: key, photoTakenAt: at } : x),
          }))
          say(r.kind === 'before'
            ? 'Before photo saved — private to the owner 🔒'
            : 'Photo saved — private to the owner 🔒')
        } catch (e) {
          setState((st: Any) => ({ ...st, bePhotoBusy: '' }))
          say(errMsg(e, 'Couldn’t save that photo'))
        }
      }
      /* Opens the camera on a phone and the picker everywhere else. Built here
         rather than rendered as a hidden input so the checklist row stays a
         plain row — the same reason getPosition lives in the store. */
      const capturePhoto = (row: Any) => {
        if (typeof document === 'undefined') return
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.setAttribute('capture', 'environment')
        input.style.display = 'none'
        input.onchange = () => {
          const file = input.files && input.files[0]
          input.remove()
          if (file) uploadStepPhoto(row, file)
        }
        document.body.appendChild(input)
        input.click()
      }

      // Group by the phase stamped on each row at instantiation. Rows created
      // before phases were stamped fall into one "The Kee Method" group.
      const PHASE_ICON = ['🔍', '🧺', '✨', '🧴', '📋']
      v.livePhases = groupSteps(rows as any).map((g, i) => {
        const n = i + 1
        return {
          icon: PHASE_ICON[(g.ord ? g.ord - 1 : i) % PHASE_ICON.length] || '✨',
          title: (g.ord ? g.ord + ' · ' : '') + g.title,
          done: g.done, total: g.total,
          open: s.bePhaseOpen === n,
          toggle: () => setState((st: Any) => ({ ...st, bePhaseOpen: st.bePhaseOpen === n ? 0 : n })),
          steps: g.steps.map((r: Any) => {
            const url = r.photoKey ? (s.bePhotoUrls || {})[r.photoKey] : null
            const busy = s.bePhotoBusy === r.id
            return {
              label: r.text, on: !!r.completed, photo: !!r.photoRequired,
              added: !!r.photoKey,
              // The thumbnail is a signed link that expires. When it hasn't
              // arrived (or has lapsed) the tile still shows — the photo is
              // recorded either way, and a blank tile is honest about that.
              wash: url ? `url("${url}") center/cover` : 'var(--photo-1)',
              stamp: r.photoKey
                ? (busy ? 'Saving…' : '🔒 ' + (timeOf(r.photoTakenAt) || 'Taken') + ' · private')
                : '',
              toggle: () => toggleStep(r),
              add: () => { if (!busy) capturePhoto(r) },
            }
          }),
        }
      })
      v.liveJobName = prop.name || 'This property'
      v.liveJobSub = '📍 ' + (prop.neighborhood || 'Metro Atlanta')
        + (timeOf(openJob.windowStart) ? '  ·  window ' + timeOf(openJob.windowStart) + '–' + (timeOf(openJob.windowEnd) || '') : '')
      v.liveJobBadge = chip('lj0', 'onBrand', jobType(openJob) + (openJob.ecoFinish === false ? '' : ' · eco finish'))
      v.liveDone = doneN
      v.liveTotal = totalN
      v.livePct = livePct
      v.liveStepsBusy = s.beStepsBusy
      v.liveStepsErr = s.beStepsErr
      v.liveNoSteps = !s.beStepsBusy && !s.beStepsErr && totalN === 0
      v.liveJobDone = openJob.status === 'complete'
      v.liveOwnerName = liveStaffWork && openJob.ownerId ? clientName(openJob.ownerId) : null
      v.liveAmount = liveStaffWork ? '$' + Number(openJob.clientAmount || 0).toFixed(0) : null
      // Repair: a job can exist without a checklist if it was booked before the
      // Kee Method was seeded. One tap builds it from the template.
      v.buildChecklist = async () => {
        try {
          set({ beStepsBusy: true })
          const n = await getData().buildJobSteps(openJob.id)
          const fresh = await getData().liveJobSteps(openJob.id)
          setState((st: Any) => ({ ...st, beSteps: fresh, beStepsBusy: false, beStepsErr: '' }))
          say(n ? 'Checklist ready · ' + n + ' steps ✓' : 'Checklist loaded ✓')
        } catch (e) { set({ beStepsBusy: false }); say(errMsg(e, 'Couldn’t build the checklist')) }
      }
      v.liveOnMyWay = async () => {
        try {
          const r = await api.sendNotice({ jobId: openJob.id, kind: 'on_the_way' })
          say(r.pushed ? 'They’ve been told you’re on your way 🚗' : 'Sent — they’ll see it in the app 🚗')
        } catch (e) { say(errMsg(e, 'Couldn’t send that just now')) }
      }
      // How much of the documentation is actually there, so the screen can say
      // so before someone taps Complete and gets refused.
      const noProof = missingProof(rows as any)
      v.livePhotoMoments = rows.filter((r: Any) => r.photoRequired).length
      v.livePhotosTaken = v.livePhotoMoments - noProof.length
      v.liveProofShort = noProof.length
      v.liveComplete = async () => {
        if (totalN && doneN < totalN) { say((totalN - doneN) + ' steps still open — finish those first'); return }
        /* The owner's report says the clean was documented. A photo moment
           ticked past without a picture would make that untrue, so it is not
           allowed to close. */
        if (noProof.length) {
          say(noProof.length === 1
            ? 'One photo moment still needs its picture'
            : noProof.length + ' photo moments still need their pictures')
          return
        }
        try {
          set({ beBusy: true })
          const now = new Date().toISOString()
          await getData().setJobStatus(openJob.id, { status: 'complete', finishedAt: now, submittedAt: now })
          setState((st: Any) => ({
            ...st, beBusy: false, beStepsJobId: null, beSteps: [],
            beJobs: st.beJobs.map((j: Any) => j.id === openJob.id ? { ...j, status: 'complete' } : j),
            c: 'today', cTab: 0, hist: [],
          }))
          // The owner hears about it: a row in their notices, and a push if
          // they've turned it on. Best-effort — the clean is already closed.
          api.sendNotice({ jobId: openJob.id, kind: 'report_ready' }).catch(() => { /* in-app only */ })
          say('Clean complete — owner notified 📸')
        } catch (e) { set({ beBusy: false }); say(errMsg(e, 'Couldn’t close out that job')) }
      }
    }

    /* ---- the book of business, whosever it is ----
       Contractors have their own clients. Row-Level Security already means a
       contractor's read returns only their own book plus whoever's home the
       studio assigned them, so this doesn't re-filter what came back — it
       labels it, because on the studio owner's screen the two are mixed and she
       needs to see which is which. */
    v.liveAdmin = backendActive() && s.beSignedIn && (s.beUser?.role === 'org_admin' || s.beUser?.role === 'cleaner')
    if (v.liveAdmin) {
      const meId = s.beUser?.id
      const counts: Any = {}
      ;(s.beProps || []).forEach((p: Any) => { counts[p.ownerId] = (counts[p.ownerId] || 0) + 1 })
      const rows = (s.beClients || []).map((u: Any, i: number, arr: Any[]) => {
        const nm = (u.fullName || (u.email || '').split('@')[0] || 'Client').trim()
        const n = counts[u.id] || 0
        const mine = u.managedBy === meId
        const invited = u.onboardingState === 'invited'
        return {
          icon: (nm[0] || 'C').toUpperCase(), tile: cTile, name: nm,
          sub: n + (n === 1 ? ' property' : ' properties') + (invited ? ' · invite not claimed' : ''),
          flag: null,
          // Only worth saying on a screen where both appear.
          right: v.me.isAdmin ? (mine ? null : (u.managedBy ? chip('cm' + u.id, 'ghost', 'Contractor’s') : null)) : null,
          last: i === arr.length - 1, go: null,
        }
      })
      const emptyCopy = v.me.isAdmin
        ? 'Clients appear here as they join'
        : 'Add your first client and their home — they’re yours, not the studio’s'
      v.clientRows = rows.length ? rows : [{ icon: '✨', name: 'No clients yet', sub: emptyCopy, flag: null, right: chip('cc0', 'refresh', 'Empty'), last: true, go: null }]
      v.bookTitle = v.me.isAdmin ? 'Clients & properties' : 'My clients'
      v.bookSubtitle = v.me.isAdmin ? undefined : 'Your own book — the studio doesn’t see it'
      // Real counts in the header, and none of the seed showcase numbers.
      const nc = (s.beClients || []).length, np = (s.beProps || []).length, nq = (s.beQuotes || []).length
      v.clientsSub = nc + (nc === 1 ? ' client' : ' clients') + ' · ' + np + (np === 1 ? ' property' : ' properties')
        + (nq ? ' · ' + nq + (nq === 1 ? ' quote out' : ' quotes out') : '')
      v.liveBook = true
    }

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
    // Live card-on-file (Square) — replaces the prototype card fields when Square
    // is configured and an owner is signed in with an org.
    v.squareReady = isSquareConfigured() && backendActive() && !!(s.beUser && s.beUser.id && s.beUser.orgId)
    v.beOwnerId = s.beUser?.id
    v.beOrgId = s.beUser?.orgId
    v.onCardSaved = (res: Any) => {
      setState((st: Any) => ({ ...st, beCard: { id: res.id, brand: res.brand, last4: res.last4, cardType: 'CREDIT' } }))
      go({ o: 'account' }); say('New card saved 💳 ····' + res.last4)
    }

    // 40 · gallery
    v.oGallery = s.role === 'owner' && s.o === 'gallery'
    v.goGallery = () => go({ o: 'gallery', gallery: 'clean', galleryFrom: 'report' })
    v.goRefSets = () => go({ o: 'gallery', gallery: 'reference', galleryFrom: 'account' })
    const isRef = s.gallery === 'reference'
    v.galleryTitle = isRef ? 'Reference photo sets' : 'Proof of service'
    v.galleryLive = v.liveOwner
    v.galleryEmpty = v.liveOwner && !(s.beReports || []).some((r: Any) => Number(r.photoCount || 0) > 0)
    v.galleryEmptyLine = isRef ? 'No reference photos yet. Add a home and upload a few shots of how each room should look — that becomes the standard every clean is checked against.' : 'No proof photos yet. After your first clean, every before/after shot lands here, private to you.'
    v.gallerySub = isRef ? 'How each room should look after every clean' : (v.liveOwner ? 'Your proof photos, private to you' : 'The Hartwell Estate · today, 11:06 AM – 12:31 PM')
    v.galleryBadge = chip('gl0', 'onBrand', isRef ? 'Your standard' : (v.liveOwner ? 'Private to you' : '9 photos · timestamped'))
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

    /* ---- live receipts — real charge rows (or an honest empty state) ---- */
    if (backendActive() && s.beSignedIn && s.beUser?.role === 'owner') {
      const day = (iso: string) => { const d = new Date(iso); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }
      const label: Any = { service_full: 'Clean · charged in full on arrival', tip: 'Tip · 100% to Ahleyia', supplies: 'Supplies' }
      const rows = (s.beCharges || []).map((c: Any, i: number, arr: Any[]) => ({
        icon: c.kind === 'tip' ? '💕' : '💳',
        name: (s.beProps || []).find((p: Any) => (s.beJobs || []).some((j: Any) => j.id === c.jobId && j.propertyId === p.id))?.name || 'Service',
        sub: day(c.createdAt) + ' · ' + (label[c.kind] || c.kind),
        right: money('var(--ink)', '$' + Number(c.amount).toFixed(2)),
        last: i === arr.length - 1,
      }))
      v.receipts = rows
      v.noReceipts = rows.length === 0
      v.chipJuly = chip('rc1', 'ghost', rows.length ? rows.length + ' charge' + (rows.length === 1 ? '' : 's') : 'None yet')
    }

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

    /* ---- live quotes (staff side) — send a real quote to a real client ----
       Writes a quotes row (staff-only under RLS) and posts the number on the
       client's thread so it lands in their messages too. */
    if (backendActive() && s.beSignedIn && !!s.beUser && s.beUser.role !== 'owner') {
      const me = s.beUser
      const clients = s.beClients || []
      const target = s.beThreadOwner || (clients[0] && clients[0].id) || null
      v.quoteClients = clients.map((c: Any) => ({
        label: c.fullName || (c.email || '').split('@')[0] || c.phone || 'Client',
        on: target === c.id,
        pick: () => set({ beThreadOwner: c.id }),
      }))
      v.hasQuoteClients = clients.length > 0
      v.sendQuote = async () => {
        if (!me?.orgId) { say('Your account isn’t linked to the business yet'); return }
        if (!target) { say('No clients yet — they appear here once they join'); return }
        if (!final) { say('Build the quote first'); return }
        try {
          set({ beBusy: true })
          await getData().createQuote({ orgId: me.orgId, ownerId: target, clientAmount: Number(final), cadence: s.cadence })
          await getData().sendMessage({
            orgId: me.orgId, threadKey: threadKeyForOwner(target), senderId: me.id, ownerId: target,
            body: 'Your tailored quote: $' + final + ' per clean. Everything included — happy to walk you through it.',
          })
          const msgs = await getData().messages(threadKeyForOwner(target))
          setState((t: Any) => ({ ...t, beMsgs: msgs, beThreadOwner: target, beBusy: false, c: 'thread' }))
          say('Quote sent to your client 💌')
        } catch (e) { set({ beBusy: false }); say(errMsg(e, 'Couldn’t send the quote')) }
      }
    }

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
    v.closeVisit = async () => {
      if (!backendActive() || !s.beActiveJobId) { set({ visitState: 'closed' }); say('Visit closed — receipt sent 💕'); return }
      try {
        set({ beBusy: true })
        const r = await api.closeConciergeVisit({ jobId: s.beActiveJobId, minutes: s.visitMinutes })
        setState((st: Any) => ({ ...st, beBusy: false, visitState: 'closed' }))
        say('Visit closed — $' + r.total.toFixed(2) + ' captured 💕')
      } catch (e) { set({ beBusy: false }); say(errMsg(e, 'Couldn’t close the visit — try again')) }
    }

    // Products & scent — the +$8 eco finish is a working billing toggle now.
    v.scentOn = s.scentOn
    v.toggleScent = () => { set({ scentOn: !s.scentOn }); say(s.scentOn ? 'Scent line removed' : 'Eco finish + scent added 🌿') }
    v.scentConsequence = s.scentOn
      ? 'Billed as its own line — Eco finish + signature scent · $8.00 — inside the single arrival charge. Never buried in the service price.'
      : 'Your receipts won’t show a scent line, and nothing extra is charged.'

    // menu — every destination, one tap away
    const item = (icon: string, name: string, sub: string, goFn: () => void, key?: string) => ({ icon, name, sub, key, go: () => { set({ menuOpen: false }); goFn() } })
    const close = (arr: Any[]) => arr.map((x, i, a) => ({ ...x, last: i === a.length - 1, right: '›' }))
    const MENUS: Any = {
      visitor: { title: 'She’s Maid In ATL', sub: 'Everything you can do before you have an account', groups: [
        { title: 'Browse', items: close([
          item('🏠', 'Welcome', 'Her studio, at a glance', () => go({ p: 'welcome' }), 'welcome'),
          item('🧺', 'Her services', 'Turnover tiers and residential care', () => go({ p: 'services' }), 'services'),
          item('🖼️', 'Her work', 'After-service photos from real homes', () => go({ p: 'portfolio' }), 'portfolio'),
          item('🌱', 'Products & scent', 'Eco, non-toxic, and why', () => go({ role: 'owner', o: 'products' }), 'products'),
        ]) },
        { title: 'Get started', items: close([
          item('✍️', 'Create an account', 'Two minutes, nothing charged', () => go({ p: 'signup', suStep: 1 }), 'signup'),
          item('🔑', 'Client sign in', 'Your email and password', () => go({ p: 'gate' }), 'gate'),
          item('🧼', 'Join her team', 'For cleaners with an invite', () => go({ p: 'staffsetup', staffStep: 1 }), 'staffsetup'),
        ]) },
      ] },
      cleaner: { title: v.me.isAdmin ? 'Your day & your business' : 'Your working day', sub: v.me.name + ' · ' + v.me.title.toLowerCase(), groups: [
        { title: 'Working', items: close([
          item('🏠', 'Today’s route', '3 properties today', () => go({ c: 'today', cTab: 0 }), 'today'),
          item('📍', 'Route map', 'Stops, drive times and windows', () => go({ c: 'map' }), 'map'),
          item('📌', 'Arrival check-in', 'Charge, then your 50% releases', () => go({ c: 'checkin', checkin: 'ready' }), 'checkin'),
          item('✅', 'Active clean', 'The Kee Method™, step by step', () => go({ c: 'job', cTab: 1 }), 'job'),
          item('🏡', 'Luxury home clean', 'Residential, 31 steps', () => go({ c: 'lux' }), 'lux'),
          item('⚠️', 'Flag an issue', 'Damage, low supply or maintenance', () => go({ c: 'flag' }), 'flag'),
          item('⏱', 'Move or hand off a job', 'No charge to the owner', () => go({ c: 'move', mv: 'form' }), 'move'),
          item('📅', 'Booking calendar', 'Every clean, and who has it', () => go({ c: 'calendar' }), 'calendar'),
          item('📌', 'Assign jobs', 'Who’s taking each clean', () => go({ c: 'assign' }), 'assign'),
          item('🧴', 'Supplies', 'Par levels and reordering', () => go({ c: 'supplies', cTab: 2 }), 'supplies'),
          item('👥', 'Assistant’s view', 'What Tiana sees on a shared job', () => go({ c: 'assist' }), 'assist'),
          item('💫', 'Concierge visit', 'Her time & receipts — not a clean', () => go({ c: 'conciergeVisit', visitState: 'brief', visitMinutes: 0, expenses: [] }), 'conciergeVisit'),
        ]) },
        { title: 'Getting paid', items: close([
          item('👤', 'My week', 'Cleans, earnings and schedule', () => go({ c: 'profile', cTab: 3 }), 'profile'),
          item('🏦', 'Payouts', 'Every release, in order', () => go({ c: 'payouts' }), 'payouts'),
          item('🧾', 'Tax documents', '1099s and yearly summaries', () => go({ c: 'tax' }), 'tax'),
        ]) },
        { title: 'Messages', items: close([
          item('💌', 'Inbox', 'Owners, leads and the business', () => go({ c: 'inbox' }), 'inbox'),
          item('✏️', 'New message', 'Write to an owner or a lead', () => go({ c: 'compose', draft: '' }), 'compose'),
          item('🔗', 'Your digital card', 'QR to scan, or text the link', () => go({ c: 'share' }), 'share'),
        ]) },
        /* Your own book. Contractors are not employees: the clients they bring
           are theirs, and the studio never sees them. Same screens for
           Ahleyia, whose book is the studio's. */
        { title: v.me.isAdmin ? 'Clients & properties' : 'My clients', items: close([
          item('🏡', v.me.isAdmin ? 'Clients & properties' : 'My clients', v.me.isAdmin ? 'Your book of business' : 'Your own book of business', () => go({ c: 'clients' }), 'clients'),
          item('➕', 'Add a client', 'They set their own sign-in from a link', () => go({ c: 'addclient', newClientLink: '' }), 'addclient'),
          item('🏠', 'Add a home for a client', 'A second property, or one you kept on paper', () => go({ c: 'addprop', npErr: '' }), 'addprop'),
          item('📅', 'Book a clean', 'Pick a day and a window', () => go({ c: 'calendar' }), 'calendar'),
          item('🚫', 'My availability', 'Days and hours you’re not working', () => go({ c: 'avail', avDay: '', avErr: '' }), 'avail'),
        ]) },
        // The studio's own side. A contractor has no business here — billing,
        // hiring and the studio's pricing belong to the owner.
        ...(v.me.isAdmin ? [{ title: 'Business', items: close([
          item('👑', 'Business dashboard', 'Billing, people, pricing', () => go({ c: 'admin' }), 'admin'),
          item('🧮', 'Quote Builder', 'Your pricing rules, made tappable', () => go({ c: 'quote' }), 'quote'),
          item('👥', 'Team & certification', 'Splits and what they can see', () => go({ c: 'team' }), 'team'),
          item('🧽', 'Add a contractor', 'They set their own sign-in', () => go({ c: 'addstaff', newStaffLink: '' }), 'addstaff'),
          item('📍', 'Service area', 'Where you take work', () => go({ c: 'area' }), 'area'),
          item('🔐', 'Master login & security', 'Business email, password, two-step', () => go({ role: 'visitor', p: 'adminlogin' }), 'adminlogin'),
        ]) }] : []),
        // Everyone who works gets these, admin or not.
        { title: 'Your account', items: close([
          item('🔔', 'Notifications', v.feedUnread ? v.feedUnread + ' unread' : 'Everything the app has told you', () => go({ c: 'notices' }), 'notices'),
          item('📋', 'Kee Method™ templates', 'Turnover and luxury home', () => go({ c: 'template', tpl: 'turn' }), 'template'),
          item('⚙️', 'Settings', 'Your account and notifications', () => go({ c: 'settings' }), 'settings'),
        ]) },
      ] },
      owner: { title: clientFirst + '’s account', sub: 'Your homes, your standard, your proof', groups: [
        { title: 'Your homes', items: close([
          item('🏡', 'Homes', 'Status, proof and history', () => go({ o: 'home', oTab: 0 }), 'home'),
          item('📅', 'Schedule', 'Reschedule, add a service, cancel', () => go({ o: 'schedule' }), 'schedule'),
          item('🗓️', 'Her open days', 'Pick a day for your next clean', () => go({ o: 'calendar' }), 'calendar'),
          item('➕', 'Add a property', 'Paste a listing link', () => go({ o: 'onboard' }), 'onboard'),
          item('✅', 'Account setup', 'Finish anything outstanding', () => go({ o: 'setup' }), 'setup'),
        ]) },
        { title: 'Every clean', items: close([
          item('📋', 'Service report', 'Photos, timeline and approval', () => go({ o: 'report', oTab: 1 }), 'report'),
          item('🖼️', 'All proof photos', 'Timestamped, kept for you', () => go({ o: 'gallery', gallery: 'clean', galleryFrom: 'report' }), 'gallery'),
          item('📷', 'Reference photos', 'How your rooms should look', () => go({ o: 'gallery', gallery: 'reference', galleryFrom: 'account' }), 'gallery'),
          item('🔔', 'Notifications', v.feedUnread ? v.feedUnread + ' unread' : 'Everything the app has told you', () => go({ o: 'notices' }), 'notices'),
          item('⭐', 'Rate & thank Ahleyia', 'She reads every one', () => go({ o: 'rate', rate: 'form' }), 'rate'),
          item('💬', 'Something’s not right', 'She comes back to fix it', () => go({ o: 'dispute', dispute: 'form' }), 'dispute'),
        ]) },
        { title: 'Home & supplies', items: close([
          item('🌱', 'Products & scent', 'Eco products and your finish', () => go({ o: 'products' }), 'products'),
          item('💫', 'Request concierge', 'Her time — a hands-free lifestyle', () => go({ o: 'concierge' }), 'concierge'),
          item('🧴', 'Supplies', 'Approve what your units need', () => go({ o: 'supplies', oTab: 2 }), 'supplies'),
          item('🧮', 'Your tailored quote', 'From Ahleyia', () => go({ o: 'quote' }), 'quote'),
        ]) },
        { title: 'Account', items: close([
          item('👤', 'Your account', 'Details, card and archive', () => go({ o: 'account', oTab: 0 }), 'account'),
          item('🧾', 'Receipts', 'One charge per clean', () => go({ o: 'receipts' }), 'receipts'),
          item('💳', 'Replace your card', 'Credit cards only', () => go({ o: 'edit', editField: 'card', editValue: '' }), 'edit'),
          item('💌', 'Messages', 'Ahleyia and the studio', () => go({ o: 'messages', oTab: 3 }), 'messages'),
        ]) },
      ] },
    }
    const menu = MENUS[s.role]
    // The owner menu title was built from the seed persona ("James's account").
    // A live client's own name is already resolved in v.accountTitle — use it,
    // so the hamburger heading is never someone else's name.
    v.menuTitle = (v.liveOwner && s.role === 'owner' && v.accountTitle) ? v.accountTitle
      : (liveSignedIn && v.bizName && s.role === 'cleaner') ? menu.title
      : menu.title
    v.menuSub = menu.sub
    v.menuGroups = menu.groups

    /* ---- desktop rail (≥820px) + account switcher ----
       The rail shows the SAME menu groups as the phone's ☰ sheet, with the
       current destination marked. Admin is a view of the cleaner role here
       (the prototype models it as a fourth account), so the switcher maps to
       the zone each account lands in. */
    // Which of her two sides she is looking at. Only meaningful for someone who
    // HAS a business side — a contractor on the Clients screen is looking at
    // their own book, not at the studio's.
    const isAdminView = v.me.isAdmin
      && ['admin', 'team', 'clients', 'bizsettings', 'area', 'assign', 'calendar'].indexOf(s.c) >= 0
    const acctRole = s.role === 'cleaner' ? (isAdminView ? 'admin' : 'cleaner') : s.role
    /* What this person may look at.
     *
     * With no backend the switcher is the review tool it was built as: hop
     * between the business, a working day, a client and the signed-out public
     * view, all on seed data.
     *
     * On a live deployment it is NOT a switcher. Views and accounts are not
     * interchangeable: you see your own account, decided by your role, and
     * nothing else. The one exception is real — Ahleyia is both the business
     * and the housekeeper, so an org_admin genuinely has two views of the same
     * account, and only those two. */
    const ALL_ACCOUNTS: Any[] = [
      ['admin', '👑', 'She’s Maid In ATL', 'Business · owner & admin'],
      ['cleaner', '🧹', v.me.isOwner ? 'Ahleyia Kee' : v.me.name, v.me.isAdmin ? 'Working day · housekeeper' : v.me.title],
      ['owner', '🏡', v.clientFull, 'Client account'],
      ['visitor', '🌐', 'Not signed in', 'What someone with no account sees'],
    ]
    const liveApp = backendActive()
    // The rule lives in src/lib/views.ts, where it is tested on its own.
    const allowed = viewsFor({ liveApp, signedIn: !!s.beSignedIn, role: s.beUser?.role ?? null })
    const ACCOUNTS: Any[] = ALL_ACCOUNTS.filter((a) => allowed.indexOf(a[0]) >= 0)
    // Nothing to switch to → the button is a profile, not a chooser.
    v.acctSwitchable = ACCOUNTS.length > 1
    v.acctLockedNote = liveApp && s.beSignedIn && !v.acctSwitchable
    const WHO: Any = {
      visitor: ['Not signed in', 'Anyone with her card link'],
      cleaner: [v.me.isOwner ? 'Ahleyia Kee' : v.me.name, isAdminView && v.me.isAdmin ? '👑 Business side · admin' : 'Working side · today’s route'],
      owner: [v.clientFull, v.liveOwner ? (v.livePropCount || 'Client') : 'Client · 2 properties'],
    }
    const who = WHO[s.role] || WHO.visitor
    v.railWhoName = who[0]
    v.railWhoSub = who[1]
    const cur = s.role === 'visitor' ? s.p : (s.role === 'cleaner' ? s.c : s.o)
    // Mark the rail's active destination by matching each item's target key.
    v.menuGroups = menu.groups.map((g: Any) => ({
      ...g,
      items: g.items.map((it: Any) => ({ ...it, active: !!it.key && it.key === cur })),
    }))
    /* ---- her existing book of business: add a client, send their link ---- */
    v.aAddClient = s.role === 'cleaner' && s.c === 'addclient'
    v.goAddClient = () => set({ c: 'addclient', newClientLink: '', ncError: '', ncName: '', ncPhone: '', ncEmail: '', ncProperty: '', ncAddress: '', ncBeds: '', ncBaths: '', ncPrice: '' })
    v.badgeExisting = chip('nc0', 'onBrand', 'From before the app')
    v.badgeInviteReady = chip('nc1', 'onBrand', '💌 Link ready')
    const ncField = (k: string) => (e: any) => set({ [k]: e.target.value })
    v.ncName = s.ncName; v.setNcName = ncField('ncName')
    v.ncPhone = s.ncPhone; v.setNcPhone = ncField('ncPhone')
    v.ncEmail = s.ncEmail; v.setNcEmail = ncField('ncEmail')
    v.ncProperty = s.ncProperty; v.setNcProperty = ncField('ncProperty')
    v.ncAddress = s.ncAddress; v.setNcAddress = ncField('ncAddress')
    v.ncBeds = s.ncBeds; v.setNcBeds = (e: any) => set({ ncBeds: e.target.value.replace(/[^0-9.]/g, '') })
    v.ncBaths = s.ncBaths; v.setNcBaths = (e: any) => set({ ncBaths: e.target.value.replace(/[^0-9.]/g, '') })
    v.ncPrice = s.ncPrice; v.setNcPrice = (e: any) => set({ ncPrice: e.target.value.replace(/[^0-9.]/g, '') })
    v.ncError = s.ncError
    v.ncTypes = [
      { id: 'residential', label: '🏡 Their home' },
      { id: 'airbnb', label: '🏠 Airbnb / rental' },
      { id: 'loved_one', label: '👪 A loved one’s' },
    ].map((t) => ({ label: t.label, on: s.ncType === t.id, pick: () => set({ ncType: t.id }) }))
    v.ncCadences = ['Weekly', 'Biweekly', 'Monthly', 'One-time'].map((label) => ({ label, on: s.ncCadence === label, pick: () => set({ ncCadence: label }) }))
    v.newClientLink = s.newClientLink
    v.newClientName = s.newClientName
    v.ncConsent = s.ncConsent
    v.setNcConsent = (n: boolean) => set({ ncConsent: n })
    v.inviteTexted = s.inviteTexted
    v.saveNewClient = async () => {
      const name = s.ncName.trim(), home = s.ncProperty.trim()
      if (!name) { set({ ncError: 'Their name, please.' }); return }
      if (!s.ncPhone.trim() && !s.ncEmail.trim()) { set({ ncError: 'A phone number or an email — whichever you have.' }); return }
      if (!home) { set({ ncError: 'What should we call their home?' }); return }
      if (!backendActive()) { set({ ncError: '', newClientLink: window.location.origin + '/?invite=demo-link', newClientName: name }); say('Client added ✓'); return }
      try {
        set({ beBusy: true, ncError: '' })
        const r = await api.createClient({
          fullName: name,
          phone: s.ncPhone.trim() || undefined,
          email: s.ncEmail.trim() || undefined,
          propertyName: home,
          address: s.ncAddress.trim() || undefined,
          propertyType: s.ncType,
          beds: parseFloat(s.ncBeds) || undefined,
          baths: parseFloat(s.ncBaths) || undefined,
          agreedPrice: parseFloat(s.ncPrice) || undefined,
          cadence: s.ncCadence,
          smsConsent: s.ncConsent,
        })
        const h = await hydrate()
        setState((t: Any) => ({ ...t, beBusy: false, newClientLink: r.inviteUrl, newClientName: name, newClientId: r.clientId, inviteTexted: null, beClients: h.clients, beStaff: h.staff, beProps: h.properties }))
        say(name + ' added ✓')
      } catch (e) { set({ beBusy: false, ncError: errMsg(e, 'Couldn’t add that client') }) }
    }
    v.copyInviteLink = () => {
      try { navigator.clipboard.writeText(s.newClientLink) } catch { /* clipboard blocked */ }
      say('Link copied 🔗')
    }
    // Send it from the business number when Twilio is configured; otherwise hand
    // off to her own phone's messaging app so she is never blocked.
    const handOffToPhoneSms = () => {
      const body = encodeURIComponent('Hi ' + s.newClientName + ' — your account with She’s Maid In ATL is ready. Set your sign-in here: ' + s.newClientLink)
      try { window.open('sms:?&body=' + body, '_blank') } catch { /* blocked in preview */ }
      say('Opening your messages 💌')
    }
    v.textInviteLink = async () => {
      if (!backendActive() || !s.newClientId) { handOffToPhoneSms(); return }
      if (!s.ncConsent) { say('Tick that they agreed to be texted first'); handOffToPhoneSms(); return }
      try {
        set({ beBusy: true })
        const r = await api.sendInvite(s.newClientId)
        setState((t: Any) => ({ ...t, beBusy: false, newClientLink: r.inviteUrl, inviteTexted: r.texted }))
        if (r.texted) say('Texted to them 💌')
        else if (!r.smsConfigured) { say('Texting isn’t set up yet — opening your messages'); handOffToPhoneSms() }
        else if (r.smsReason === 'no_consent') say('They haven’t agreed to texts — send it another way')
        else if (r.smsReason === 'opted_out') say('They asked to stop texts — send it another way')
        else if (r.smsReason === 'no_number') say('No mobile number on file for them')
        else say('Couldn’t text it — the link is here to copy')
      } catch (e) { set({ beBusy: false }); say(errMsg(e, 'Couldn’t send that text')) }
    }

    /* ---- add a home to a client she already has ----
       A client can own more than one property, and most of hers came from
       before the app. This writes straight to `properties` — no invitation,
       because the client already exists. */
    v.aAddProp = s.role === 'cleaner' && s.c === 'addprop'
    v.goAddProp = () => set({ c: 'addprop', npErr: '', npName: '', npArea: '', npBeds: '', npBaths: '', npOwner: '' })
    v.badgeAddProp = chip('np0', 'onBrand', 'Add a home')
    const npField = (k: string) => (e: any) => set({ [k]: e.target.value })
    v.npName = s.npName; v.setNpName = npField('npName')
    v.npArea = s.npArea; v.setNpArea = npField('npArea')
    v.npBeds = s.npBeds; v.setNpBeds = (e: any) => set({ npBeds: e.target.value.replace(/[^0-9.]/g, '') })
    v.npBaths = s.npBaths; v.setNpBaths = (e: any) => set({ npBaths: e.target.value.replace(/[^0-9.]/g, '') })
    v.npErr = s.npErr
    v.npKinds = [
      { id: 'residential', label: '🏡 Their home' },
      { id: 'airbnb', label: '🏠 Airbnb / rental' },
      { id: 'loved_one', label: '👪 A loved one’s' },
    ].map((t) => ({ label: t.label, on: s.npKind === t.id, pick: () => set({ npKind: t.id }) }))
    v.npOwners = (s.beClients || []).map((c: Any) => ({
      label: clientName(c.id), on: s.npOwner === c.id, pick: () => set({ npOwner: c.id }),
    }))
    v.npNoClients = liveStaffWork && (s.beClients || []).length === 0
    v.saveNewProperty = async () => {
      const name = (s.npName || '').trim()
      if (!name) { set({ npErr: 'What should we call this home?' }); return }
      if (!backendActive()) { set({ npErr: '', npName: '', c: 'clients' }); say('Home added ✓'); return }
      const ownerId = s.npOwner || (s.beClients || [])[0]?.id
      if (!ownerId) { set({ npErr: 'Add the client first — then their home.' }); return }
      const orgId = s.beUser?.orgId
      if (!orgId) { set({ npErr: 'Your account isn’t linked to the business yet.' }); return }
      try {
        set({ beBusy: true, npErr: '' })
        await getData().createPropertyFor({
          orgId, ownerId, name, type: s.npKind,
          neighborhood: (s.npArea || '').trim() || undefined,
          beds: parseFloat(s.npBeds) || undefined,
          baths: parseFloat(s.npBaths) || undefined,
          baseEdition: s.npKind === 'airbnb' ? 'vacation_rental' : 'luxury_home',
          // A contractor's home goes in THEIR book; the studio owner's is the
          // studio's. RLS rejects anything else, so this has to be right.
          managedBy: v.me.isAdmin ? null : s.beUser?.id,
        })
        const h = await hydrate()
        setState((t: Any) => ({
          ...t, beBusy: false, beProps: h.properties, beClients: h.clients,
          npName: '', npArea: '', npBeds: '', npBaths: '', c: 'clients', hist: [],
        }))
        say(name + ' added ✓')
      } catch (e) { set({ beBusy: false, npErr: errMsg(e, 'Couldn’t add that home') }) }
    }

    /* ---- add someone to the team: same invitation, cleaner side ---- */
    v.aAddStaff = s.role === 'cleaner' && s.c === 'addstaff'
    v.goAddStaff = () => set({ c: 'addstaff', newStaffLink: '', nsError: '', nsName: '', nsPhone: '', nsEmail: '' })
    v.goTeam = () => go({ c: 'team' })
    v.badgeTeamAdd = chip('ns0', 'onBrand', '🧽 New team member')
    v.nsName = s.nsName; v.setNsName = (e: any) => set({ nsName: e.target.value })
    v.nsPhone = s.nsPhone; v.setNsPhone = (e: any) => set({ nsPhone: e.target.value })
    v.nsEmail = s.nsEmail; v.setNsEmail = (e: any) => set({ nsEmail: e.target.value })
    v.nsConsent = s.nsConsent; v.setNsConsent = (n: boolean) => set({ nsConsent: n })
    v.nsError = s.nsError
    v.newStaffLink = s.newStaffLink
    v.newStaffName = s.newStaffName
    v.saveNewStaff = async () => {
      const name = s.nsName.trim()
      if (!name) { set({ nsError: 'Their name, please.' }); return }
      if (!s.nsPhone.trim() && !s.nsEmail.trim()) { set({ nsError: 'A phone number or an email — whichever you have.' }); return }
      if (!backendActive()) { set({ nsError: '', newStaffLink: window.location.origin + '/?invite=demo-link', newStaffName: name }); say('Added to your team ✓'); return }
      try {
        set({ beBusy: true, nsError: '' })
        const r = await api.createStaff({
          fullName: name,
          phone: s.nsPhone.trim() || undefined,
          email: s.nsEmail.trim() || undefined,
          smsConsent: s.nsConsent,
        })
        setState((t: Any) => ({ ...t, beBusy: false, newStaffLink: r.inviteUrl, newStaffName: name, newStaffId: r.staffId }))
        say(name + ' added to your team ✓')
      } catch (e) { set({ beBusy: false, nsError: errMsg(e, 'Couldn’t add them') }) }
    }
    v.copyStaffLink = () => {
      try { navigator.clipboard.writeText(s.newStaffLink) } catch { /* clipboard blocked */ }
      say('Link copied 🔗')
    }
    v.textStaffLink = async () => {
      const handOff = () => {
        const body = encodeURIComponent('Hi ' + s.newStaffName + ' — welcome to She’s Maid In ATL. Set up your sign-in here: ' + s.newStaffLink)
        try { window.open('sms:?&body=' + body, '_blank') } catch { /* blocked in preview */ }
        say('Opening your messages 💌')
      }
      if (!backendActive() || !s.newStaffId || !s.nsConsent) { handOff(); return }
      try {
        set({ beBusy: true })
        const r = await api.sendInvite(s.newStaffId)
        setState((t: Any) => ({ ...t, beBusy: false, newStaffLink: r.inviteUrl }))
        if (r.texted) say('Texted to them 💌')
        else { say(r.smsConfigured ? 'Couldn’t text it — the link is here to copy' : 'Texting isn’t set up yet — opening your messages'); if (!r.smsConfigured) handOff() }
      } catch (e) { set({ beBusy: false }); say(errMsg(e, 'Couldn’t send that text')) }
    }

    /* ---- the invitation an existing client opens (?invite=…) ---- */
    v.vInvite = s.role === 'visitor' && s.p === 'invite'
    v.inviteLoading = s.inviteLoading
    v.invitePreview = s.invitePreview
    v.inviteError = s.inviteError
    v.inviteFormError = s.inviteFormError
    v.inviteDone = s.inviteDone
    v.inviteBusy = s.inviteBusy
    v.badgeInvite = chip('iv0', 'onBrand', '💌 Your invitation')
    v.inviteEmail = s.inviteEmail
    v.setInviteEmail = (e: any) => set({ inviteEmail: e.target.value })
    v.invitePw = s.invitePw
    v.setInvitePw = (e: any) => set({ invitePw: e.target.value })
    v.invitePwType = s.invitePwShown ? 'text' : 'password'
    v.invitePwToggleLabel = s.invitePwShown ? 'Hide' : 'Show'
    v.toggleInvitePw = () => set({ invitePwShown: !s.invitePwShown })
    v.claimInvite = async () => {
      const email = s.inviteEmail.trim().toLowerCase()
      const pw = s.invitePw
      if (email.indexOf('@') < 0) { set({ inviteFormError: 'Enter the email where your reports and receipts should go.' }); return }
      if (pw.length < 8 || !/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) {
        set({ inviteFormError: 'Use at least 8 characters, with letters and a number.' }); return
      }
      if (!backendActive()) { set({ inviteFormError: '', inviteDone: true }); say('Account created ✓'); return }
      try {
        set({ inviteBusy: true, inviteFormError: '' })
        await api.claimInvite({ token: s.inviteToken, email, password: pw })
        // Sign them straight in with the credentials they just chose.
        await signInWithPassword(email, pw)
        const h = await hydrate()
        setState((t: Any) => ({
          ...t, inviteBusy: false, inviteDone: true, invitePw: '',
          beSignedIn: true, beUser: h.user, beCard: h.card, beJobs: h.jobs,
          beProps: h.properties, beClients: h.clients, beStaff: h.staff, beMsgs: h.messages,
          beQuotes: h.quotes, beReports: h.reports, beCharges: h.charges,
          // Land them where they belong: a cleaner starts on their route.
          ...(h.user?.role === 'owner'
            ? { role: 'owner', o: 'home', oTab: 0 }
            : { role: 'cleaner', c: 'today', cTab: 0 }),
          hist: [],
        }))
        say('Welcome in ✓')
      } catch (e) { set({ inviteBusy: false, inviteFormError: errMsg(e, 'Could not finish setting up your account') }) }
    }

    v.chipCurrent = chip('ac0', 'refresh', 'Current')
    // Fall back to whatever this account actually has — an account with one
    // view has no row 3 to fall back to.
    const acct = ACCOUNTS.find((a) => a[0] === acctRole) || ACCOUNTS[0] || ALL_ACCOUNTS[3]
    v.acctIcon = acct[1]; v.acctName = acct[2]; v.acctSub = acct[3]
    v.acctOpen = s.acctOpen
    v.openAcct = () => set({ acctOpen: true })
    v.closeAcct = () => set({ acctOpen: false })
    v.switchViewFromMenu = () => set({ menuOpen: false, acctOpen: true })
    v.acctEmail = s.beUser?.email || 'Not signed in'
    v.acctRows = ACCOUNTS.map((a, i) => ({
      icon: a[1], name: a[2], sub: a[3], last: i === ACCOUNTS.length - 1,
      current: a[0] === acctRole,
      use: () => {
        const patch: Any = { acctOpen: false, menuOpen: false, hist: [] }
        if (a[0] === 'admin') { patch.role = 'cleaner'; patch.c = 'admin' }
        else if (a[0] === 'cleaner') { patch.role = 'cleaner'; patch.c = 'today'; patch.cTab = 0 }
        else if (a[0] === 'owner') { patch.role = 'owner'; patch.o = 'home'; patch.oTab = 0 }
        else { patch.role = 'visitor'; patch.p = 'welcome' }
        set(patch)
        // On a live account the two rows are two views of one account, so
        // "now viewing as someone else" would be a lie.
        say(liveApp && s.beSignedIn ? (a[0] === 'admin' ? 'Business side' : 'Working side') : 'Now viewing as ' + a[2])
      },
    }))
    v.acctTitle = v.acctSwitchable ? 'Switch view' : 'Your account'
    // Signing out is the one thing every live account needs from here, whether
    // or not there is a second view to switch to.
    v.acctSignOut = liveApp && s.beSignedIn ? v.signOut : null

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
        { n: 59, label: 'Create an account', go: jump('visitor', 'signup', { suStep: 1 }) },
        { n: 66, label: 'Cleaner with an invite', go: jump('visitor', 'invitecode', { inviteEntry: '', inviteEntryErr: '' }) },
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
