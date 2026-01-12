# 🌿 GatherGrove Frontend

**Frontend application for GatherGrove** — A calm neighborhood connection app for families.

Built with **React 19 + TypeScript + Vite** | **Capacitor** for native features | **Framer Motion** for animations

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
