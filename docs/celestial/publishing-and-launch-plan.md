# Publishing and Launch Plan

## Strategic frame

The book is the funnel. The companion app is the margin product and the moat.
Traditional publishing cannot ship software, so we price the book aggressively
to maximize reader acquisition and let the app carry long-term revenue and
retention.

**Implications:**

- Wide distribution beats Amazon exclusivity. Kindle Unlimited is the wrong
  tradeoff because we monetize through the app, not Kindle page-reads.
- The book must stand alone. Reviews on Amazon are existential and any
  perceived "you have to use the app" gating will tank them.
- Email capture happens at the app, not the book. The list is the asset that
  sells Book II, canon drops, and audio artifacts.

## Publishing setup

### Imprint and legal

- [ ] Form an LLC for the imprint (liability + clean tax + a real legal entity
      to own the imprint name). Cost: ~$100-300 depending on state.
- [ ] Choose imprint name. Goes on spine, copyright page, and ISBN registration.
- [ ] Register a business bank account and a payment processor (Stripe) under
      the LLC for app revenue.

### ISBNs

- [ ] Buy 10 ISBNs from Bowker (myidentifiers.com). Cost: $295.
- [ ] Do **not** use KDP's free ISBN. It lists Amazon as the publisher, locks
      to Amazon-only distribution, and signals amateur to reviewers and
      librarians.
- [ ] ISBN allocation plan:
  - Book I paperback
  - Book I hardcover
  - Book I ebook
  - Book I audiobook
  - Book II paperback
  - Book II hardcover
  - Book II ebook
  - Book II audiobook
  - Reserve x2 (special editions, omnibus, etc.)

### Print distribution

- [ ] **KDP Print** for Amazon paperback and hardcover. Print-on-demand, no
      inventory.
- [ ] **IngramSpark** for the same files. Ingram is the catalog bookstores and
      libraries actually order from. KDP-only means zero bookstore presence.
      Setup fee $49; free with promo codes that run periodically.
- [ ] Identical interior PDFs and cover files on both. Use the same ISBN per
      format across both platforms.
- [ ] Set wholesale discount on Ingram to 55% with returns enabled if any
      bookstore stocking is realistic; 40% no-returns otherwise.

### Ebook distribution

- [ ] **KDP** for Amazon Kindle.
- [ ] **Draft2Digital** for Apple Books, Kobo, Nook, Google Play, and library
      distribution via OverDrive. Free signup, takes a cut of each sale.
- [ ] **Do not enroll in KDP Select.** 90-day Amazon exclusivity is the wrong
      trade for us.
- [ ] Pricing: paperback $14.99, hardcover $26.99, ebook $4.99. Aggressive on
      ebook to drive app conversion.

### Audiobook

- [ ] **Findaway Voices** (now Spotify) for wide audio distribution including
      Audible, Apple, Spotify, Kobo, library.
- [ ] Avoid ACX exclusivity. The 40 vs 25 percent royalty bump is not worth
      losing Apple, Spotify, and library audio.
- [ ] Decide narrator strategy: hire a single narrator from Findaway's
      marketplace, or use the in-world audio artifacts (CA-9) as a sampler to
      attract a name narrator.

## Companion app linkage

### What goes in the book

- [ ] QR code on the inside front cover. Routes to landing page, not directly
      to an app store.
- [ ] Second QR code at the end of the book with end-matter copy that frames
      the app as continuation, not gating.
- [ ] Copyright page credits the imprint and includes the landing-page URL.
- [ ] No per-copy unlock codes. Friction is not worth it for POD.
- [ ] No content gated behind the app in a way that breaks the book as a
      standalone read.

### App tiering

- [ ] Free download, free exploration of the wiki up to the reader's stated
      chapter (CA-1 reading-position sync handles the horizon).
- [ ] Paid tier unlocks: canon drops (CA-12), reread mode (CA-5), audio
      artifacts (CA-9), notification when seeded questions become canon (CA-Q).
- [ ] Pricing TBD; suggest one-time unlock per book at $9.99 or subscription
      at $4.99/month with a free trial after the user marks chapter 3 read.
- [ ] Onboarding captures email before the first ASK question. Email is the
      asset.

## Landing page and QR routing

### One URL, smart routing

The QR codes in the book point to a single canonical URL. The landing page
detects platform and intent and routes accordingly. This is critical because
sending readers directly to a store listing strands anyone whose device is the
wrong platform, and it gives us no email-capture opportunity.

### Recommended URL structure

- `yourbook.com/start` — entry point from book QR codes.
- `yourbook.com/start?ch=01` — optional chapter parameter from end-of-chapter
  QR codes (future), pre-sets reading horizon.
- `yourbook.com/canon/<slug>` — direct deep links into canon drops, used in
  email and social.

### Routing flow

```
QR scan → /start
  │
  ├─ detect platform (iOS / Android / desktop / unknown)
  │
  ├─ if app is installed (universal links / app links) →
  │     open app directly to onboarding or current state
  │
  ├─ if mobile and app not installed →
  │     show landing with one primary CTA: install app
  │     secondary CTA: continue in browser (web wiki, gated)
  │     email capture above the fold
  │
  └─ if desktop →
        show landing with email capture
        primary CTA: send install link to phone (SMS or email)
        secondary CTA: continue in browser
```

### Landing page content (above the fold)

- One sentence positioning: what the app does for a reader of the book.
- Email capture (single field).
- Primary install CTA, platform-detected.
- Trust signal: cover image, author photo or imprint mark, one quote.

### Below the fold

- 30-second video or animated preview of the wiki / graph / ASK in action.
- "What's inside" — three bullets max, no marketing fluff.
- FAQ: "Do I need the app to enjoy the book?" → "No. The book stands alone.
  The app is for readers who want to keep exploring."
- Link to buy the book on Amazon, Apple Books, Kobo, Bookshop.org. Bookshop.org
  link is an unexpectedly strong signal to indie-sympathetic readers.

### Implementation notes

- Universal links on iOS and app links on Android so an installed app
  intercepts the URL without bouncing through Safari / Chrome.
- Same domain for landing and app deep links. Do not split across subdomains
  if avoidable; it complicates the universal-link entitlement file.
- Set up Plausible or Fathom (privacy-respecting analytics) to track scan
  source, install rate, email capture rate. Avoid Google Analytics for the
  trust signal.
- Apple App Site Association and Android assetlinks.json must be hosted at
  the apex domain.

## Launch sequence

### T-90 days

- [ ] Imprint LLC formed, ISBNs purchased.
- [ ] Final manuscript locked. No more content edits after this.
- [ ] Cover design final for all three formats.
- [ ] Interior typeset for paperback and hardcover.
- [ ] Landing page live at a placeholder ("Book coming [date]") with email
      capture.
- [ ] App in TestFlight / internal Android testing track.

### T-60 days

- [ ] KDP and IngramSpark print files uploaded, proof copies ordered.
- [ ] Ebook files finalized and uploaded to KDP and D2D in draft state.
- [ ] Audiobook narration in progress or scheduled.
- [ ] Recruit launch team: aim for 50-100 readers from any existing list,
      personal network, sci-fi reader communities. Offer advance app access
      and an ARC in exchange for an honest Amazon review on launch day.

### T-30 days

- [ ] Proof copies approved. Print listings go live for pre-order where
      possible (KDP supports ebook pre-order; print does not).
- [ ] App submitted to App Store and Play Store review. Budget two weeks for
      first-time review, especially Apple.
- [ ] ARCs distributed to launch team.
- [ ] First three canon drops drafted and queued for post-launch (CA-12).

### Launch week

- [ ] Ebook releases, paperback and hardcover go live the same day.
- [ ] Launch team posts reviews. Goal: 25+ reviews in week one to clear
      Amazon's algorithmic thresholds.
- [ ] App launches with reading-position sync, citations, basic wiki.
      Predictions, graph, audio can ship in the first 60 days post-launch.
- [ ] Email capture redirects readers from book to app to email list.

### Post-launch

- [ ] Canon drop cadence: monthly minimum, ideally biweekly for the first
      90 days while interest is highest.
- [ ] Q&A editorial queue (CA-Q) reviewed weekly. Promoted entries become
      future canon drops.
- [ ] Track: app install rate per book sale, email capture rate per app
      install, paid-tier conversion rate. These three numbers determine
      whether Book II's launch budget grows or shrinks.

## Open decisions

- Imprint name.
- Whether to attempt bookstore stocking (requires Ingram returns, real
  publicity push) or stay POD-only.
- Audiobook narrator strategy and budget.
- App pricing model: one-time unlock vs subscription.
- Whether to do a Kickstarter for special editions. Recommendation: only if
  the email list is above ~2,000 by launch; otherwise it underperforms.
- Whether to offer a signed hardcover tier direct from the imprint site.

## What we are deliberately not doing

- KDP Select / Kindle Unlimited.
- ACX exclusivity.
- Gating book content behind the app.
- Per-copy unlock codes.
- Google Analytics on the landing page.
- Paid Amazon ads at launch. Wait until organic reviews and conversion
  metrics are known; otherwise we are buying traffic to an unoptimized
  funnel.
