import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import { api } from '@appdeploy/client';
import { Check, ChevronLeft, ChevronRight, Upload, X } from 'lucide-react';
import { HowItWorks, suiteDraftText, type SuiteDraft } from './SuiteExperience';

type ViewName = 'home' | 'shop' | 'paper' | 'sports' | 'suites' | 'quote' | 'policies';
type UploadRecord = { path: string; filename: string; contentType: string };
type QuoteForm = {
  name: string; email: string; phone: string; contact: string; service: string;
  eventType: string; eventDate: string; neededBy: string; audience: string;
  quantities: string; pieces: string; apparelSizes: string; paperQuantity: number;
  sportsPackage: string; addOns: string[]; themeColors: string; colors: string;
  namesDates: string; wording: string; personalization: string; inspiration: string;
  feeling: string; avoid: string; fulfillment: string; budget: string;
  paymentAck: boolean; proofAck: boolean; photoAck: boolean; policyAck: boolean;
  uploadPermission: boolean; marketing: boolean;
};

const chapterMeta: Record<ViewName, { number: string; title: string; line: string }> = {
  home: { number: '00', title: 'Color Create Connect', line: 'A blank page is about to become a world.' },
  shop: { number: '01', title: 'Wear the Idea', line: 'Custom apparel begins with the thought, not a template.' },
  paper: { number: '02', title: 'Paper Lane', line: 'The smallest details can carry the whole celebration.' },
  sports: { number: '03', title: 'Show Up Loud', line: 'The arena opens. Your people, your colors, your moment.' },
  suites: { number: '04', title: 'Build the Moment', line: 'Choose the pieces. I will help connect the story.' },
  quote: { number: '05', title: 'Tell Me the Moment', line: 'Come in. I will help shape the right build.' },
  policies: { number: '06', title: 'The Studio Rules', line: 'Clear boundaries protect the work and the people inside it.' },
};

const storyWords = ['Sketch.', 'Deconstruct.', 'Recolor.', 'Rearrange.', 'Rebuild.', 'Redraw.', 'Produce.'];
const chapters = [
  ['00', 'The Introduction'], ['01', 'The Celebration'], ['02', 'The Moment'],
  ['03', 'The Pieces'], ['04', 'Creative Direction'], ['05', 'The Practical'],
];
const occasions = [
  { label: 'Graduation', icon: 'GRAD', style: 'from-stone-950 via-stone-800 to-amber-700 text-white' },
  { label: 'Sweet Beginnings', icon: 'BABY', style: 'from-amber-50 via-orange-100 to-amber-300 text-stone-900' },
  { label: 'Bridal Bliss', icon: 'BRIDE', style: 'from-white via-stone-100 to-amber-200 text-stone-900' },
  { label: 'Birthday', icon: 'WISH', style: 'from-orange-950 via-amber-800 to-yellow-500 text-white' },
  { label: 'Group Gatherings', icon: 'CREW', style: 'from-stone-200 via-amber-200 to-orange-300 text-stone-950' },
  { label: 'Sports Social Studio', icon: 'LOUD', style: 'from-[#fffaf0] via-[#eee5d7] to-[#b9c9e8] text-stone-950' },
  { label: 'Business', icon: 'WORK', style: 'from-stone-950 via-amber-950 to-stone-700 text-white' },
  { label: 'Something Else', icon: 'MORE', style: 'from-amber-100 via-white to-stone-300 text-stone-900' },
];

export function IntroCinematic() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem('ccc-story-intro') === 'seen') return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        sessionStorage.setItem('ccc-story-intro', 'seen');
        return;
      }
      setShow(true);
      const timer = window.setTimeout(() => {
        setShow(false);
        sessionStorage.setItem('ccc-story-intro', 'seen');
      }, 4200);
      return () => window.clearTimeout(timer);
    } catch {
      return;
    }
  }, []);
  const close = () => {
    setShow(false);
    try { sessionStorage.setItem('ccc-story-intro', 'seen'); } catch { return; }
  };
  if (!show) return null;
  return <div className="story-intro pointer-events-none fixed inset-0 z-[90] grid place-items-center bg-stone-950/92 p-4 text-white">
    <div className="pointer-events-auto relative w-full max-w-4xl overflow-hidden rounded-[2rem] border border-amber-300/30 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,.28),transparent_30%),linear-gradient(145deg,#0c0a09,#292524)] p-7 shadow-2xl sm:p-10">
      <button onClick={close} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/30" aria-label="Skip intro"><X size={18}/></button>
      <div className="text-xs font-black uppercase tracking-[.26em] text-amber-300">Creator Studio presents</div>
      <div className="intro-wordmark serif mt-5 text-5xl font-bold leading-[.86] sm:text-7xl"><span>COLOR</span><span>CREATE</span><span>CONNECT</span></div>
      <div className="mt-7 flex flex-wrap gap-x-4 gap-y-2 text-sm font-black uppercase tracking-[.12em] text-stone-300">{storyWords.map((word, index) => <span key={word} style={{ animationDelay: index * .22 + 's' }}>{word}</span>)}</div>
      <button onClick={close} className="mt-8 rounded-full bg-amber-300 px-6 py-3 font-black text-stone-950">Enter the story</button>
    </div>
  </div>;
}

export function ChapterMoment({ view }: { view: ViewName }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (view === 'home') return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 1550);
    return () => window.clearTimeout(timer);
  }, [view]);
  if (!visible || view === 'home') return null;
  const meta = chapterMeta[view];
  return <div className="chapter-wipe pointer-events-none fixed inset-0 z-[80] grid place-items-center p-5">
    <div className="chapter-card max-w-xl rounded-[1.6rem] border border-amber-300/30 bg-stone-950/94 p-7 text-center text-white shadow-2xl">
      <div className="text-xs font-black uppercase tracking-[.24em] text-amber-300">Chapter {meta.number}</div>
      <div className="serif mt-3 text-4xl font-bold">{meta.title}</div>
      <p className="mt-3 text-sm leading-6 text-stone-300">{meta.line}</p>
    </div>
  </div>;
}

export function StoryMotion() {
  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('story-visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: .08, rootMargin: '0px 0px -6% 0px' });
    const decorate = () => {
      document.querySelectorAll<HTMLElement>('main section,main article').forEach((element, index) => {
        if (element.dataset.storyObserved) return;
        element.dataset.storyObserved = 'yes';
        element.classList.add('story-panel');
        element.style.setProperty('--story-delay', Math.min(index % 6, 5) * 70 + 'ms');
        observer.observe(element);
      });
      document.querySelectorAll('main').forEach(main => {
        const title = main.querySelector('h1')?.textContent || '';
        main.classList.toggle('paper-story', title.includes('Paper Lane'));
        main.classList.toggle('sports-story', title.includes('Sports Social Studio'));
        main.classList.toggle('shop-story', title.includes('Custom Apparel'));
        main.classList.toggle('suite-story', title.includes('Celebration Suites'));
      });
      Array.from(document.querySelectorAll('h2')).find(item => item.textContent?.includes('Choose the collection closest'))?.closest('section')?.classList.add('collection-world');
    };
    decorate();
    const mutations = new MutationObserver(decorate);
    mutations.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
    return () => { mutations.disconnect(); observer.disconnect(); };
  }, []);
  return null;
}

const allowedFile = (file: File) => ['image/jpeg', 'image/png', 'image/heic', 'image/heif'].includes(file.type) || /\.(jpe?g|png|heic|heif)$/i.test(file.name);
const readBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = () => reject(new Error('Unable to read ' + file.name));
  reader.readAsDataURL(file);
});
async function uploadReferences(files: File[]): Promise<UploadRecord[]> {
  const uploaded: UploadRecord[] = [];
  for (const file of files) {
    const content = await readBase64(file);
    const { data } = await api.post('/api/uploads', { filename: file.name, contentType: file.type || 'application/octet-stream', content });
    uploaded.push(data as UploadRecord);
  }
  return uploaded;
}
function chooseFiles(event: ChangeEvent<HTMLInputElement>, setFiles: (files: File[]) => void, setError: (message: string) => void) {
  const files = Array.from(event.target.files || []);
  if (files.length > 5) { setError('Choose up to 5 reference files.'); return; }
  const bad = files.find(file => !allowedFile(file) || file.size > 4 * 1024 * 1024);
  if (bad) { setError('Each file must be JPG, PNG, or HEIC and no larger than 4 MB on Netlify.'); return; }
  setError('');
  setFiles(files);
}

export function StoryQuoteWizard({ suiteDraft }: { suiteDraft: SuiteDraft | null }) {
  const initialPieces = suiteDraft ? suiteDraftText(suiteDraft) : '';
  const [step, setStep] = useState(0);
  const [sent, setSent] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState<QuoteForm>({
    name: '', email: '', phone: '', contact: 'Email', service: suiteDraft?.collection === 'Group Gatherings' ? 'Group Gatherings' : 'Celebration Suite',
    eventType: suiteDraft?.collection || '', eventDate: '', neededBy: '', audience: '', quantities: '', pieces: initialPieces,
    apparelSizes: '', paperQuantity: 12, sportsPackage: '', addOns: [], themeColors: '', colors: '', namesDates: '', wording: '',
    personalization: '', inspiration: '', feeling: '', avoid: '', fulfillment: 'Pickup', budget: '', paymentAck: false,
    proofAck: false, photoAck: false, policyAck: false, uploadPermission: false, marketing: false,
  });
  const sportsPath = ['Player Pride', 'Team Identity', 'Full Team Takeover'].includes(form.service);
  const packages = form.service === 'Player Pride'
    ? ['Sideline Support Pack, $65', 'Player Pride Pack, $145', 'Full Family Fan Pack, $295']
    : form.service === 'Team Identity'
      ? ['Rookie Team Package, $395', 'All-Star Team Package, $750', 'Championship Season Package, $1,050']
      : form.service === 'Full Team Takeover'
        ? ['Full Team Takeover custom program', 'Sponsor or booster program'] : [];
  const addOns = form.service === 'Player Pride'
    ? ['Mini Keepsake Pack', 'Player Pocket Pack', 'Game-Day Extras Pack', 'Grandstand Keepsake Pack']
    : ['Additional player card', 'Schedule update', 'Game-day graphic', 'Player spotlight', 'Sponsor announcement', 'Quick Update Pack', 'Game Week Pack', 'Banquet & Awards Pack', 'Season Extension Pack'];
  const update = <K extends keyof QuoteForm>(key: K, value: QuoteForm[K]) => setForm(current => ({ ...current, [key]: value }));
  const selectOccasion = (occasion: string) => setForm(current => ({
    ...current,
    eventType: occasion,
    service: occasion === 'Group Gatherings' ? 'Group Gatherings' : occasion === 'Sports Social Studio' ? 'Player Pride' : occasion === 'Business' ? 'Something beyond standard scope' : 'Celebration Suite',
  }));
  const validate = () => {
    if (step === 0 && (!form.name.trim() || !form.email.trim())) return 'Tell me your name and email so I know who I am designing for.';
    if (step === 1 && (!form.eventType.trim() || !form.service)) return 'Choose the moment and the closest service path.';
    if (step === 2 && (!form.eventType.trim() || !form.neededBy)) return 'Event type and needed-by date are required.';
    if (step === 3 && (!form.pieces.trim() || (form.service === 'Paper Lane' && (form.paperQuantity < 12 || form.paperQuantity % 12 !== 0)))) return 'List the requested pieces. Paper quantities must be multiples of 12.';
    if (step === 4 && (!form.themeColors.trim() || !form.feeling.trim())) return 'Theme or style direction and the intended feeling are required.';
    if (step === 4 && files.length && !form.uploadPermission) return 'Confirm permission to use the uploaded reference files.';
    if (step === 5 && (!form.fulfillment || !form.budget || !form.paymentAck || !form.proofAck || !form.photoAck || !form.policyAck)) return 'Complete the practical details and each required acknowledgment.';
    return '';
  };
  const next = () => {
    const message = validate();
    if (message) { setError(message); return; }
    setError('');
    setStep(value => Math.min(5, value + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const back = () => {
    setError('');
    setStep(value => Math.max(0, value - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const toggleAddon = (name: string) => update('addOns', form.addOns.includes(name) ? form.addOns.filter(item => item !== name) : [...form.addOns, name]);
  const submit = async () => {
    const message = validate();
    if (message) { setError(message); return; }
    setBusy(true);
    setError('');
    try {
      const uploaded = files.length ? await uploadReferences(files) : [];
      const details = [
        form.pieces,
        form.apparelSizes && 'Apparel sizes and quantities:\n' + form.apparelSizes,
        form.service === 'Paper Lane' && 'Paper quantity: ' + form.paperQuantity,
        sportsPath && form.sportsPackage && 'Selected sports package: ' + form.sportsPackage,
        form.addOns.length && 'Add-ons: ' + form.addOns.join(', '),
        'Theme and style: ' + form.themeColors,
        form.colors && 'Colors: ' + form.colors,
        form.namesDates && 'Names and dates: ' + form.namesDates,
        form.wording && 'Wording: ' + form.wording,
        form.personalization && 'Personalization: ' + form.personalization,
        form.inspiration && 'Inspiration and meaningful details: ' + form.inspiration,
        'Desired feeling: ' + form.feeling,
        form.avoid && 'Avoid: ' + form.avoid,
      ].filter(Boolean).join('\n\n');
      const { data } = await api.post('/api/quotes', {
        ...form, details,
        referenceFileNames: uploaded.map(file => file.filename),
        referenceUploadPaths: uploaded.map(file => file.path),
        status: 'new',
      });
      setEmailSent(Boolean(data.emailConfirmationSent));
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The quote could not be submitted.');
    } finally {
      setBusy(false);
    }
  };
  const firstName = form.name.trim().split(' ')[0] || 'friend';
  if (sent) return <QuoteShell><div className="mx-auto max-w-2xl rounded-[2rem] bg-stone-950 p-9 text-center text-white shadow-2xl"><Check className="mx-auto text-amber-300" size={44}/><h2 className="serif mt-4 text-4xl font-bold">Your story is in the studio.</h2><p className="mt-4 leading-7 text-stone-300">I received the full intake and will respond within 1 to 2 business days.</p><p className="mt-3 text-sm text-amber-200">{emailSent ? 'A confirmation email was sent to ' + form.email + '.' : 'Your on-screen confirmation is complete. Email delivery activates when the secure transactional email connection is enabled.'}</p></div></QuoteShell>;
  const narrator = [
    'Come in. First, who am I designing for?',
    'Now tell me what kind of moment is walking through the door.',
    firstName + ', give me the shape of the day so I can design around real life.',
    'Let us put the pieces on the table and see what belongs together.',
    'This is where your world starts taking color, texture, memory, and meaning.',
    'Last chapter. Tell me how this needs to land, then I will take it from here.',
  ][step];
  return <><HowItWorks/><QuoteShell><div className="mx-auto max-w-5xl"><StorySpine step={step}/><section className="quote-chapter overflow-hidden rounded-[2rem] border border-stone-300 bg-white shadow-xl"><div className="quote-chapter-head bg-stone-950 p-6 text-white sm:p-8"><p className="text-xs font-black uppercase tracking-[.24em] text-amber-300">Chapter {chapters[step][0]}</p><h2 className="serif mt-3 text-4xl font-bold sm:text-5xl">{chapters[step][1]}</h2><p className="mt-4 max-w-3xl text-base leading-7 text-stone-300">{narrator}</p></div><div className="p-5 sm:p-9">
    {step === 0 && <><div className="mb-6 rounded-3xl bg-[#f3e7d2] p-6"><p className="text-xs font-black uppercase tracking-[.2em] text-amber-900">Welcome to the studio</p><h1 className="serif mt-3 text-4xl font-bold">Tell me the moment. I will help shape the right build.</h1><p className="mt-4 leading-7 text-stone-700">Submitting does not charge you or confirm an order. It simply gives me enough detail to receive the idea properly.</p></div><div className="grid gap-x-5 sm:grid-cols-2"><Field label="Your name *"><input className="input" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Who am I designing for?"/></Field><Field label="Email *"><input type="email" className="input" value={form.email} onChange={e => update('email', e.target.value)} placeholder="Where should I reply?"/></Field><Field label="Phone, optional"><input className="input" value={form.phone} onChange={e => update('phone', e.target.value)}/></Field><Field label="How would you like me to reach you?"><select className="input" value={form.contact} onChange={e => update('contact', e.target.value)}><option>Email</option><option>Phone</option><option>Text</option></select></Field></div></>}
    {step === 1 && <><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{occasions.map(option => <button type="button" key={option.label} onClick={() => selectOccasion(option.label)} className={'occasion-poster group relative min-h-40 overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl ' + option.style + (form.eventType === option.label ? ' ring-4 ring-amber-300 ring-offset-2' : '')}><span className="text-[10px] font-black tracking-[.2em]">{option.icon}</span><span className="serif mt-12 block text-xl font-bold leading-tight">{option.label}</span><span className="absolute -bottom-8 -right-5 h-24 w-24 rounded-full border border-current opacity-20"/></button>)}</div><Field label="Closest service or collection"><select className="input" value={form.service} onChange={e => update('service', e.target.value)}><option>Celebration Suite</option><option>Group Gatherings</option><option>Custom Apparel</option><option>Paper Lane</option><option>Player Pride</option><option>Team Identity</option><option>Full Team Takeover</option><option>Something beyond standard scope</option></select></Field></>}
    {step === 2 && <div className="grid gap-x-5 sm:grid-cols-2"><Field label="Event type *"><input className="input" value={form.eventType} onChange={e => update('eventType', e.target.value)} placeholder="Birthday, graduation, tournament, reunion..."/></Field><Field label="Event date"><input type="date" className="input" value={form.eventDate} onChange={e => update('eventDate', e.target.value)}/></Field><Field label="Needed-by date *"><input type="date" className="input" value={form.neededBy} onChange={e => update('neededBy', e.target.value)}/></Field><Field label="Who is this for, or how many people?"><input className="input" value={form.audience} onChange={e => update('audience', e.target.value)}/></Field><Field label="Overall quantities"><input className="input" value={form.quantities} onChange={e => update('quantities', e.target.value)} placeholder="Approximate totals are okay"/></Field></div>}
    {step === 3 && <><Field label="Requested pieces *"><textarea className="input" rows={8} value={form.pieces} onChange={e => update('pieces', e.target.value)} placeholder="List each piece you want included."/></Field>{suiteDraft && <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">Your Build Your Collection selections already traveled into this chapter.</p>}{form.service === 'Custom Apparel' && <Field label="Apparel sizes and quantities"><textarea className="input" rows={5} value={form.apparelSizes} onChange={e => update('apparelSizes', e.target.value)} placeholder="Youth M x 2, Adult XL x 4..."/></Field>}{form.service === 'Paper Lane' && <Field label="Paper quantity, multiples of 12"><input type="number" min={12} step={12} className="input" value={form.paperQuantity} onChange={e => update('paperQuantity', Number(e.target.value) || 12)}/></Field>}{sportsPath && <><Field label="Sports package"><select className="input" value={form.sportsPackage} onChange={e => update('sportsPackage', e.target.value)}><option value="">Select a package first</option>{packages.map(option => <option key={option}>{option}</option>)}</select></Field>{form.sportsPackage && <Field label="Package add-ons"><div className="grid gap-2 sm:grid-cols-2">{addOns.map(option => <label key={option} className="flex min-h-12 items-center gap-3 rounded-xl border border-stone-300 p-3 text-sm"><input type="checkbox" checked={form.addOns.includes(option)} onChange={() => toggleAddon(option)} className="h-5 w-5"/>{option}</label>)}</div></Field>}</>}</>}
    {step === 4 && <><div className="grid gap-x-5 sm:grid-cols-2"><Field label="Theme and style direction *"><textarea className="input" rows={4} value={form.themeColors} onChange={e => update('themeColors', e.target.value)} placeholder="Retro, soft luxury, bold stadium, storybook, minimal..."/></Field><Field label="Colors"><textarea className="input" rows={4} value={form.colors} onChange={e => update('colors', e.target.value)} placeholder="Specific colors, team colors, or CCC's choice."/></Field><Field label="Names and dates to include"><textarea className="input" rows={4} value={form.namesDates} onChange={e => update('namesDates', e.target.value)}/></Field><Field label="Exact wording or important phrases"><textarea className="input" rows={4} value={form.wording} onChange={e => update('wording', e.target.value)}/></Field><Field label="Personalization details"><textarea className="input" rows={4} value={form.personalization} onChange={e => update('personalization', e.target.value)}/></Field><Field label="Inspiration and meaningful details"><textarea className="input" rows={4} value={form.inspiration} onChange={e => update('inspiration', e.target.value)}/></Field><Field label="What should this feel like? *"><textarea className="input" rows={4} value={form.feeling} onChange={e => update('feeling', e.target.value)} placeholder="Playful, grown glam, bold stadium, soft luxury..."/></Field><Field label="What should be avoided?"><textarea className="input" rows={4} value={form.avoid} onChange={e => update('avoid', e.target.value)} placeholder="Colors, symbols, styles, wording, or details that should not appear."/></Field></div><Field label="Photos, logos, sketches, and inspiration"><label className="upload-world flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-amber-700/40 bg-[#faf4e8] p-5 text-center"><Upload/><strong className="mt-2">Choose up to 5 reference files</strong><span className="mt-1 text-xs text-stone-500">JPG, PNG, or HEIC, no larger than 4 MB each on Netlify.</span><span className="mt-3 rounded-full bg-stone-950 px-4 py-2 text-xs font-black text-amber-200">People stay recognizable.</span><input type="file" multiple className="hidden" accept=".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif" onChange={event => chooseFiles(event, setFiles, setError)}/></label>{files.length > 0 && <p className="mt-2 text-xs text-stone-600">{files.map(file => file.name).join(' • ')}</p>}</Field>{files.length > 0 && <label className="mt-4 flex min-h-14 items-center gap-3 rounded-xl border border-amber-700/30 bg-amber-50 p-4 text-sm"><input type="checkbox" checked={form.uploadPermission} onChange={e => update('uploadPermission', e.target.checked)} className="h-5 w-5 shrink-0"/>I have permission to use every photo, logo, name, and artwork I am uploading.</label>}</>}
    {step === 5 && <><div className="grid gap-x-5 sm:grid-cols-2"><Field label="Fulfillment preference"><select className="input" value={form.fulfillment} onChange={e => update('fulfillment', e.target.value)}><option>Pickup</option><option>Shipping</option><option>Digital delivery</option><option>Not sure</option></select></Field><Field label="Budget range"><select className="input" value={form.budget} onChange={e => update('budget', e.target.value)}><option value="">Choose a range</option><option>Under $150</option><option>$150 to $299</option><option>$300 to $499</option><option>$500 to $999</option><option>$1,000+</option><option>Help me determine it</option></select></Field></div><div className="mt-7 rounded-2xl bg-stone-950 p-5 text-white"><p className="text-xs font-black uppercase tracking-[.18em] text-amber-300">Required acknowledgments</p><RequiredCheck checked={form.paymentAck} onChange={value => update('paymentAck', value)}>I understand quoted work requires the applicable deposit or payment before design work begins.</RequiredCheck><RequiredCheck checked={form.proofAck} onChange={value => update('proofAck', value)}>I understand production begins only after complete information and final proof approval.</RequiredCheck><RequiredCheck checked={form.photoAck} onChange={value => update('photoAck', value)}>I understand and acknowledge the Photo Integrity Promise. People in submitted photos will stay recognizable.</RequiredCheck><RequiredCheck checked={form.policyAck} onChange={value => update('policyAck', value)}>I confirm my details are accurate and agree to the studio policies and usage rules.</RequiredCheck></div><label className="mt-4 flex min-h-14 items-center gap-3 rounded-xl border border-stone-300 bg-white p-4 text-sm"><input type="checkbox" checked={form.marketing} onChange={e => update('marketing', e.target.checked)} className="h-5 w-5 shrink-0"/><span><strong>Optional:</strong> CCC may share the finished project in its portfolio or social media.</span></label></>}
    {error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
    <div className="mt-8 flex items-center justify-between gap-3"><button disabled={step === 0 || busy} onClick={back} className="flex min-h-12 items-center gap-2 rounded-full border border-stone-400 bg-white px-5 font-bold disabled:opacity-30"><ChevronLeft size={18}/>Back</button>{step < 5 ? <button onClick={next} className="cta-metal flex min-h-12 items-center gap-2 rounded-full px-6 font-bold text-white">Turn the page<ChevronRight size={18}/></button> : <button disabled={busy} onClick={submit} className="cta-metal min-h-12 rounded-full px-7 font-bold text-white disabled:opacity-50">{busy ? 'Sending your story...' : 'Send my quote request'}</button>}</div>
  </div></section></div></QuoteShell></>;
}

function StorySpine({ step }: { step: number }) {
  return <div className="story-spine mb-8 rounded-[1.6rem] border border-stone-300 bg-white p-4 shadow-sm sm:p-6"><div className="relative grid grid-cols-6 gap-1"><div className="story-spine-line absolute left-[8%] right-[8%] top-4 h-[3px] bg-stone-200"><div className="h-full bg-gradient-to-r from-stone-950 via-amber-700 to-amber-400 transition-all" style={{ width: step / 5 * 100 + '%' }}/></div>{chapters.map((chapter, index) => <div key={chapter[0]} className="relative z-10 text-center"><span className={'mx-auto grid h-8 w-8 place-items-center rounded-full border-2 text-[10px] font-black transition ' + (index <= step ? 'border-stone-950 bg-stone-950 text-amber-200' : 'border-stone-300 bg-white text-stone-400')}>{chapter[0]}</span><span className={'mt-2 hidden text-[10px] font-black uppercase tracking-wide sm:block ' + (index <= step ? 'text-stone-900' : 'text-stone-400')}>{chapter[1]}</span></div>)}</div></div>;
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="mt-5 block"><span className="mb-2 block text-sm font-bold">{label}</span>{children}</label>; }
function RequiredCheck({ checked, onChange, children }: { checked: boolean; onChange: (value: boolean) => void; children: ReactNode }) { return <label className="mt-3 flex min-h-14 items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-stone-100"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-5 w-5 shrink-0"/>{children}</label>; }
function QuoteShell({ children }: { children: ReactNode }) { return <main className="quote-story"><div className="quote-world border-b border-stone-300 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,.28),transparent_30%),linear-gradient(145deg,#1c1917,#443427)] text-white"><div className="mx-auto max-w-7xl px-4 py-14 lg:px-8"><p className="text-xs font-black uppercase tracking-[.22em] text-amber-300">Creator Studio / Request a Quote</p><h1 className="serif mt-4 max-w-5xl text-5xl font-bold leading-[.95] md:text-7xl">Tell me the moment. I will help shape the right build.</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-stone-300">Submitting does not charge you or confirm an order. This is the part where I listen before I design.</p></div></div><div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">{children}<p className="mt-8 text-center text-sm text-stone-600">Need help before submitting? Email <a className="font-black text-amber-800 underline" href="mailto:colorcreateconnect@gmail.com">colorcreateconnect@gmail.com</a>.</p></div></main>; }
