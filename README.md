# 🌿 GatherGrove Frontend

**Frontend application for GatherGrove** — A calm neighborhood connection app for families.

Built with **React 19 + TypeScript + Vite** | **Capacitor** for native features | **Framer Motion** for animations

> **⚙️ AI Tools Notice**  
> AI assistants working on this codebase **must follow [`AI-PROGRAMMING-RULES.md`](./AI-PROGRAMMING-RULES.md)**.  
> Start each session by reading this file. It defines maintainer mode, file creation policies, and editing constraints.

---

## 📋 Table of Contents

- [Executive Summary](#-executive-summary)
- [The Core Loop](#-the-core-loop)
- [North Star Metrics](#-north-star-metrics)
- [Product Positioning](#-product-positioning)
- [Core Product Areas](#-core-product-areas)
- [Privacy & Trust](#-privacy--trust)
- [Quickstart](#-quickstart)
- [Contributing](#-contributing)

---

## 🌿 Canonical Strategy

**GatherGrove — Canonical Strategy (Final, Integrated)**  
*A calm operating system for real-world neighborhood coordination*

### 1) North Star and Positioning

**Purpose (one sentence):** GatherGrove helps neighbors discover each other and gather in real life — without feeds, noise, or public posting.

**Positioning anchor:** If Nextdoor is where neighbors talk, GatherGrove is where neighbors actually gather.

**Brand line:** Where neighbors gather

GatherGrove is not a social network. It is not a messaging platform. It is not a marketplace.  
**It is a coordination system for real life.**

### 2) Core Philosophy: The Three Invariants

These are architectural laws. If a feature violates one, it does not ship.

1. **Instant Utility** — Every user experiences value within 60 seconds. No dead feeds. Ever.
2. **Earned Trust** — Trust and verification are progressive, reversible, and optional — never a gate.
3. **Calm Relevance** — Expansion never imports noise. The product must remain quiet, useful, and non-performative.

### 3) Product Constitution: The Mental Model

This governs every UX decision and every future expansion:

- **People are primary**
- **Groups provide context**
- **Events activate connection**

**Translation:** GatherGrove is not a place to post. It is a system to coordinate real-world moments. Everything else exists only to support events.

### 4) Groups: Universal but Invisible

GatherGrove uses a single flexible Group construct to represent real-world structures — but groups are never the navigation model.

**Groups are:**
- not identities
- not destinations
- containers for context only

**Group types (present or latent):**
- Neighborhoods
- Households
- Extended families
- Activity clusters
- Interest clusters

**Critical constraint:** Only Neighborhoods and Households are exposed in early product. All other groups may exist internally without becoming walls, feeds, or surfaces.

This permanently prevents: feeds, posting walls, group spam, social-graph creep.

### 5) Household Model: Linked, Not Forced (Person-First Architecture)

**Core rule:** You do not onboard a household. You onboard a person — who may optionally link into a household.

**Non-negotiable constraints:**
- Each adult has their own account
- A person may exist with zero households
- Households are joined only by invitation or approval
- No shared logins
- No auto-linking
- No forced merges

**Why this matters:** This structure supports couples joining later, separation/divorce, custody realities, roommates or multi-generational homes, changing life stages, and future group types without rewriting identity.

Consent is enforced structurally, not socially.

### 6) Two-Layer Location Model (Core Moat)

**Layer 1: Nearby (Home Zone) — Default**

Purpose: instant value + cold-start immunity
- Approximate location only
- Default ~0.5 miles
- Auto-widens to 3–5 miles if density is low
- Honest framing: "Widening your search until your area gets busier."

*Invariant protected: Instant Utility*

**Layer 2: Verified Neighborhoods — Optional**

Purpose: high-trust named context + future community tooling
- Never required for value
- Progressive, reversible verification
- Hardened governance

*Invariant protected: Earned Trust*

### 7) Onboarding: Calm, Person-First, Trust-Safe (≤60 seconds)

**Design goal:** Deliver immediate value fast while building trust through clarity and reversibility.

**Core pattern:** Draft → Preview → Go Live (optional)  
Nothing becomes visible without explicit confirmation.

**Initial onboarding flow:**
1. **Access (Person only)** — OAuth (Apple / Google). Guardrails: no contacts import, no public posting, consent-gated messaging.
2. **Location (Home Zone)** — City / State / ZIP. Approximate distance only.
3. **Household intent (not structure)** — Family with kids, Singles/Couples, Empty Nesters. Stored as intent, not identity.
4. **Kids' ages (family only)** — Ages only. No names, photos, schools, or birthdays.
5. **Review & Privacy Checkpoint** — Exact discovery card preview. Clear labeling of what is visible vs never shared. Actions: Go live, Edit, Browse first (no household yet).
6. **Magic Moment (Instant Utility)** — Show 3–5 blurred nearby households. CTA: Browse neighbors or Host an event.
7. **Verified neighborhood prompt (conditional)** — Only when confidence is high. Never blocking.

**Progressive completion (after value):**
- Add household details (optional)
- Interests / tags (signals only)
- Invite another adult
- Adjust discovery preferences
- Join or leave households

No nagging. No gates.

### 8) Couple & Household Linking: Canonical Flow

**Primary (V1 default): Invitation link**
- One adult goes live
- Invites via Settings → Household
- Invitee previews and joins
- No duplication

**Secondary:** Independent signup + conservative suggestion (suggested only when high confidence exists; approval always required).

**Duplicates:** Allowed temporarily. Merges are opt-in, explicit, bilateral.

System never: assumes relationships, auto-links, forces merges, blocks usage, deletes accounts.

Consent is constitutional.

### 9) Events: The Activation Engine

Events are invitations, not announcements.

**Only two types:**
- ⚡ **Happening Now** (auto-expires)
- 📅 **Future Event** (RSVP + reminders)

Events: are host-initiated, are context-bounded, can be shared beyond connections, never create feeds or broadcast surfaces.

Everything else supports events.

### 10) Off-Platform Event Invitations (Integrated Canon)

**Core principle:** Delivery adapts to where the recipient already lives.

**Canonical routing:**
- On GatherGrove → in-app invite
- Not on GatherGrove → SMS

SMS is default for non-users, not everyone.

**Intentional SMS for members:** Hosts may optionally tap: "Also text this invite"

**Constraints:** off by default, one action per event, framed as a reminder, uses host's native SMS app, never auto-sent.

SMS remains powerful without becoming noise.

### 11) RSVP Without Signup (Critical)

Off-platform invitees can: open link, view event, RSVP without creating an account.

RSVP: is tied to the event (not identity), visible to host, fully functional.

Joining GatherGrove is positioned as convenience, not obligation.

### 12) Connections: Trust Gate

- Mutual consent required
- No cold DMs
- Connections unlock conversation, not events

Events remain accessible without social pressure.

### 13) Interests & Tags: Signals Only

Optional, skippable, relevance only, never destinations.

If tags become identity labels, they do not ship.

### 14) Categories: Metadata, Not Navigation

Used only: during creation, as light filters. Never as feeds or hubs.

**V1:** 🏡 Neighborhood, 🎪 Playdate, 👶 Babysitting, 🐶 Pets, 🎉 Celebrations, ✨ Other

### 15) Relevance Bands (Visibility Control)

- **Band A (3–5 mi):** Neighborhood, Celebrations
- **Band B (1–2 mi):** Playdate, Babysitting, Pets
- **Band C (<0.5 mi):** Reserved for Verified Neighborhoods

Prevents accidental over-sharing.

### 16) Babysitting: Trust-First, Not a Marketplace

Split intentionally: babysitting events, babysitting availability signal.

**Rules:** neighborhood-only, no ratings, no payments, no browsing marketplace.

**Positioning:** Neighbors helping neighbors.

### 17) Gender Matching for Playdates

**Principle:** Gender is a match attribute, not a public attribute.

- Public cards show ages only
- Gender used only in discovery logic
- Fully reversible in settings

Trust without exposure.

### 18) Navigation: Four Tabs, Four Questions

- 🏠 **Home** — What I'm already part of (invited events, hosted events, messages from connections; orientation, not discovery)
- 🧭 **Discover** — Who I can gather with (household browsing only; invite or connect; no feeds, no performance)
- 📅 **Calendar** — When I'm committed (reference lens only; exportable; never replaces real calendars)
- 👤 **Me** — My setup & privacy (household, privacy, neighborhoods, account; all control, all reversible)

Nothing else ships.

### 19) Invite Flow: Intent-Preserving by Design

Discovery → Compose → Invite → Share

**Key guarantees:** intent never drifts, clicked household always prioritized, suggested = exactly what user just saw, no surprise selections, scalable to large communities.

This is both UX-safe and engineer-safe.

### 20) Alerts (Pilot-Safe)

- **V1:** Lost Pet only
- Admin-enabled
- Auto-expires
- No comments

Never becomes a complaint board.

### 21) Growth Loop (Mechanical, Not Viral)

Event → Attendance → Connections → Better Discovery → Invites → Density

No hacks. No virality. No engagement manipulation.

### 22) Metrics

**North Star:** Weekly active households with 3+ connections

**Engine metric:** Event → Connection conversion rate

Measures real-world tie formation — not scrolling.

### 23) Monetization (Constitutional)

No ads. No data sales. No engagement optimization.

Revenue follows value, never corrupts trust.

- Consumer PWYW
- Consumer Premium (convenience only)
- B2B Community OS
- Trust Services (opt-in, capped)

Anti-patterns never ship.

### 24) System Summary

- Nearby guarantees instant value
- Person-first identity preserves consent
- Events activate connection
- Invitations gate visibility
- SMS assists without becoming system of record
- Memory improves retention privately
- Verified neighborhoods unlock trust later
- Monetization cannot distort behavior

**This system is intentionally narrow. Its durability comes from what it refuses to become.**

### Strategic Feedback Notes

**Strengths (9/10):**
- Cohesive constitution: invariants + mental model control the product
- Cold-start solved: Home Zone + Magic Moment + events-first
- Trust architecture is structural (person-first accounts, consent gates, reversible verification)
- Off-platform invites routing (in-app for members, SMS for non-users)
- Navigation clean and scale-proof (four tabs tied to four questions)

**Path to 10:**
1. Lock the "magic moment" mechanism that ensures new users see 3–5 relevant households in low-density areas
2. Add explicit guardrails for RSVP-without-signup (rate limits, token rules, host controls)
3. Define "successful host" playbook (templates, invite suggestions, reminder timing, minimum viable event)
4. Express the moat as a single unavoidable advantage (verified neighborhood governance + directory trust model + reversible identity ladder)

---

## 🎯 Executive Summary

### Vision & Purpose

**GatherGrove is a calm neighborhood connection app that helps families:**

1. **Discover** nearby households in the same life stage
2. **Coordinate** simple real-life hangouts without group-text chaos
3. **Remember** those moments privately (optional, no social pressure)

**Philosophy:** Calm, private, functional — anti-Nextdoor noise, more durable than one-off invite tools.

---

### The Core Problem

**Three Gaps:**

1. **Discovery Gap** — Families don't know who nearby they'd naturally click with (kids' ages, similar life stage, interests)
2. **Coordination Friction** — Group texts/email chains bury details, create confusion, lack "source of truth"
3. **Memory Loss** — Great gatherings happen, but photos/details get lost with no quiet, private archive

---

### The Solution: Discovery-First Coordination

**GatherGrove helps families discover nearby households in the same life stage, coordinate simple real-world hangouts, and quietly preserve those moments — without social feeds, noise, or pressure.**

**Core Thesis:**  
**"Discovery is the long-term destination. Events are the short-term entry point."**

- **For new users:** Events deliver first value (RSVP via link, no signup required)
- **For established users:** Discovery becomes the hero (neighborhood graph, meaningful connections)
- **For retention:** Memory creates quiet stickiness (optional, private archive)

---

## 🔄 The Core Loop

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  DISCOVER → EVENT → ATTEND → REMEMBER → RECONNECT          │
│      ↑                                              ↓       │
│      └──────────────────────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

1. **DISCOVER** — Find nearby households in same life stage ("8 families with kids your age!")
2. **EVENT** — Lightweight coordination (functional, not fancy)
3. **ATTEND** — Real-world gatherings happen (the actual goal)
4. **REMEMBER** — Optional photo archive (visible only to attendees, no pressure)
5. **RECONNECT** — Connections deepen, discovery reveals more neighbors

---

## 🎯 North Star Metrics

### **Primary: Weekly Active Households with 3+ Connections**

Not vanity MAU — measures **real neighborhood graph formation.**

**Target:** 70% retention for households with 3+ connections

---

### **Secondary: Event-to-Connection Conversion Rate**

What % of event attendees form at least one new connection?

**Target:** 40%+ within 7 days

---

## ✅ Product Positioning

### What GatherGrove IS
- ✅ **Discovery-first neighborhood platform** (find families in same life stage)
- ✅ **Lightweight coordination utility** (functional, not performative)
- ✅ **Private, optional memory layer** (no social pressure)
- ✅ **Calm alternative to social media** (no feeds, no infinite scroll)
- ✅ **Trust-gated communication** (connection requests before messaging)

### What GatherGrove is NOT
- ❌ **A "pretty template" event competitor** (that's Partiful's lane)
- ❌ **A social network** (no feeds, likes, followers)
- ❌ **A complaint forum** (no open neighborhood posting)
- ❌ **A chat replacement** (event-specific threads only)

### Primary User (Wedge Case)
**Families with children (ages ~2-12) living in suburban or dense residential neighborhoods.**

### The North Star Test
> **"Does this feature help people get offline and see each other?"**  
> **If NO → Don't build it.**

---

## 🎨 Core Product Areas

### 1. Discovery (The Hero)
**Map/list of nearby households with filters:**
- Household type, kids' age ranges, distance radius, interests
- Approximate distance ("~0.3mi"), never exact addresses
- "Weather radar" calm vibe, not Google Maps precision
- Adaptive empty states (density-aware CTAs)

### 2. Connections (Trust Gate)
**Gated communication prevents spam:**
1. Discover interesting household
2. Send connection request (with optional message)
3. Recipient accepts/declines
4. Only after acceptance can messaging begin

### 3. Events (Coordination)
**Lightweight, functional event creation:**
- 8 categories (Neighborhood, Playdate, Help & Favors, Pets, Food, Celebrations, Sports, Other)
- "Happening Now" vs. "Future" (time-based badges)
- Invite neighbors, connections, or external (shareable links)
- RSVP without signup (soft-entry growth)

### 4. Memory (Optional, Private)
**Quiet post-event prompt:**
- Add photo / link album / skip
- Visible only to attendees
- No feed, no likes, no pressure

---

## 🔒 Privacy & Trust

### What Parents Are Comfortable With
- ✅ Approximate distance ("~0.3 miles away")
- ✅ Abstracted maps ("weather radar" vibe)
- ✅ Real family identity (last names help trust)
- ✅ Gated messaging (connection request first)
- ✅ Kids as **age ranges** + optional gender (never names/photos)
- ✅ Clear explanation + instant opt-out

### Location Rules (Non-Negotiable)
- Never show exact home location
- Use soft dots/clusters, approximate distance labels
- Discovery visible, communication gated
- Discovery can be turned off instantly (app still works)

---

## 🚀 Quickstart

```bash
cd gathergrove-frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## 🎨 Event Categories (8)

1. 🏡 **Neighborhood** — Block parties, driveway hangs, cul-de-sac meetups
2. 🎪 **Playdate** — Park meetups, family fun
3. 🤝 **Help & Favors** — Borrow tools, rides, babysitting requests
4. 🐶 **Pets** — Dog playtimes, pet sitting, lost/found
5. 🍽️ **Food & Dining** — Potlucks, dinners, restaurant outings
6. 🎉 **Celebrations** — Birthdays, holidays, milestones
7. ⚽ **Sports & Activities** — Pickup games, workouts, adventures
8. ✨ **Other** — Anything else

---

## 👥 Contributing

**Strategic Constraints:**
- **Discovery-First**: Core value is neighborhood graph, not events
- **No Social Media Patterns**: No feeds, likes, or follower counts
- **Privacy-First**: Opt-in everything, approximate distances, gated messaging
- **Calm by Design**: "Weather radar" aesthetics, not engagement optimization
- **North Star Test**: "Does this help people get offline?"

---

**Built with ❤️ for neighborhood communities**

*Last Updated: January 2, 2026 | Version 0.2.0*
