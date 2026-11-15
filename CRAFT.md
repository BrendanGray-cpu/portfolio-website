# Craft Standards for brendangraydesign.com

These rules come from the Interface Craft library in the vault (`Interface Craft/`). Each one names where it's applied in this site, so a touch-up pass can check them one by one.

## Motion

- **Arcs, not straight lines** (*Animations*). The nav dot lifts on a small arc as it glides between items. The contract card arcs onto the form and grows at the top of its path. The checkout cursor curves between stops, and the head's dots curl in on arrival.
- **Chain related elements** (*Animations*). Page sections fade up 60ms apart. The supplier spokes pulse in sequence, and tasks tick one by one.
- **Interruptible** (*Animations*). The head keeps taking input while a new mood decodes. Illustration stories rewind from wherever they are when you leave a card.
- **Semantic motion** (*Animations*). Scratching the face scrambles the mood word. The before/after slider wipes the redesign over the old screen. The contract signature writes itself.
- **Anticipation before a payoff** (*Animations*, Disney principles). The face gathers in for 140ms before each new mood.
- **Waves for loops** (*Wave Functions*). The idle sway is three sines at unrelated speeds, so it never visibly repeats.
- **Springs for physical things** (*Live Tuning*). The nav dot and the head use springs, tuned live with DialKit in the labs.
- **Reduced motion** (*Industry Standards*). Every animation stops, the head sits still and changes mood on a tap, and the illustrations jump to their end frame.

## Interactivity

- **Before/after sliders:** Contact Center, visual workflow, the trial hub, Motorcycle and Wellspring first versions.
- **Live prototypes:** they load inside each case study on click. On phones they open in a new tab.
- **Recommendations:** they unfold in place, one at a time, with keyboard support.
- **Fun Zone media:** it tilts toward the cursor. The sizzle reel plays muted while on screen.

## States

- **Every state has a plan** (*State Machines*). The hero handles mouse, touch (press-drag), reduced motion, slow loading and no WebGL. You can force each one with `?sim=` in the head lab.
- **Hide the wait** (*Perceived Performance*). The head assembles as it loads. Images reserve their space and sit on a dotted placeholder until they arrive.

## Type

- **Measure.** Body text is capped at 64 characters per line. The large intro is capped at 22 characters per line, as display text.
- **Leading.** Body 1.55–1.6, display 0.95, intro 1.2.
- **Balanced headings.** `text-wrap: balance` on headings, `pretty` on paragraphs.
- **Tabular figures.** Timelines and dates use tabular figures, so digits line up.
- **Proper punctuation.** Real apostrophes, × for dimensions, → for links. No em dashes in the copy (voice rule).
- **Two faces, no monospace and no all caps.** Hanken Grotesk for display, Instrument Sans for everything else. Labels get their hierarchy from size, weight and a muted color.

## Style

- **Borders are transparent ink** (*Style Details*). Edges stay crisp on white, gray and over images.
- **Three radius steps:** 4 (small parts), 10 (cards and images), 999 (pills).
- **One accent with a job.** Blue is only used for the nav dot, the designed object in each illustration, the mood fill and hover states.
- **Consistent illustration language.** One object line weight, one detail weight, paper fills, one depth plate.

## Less, but better

- **The hero has one framing device:** the faint grid. The selection box, coordinates and hint text are off.
- **No eyebrow labels over page titles.** Titles stand on their own.
- **No "at a glance" cards.** They repeated the meta row and the Outcome section.
- **Cards show one thing at rest:** the illustration and its title. The caption, role and link unfold on hover. No status on cards; status lives in the case study meta.

## Copy

- **Voice guide.** Every line follows `Reference/Writing/Brendan Writing Voice.md` and the tics table: no negation-first reveals, no significance designation, no abstraction agency, no deferred nouns, no coy headers, no aphoristic closers, no straw men, no fragment cadence, no dressed metaphor and no label-first framing.
- **Claims.** Numbers come only from `Career/Brendan Gray Professional Profile.md`, in their public-safe versions.
