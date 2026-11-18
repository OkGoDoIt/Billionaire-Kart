/* Online names. A player's handle is one of these titles plus a number the server hands out
   ("Thought Leader 4821"). Nobody types a name, so there is nothing to moderate.
   The server stores only the title's INDEX: never reorder or delete entries, only append
   (the server accepts indexes 0 to 199; raise its limit before going past 200). */
export const HANDLE_TITLES = [
  'Thought Leader', 'Serial Founder', 'Angel Investor', 'Growth Hacker', 'Chief Vibes Officer',
  'Unpaid Intern', 'Stealth Founder', 'Board Observer', 'Pivot Artist', 'Disruptor',
  'Visionary', 'Burn Rate', 'Vaporware', 'Synergy Guru', 'Hype Man',
  'Bag Holder', 'Paper Billionaire', 'Tax Haven', 'Golden Parachute', 'Exit Strategy',
  'Cap Table', 'Down Round', 'Pre-Revenue', 'Minimum Viable', 'Blitzscaler',
  'Rent Seeker', 'Loss Leader', 'Dead Unicorn', 'Zombie Startup', 'Acqui-Hire',
  'Yacht Collector', 'Bunker Owner', 'Island Buyer', 'Jet Tracker', 'Space Tourist',
  'Podcast Host', 'Keynote Speaker', 'TED Talker', 'Book Deal', 'Guru for Hire',
  'Ten-X Engineer', 'Ninja Rockstar', 'Code Wizard', 'Tech Bro', 'Hustle Bro',
  'Crypto Bro', 'Finance Bro', 'Founder Mode', 'Grindset', 'Rise and Grind',
  'Ice Bath Guy', 'Biohacker', 'Blood Boy', 'Live Forever', 'Cryo Customer',
  'Soylent Sipper', 'Fasting Founder', 'Cold Plunger', 'Sleep Hacker', 'Macro Doser',
  'Layoff Memo', 'Pink Slip', 'Return to Office', 'Unlimited PTO', 'Pizza Party',
  'We Are Family', 'Open Floor Plan', 'Standing Desk', 'Nap Pod', 'Kombucha Tap',
  'Stock Option', 'Vesting Cliff', 'Liquidity Event', 'Secondary Sale', 'Insider Tip',
  'Pump and Dump', 'Rug Pull', 'Diamond Hands', 'To the Moon', 'Number Go Up',
  'Token Launch', 'Whitepaper', 'Gas Fee', 'Cold Wallet', 'Lost Seed Phrase',
  'Monopoly Man', 'Robber Baron', 'Trust Buster', 'Market Maker', 'Price Gouger',
  'Lobbyist', 'Super PAC', 'Dark Money', 'Shell Company', 'Offshore Account',
  'Loophole', 'Write-Off', 'Carried Interest', 'Stepped-Up Basis', 'Charitable Trust',
  'Philanthropist', 'Naming Rights', 'Legacy Admit', 'Trust Fund', 'Nepo Hire',
  'Small Loan', 'Self-Made', 'Garage Myth', 'Dropout', 'Wunderkind',
  'Move Fast', 'Break Things', 'Ask Forgiveness', 'Terms of Service', 'Dark Pattern',
  'Data Broker', 'Cookie Banner', 'Opt-Out', 'Shadow Profile', 'Ad Tracker',
  'Engagement Bait', 'Doomscroller', 'Reply Guy', 'Blue Check', 'Main Character',
  'Ratio Risk', 'Hot Take', 'Subtweet', 'Thread Guy', 'Quote Tweet',
  'Algorithm', 'Black Box', 'Hallucination', 'Prompt Engineer', 'Stochastic Parrot',
  'Compute Hoarder', 'GPU Baron', 'Token Burner', 'Model Collapse', 'Doomer',
  'Accelerationist', 'Paperclip Maximizer', 'Alignment Problem', 'Singularity Soon', 'Post-Scarcity',
  'Mars Colonist', 'Seasteader', 'Network State', 'Charter City', 'Exit Seeker',
  'Tunnel Digger', 'Flamethrower', 'Self-Driving', 'Full Autopilot', 'Recall Notice',
  'Beta Tester', 'Feature Creep', 'Tech Debt', 'Ship It', 'Works on My Machine',
  'Hotfix', 'Rollback', 'Outage', 'Five Nines', 'Postmortem',
  'Stand-Up Meeting', 'All-Hands', 'Offsite', 'Reorg', 'Skip-Level',
  'Middle Manager', 'Chief of Staff', 'Fractional CEO', 'Founder in Residence', 'Venture Partner',
  'Scout', 'Deal Flow', 'Term Sheet', 'Due Diligence', 'Dry Powder',
  'Pattern Matcher', 'Warm Intro', 'Cold Email', 'Pitch Deck', 'Demo Day',
  'Hockey Stick', 'Up and to the Right', 'North Star', 'Moat', 'Flywheel',
  'Network Effect', 'Land Grab', 'Walled Garden', 'Platform Tax', 'Lock-In',
  'Surge Pricing', 'Gig Economy', 'Contractor', 'Side Hustle', 'Passive Income',
];
if (HANDLE_TITLES.length !== 200 || new Set(HANDLE_TITLES).size !== 200) throw new Error('handles.js: expected 200 distinct titles, found ' + HANDLE_TITLES.length);

/** "Thought Leader 4821". An unknown title index falls back to a plain word rather than breaking the screen. */
export function handleName(handle) {
  if (!handle) return 'Racer';
  const title = HANDLE_TITLES[handle.title] || 'Racer';
  return `${title} ${String(handle.number).padStart(4, '0')}`;
}
