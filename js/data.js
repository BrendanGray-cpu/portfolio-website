/* ============================================================
   data.js — all site copy as structured data.
   Text is verbatim from the content doc; only punctuation is
   normalised (en dashes for ranges, curly quotes).
   Section paragraph items may be:
     "string"                       → <p>
     { sub, text }                  → <h4> + <p>
     { list: [...] }                → <ul>
     { figure: [{src, alt, caption}, ...] } → two-up figure
   ============================================================ */

const IMG = "/assets/img";

export const SITE = {
  name: "Brendan Gray",
  title: "Brendan Gray — Product Designer",
  description: "Product designer in Utah working in B2B SaaS, mostly on growth: the surfaces where software gets bought, and the research that explains why.",
  linkedin: "https://www.linkedin.com/in/brendansgray/",
  email: "graybrendan15@gmail.com",
  resume: "/assets/Brendan-Gray-Resume.pdf",
};

export const PROJECTS = [
  {
    slug: "contract-sign-up",
    name: "Contract Sign-up",
    company: "BambooHR",
    role: "Product Designer, sole designer on the initiative",
    duration: "11-month initiative, through Feb 2026",
    context: "The sales-assisted path to buying BambooHR. After a prospect works with a sales rep, they come into the trial to review the order, sign the terms, add payment, and start their subscription. It sits inside the trial and predates the checkout.",
    link: "https://billing-checkout-v2.vercel.app/",
    cta: "Try the Prototype",
    image: `${IMG}/previews/contract-sign-up.webp`,
    thumb: `${IMG}/previews/contract-sign-up-sm.webp`,
    aspect: 2702 / 1500,
    alt: "BambooHR settings page with the two-step sign-up: add payment information and accept the terms of service",
    focus: [0.6, 0.53],
    zoom: 1.75,
    sections: [
      { heading: "Problem", items: [
        "Before this, starting a subscription was informal and mostly happened outside the product. A prospect added a payment method through a link outside BambooHR, and a sales rep started the subscription for them. That created some problems. Legal had no in-app record of who accepted the terms of service or when, so when a customer disputed that they’d agreed, we couldn’t prove it. Additionally, we didn’t offer contracts at all. BambooHR traditionally is a month-to-month subscription, which makes it easy for a customer to sign up and just as easy to leave. Contracts are an industry standard, so not having them was kind of surprising. The company wanted to offer extended-term contracts to the customers who wanted them, record acceptance properly, and make the start of a subscription a formal, recorded event.",
      ]},
      { heading: "Constraints", items: [
        "The flow had to work for more than one person, and the steps could happen inside or outside BambooHR. If the person signing also holds the company payment information, they review, sign, and pay in one motion inside the app. But in a sales motion, the person talking to sales rarely has the company card. That meant pulling in someone who has no BambooHR login and no interest in making one — a finance lead, a founder, a CTO. So we built a sharable link. The signer can copy it, send it to their finance person over Slack or Teams, and that person adds payment in their browser without an account. When both steps are done, the subscription starts. Because a customer could pay by card, ACH, wire, or check, the flow had to handle each use case.",
      ]},
      { heading: "Decision", items: [
        "An earlier version put a wall of legal text and metadata on the left and a PDF preview on the right. A lot of it was redundant with the order form preview, and the hierarchy was off. I made the order form the user is agreeing to the first thing they see, and gave the actions clear hierarchy on the right once they’d reviewed it. I trimmed the surrounding content down to what moves the user forward. Everything legally required already lived on the order form in the media previewer, so the interface didn’t need to repeat it.",
      ]},
      { heading: "Outcome", items: [
        "This one shipped, and it worked well. By the time I left, a third of all new customers were on an extended-term contract, and every new customer was going through the sign-up flow. All that revenue was now locked into long-term contracts, and churn among contracted customers was very low compared to month-to-month. A formerly month-to-month product that had no contracts and no record of acceptance now had both.",
      ]},
      { heading: "Reflection", items: [
        "This was a company initiative that ran close to a year, and my billing team acted as support whenever a new use case or an alternate state turned up. I didn’t know how long it would last. If I did it again, I’d push to get edge cases and use cases from stakeholders earlier, since those heavily shaped the design. We went through a few iterations that would have been simpler with the full picture in front of me from the start.",
      ]},
    ],
  },
  {
    slug: "supplier-experience",
    name: "Supplier Experience",
    company: "Graphite Connect",
    role: "Lead Product Designer, sole designer",
    duration: "Aug 2023 – Dec 2025",
    context: "B2B procurement platform. An initiative of seven projects to improve the experience of one persona — suppliers.",
    link: null,
    image: `${IMG}/previews/supplier-experience.webp`,
    thumb: `${IMG}/previews/supplier-experience-sm.webp`,
    aspect: 1666 / 752,
    alt: "Timeline of the supplier experience initiative from 2023 to 2025: contact center, accessibility improvements, attachment drawers, satisfaction survey, and visual workflow",
    focus: [0.42, 0.45],
    zoom: 0.97,
    sections: [
      { heading: "Problem", items: [
        "Graphite Connect was built for the customers who pay for it — buyers managing risk and relationships for their supplier base. Suppliers were never originally designed for. Every new buyer brought tens to hundreds of thousands of suppliers onto the platform, and testing said the same thing over and over: the platform felt confusing, and it wasn’t built with them in mind. That friction cost more than the supplier’s time. A tedious onboarding strained the buyer–supplier relationship, and suppliers complained to the buyer about it. Every point of friction across thousands of onboardings turned into support tickets.",
      ]},
      { heading: "Constraints", items: [
        "Two things made this hard. First, the persona was the widest I’ve designed for. Suppliers ranged from individuals to enterprises, across every industry and level of technical skill, so no single persona covered them. Second, suppliers brought no revenue. Graphite earns from buyers, so improving the supplier experience has no direct line to revenue. Before I could design anything, I had to make the case upward and convince leadership a non-paying persona was worth the investment. I tied the work to what they cared about — support load and customer relationships.",
      ]},
      { heading: "Decision", items: [
        "I treated suppliers as a first-class persona and ran it as a sustained long-term initiative rather than one-off fixes. Although there were many projects under the umbrella, three main projects anchored the work.",
        { sub: "Contact Center", text: "Suppliers needed to know who at the buying company to talk to and who held the right permissions. The old page showed a name, an email, and users grouped by roles, and nothing more. Over six months I redesigned it into an interactive and actionable component. Organizations could import their employees and internal roles, which gave suppliers real visibility and a way to reach the right person when they needed help." },
        { figure: [
          { src: `${IMG}/supplier/contact-center-before.webp`, width: 1600, height: 1034, alt: "The old Contacts page: names and emails grouped under role headings, with most roles showing no assigned owners", caption: "Contact Center, before" },
          { src: `${IMG}/supplier/contact-center-after.webp`, width: 1600, height: 914, alt: "The redesigned Contact Center: a searchable, filterable table of contacts with permissions, status, and a detail panel for the selected person", caption: "Contact Center, after" },
        ]},
        { sub: "Accessibility", text: "Critical feedback from low-vision users made us quickly aware: the platform had never been built for assistive technology. Screen readers, keyboard navigation, color contrast — it had never been done. I became the point man for accessibility. I met with disabled users, took classes, audited the product, and brought our CPO, engineers, and creative director up to speed on WCAG 2.2. The lasting change was a process. Wireframes and tickets now get written to WCAG 2.2, engineers test with accessibility tools during development, and QA checks accessibility before production." },
        { sub: "Visual Workflow", text: "Every buyer runs their own onboarding process, shown to suppliers as a visual workflow of pending tasks, owners, and next steps. In testing, suppliers kept clicking the workflow items expecting details and navigation, which was a failure of the workflow for looking clickable while doing nothing. I made items open a task drawer on click, with a status tooltip on hover. I built a status system with dedicated icon space so we could add new statuses without breaking the layout. I turned stage titles into buttons that reveal a description, and let buyers write their own so suppliers read it in language they understand." },
        { figure: [
          { src: `${IMG}/supplier/workflow-before.webp`, width: 1600, height: 1257, alt: "The old visual workflow: stage cards with checkmarks and checkboxes and no interaction", caption: "Visual Workflow, before" },
          { src: `${IMG}/supplier/workflow-after.webp`, width: 1600, height: 1256, alt: "The redesigned visual workflow: clickable stage titles, status icons with an On-Hold tooltip, and the active stage highlighted", caption: "Visual Workflow, after" },
        ]},
      ]},
      { heading: "Outcome", items: [
        "Across the initiative, support tickets measurably dropped, even as the platform’s user base grew more than threefold. Suppliers went from an afterthought to a maintained part of the product, and accessible design is now built into how the team ships.",
      ]},
      { heading: "Reflection", items: [
        "The hardest part of this work was earning the right to design for suppliers at all. Making the case for a non-revenue persona was as much of the job as the design itself.",
      ]},
    ],
  },
  {
    slug: "hris-buying-lifecycle-study",
    name: "HRIS Buying Lifecycle Study",
    company: "BambooHR",
    role: "Product Designer, sole researcher",
    duration: "June 2026, ~2 weeks",
    context: "A self-initiated study mapping how prospects buy HRIS software before they purchase, delivered as an interactive, coded slide deck.",
    link: "https://hris-lifecycle.vercel.app/#0",
    cta: "Explore the Study",
    image: `${IMG}/previews/hris-buying-lifecycle-study.webp`,
    thumb: `${IMG}/previews/hris-buying-lifecycle-study-sm.webp`,
    aspect: 2710 / 1582,
    alt: "Title screen of the HRIS Buying Lifecycle interactive deck: how SMB prospects buy HR software and how we can best position ourselves",
    focus: [0.26, 0.51],
    zoom: 0.8,
    sections: [
      { heading: "Problem", items: [
        "Our trial was doing too many jobs. Marketing used it as an early tool on their marketing page, sales used it for late-stage conversion, and we were planning on putting a checkout in it. I wasn’t satisfied with how little we understood about where a trial actually fits in a buyer’s head, so I started the study to find out. I questioned whether we had the trial positioned correctly in the buying process, and what to do if we didn’t.",
      ]},
      { heading: "Constraints", items: [
        "I started this without a mandate, running it by myself for about two weeks. I recruited people who had recently bought HR software, some of whom had shortlisted BambooHR, because I wanted the general buying journey rather than our own funnel.",
      ]},
      { heading: "Decision", items: [
        "I ran moderated interviews with 12 people who had recently bought HR software. There were several key findings:",
        { list: [
          "Whether a buyer wants a salesperson comes down to risk, not company size.",
          "The job is to calm fear, and first-time buyers are the most anxious.",
          "We built the trial as an early preview and presented it like late-stage proof.",
          "Buyers trusted the products that were honest about their own limits.",
          "Buyers expect a trial to be a sandbox for their own data. Ours comes prefilled with demo data, and they are discouraged from adding their own as it gets deleted.",
        ]},
        "The research was clear, we shouldn’t try to replace the sales rep. We should rebuild the trust a rep creates, inside the product. A trial can answer how BambooHR looks and feels. It can’t answer whether it will work for one specific company, and we were leaning on it to do both.",
        "I treated the deliverable as a design challenge. I was used to handing research over as a slide deck, and I wanted to try something interactive instead. Coding it let me put all six lifecycle stages on a single page for people to explore, where a deck would have spread them across six slides. I prototyped it with AI, which let me pull synthesized research straight into the presentation.",
      ]},
      { heading: "Outcome", items: [
        "The study changed the direction of the trial and the agent. The experience shifted toward calming fear and getting people to what they wanted to see quickly, instead of repeating their pain points back to them. The guided experience became more of a tour that orients and shows the product, and less a set of instructions for making it fit a specific use case. My manager used the research in his own mapping for the growth portfolio, so it informed teams beyond mine.",
      ]},
      { heading: "Reflection", items: [
        "I wish I’d run a study this size the week I joined the team. Understanding how my corner of the product fit into the whole buying journey changed how I worked, and it turned out to be just as useful to the people around me. Additionally, the research was dense enough that the generated language didn’t come out right the first time, so I spent a good amount of effort rewriting it. I’ve since baked in rules for voice and tone into my AI content generation.",
      ]},
    ],
  },
  {
    slug: "trial-experience",
    name: "Trial Experience",
    company: "BambooHR",
    role: "Lead Product Designer, PM/design/engineering trio",
    duration: "Started March 2026",
    context: "A guided, AI-driven free trial that orients prospects and shows them the parts of BambooHR most relevant to their business. There are three surfaces within it — welcome screens, an agent, and a trial hub.",
    link: "https://trial-experience-beta.vercel.app/",
    cta: "Try the Prototype",
    image: `${IMG}/previews/trial-experience.webp`,
    thumb: `${IMG}/previews/trial-experience-sm.webp`,
    aspect: 2814 / 1576,
    alt: "Welcome to BambooHR screen: a green page with a Let’s Go button, surrounded by scattered HR icons",
    focus: [0.5, 0.5],
    zoom: 1,
    sections: [
      { heading: "Problem", items: [
        "Before this, the trial had no real guidance. A user created an account, landed on the home page, and had to find what mattered to them on their own. Most buyers assume HRIS software is about 90% the same and just need to know where things are so they can judge the feel of it. The trial didn’t help them do that. People got dropped off, clicked around for 10 to 20 minutes, and left and as a result, it didn’t convert well. We did have a small tour guide, but it sat buried under a button on the home page. The users who found it stayed in the trial longer and converted at higher rates, so we already knew guidance worked, we just hadn’t made it the default.",
      ]},
      { heading: "Constraints", items: [
        "This was several projects in one, released together. A user had to be welcomed, the agent had to be trained, the trial content needed a home, and a prospect had to be able to buy. Each depended on the others, and all of it had to land at once. We didn’t have much data to train the agent on at first, though a parallel effort to centralize the data we collected before the trial helped fill that in. With the company-wide push to build AI products and the release of Bamboo AI, we had to design the trial knowing its product features and tools would change as we worked.",
      ]},
      { heading: "Decision", items: [
        "I designed three surfaces. The welcome screens orient the user, make clear that everything they see is sample data, and ask a few questions we use to train the agent and pass to sales. They end the welcome screens with suggestions for what to look at first. The agent is really several agents in a trench coat. One gathers what we already know about the user — from our marketing site, its chatbot, forms they filled out, and the welcome-screen questions — which tells us their location, company size, and industry. Another tailors the trial copy to that industry and ties it to the user’s use case. Another watches behavior, so when someone returns to a page repeatedly or lingers on it, the agent offers a suggestion at that moment. The trial hub gathers all of it in one place: the agent and its suggestions, an assessment that recommends the right package, a way to subscribe, teammate invites, a video library, and guided tours. It lives in a drawer that slides down on any page, so the help is there when the user wants it and out of the way when they don’t.",
        "Several of the important decisions came out of testing.",
        "I started with a chatbot assistant that followed the user around, and I dropped it. Users had chatbot fatigue, and they confused a trial agent with a real BambooHR assistant, so the distinction wasn’t strong enough.",
        "I tried the trial hub as its own page. Landing on a page called the Trial Hub put it on the same level as real product pages, and users couldn’t tell what was BambooHR and what was trial-specific. Research kept pointing the same way. The trial content had to be visually distinct. I moved it into a drawer and treated it in black, the trial’s designated color, testing it as accents and as full dark mode.",
        "I changed how the agent talks. It first suggested things based on the user’s pain points, and testing showed users already know their pain points and don’t need them repeated. What they want are outcomes they can attach to those pain points. I made the suggestions outcome-oriented, and they landed a lot better — users connected them to their own situation and found what they came for.",
        "For relevance, we trained the agent on thousands of hours of recorded conversations between sales reps and prospects. That surfaced the pain points, concerns, and interests that track with industry. A tech company tends to care about benefits, and a high-turnover industry like construction cares more about onboarding. Company size, location, and industry told us a lot about what a user came to evaluate. It was a starting point, and the agent was built to get smarter as more people used it.",
      ]},
      { heading: "Outcome", items: [
        "It didn’t ship while I was there. The design was tested and handed off — welcome, agent, hub, and the checkout inside it — with release planned for a week or two after my role ended. I can’t show conversion numbers, but the direction was validated in testing round after round, and every affected team had signed off on the solution.",
      ]},
      { heading: "Reflection", items: [
        "The solution felt prescribed at the start — we had to put AI in the trial and use the new technology to solve something we couldn’t before. Testing complicated that in useful ways. Every round taught me something new, from how users actually feel about AI to the purpose of a trial. A trial sits at one stage within a longer buying process, and its job is more narrow. It shows the user how BambooHR looks and feels. The best thing I could do was make it excellent at that one job instead of overloading it.",
      ]},
    ],
  },
  {
    slug: "checkout",
    name: "Checkout",
    company: "BambooHR",
    role: "Lead Product Designer, design and usability owner in a PM/design/engineering trio",
    duration: "~3 months, 2025",
    context: "Self-service purchase flow that lets small companies buy BambooHR without talking to sales, a first for the product.",
    link: "https://trial-checkout-real.vercel.app/signup",
    cta: "Try the Prototype",
    image: `${IMG}/previews/checkout.webp`,
    thumb: `${IMG}/previews/checkout-sm.webp`,
    aspect: 2688 / 1330,
    alt: "Get Started with BambooHR checkout: a four-step flow (Your Plan, About You, Review, Payment) starting with plan setup",
    focus: [0.23, 0.5],
    zoom: 1,
    sections: [
      { heading: "Problem", items: [
        "Buying HR software usually means calling sales. Pricing is usually opaque, so getting a quote takes a conversation, and a portion of buyers refuse to do it. Our PM’s research put it around one in eight prospects who wouldn’t talk to sales at all, with more who were reluctant. Each one was a company that might have bought BambooHR and didn’t, because the only way to buy was through a sales rep. We wanted to let people buy the way they’re comfortable buying, and reasoned that those who would have walked will convert. We scoped the first version to U.S. companies under 25 employees with the simplest packages, and left room to expand to larger deals later.",
      ]},
      { heading: "Constraints", items: [
        "A self-service purchase involves nearly every team, and each one has constraints. Implementation needed a clean handoff of the customer and their data into onboarding. Sales needed to know how self-serve purchases affected commission. Billing was a hard boundary as BambooHR doesn’t process payments, so the flow had to embed the payment processor directly through an iframe. Legal required the buyer to review and agree to the terms of service and a generated order form. Designing the flow meant working all of those at once.",
      ]},
      { heading: "Decision", items: [
        "The biggest decision went against the prevailing direction. The company was pushing AI chat and moving away from forms, so I built and tested a version where the user talks to a chat to assemble their order form and pay. It didn’t test well. A checkout is one of the most established patterns on the web, and most people carry a mental model of how it works. Replacing that with a conversation adds risk at the exact moment someone decides to spend money. I went with a traditional stepped checkout — clear sections, familiar fields, submit to pay. The AI chat exploration was still valuable as it let me research and reject the idea on evidence instead of a hunch.",
      ]},
      { heading: "Outcome", items: [
        "The design was specified, tested, and approved, and engineering had started building. It cleared every involved team — implementation, sales, billing, and legal. It didn’t ship before my role ended, so I have no conversion numbers to show. What I have is a validated design that is held up under scrutiny from every team involved.",
      ]},
      { heading: "Reflection", items: [
        "Testing reframed the project for me. HR software is a high-risk purchase. A real segment of buyers wants to do it themselves, and plenty of others want help and reassurance. The useful part was learning our buyers are segmented by risk tolerance and experience rather than by company size, the assumption we started with. The direction felt prescribed going in, and testing is what turned it into something I felt good delivering.",
      ]},
    ],
  },
];

export const FUN = [
  {
    slug: "motorcycle-engines",
    name: "Motorcycle Engines",
    role: "Personal project",
    context: "An interactive 3D motorcycle engine you can rotate, explode into parts, and slice open with a cross-section view.",
    link: "https://motorcycle-engine.vercel.app/",
    cta: "Explore the Engine",
    image: `${IMG}/previews/motorcycle-engines.webp`,
    thumb: `${IMG}/previews/motorcycle-engines-sm.webp`,
    aspect: 2710 / 1586,
    alt: "Interactive inline-four motorcycle engine in X-ray view, with engine-type controls, a tachometer at 2,000 rpm, and a telemetry chart",
    focus: [0.5, 0.52],
    zoom: 1.21,
    sections: [
      { heading: "What it is", items: [
        "An interactive 3D motorcycle engine you can rotate, explode into parts, and slice open with a cross-section view. Hover any part and it tells you what it is. A guided tour walks you through where the energy goes, step by step, and you can switch between a few different kinds of engine.",
      ]},
      { heading: "Why I built it", items: [
        "I ride, and I can handle basic maintenance, but I wanted to understand my bike well enough to one day do major work on it myself. I’d seen people on X build interactive breakdowns of other mechanical systems, and I wanted to try the idea on a system I actually care about and turn it into something I could learn from. It was also my first time using Three.js, and I wanted to build something with it.",
      ]},
      { heading: "What I learned", items: [
        "This one taught me to go deeper. Every iteration, I asked how it could be more detailed and more educational, and I kept going several levels further than I’d planned to. With AI, imagining the next improvement was most of the work of building it.",
      ]},
    ],
  },
  {
    slug: "glass-therapy",
    name: "Glass Therapy",
    role: "Personal project",
    context: "A conceptual website whose surface breaks apart and comes back together.",
    link: "https://glass-therapy.vercel.app/",
    cta: "Visit the Site",
    image: `${IMG}/previews/glass-therapy.webp`,
    thumb: `${IMG}/previews/glass-therapy-sm.webp`,
    aspect: 2648 / 1556,
    alt: "A dark website fractured into glass shards, with the headline “Not feeling quite whole?” spanning the cracks",
    focus: [0.31, 0.5],
    zoom: 1,
    sections: [
      { heading: "What it is", items: [
        "A conceptual website whose surface breaks apart and comes back together. The UI shatters into glass shards and moves, playing on the idea of something broken being made whole again.",
      ]},
      { heading: "Why I built it", items: [
        "I saw someone on X post a website that had broken, moving parts and I wanted to see if I could build one too. Mine went in a different direction. I worked to make the shards actually read as glass, and spent time on the reflection and the light source to get them where I wanted. The broken-UI idea stuck with me, so I leaned into the concept and tied it to therapy and being made whole.",
      ]},
      { heading: "What I learned", items: [
        "This one was about realism. I learned a lot about 3D, lighting, and how much work it takes to make a surface look like glass.",
      ]},
    ],
  },
  {
    slug: "wellspring-group",
    name: "Wellspring Group",
    role: "Personal project",
    context: "A brand and marketing site for a fictional food-and-beverage conglomerate.",
    link: "https://wellspring-group.vercel.app/",
    cta: "Visit the Site",
    image: `${IMG}/previews/wellspring-group.webp`,
    thumb: `${IMG}/previews/wellspring-group-sm.webp`,
    aspect: 2684 / 1564,
    alt: "Wellspring Group’s landing page: teal bubbles gathered into a bottle silhouette beside the line “good soda starts with good ingredients”",
    focus: [0.52, 0.5],
    zoom: 1,
    sections: [
      { heading: "What it is", items: [
        "A brand and marketing site for a fictional food-and-beverage conglomerate. Wellspring Group owns a set of beverage companies, and the site walks you through its mission, history, the companies under it, and its stats.",
      ]},
      { heading: "Why I built it", items: [
        "This one was a study. There’s a brand site I admire for how different it is, since most marketing sites feel interchangeable and that one didn’t. I wanted to understand how its bubble physics and interactions worked, so I rebuilt them and put them on a company I made up, with my own information, colors, logo, and copy. I was practicing coding and aesthetics.",
      ]},
      { heading: "What I learned", items: [
        "A lot at once. Physics and motion, interaction and timing, layout, branding, and color theory. Emulating something I admire is one of the ways I learn the fastest.",
      ]},
    ],
  },
  {
    slug: "vantage-financial",
    name: "Vantage Financial",
    role: "Personal project",
    context: "A fictional fintech dashboard for trading.",
    link: "https://vantage-financial-five.vercel.app/",
    cta: "Open the Dashboard",
    image: `${IMG}/previews/vantage-financial.webp`,
    thumb: `${IMG}/previews/vantage-financial-sm.webp`,
    aspect: 2686 / 1578,
    alt: "Vantage Financial portfolio dashboard showing total assets, a performance chart, and open positions",
    focus: [0.72, 0.71],
    zoom: 1.19,
    sections: [
      { heading: "What it is", items: [
        "A fictional fintech dashboard for trading. You can see your holdings, market news, and stock data, track the usual trading metrics, and make trades from it.",
      ]},
      { heading: "Why I built it", items: [
        "I wanted to build a dashboard, and I wanted to push myself on the details. A dashboard is a good exercise in system design — a dense interface a user can customize and resize, with layers of detail underneath. I’m into investing and I’ve used a lot of fintech dashboards, so I pulled in what I liked from them and added the things I always wished were there. I started from Apple’s Human Interface Guidelines and built out from there, using them for the interface and the motion.",
      ]},
      { heading: "What I learned", items: [
        "This one was about detail and states. I learned to design for what happens when a user customizes and resizes the dashboard, and I learned to use an existing system like Apple’s HIG as a foundation to build on rather than starting from scratch.",
      ]},
    ],
  },
];

export const ABOUT = {
  heading: "Hey there.",
  photo: `${IMG}/brendan.webp`,
  photoAlt: "Brendan Gray, standing with arms crossed in a gray short-sleeve shirt",
  paragraphs: [
    "I’m Brendan, a product designer in Utah. I work in B2B SaaS, mostly on growth — the surfaces where software gets bought, and the research that explains why.",
    "I start with the problem. I research until I actually understand what’s driving it, then design from there. I take the same ownership over my own growth, and I’d rather find the gap myself than wait for someone to point it out.",
    "I work AI-native. I use it to move faster on research synthesis and prototyping, and I’ve learned to lean on it where it helps and rein it in where it doesn’t.",
    "I try to leave the teams I’m on better than I found them, and I welcome feedback so I catch the gaps I can’t see myself. Off the clock, I love building and designing things to learn how they work.",
  ],
};

export const SECTIONS = {
  projects: { path: "/", label: "Projects", items: PROJECTS, base: "/projects" },
  fun: { path: "/fun-zone", label: "Fun Zone", items: FUN, base: "/fun-zone" },
};

export function findItem(sectionKey, slug) {
  const s = SECTIONS[sectionKey];
  const i = s.items.findIndex((p) => p.slug === slug);
  if (i < 0) return null;
  const n = s.items.length;
  return { item: s.items[i], index: i, prev: s.items[(i - 1 + n) % n], next: s.items[(i + 1) % n], section: s };
}
