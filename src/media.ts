// Real cleared client work extracted from the Color Create Studio design handoff.
// Publish rule: only CLEAR / OK-OWN images appear here. PERM items (Grillfather-worn,
// Best Dad worn+collage, reunion group tee) are intentionally absent. The Paw-ty suite
// is shown as a portfolio EXAMPLE only (licensed characters), never as a buyable product.
import logo from './assets/media/logo.jpg';
import sportsJaylenCard from './assets/media/sports-jaylen-card.jpg';
import sportsJaylenYardsign from './assets/media/sports-jaylen-yardsign.jpg';
import sportsAymirJersey from './assets/media/sports-aymir-jersey.jpg';
import sportsFamilyTees from './assets/media/sports-family-tees.jpg';
import sportsMagnetBadge from './assets/media/sports-magnet-badge.jpg';
import sportsMagnetContour from './assets/media/sports-magnet-contour.jpg';
import sportsFaceFan from './assets/media/sports-face-fan.jpg';
import gradJayvonSuite from './assets/media/grad-jayvon-suite.jpg';
import gradJayvonApparel from './assets/media/grad-jayvon-apparel.jpg';
import gradMekhiGraduate from './assets/media/grad-mekhi-graduate.jpg';
import gradMekhiAirforce from './assets/media/grad-mekhi-airforce.jpg';
import birthdayBriannaBrunch from './assets/media/birthday-brianna-brunch.jpg';
import birthdaySweet16 from './assets/media/birthday-sweet16.jpg';
import revealBabybeeInvite from './assets/media/reveal-babybee-invite.jpg';
import revealBabybeeSuite from './assets/media/reveal-babybee-suite.jpg';
import partyDukesBoots from './assets/media/party-dukes-boots.jpg';
import partyLailahGarden from './assets/media/party-lailah-garden.jpg';
import partyNinetiesToppers from './assets/media/party-nineties-toppers.jpg';
import examplePawty from './assets/media/example-pawty.jpg';
import apparelDavinci from './assets/media/apparel-davinci.jpg';
import apparelFatherhood from './assets/media/apparel-fatherhood.jpg';
import apparelDaddyu from './assets/media/apparel-daddyu.jpg';
import apparelChiefy from './assets/media/apparel-chiefy.jpg';
import apparelTopshelf from './assets/media/apparel-topshelf.jpg';
import apparelPopsicles from './assets/media/apparel-popsicles.jpg';
import keepsakeHeyboo from './assets/media/keepsake-heyboo.jpg';

export const media = {
  logo,
  sportsJaylenCard, sportsJaylenYardsign, sportsAymirJersey, sportsFamilyTees,
  sportsMagnetBadge, sportsMagnetContour, sportsFaceFan,
  gradJayvonSuite, gradJayvonApparel, gradMekhiGraduate, gradMekhiAirforce,
  birthdayBriannaBrunch, birthdaySweet16, revealBabybeeInvite, revealBabybeeSuite,
  partyDukesBoots, partyLailahGarden, partyNinetiesToppers, examplePawty,
  apparelDavinci, apparelFatherhood, apparelDaddyu, apparelChiefy,
  apparelTopshelf, apparelPopsicles, keepsakeHeyboo,
};

export type PortfolioCategory = 'Sports' | 'Graduation' | 'Birthday' | 'Reveal' | 'Party' | 'Apparel' | 'Keepsake';
export type PortfolioPiece = { img: string; type: string; cat: PortfolioCategory; title: string; story: string; deliv: string[]; example?: boolean };

// Real portfolio — cleared work only. GRADUATION leads (headline department per brief).
export const portfolio: PortfolioPiece[] = [
  { img: gradJayvonSuite, type: 'Graduation', cat: 'Graduation', title: 'Jayvon Jackson · Full Ride', story: 'The studio’s showpiece graduation suite — Class of 2026, Track & Field. Banner, welcome sign, apparel, stole, cap, labels, favors and keepsakes, all one story.', deliv: ['Apparel', 'Stole', 'Cap', 'Sign', 'Keepsakes'] },
  { img: gradJayvonApparel, type: 'Graduation', cat: 'Graduation', title: 'Full Ride · Wearables', story: 'The apparel drop from the Full Ride suite — photo-real tee, matching stole and bedazzled grad cap, built around the athlete.', deliv: ['Tee', 'Stole', 'Grad cap'] },
  { img: gradMekhiGraduate, type: 'Graduation', cat: 'Graduation', title: 'Graduate Spotlight', story: 'A bold grad announcement built around the moment — framed to keep.', deliv: ['Announcement', 'Print + digital'] },
  { img: gradMekhiAirforce, type: 'Graduation', cat: 'Graduation', title: 'Next Chapter · Service', story: 'A milestone design honoring the leap from cap and gown to service — proud, clean, personal.', deliv: ['Keepsake', 'Announcement'] },
  { img: sportsJaylenCard, type: 'Sports', cat: 'Sports', title: 'Jaylen #24 · Meet the Team', story: 'Magazine-style spotlight card for the Atlanta Spartans Hit Squad — metallic type, stadium lights, big-hits energy.', deliv: ['Player card', 'Team look'] },
  { img: sportsJaylenYardsign, type: 'Sports', cat: 'Sports', title: 'Spartans Yard Sign', story: 'Weatherproof front-yard bragging rights — the same Hit Squad look, staked and game-ready.', deliv: ['Yard sign', 'Weatherproof'] },
  { img: sportsFamilyTees, type: 'Sports', cat: 'Sports', title: 'Hit Squad Group Tees', story: 'Matching Atlanta Spartans supporter tees for the whole cheering section — one crest, the entire family loud.', deliv: ['Group tees', 'Crest'] },
  { img: sportsMagnetBadge, type: 'Sports', cat: 'Sports', title: 'Spartans Keepsakes', story: 'Fridge magnets, contour cut-outs and game-day face fans — the little keepsakes that make the season last.', deliv: ['Magnet', 'Fan', 'Keepsake'] },
  { img: birthdayBriannaBrunch, type: 'Birthday', cat: 'Birthday', title: 'Birthday Brunch · 33', story: 'Blush-and-burgundy vintage suite — welcome sign, invitation, toppers, labels, favor tags and napkins, all one look.', deliv: ['Sign', 'Invite', 'Toppers', 'Labels', 'Favors'] },
  { img: birthdaySweet16, type: 'Milestone', cat: 'Birthday', title: 'Sweet 16', story: 'A glowing sweet-sixteen invitation suite designed to feel like the night itself.', deliv: ['Invitation', 'Signage'] },
  { img: revealBabybeeInvite, type: 'Sweet Beginnings', cat: 'Reveal', title: 'What Will Baby Bee?', story: 'Honey-and-daisy gender reveal — warm, sweet and buzzing with charm across the whole set.', deliv: ['Reveal invite', 'Favors', 'Labels'] },
  { img: revealBabybeeSuite, type: 'Sweet Beginnings', cat: 'Reveal', title: 'Baby Bee · Full Suite', story: 'The coordinated honey-and-daisy paper suite — welcome sign, invitation, water labels, chip bags, toppers, honey-jar favors and candy wraps.', deliv: ['Sign', 'Invite', 'Wraps', 'Toppers', 'Favors'] },
  { img: partyDukesBoots, type: 'Theme Party', cat: 'Party', title: 'Dukes & Boots Hoedown', story: 'A playful wild-west theme carried from invitation to chip bags, candy bars, toppers and favor wraps.', deliv: ['Invite', 'Wraps', 'Toppers'] },
  { img: partyLailahGarden, type: 'Theme Party', cat: 'Party', title: 'Garden Party · Lailah', story: 'A soft wildflower theme — invitation and envelope set, thank-you cards, tags and coordinated decor.', deliv: ['Invite', 'Cards', 'Tags'] },
  { img: partyNinetiesToppers, type: 'Party Decor', cat: 'Party', title: 'Ninety’s Baby Decor', story: 'Black-and-gold balloon theme — cupcake toppers, bottle labels and coordinated party decor.', deliv: ['Toppers', 'Labels'] },
  { img: examplePawty, type: 'Theme Party', cat: 'Party', title: 'Slippery Paw-ty · Turning 4', story: 'A splash-day 4th birthday suite — invitation, welcome sign, cake topper, labels, plates, napkins and favors. Custom work shown as a portfolio example only.', deliv: ['Invite', 'Sign', 'Toppers', 'Labels', 'Favors'], example: true },
  { img: apparelDavinci, type: 'Streetwear', cat: 'Apparel', title: 'DaVinci Diamond', story: 'A poster-style streetwear showpiece — vintage record-cover energy, halftone grit and full-length attitude. A one-of-one hero graphic.', deliv: ['Poster art', 'Streetwear'] },
  { img: apparelFatherhood, type: 'Apparel', cat: 'Apparel', title: 'Fatherhood Dept.', story: 'A dad-pride patch tee — hammer & heart, “Pressure · Patience · Protection · Purpose. Daily operations since 2025.”', deliv: ['Back patch', 'Shirt'] },
  { img: apparelDaddyu, type: 'Apparel', cat: 'Apparel', title: 'Daddy University', story: 'A crest-style dad tee — “Provide · Protect · Presence. Major: Dad Jokes, Grilling, Sacrificing.” Front crest, full back.', deliv: ['Crest', 'Front + back'] },
  { img: apparelChiefy, type: 'Apparel', cat: 'Apparel', title: 'Chiefy Chief', story: 'A personalized name-patch tee — “Chiefy Chief of Baby Chief Brad & Tahj.” Custom to the family, every time.', deliv: ['Name patch', 'Shirt'] },
  { img: apparelTopshelf, type: 'Streetwear', cat: 'Apparel', title: 'Top Shelf Behavior', story: 'A seasonal streetwear drop — “Red, White & Blue Agave.” Hand-drawn, sparkler-lit, cookout-ready.', deliv: ['Graphic tee', 'Seasonal drop'] },
  { img: apparelPopsicles, type: 'Streetwear', cat: 'Apparel', title: 'Popsicles & Pyrotechnics', story: 'A retro summer graphic — firecracker popsicle, fireworks and a bubble banner. Bold, nostalgic, seasonal.', deliv: ['Graphic tee', 'Seasonal drop'] },
  { img: keepsakeHeyboo, type: 'Keepsake', cat: 'Keepsake', title: 'Hey Boo!', story: 'A playful seasonal keepsake graphic — two friends toasting the night. Retro-groovy and fun.', deliv: ['Seasonal art', 'Keepsake'] },
];
