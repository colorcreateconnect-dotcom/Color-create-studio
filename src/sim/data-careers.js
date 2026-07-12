// ============================================================================
// data-careers.js — career ladders (#8) and school majors (#9).
//
// Careers are data: a list of level tiers with title/pay, the skills a
// promotion wants, and the world/pack they unlock. The career system reads
// this; nothing is hardcoded in buttons.
// ============================================================================

/* CCS is the shared global from core.js */
CCS.data = CCS.data || {};

const L = (title, pay, xp, skills = {}) => ({ title, pay, promoteXp: xp, promoteSkills: skills });

CCS.data.careers = [
  {
    id: 'creator', name: 'Creator', emoji: '📱', pack: 'fame',
    description: 'Post, film, go viral. Turn your life into content.',
    schedule: 'flexible', // work any time
    skill: 'creativity',
    levels: [
      L('Phone Poster', 60, 40, {}),
      L('Micro Creator', 110, 90, { creativity: 15 }),
      L('Brand Beginner', 180, 160, { creativity: 30, charisma: 20 }),
      L('Viral Regular', 300, 260, { creativity: 45, charisma: 35 }),
      L('Main Character Creator', 500, 999, { creativity: 60, charisma: 50 }),
    ],
    followersPerShift: 45,
  },
  {
    id: 'stylist', name: 'Stylist', emoji: '💇', pack: 'fashion', skill: 'style',
    description: 'Dress clients and set trends.', schedule: 'day',
    levels: [
      L('Fitting Room Helper', 70, 45, {}),
      L('Junior Stylist', 120, 100, { style: 15 }),
      L('Personal Stylist', 200, 180, { style: 30, charisma: 15 }),
      L('Celebrity Stylist', 340, 300, { style: 50, charisma: 30 }),
      L('Creative Director', 560, 999, { style: 65, business: 25 }),
    ],
  },
  {
    id: 'musician', name: 'Musician', emoji: '🎧', pack: 'nightlife', skill: 'music',
    description: 'Write, record and perform.', schedule: 'evening',
    levels: [
      L('Bedroom Producer', 65, 45, {}),
      L('Open Mic Act', 120, 100, { music: 15 }),
      L('Local Headliner', 210, 190, { music: 32, charisma: 15 }),
      L('Touring Artist', 360, 320, { music: 50, charisma: 30 }),
      L('Chart Topper', 600, 999, { music: 65, charisma: 45 }),
    ],
    followersPerShift: 30,
  },
  {
    id: 'beautyTech', name: 'Beauty Tech', emoji: '💅', pack: 'fashion', skill: 'style',
    description: 'Nails, glam and glow-ups.', schedule: 'day',
    levels: [
      L('Salon Assistant', 70, 45, {}),
      L('Nail Tech', 120, 100, { style: 12 }),
      L('Lead Artist', 200, 180, { style: 28 }),
      L('Glam Specialist', 330, 300, { style: 45, business: 15 }),
      L('Salon Owner', 540, 999, { style: 60, business: 30 }),
    ],
  },
  {
    id: 'entrepreneur', name: 'Entrepreneur', emoji: '📈', pack: 'business', skill: 'business',
    description: 'Build brands and chase deals.', schedule: 'flexible',
    levels: [
      L('Side Hustler', 80, 50, {}),
      L('Small Biz Owner', 140, 110, { business: 15 }),
      L('Startup Founder', 240, 200, { business: 32 }),
      L('Scale-Up CEO', 420, 360, { business: 50, charisma: 25 }),
      L('Mogul', 720, 999, { business: 70, charisma: 40 }),
    ],
  },
  {
    id: 'designer', name: 'Designer', emoji: '✏️', pack: 'fashion', skill: 'creativity',
    description: 'Sketch, prototype and ship products.', schedule: 'day',
    levels: [
      L('Design Intern', 70, 45, {}),
      L('Junior Designer', 125, 105, { creativity: 15, style: 10 }),
      L('Product Designer', 210, 185, { creativity: 30, style: 20 }),
      L('Art Director', 350, 310, { creativity: 48, style: 30 }),
      L('Head of Design', 580, 999, { creativity: 62, business: 25 }),
    ],
  },
  {
    id: 'student', name: 'Student', emoji: '🎓', pack: 'school', skill: 'academics',
    description: 'Study hard, graduate, unlock everything.', schedule: 'day',
    levels: [
      L('Freshman', 40, 40, {}),
      L('Sophomore', 55, 90, { academics: 20 }),
      L('Junior', 70, 160, { academics: 40 }),
      L('Senior', 90, 260, { academics: 60 }),
      L('Graduate', 130, 999, { academics: 80 }),
    ],
  },
  {
    id: 'retail', name: 'Part-Time Retail', emoji: '🛍️', pack: null, skill: 'charisma',
    description: 'Fold, greet, restock. Reliable starter cash.', schedule: 'day',
    levels: [
      L('Sales Associate', 55, 40, {}),
      L('Key Holder', 85, 90, { charisma: 12 }),
      L('Floor Lead', 120, 160, { charisma: 25 }),
      L('Assistant Manager', 170, 260, { charisma: 40, business: 15 }),
      L('Store Manager', 240, 999, { charisma: 50, business: 30 }),
    ],
  },
  {
    id: 'barista', name: 'Barista', emoji: '☕', pack: null, skill: 'cooking',
    description: 'Pull shots, latte art, regulars who love you.', schedule: 'morning',
    levels: [
      L('Trainee', 55, 40, {}),
      L('Barista', 85, 90, { cooking: 12 }),
      L('Head Barista', 120, 160, { cooking: 25, charisma: 15 }),
      L('Shift Lead', 165, 260, { cooking: 40, charisma: 25 }),
      L('Cafe Manager', 230, 999, { cooking: 50, business: 25 }),
    ],
  },
  {
    id: 'assistant', name: 'Assistant', emoji: '🗂️', pack: null, skill: 'business',
    description: 'Keep someone important organized. Learn everything.', schedule: 'day',
    levels: [
      L('Office Temp', 60, 40, {}),
      L('Personal Assistant', 95, 90, { business: 12 }),
      L('Executive Assistant', 140, 160, { business: 28 }),
      L('Chief of Staff', 200, 260, { business: 45, charisma: 20 }),
      L('Operations Lead', 290, 999, { business: 60 }),
    ],
  },
];
CCS.data.careerById = Object.fromEntries(CCS.data.careers.map((c) => [c.id, c]));

// School programs (#9). Each nudges a couple of skills as you study.
CCS.data.majors = [
  { id: 'fashion',  name: 'Fashion',  emoji: '👗', skills: ['style', 'creativity'] },
  { id: 'business', name: 'Business', emoji: '📊', skills: ['business', 'charisma'] },
  { id: 'music',    name: 'Music',    emoji: '🎼', skills: ['music', 'creativity'] },
  { id: 'beauty',   name: 'Beauty',   emoji: '💄', skills: ['style', 'charisma'] },
  { id: 'media',    name: 'Media',    emoji: '🎬', skills: ['creativity', 'charisma'] },
  { id: 'design',   name: 'Design',   emoji: '🎨', skills: ['creativity', 'style'] },
];
CCS.data.majorById = Object.fromEntries(CCS.data.majors.map((m) => [m.id, m]));
