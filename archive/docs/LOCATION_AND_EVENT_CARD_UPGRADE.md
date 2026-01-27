# Location Field & Event Card Upgrade

## Summary
Adding location field (critical) and upgrading event card design to be state-of-the-art.

## Changes Needed in `src/pages/ComposePost.tsx`

### 1. Add Location State Variable (around line 193)

**Find this:**
```typescript
  const [details, setDetails] = useState(existingPost?.details ?? "");

  const [title, setTitle] = useState(existingPost?.title ?? "");
```

**Add after `setDetails` line:**
```typescript
  const [details, setDetails] = useState(existingPost?.details ?? "");
  const [eventLocation, setEventLocation] = useState("");

  const [title, setTitle] = useState(existingPost?.title ?? "");
```

### 2. Update Validation (around line 217)

**Find this:**
```typescript
  const canSubmitDetails =
    kind === "happening"
      ? details.trim().length > 0
      : details.trim().length > 0 && title.trim().length > 0 && !!date && !!startTime;
```

**Replace with:**
```typescript
  const canSubmitDetails =
    kind === "happening"
      ? details.trim().length > 0 && eventLocation.trim().length > 0
      : details.trim().length > 0 && title.trim().length > 0 && eventLocation.trim().length > 0 && !!date && !!startTime;
```

### 3. Add Location Field for Future Events (around line 615)

**Find this (in the "event" kind section):**
```typescript
                  <div>
                    <label className="gg-label">Details</label>
                    <textarea
                      className="composer-textarea"
                      placeholder="Details (e.g., BYOB, bring chairs, snacks, kids welcome, etc.)"
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                    />
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label className="gg-label">Who can see this event?</label>
```

**Add between the details textarea and "Who can see" section:**
```typescript
                  <div>
                    <label className="gg-label">Details</label>
                    <textarea
                      className="composer-textarea"
                      placeholder="Details (e.g., BYOB, bring chairs, snacks, kids welcome, etc.)"
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                    />
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label className="gg-label">Where? *</label>
                    <input 
                      className="gg-input" 
                      placeholder="e.g., 'Our backyard', 'Oak Park', '123 Main St'" 
                      value={eventLocation} 
                      onChange={(e) => setEventLocation(e.target.value)} 
                    />
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label className="gg-label">Who can see this event?</label>
```

### 4. Add Location Field for Happening Now (around line 638)

**Find this (in the "happening" kind section):**
```typescript
              {kind === "happening" && (
                <div className="gg-card-section">
                  <div className="gg-label">Details</div>
                  <textarea
                    className="composer-textarea"
                    placeholder="What's happening right now? (Posts disappear after 24 hours.)"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                  />
                </div>
              )}
```

**Replace with:**
```typescript
              {kind === "happening" && (
                <div className="gg-card-section">
                  <div className="gg-label">Details</div>
                  <textarea
                    className="composer-textarea"
                    placeholder="What's happening right now? (Posts disappear after 24 hours.)"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                  />
                  
                  <div style={{ marginTop: 10 }}>
                    <label className="gg-label">Where? *</label>
                    <input 
                      className="gg-input" 
                      placeholder="e.g., 'Our backyard', 'Oak Park', '123 Main St'" 
                      value={eventLocation} 
                      onChange={(e) => setEventLocation(e.target.value)} 
                    />
                  </div>
                </div>
              )}
```

### 5. Update Preview Card to Show Location (around line 680-695)

**Find the preview card section (with "full-preview-card" className):**
```typescript
              <div className="gg-card-section">
                <div className="full-preview-card">
                  <div className="full-preview-title-row">
                    <div className="full-preview-title">{kind === "happening" ? "Happening Now" : title.trim() || "Your event title"}</div>
                    <div className="full-preview-pill">{kind === "happening" ? "Now" : "Future"}</div>
                  </div>
                  <div className="full-preview-meta">
                    {previewWhen}
                    {previewRecipients.length > 0 && ` · Invited: ${previewRecipients.join(", ")}`}
                  </div>
                  {kind === "event" && (
                    <div className="full-preview-meta">
                      {categoryMeta.emoji} {categoryMeta.label}
                    </div>
                  )}
                  <div className="full-preview-body" style={{ marginTop: 8 }}>
                    {details.trim() || "Your details will appear here as you type."}
                  </div>
                </div>
              </div>
```

**Update to include location display:**
```typescript
              <div className="gg-card-section">
                <div className="full-preview-card">
                  <div className="full-preview-title-row">
                    <div className="full-preview-title">{kind === "happening" ? "Happening Now" : title.trim() || "Your event title"}</div>
                    <div className="full-preview-pill">{kind === "happening" ? "Now" : "Future"}</div>
                  </div>
                  <div className="full-preview-meta">
                    {previewWhen}
                    {previewRecipients.length > 0 && ` · Invited: ${previewRecipients.join(", ")}`}
                  </div>
                  {kind === "event" && (
                    <div className="full-preview-meta">
                      {categoryMeta.emoji} {categoryMeta.label}
                    </div>
                  )}
                  {eventLocation.trim() && (
                    <div className="full-preview-meta" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      📍 {eventLocation.trim()}
                    </div>
                  )}
                  <div className="full-preview-body" style={{ marginTop: 8 }}>
                    {details.trim() || "Your details will appear here as you type."}
                  </div>
                </div>
              </div>
```

## Result

After these changes:
- ✅ Both event types require location
- ✅ Location shown in preview with 📍 emoji
- ✅ Clear "Where?" label with examples
- ✅ Validation prevents posting without location

## Next Steps (State-of-the-Art Event Card Design)

The current preview card is functional but basic. For a truly beautiful, modern event invitation:

1. **Add gradient backgrounds** for different event types
2. **Larger, bolder typography** for titles
3. **Icon-based metadata** (clock, location, people)
4. **Soft shadows & rounded corners** (already has this)
5. **Color-coded category badges** instead of just emoji
6. **RSVP preview count** ("3 invited")

This can be Phase 2 after location is working!
