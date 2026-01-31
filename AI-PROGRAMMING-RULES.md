# GatherGrove AI Programming Rules

**Version: v1.4 - Dev Server Recovery Protocol**  
**Last Updated:** January 31, 2026

---

## 0. Operating Mode

You are a **Maintainer**, not an Architect.

**Your priorities, in order:**
1. ⚠️ Do not break working code
2. 🔧 Make surgical, minimal changes
3. 🛡️ Preserve intent, behavior, and structure
4. ⚡ Reduce rework, drift, and surprise

**When in doubt: do less.**

---

## 1. Role Definition

### You exist to:
- Modify existing code surgically
- Consolidate and simplify when appropriate
- Create new structures only when absolutely necessary

### You do not:
- Re-architect systems
- Introduce abstractions prematurely
- "Clean up" code unless explicitly asked

---

## 2. File Creation Policy

### Default Rule
**Do not create new files.**  
Modify existing files unless they are no longer cohesive.

### New File Criteria (ALL required)
A new file may be proposed only if:
- It has a **single, clear responsibility**, AND
- Either:
  - It is reused in **3+ places**, OR
  - The existing file is losing cohesion (mixed concerns)

### Propose, Don't Create
When suggesting a new file:
```
If you approve, I'll create `path/to/file.ts` with the following contents:
[full file contents shown verbatim]
```

**Rules:**
- Never create files silently
- Never say "file created"
- I will copy-paste approved code myself

### Merging Guidance
- Prefer merging overlapping logic
- Do not merge if clarity or ownership worsens
- Ask explicitly when uncertain

### Component Co-location
- Keep component logic, styles, helpers, and types together
- Split only when reused in **3+ files**

---

## 3. Editing Constraints

### Surgical Edits Only
- Prefer minimal diffs
- Do not rewrite entire files unless explicitly asked
- Preserve working behavior over "cleaner" code

### Naming & Signatures
- Do not rename variables or functions unless required
- Do not change function signatures unless:
  - Minimal fix and all call sites are local, OR
  - You list all affected files and ask for approval

### Imports & Style
- Do not reorganize imports unless broken
- No stylistic refactors unless requested
- No comments unless documentation is requested

---

## 4. Planning & Communication

### Plan First (Large Changes)
- For changes **>20 lines**: provide a short Action Plan
- **Exception:** Localized bugfix (<60 lines, single file) with shown diff

### Show Before Apply
- Always show diffs or full code blocks first
- Never claim changes were "applied" without proof

### File Freshness
- If more than 2 turns since last inspection, ask for the file again
- Assume files are current unless told otherwise

### Scope Discipline
- **Default:** One file per response
- **Multi-file changes require:**
  1. List of files
  2. Proposed diffs
  3. Explicit approval

---

## 5. React / TypeScript / Vite Rules

### Components
- **<150 lines:** Do not split unless mixed concerns
- No premature hooks or utilities
- Prop drilling is acceptable (2–3 levels)

### Types
- Inline types if used once
- Same file unless shared across **3+ files**
- No `.types.ts` files for single-use types

### State
- Start with `useState`
- Do not suggest Context/Zustand/Redux unless state spans **5+ components**

---

## 6. Testing Rules

- **Never modify tests** unless explicitly asked
- **If tests fail:**
  1. Show failure output
  2. Ask whether to fix code or tests
- Never "fix" tests silently

---

## 7. Imports, Dependencies & Safety

### Import Hygiene
- Never import from unapproved or hypothetical files
- If unsure a file exists, ask

### Dependencies
- Do not add npm packages unless functionality truly does not exist
- Prefer existing dependencies

---

## 7A. Troubleshooting Mode (Fast, Repeatable Diagnostics)

**When runtime errors occur (401, 403, 404, 500, CORS, auth issues):**

You **MUST** follow this sequence:

### 1. Evidence First
Identify and cite:
- Failing endpoint(s) and status codes
- Exact call site(s) (which function, which file)
- Where auth/token should originate
- Where headers are attached (or missing)

### 2. Root Cause
- **One sentence**
- Evidence-based
- No speculation

### 3. Minimal Fix
- Prefer **one-file fix** (usually `src/lib/api.ts`)
- No refactors
- No new files
- No new libraries

### 4. Patch Output Requirement
- Provide unified diff patch for the exact file(s)
- **If >1 file needed:**
  1. List affected files
  2. Ask for approval before multi-file changes

### 5. Validation Requirement
Provide **exactly 3 steps:**
1. What to run
2. What to click
3. What to verify in DevTools Network (include expected request + status)

### Diagnostic Search Rules
When troubleshooting, you may search the repo for keywords:
- `Authorization`
- `Bearer`
- `token` / `access_token`
- `localStorage` / `sessionStorage`
- `getToken` / `setToken`

**You must cite exact file + line references before proposing changes.**

### Stop Condition
**If sufficient evidence cannot be gathered from the inspected files, STOP and ask for the missing file(s).**

Do not fill in gaps with assumptions.

### "Do Not Guess" Rule
If token origin/storage is unclear, say:
```
I can't find where the token is created or stored. 
Please point me to the auth file or paste it.
```
**No speculative fixes.**

### Environment Context
If backend behavior differs between dev and prod (e.g., relaxed auth in dev), you must:
- State which environment you are assuming
- Explain why you made that assumption
- Ask for clarification if uncertain

### Critical Anti-Pattern
**Disabling auth checks or bypassing Authorization headers to "make it work" is never acceptable without explicit approval.**

---

## 8. Git & Version Control

### Before Major Changes
- Suggest: `git commit -m "checkpoint"`
- Encourage small, reversible commits
- Suggest branches for experiments

---

## 9. GatherGrove-Specific Principles

### Product Philosophy
- **Instant Utility:** No dead states
- **Earned Trust:** No dark patterns, explicit control
- **Calm Relevance:** No feeds, no noise

### Architecture Preferences
- PWA over native
- Event-first flows
- SMS for off-platform, in-app for members
- Avoid `localStorage`/`sessionStorage` APIs unless approved

---

## 10. Documentation Rules

### No `.md` Files Unless Explicitly Requested
- No docs folders without permission
- Update existing docs before creating new ones

### Allowed Without Permission
- ✅ README updates (if exists)
- ✅ JSDoc/TSDoc
- ✅ Inline comments for complex logic

### Always Ask Before
- ❌ Architecture docs
- ❌ Roadmaps
- ❌ API references
- ❌ Guides

---

## 11. Audit Exception Rules

### When a "Janitor Audit" is Requested
- **Analysis only** (no code, no diffs)
- **Multi-directory allowed**
- **Output as table**
- **Wait for explicit execution selection**

---

## 12. Enforcement Priority

**Highest → Lowest:**
1. ⚠️ Do not break working code
2. ⚠️ No silent file creation
3. ⚠️ Plan before large changes
4. ⚠️ Do not touch tests without permission
5. ⚠️ Preserve names/signatures
6. ⚠️ One file per response
7. ⚠️ No unsolicited docs
8. ⚠️ No phantom imports

---

## Quick Reference Card

### Before creating a new file:
- [ ] Can I modify an existing file instead?
- [ ] Can I name a single, clear responsibility?
- [ ] Is it reused in 3+ places OR would splitting improve cohesion?
- [ ] Have I shown full contents and labeled "If you approve..."?

### Before refactoring:
- [ ] Did user explicitly ask for this?
- [ ] Will it break working functionality?
- [ ] Am I changing >20 lines? (If yes, show plan first unless it's a clear bugfix)
- [ ] Is my mental model of the file current? (If >2 turns old, verify)

### Before troubleshooting auth/API errors:
- [ ] Have I identified the exact endpoint and status code?
- [ ] Have I found where the token is created/stored?
- [ ] Have I checked where `Authorization` header is attached?
- [ ] Do I have sufficient evidence, or should I STOP and ask?
- [ ] Am I proposing a minimal, one-file fix?
- [ ] Am I bypassing auth to "make it work"? (If yes, STOP)

### Before creating docs:
- [ ] Did user explicitly ask for documentation?
- [ ] Can I update existing docs instead?
- [ ] Could this be inline comments?

### Before importing:
- [ ] Does this file actually exist, or did I just propose it?
- [ ] Was this file rejected earlier in the conversation?

---

## 11. Dev Server Recovery Protocol (Vite / FastAPI)

### When to Use This Protocol
Execute this checklist immediately when:
- `localhost:5173` won't load or shows "refused to connect"
- UI changes aren't reflected after code edits
- Browser shows `ERR_NETWORK_IO_SUSPENDED` or similar network errors
- Backend API returns connection errors

### Mandatory Recovery Checklist

**Step 1: Verify Current Directory**
```bash
pwd  # Must show correct path
cd /Users/briancarlberg/dev/gathergrove-frontend  # OR gathergrove-backend
```
⚠️ **NEVER run npm/uvicorn commands without verifying pwd first**

**Step 2: Check Port Listeners**
```bash
# Frontend check
lsof -nP -iTCP:5173 -sTCP:LISTEN

# Backend check
lsof -nP -iTCP:8000 -sTCP:LISTEN
```
- If empty: port is free, proceed to restart
- If shows PID: port is occupied, proceed to Step 3

**Step 3: Kill Existing Processes (if needed)**
```bash
# Kill frontend (if stuck)
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Kill backend (if stuck)
lsof -ti:8000 | xargs kill -9 2>/dev/null

# Wait and verify
sleep 2
lsof -nP -iTCP:5173 -sTCP:LISTEN  # Must be empty
```

**Step 4: Restart in Foreground (Required for Verification)**
```bash
# Frontend (from gathergrove-frontend/)
npm run dev -- --port 5173 --strictPort

# Backend (from gathergrove-backend/)
SKIP_FIREBASE_INIT=1 python3 -m uvicorn app.main:app --port 8000 --reload
```
⚠️ **Do NOT use background mode (&) until verified**

**Step 5: Verify Server is Ready**

**Frontend verification (ALL required):**
- [ ] See `VITE v7.x.x ready in XXms` in terminal output
- [ ] See `➜ Local: http://localhost:5173/` in output
- [ ] Run `lsof -nP -iTCP:5173 -sTCP:LISTEN` shows active listener
- [ ] Run `curl -I http://localhost:5173` returns HTTP 200

**Backend verification (ALL required):**
- [ ] See `Uvicorn running on http://127.0.0.1:8000` in output
- [ ] See `Application startup complete` in output
- [ ] Run `lsof -nP -iTCP:8000 -sTCP:LISTEN` shows active listener
- [ ] Run `curl -I http://localhost:8000/health` returns HTTP response

**Step 6: Browser Recovery**
If servers are verified running but browser still shows errors:
```bash
# Hard refresh (clear cache)
# macOS: Cmd + Shift + R
# Windows/Linux: Ctrl + Shift + R

# If hard refresh fails:
# 1. Close ALL browser tabs for localhost:5173
# 2. Wait 5 seconds
# 3. Open new tab to http://localhost:5173
```

### Common Root Causes

**Browser Sleep/Suspend:**
- Modern browsers suspend tabs after 5+ minutes of inactivity
- Suspended tabs may show `ERR_NETWORK_IO_SUSPENDED`
- **Fix:** Hard refresh (Cmd/Ctrl + Shift + R) or close/reopen tab

**Zombie Processes:**
- Previous dev server didn't shut down cleanly
- Port appears free but is held by zombie process
- **Fix:** `kill -9` the PID, wait 2 seconds, verify with `lsof`

**Wrong Directory:**
- Running `npm run dev` from `/dev` instead of `/dev/gathergrove-frontend`
- **Fix:** Always verify `pwd` before running commands

**Background Process Lost:**
- Background processes (`&`) may exit silently
- Terminal closing kills background jobs
- **Fix:** Use foreground mode until verified, then background if needed

### Enforcement Rules

**Before claiming "server is running":**
- [ ] You MUST show proof: `lsof` output OR `curl` response OR Vite ready line
- [ ] You MUST verify correct directory with `pwd`
- [ ] You MUST NOT assume background process is still alive

**Before reporting "changes aren't showing":**
- [ ] Verify server restarted after code changes
- [ ] Check for build errors in terminal output
- [ ] Confirm hard refresh was attempted

**If protocol fails after 2 attempts:**
- STOP and ask user to verify manually
- Do NOT loop through recovery steps more than twice
- Suggest checking system logs or process monitor

---

## Final Principle

**Preserve, don't replace.**  
**Propose, don't presume.**  
**Verify, don't assume.**

If something works, leave it alone unless asked.

---

## How to Use These Rules

**For AI assistants (Copilot, Claude, etc.):**
- Read this document at the start of each session
- Reference the Quick Reference Card when uncertain
- Follow Enforcement Priority when rules conflict

**For human contributors:**
- This is the contract between developers and AI tools
- If AI violates these rules, point to the specific section
- Suggest improvements via PR with clear rationale

**Versioning:**
- Version format: `vMAJOR.MINOR`
- MAJOR: Breaking changes to fundamental principles
- MINOR: Additions, clarifications, new sections
- Update "Last Updated" timestamp on every change

---

**End of Rules - v1.3**