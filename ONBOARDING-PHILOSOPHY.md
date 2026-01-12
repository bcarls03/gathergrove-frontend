# Onboarding Philosophy: Progressive, Trust-First

## Core Principles

### 1. Progressive Disclosure
**"Collect only what's needed, when it's needed."**

We don't ask for everything upfront. Instead, we introduce features and data collection progressively as users need them.

#### Implementation:
- **Step 1 (Required)**: Individual profile only (name, email, visibility)
- **Step 2 (Optional)**: Household info—can be skipped entirely
- **Later**: Additional details collected in-context (e.g., event preferences when creating an event)

#### Benefits:
- ✅ Reduces cognitive load during signup
- ✅ Lowers abandonment rates (fewer fields = higher completion)
- ✅ Respects user time and attention
- ✅ Shows we value their privacy

### 2. Trust-First Authentication
**"Support familiar, trusted sign-in methods for authentication only."**

We offer 4 trusted providers (Apple, Google, Facebook, Microsoft) but use them ONLY for secure authentication—not for importing data.

#### What We Do:
✅ Use OAuth providers for secure identity verification  
✅ Auto-fill basic identity info (name, email) from their account  
✅ Provide one-click signup experience  
✅ Clear privacy messaging about what we access  

#### What We Don't Do:
❌ Import contacts or friend lists  
❌ Request permissions beyond authentication  
❌ Access external data without explicit consent  
❌ Make identity dependent on external platforms  
❌ Auto-connect users based on social connections  

### 3. Individual-First Identity
**"Identity remains individual-first, privacy-controlled, and independent."**

Every user has their own profile that exists independently of any household, social network, or external platform.

#### Implementation:
- User profile is separate from household entity
- Can join/leave/create households without affecting identity
- Can disconnect social login and keep GatherGrove account
- All data lives within GatherGrove, not synced externally
- Privacy settings controlled at individual level

#### Benefits:
- ✅ Singles/couples don't need fake "household" identities
- ✅ Can move between households (roommates, divorce, relocation)
- ✅ Teenagers can have own identity, separate from family
- ✅ Privacy independent of household decisions
- ✅ No forced coupling to external platforms

## User Experience Flow

### Onboarding Step 1: Profile Creation (Required)

**Messaging**:
> "Welcome to GatherGrove"  
> "Sign in with a trusted provider for secure authentication"  
> *"We only use this to verify your identity—no importing your contacts, friend lists, or other data from Google, Apple, Facebook, or Microsoft."*

**Options**:
1. Continue with Google 🔍 (one-click, shown first - most popular)
2. Continue with Apple 🍎 (one-click)
3. Continue with Facebook 📘 (one-click)
4. Continue with Microsoft 🏢 (one-click)
5. Manual form (dev/testing fallback)

**Privacy Notice** (green callout):
> 🔒 **Your privacy matters:** We only use these providers for secure authentication. We won't import your contacts, friend lists, or any other data from Google, Apple, Facebook, or Microsoft. Your GatherGrove identity is yours alone and independent of any social platform.

**Fields Collected**:
- First name
- Last name
- Email
- Profile visibility (private/neighbors/public)

**Progressive Messaging**:
> **Next (optional):** Set up your household  
> *"We collect only what's needed, when it's needed. You can skip this step and add it later."*

### Onboarding Step 2: Household Creation (Optional)

**Messaging**:
> "Create Your Household (Optional)"  
> "You can skip this step—we collect only what's needed, when it's needed"  
> *"Add household info later from Settings, or connect events to just your individual profile"*

**Options**:
1. Fill in household details (name, type, kids)
2. **Skip for now—start with just me** (prominent button)

**Progressive Messaging**:
> "You can always add or edit your household later in Settings"  
> *"Your identity is individual-first and independent of any household"*

## Privacy & Trust Messaging

### Key Messages Throughout App:

**Authentication**:
- "Secure authentication only—no data import"
- "We only verify your identity"
- "Independent of external platforms"

**Data Collection**:
- "Collect only what's needed, when it's needed"
- "You control your data"
- "Add more info later, or never"

**Identity**:
- "Your identity is yours alone"
- "Independent of household"
- "Individual-first, privacy-controlled"

**Social Login**:
- "Used for authentication only"
- "No contact or friend list import"
- "Can disconnect anytime"

## Technical Implementation

### OAuth Scopes (Minimal)
```typescript
// ONLY request basic authentication scopes
googleProvider.addScope('profile');  // Name, photo
googleProvider.addScope('email');     // Email address

// DO NOT request:
// - contacts.read
// - friends.list
// - calendar.read
// - etc.
```

### Data We Store from OAuth
```typescript
{
  uid: user.uid,              // Firebase UID
  email: user.email,          // Email address
  first_name: firstName,      // Extracted from displayName
  last_name: lastName,        // Extracted from displayName
  profile_photo_url: user.photoURL  // Optional profile pic
  // THAT'S IT. Nothing else.
}
```

### Data We DON'T Store
- ❌ OAuth access tokens (no ongoing API access)
- ❌ Refresh tokens (no background data sync)
- ❌ Friend lists or connections from social platforms
- ❌ Contact information from external accounts
- ❌ Calendar data
- ❌ Location history
- ❌ Posts, photos, or content from external platforms

### Account Unlinking
Users can disconnect their social login in Settings:
```typescript
// User can:
1. Unlink Apple/Google/Facebook/Microsoft account
2. Set a password (if we add email/password auth)
3. Keep their GatherGrove profile intact
4. Continue using the app normally
```

## Competitive Differentiation

### vs. Facebook Groups
- ❌ Facebook: Forces Facebook account, imports friend lists, shows to Facebook friends
- ✅ GatherGrove: Uses Facebook ONLY for auth, no friend list import, independent identity

### vs. Nextdoor
- ⚠️ Nextdoor: Address verification required upfront, tied to physical location
- ✅ GatherGrove: Address optional, can skip household entirely, individual-first

### vs. Meetup
- ⚠️ Meetup: Encourages importing contacts, pushes social features
- ✅ GatherGrove: No contact import, pure authentication, clean privacy

## Success Metrics

### Privacy Trust
- **Survey**: % of users who trust our data practices
- **Adoption**: % choosing social login vs. manual
- **Retention**: Users who skip household are still engaged
- **Reviews**: Mentions of privacy/trust in app store reviews

### Progressive Disclosure
- **Completion**: % completing Step 1 (target: >90%)
- **Household skip**: % skipping Step 2 (target: 30-50%)
- **Later adoption**: % adding household later in Settings
- **Time to signup**: Median time from landing to authenticated

### Individual-First Success
- **Singles/couples**: % of users without households
- **Engagement**: Activity level for non-household users
- **Flexibility**: % of users who change households
- **Privacy**: % using private/neighbors visibility

## Future Considerations

### Phase 2: More Progressive Features
- Neighborhood selection: Optional until creating first public event
- Address: Optional until wanting location-based features
- Bio: Optional, can add anytime
- Interests/tags: Suggested after first few events attended

### Phase 3: Contextual Permissions
- "Want to import Facebook events?" (in-context, opt-in)
- "Want to invite Facebook friends?" (explicit permission request)
- "See nearby neighbors?" (when browsing directory)
- "Enable push notifications?" (after first RSVP)

### Phase 4: Advanced Privacy
- Granular visibility controls per data field
- Private events visible to specific households
- Selective profile sharing
- Data export/portability

## Key Takeaways

### What Makes GatherGrove Different:

1. **Authentication ≠ Data Import**
   - We use trusted providers for auth only
   - Your Facebook/Google account doesn't become your GatherGrove identity
   
2. **Individual-First Always**
   - You are a person, not a household
   - Household is optional metadata about you
   - Can exist without any household
   
3. **Progressive, Not Demanding**
   - Ask for info when it's actually needed
   - Every step after profile is optional
   - Can circle back and add details later
   
4. **Privacy by Default**
   - Minimal data collection
   - No hidden permissions
   - Independent of external platforms
   - You control your visibility

### This Philosophy Enables:
✅ Highest signup completion rates  
✅ Strongest user trust and privacy perception  
✅ Flexibility for all household types (single, couple, family, roommates)  
✅ Future-proof identity (move, divorce, life changes)  
✅ Competitive advantage in privacy-conscious market  

---

**Bottom Line**: GatherGrove earns trust by asking for less, being transparent about data use, and keeping user identity independent and privacy-controlled.
