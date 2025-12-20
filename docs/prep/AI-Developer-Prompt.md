# PROMPT FOR AI/DEVELOPER TEAM
## MNEMO Phase 1 MVP Implementation Specification

**Hand these documents directly to your development team. Use this prompt to frame the project.**
---

## FRAMING (Read This First)

**MNEMO** is a poetry memorization platform that uses **pedagogical annotation as retrieval practice**. The key insight: Users don't learn from auto-detected patterns—they learn from *marking the patterns themselves*.
**Your job:** Build a system where users upload poems, mark meter/rhyme/sound patterns (through intuitive clicking, not forms), and practice recitation with progressive difficulty (gradually hiding layer supports).
**Timeline:** 2 weeks for Phase 1 MVP (120-150 hours, 1-2 devs)
**Tech Stack:** Node.js + Express, React/Vue, PostgreSQL, Docker

---

## WHAT YOU'RE BUILDING

### Core Features (MVP)

1. **Text Library** (User's Private Poems)
   - Upload poem text (plain text → parse into lines)
   - Store in PostgreSQL with metadata
   - Display in library view

2. **Unified Annotation Interface** (All Three Layers Visible + Toggleable)
   - **Layer 1 (Meter):** Click-based stress marking
     - Pre-parsed syllables: [Two] | [roads] | [di] | [verged] | ...
     - User clicks below syllable → ● dot appears (toggle stress on/off)
     - Real-time display: u / u / u / u /
     - Fallback: Unknown word → user enters syllable count or breakdown
     
   - **Layer 2 (Rhyme):** Line-by-line letter entry
     - Each line + input box for letter (A, B, A, B)
     - Real-time rhyme scheme display
     
   - **Layer 3 (Sound Patterns):** In-text selection + color-coding
     - User selects text → dialog (alliteration/assonance/custom) + color picker
     - Pattern highlights throughout poem in chosen color
     
   - **Layer Toggles:** Checkboxes to show/hide any layer
     - ☑ Text  ☑ Meter  ☑ Rhyme  ☑ Sound
     
   - **Visual Design:** Book-like aesthetic
     - Serif font (EB Garamond or Georgia)
     - Aged paper background (cream gradient)
     - 3-column layout: left margin | poem | right margin
     - Subtle, literary feel

3. **Practice with Progressive Difficulty**
   - **Easy:** All layers + text visible → User types/pastes poem
   - **Medium:** Text + meter visible, rhyme/sound hidden
   - **Hard:** Text only, all annotations hidden
   - **Expert:** No text, pure memory recall
   - User types poem; system compares to original; shows accuracy %

4. **Cloze Deletion Practice**
   - Random word hidden: "Two roads ________ in a yellow wood"
   - User types answer
   - Scoring: Fuzzy match (first 3+ letters)

5. **Personal Journal**
   - Open-ended reflection entries per poem
   - Categories: meaning, emotion, technique, progress
   - Timestamps

6. **Analytics Dashboard**
   - Total poems uploaded
   - Total annotations created
   - Total practice sessions
   - Current streak
   - Per-poem progress bar
   - Average accuracy across sessions

7. **Spaced Repetition Scheduling (SM-2)**
   - After each practice session, calculate next review date
   - Quality rating (1-5) → interval adjustment
   - Easiness factor (default 2.5)
   - Jitter ±10% for randomization

---

## HOW TO UNDERSTAND THE SPEC

### Read in This Order

**If you're a backend dev:**
1. Read MNEMO-Development-Plan-Final.md sections:
   - "QUICK START FOR DEVS" (the pitch)
   - "ARCHITECTURE OVERVIEW" (system diagram)
   - "DATABASE SCHEMA" (10 tables, JSONB annotations)
   - "BACKEND API SPECIFICATION" (all REST endpoints)
   - "TECHNICAL STACK"
2. Reference MNEMO-Research-to-Design.md for understanding why UI works the way it does

**If you're a frontend dev:**
1. Read MNEMO-Research-to-Design.md sections:
   - "VISUAL DESIGN" (book-like aesthetic, CSS variables)
   - "SYLLABLE PARSING" (how automatic + manual works)
   - "UNIFIED ANNOTATED POEM DISPLAY" (layout mockup)
   - "METER ANNOTATION" (click-based, code sketch included)
   - "RHYME SCHEME ANNOTATION" (line input, code sketch)
   - "SOUND PATTERNS" (selection + color, code sketch included)
   - "PRACTICE WITH PROGRESSIVE DIFFICULTY" (layer toggles, code sketch)
2. Reference MNEMO-Development-Plan-Final.md for database structure + API endpoints

**If you're doing both:**
1. Start with MNEMO-Development-Plan-Final.md "ARCHITECTURE OVERVIEW"
2. Then read MNEMO-Research-to-Design.md for UI understanding
3. Then skim both for details as needed

**If you're a product/project manager:**
1. Read MNEMO-Project-Summary.md (high-level overview)
2. Reference MNEMO-Development-Plan-Final.md "QUICK START FOR DEVS" for effort/timeline

---

## KEY ARCHITECTURAL DECISIONS

### 1. Syllable Parsing is Hybrid
- **Automatic:** `syllabify` npm package (95%+ coverage on poetry vocabulary)
- **Manual Fallback:** If unknown word, user enters syllable count or breakdown (saved to localStorage)
- **Why:** Balances automation with user control (pedagogically sound per desirable difficulty research)
- **Effort:** ~5 hours to integrate

### 2. Meter Suggestions Removed from MVP
- **Reason:** Desirable difficulty (Bjork, 1994) - users learn better by struggling, not recognizing
- **Deferral:** Add during recitation practice in Phase 2 (when user needs it for comparison/corrective feedback)
- **Result:** Cleaner UI + stronger pedagogy

### 3. Three Annotation Layers in One Display
- **Why:** Users can see patterns simultaneously + understand relationships
- **Support:** Research on pattern comparison + scaffolded retrieval
- **Progressive:** Layers hide one-by-one during practice (easy → hard progression)

### 4. All Annotations Stored as JSONB
- Single `user_annotations` table
- Annotation types: meter, rhyme_scheme, sound_pattern, personal_note
- Easy to query + version + update
- Example structure in Development-Plan

### 5. Spaced Repetition is SM-2 (Simple)
- No fancy machine learning in MVP
- Quality ratings (1-5) drive interval calculation
- Easiness factor adjustment per session
- Foundation for Phase 2 (advanced scheduling)

---

## CRITICAL IMPLEMENTATION DETAILS

### Database (PostgreSQL)

**Core Tables:**
- `users` — authentication
- `texts` — uploaded poems (user's private library)
- `user_annotations` — unified meter/rhyme/sound/note storage (JSONB content)
- `practice_sessions` — session metadata + visibility settings
- `practice_attempts` — individual exercise attempts + scoring
- `review_schedule` — SM-2 scheduling per user-text pair
- `journal_entries` — reflection notes

**See MNEMO-Development-Plan-Final.md for complete schema + SQL.**

### Frontend State Management

**Per Poem (During Annotation):**
```javascript
state = {
    currentTextId: "...",
    syllables: [{text, stressed: boolean}, ...],
    rhymeLabels: {1: "A", 2: "B", ...},
    soundPatterns: [{pattern_type, sound, color, instances}, ...],
    visibilityToggles: {text: true, meter: true, rhyme: true, sound: true}
}
```

**Practice Mode:**
```javascript
practiceState = {
    difficultyLevel: "easy" | "medium" | "hard" | "expert",
    visibilitySettings: {text: true, meter: true, rhyme: false, sound: false},
    userInput: "user typed/pasted poem...",
    accuracy: 0.87,
    feedbackMessage: "..."
}
```

### API Design (RESTful)

**Example Annotation Endpoints:**
- `POST /texts/:text_id/annotations` — save meter/rhyme/sound
- `GET /texts/:text_id/annotations/display` — return annotated poem HTML
- `PATCH /annotations/:annotation_id` — update existing annotation
- `DELETE /annotations/:annotation_id` — delete

**See MNEMO-Development-Plan-Final.md for complete API spec.**

---

## PEDAGOGICAL FOUNDATION (Why It's Built This Way)

**Every feature serves memorization.**

### Desirable Difficulty (Bjork, 1994)
- Users struggle through annotation themselves (meter marking, pattern selection)
- This struggle = encoding + retrieval practice
- Auto-suggestions would reduce struggle (worse learning)
- ✅ We removed meter suggestions from MVP

### Generation Effect (Slamecka & Graf, 1978)
- Self-generated answers stick better than recognized answers
- User manually marking stress → better retention than being told pattern
- ✅ Click-based marking over auto-detection

### Multi-Modal Learning (Paivio, 1986)
- Visual (color-coded patterns) + textual (poem text) + motor (clicking, selecting)
- Engages multiple memory systems
- ✅ Color-coding + selection interaction

### Elaboration (Craik & Lockhart, 1972)
- Deep processing through meaningful connection-making
- Comparing meter + rhyme + sound in one view = elaboration
- ✅ Unified annotation display

### Scaffolding (Vygotsky)
- Gradual removal of supports builds independence
- Practice mode: Easy (all supports) → Expert (no supports)
- ✅ Layer toggle progression

### Spaced Repetition (Ebbinghaus + Bjork)
- SM-2 algorithm = proven memory spacing
- Each practice session adjusts next review date
- ✅ Review scheduling module

---

## TECHNICAL REQUIREMENTS

### Backend (Node.js + Express)
- User authentication (JWT tokens)
- File upload handling (S3/GCS)
- Text processing (syllable parsing via `syllabify`)
- Annotation storage + retrieval (PostgreSQL queries)
- SM-2 scheduling calculations
- REST API (20+ endpoints)

### Frontend (React or Vue)
- Upload form + poem library
- Unified annotation component (complex, central feature)
- Meter annotation subcomponent (click handlers, state)
- Rhyme annotation subcomponent (form inputs, real-time display)
- Sound pattern selector subcomponent (selection API, color picker, regex matching)
- Practice interface (layer toggles, input field, scoring)
- Journal + analytics dashboard

### Database (PostgreSQL)
- 10 tables as specified
- JSONB for annotation content
- Indexes on user_id, text_id for performance
- Foreign key constraints

### DevOps (Docker + CI/CD)
- Containerization (Docker file)
- GitHub Actions for CI (test on push)
- Deployment ready (single server or managed hosting)

---

## EFFORT BREAKDOWN (120-150 hours total)

### Week 1: Backend (~60 hours)
- User auth: 6 hrs
- Text upload + storage: 8 hrs
- Syllable parsing (`syllabify` integration): 4 hrs
- Annotation storage (JSONB): 6 hrs
- SM-2 algorithm: 8 hrs
- Practice session management: 8 hrs
- API implementation: 12 hrs
- Testing + debugging: 8 hrs

### Week 2: Frontend (~60 hours)
- Upload UI + library: 6 hrs
- Unified annotation interface: 16 hrs
  - Layout + toggles: 4 hrs
  - Meter component: 4 hrs
  - Rhyme component: 3 hrs
  - Sound component: 5 hrs
- Practice interface: 12 hrs
- Journal + analytics: 8 hrs
- Visual design (CSS): 8 hrs
- Integration + testing: 10 hrs

### Week 3: Polish + Deployment (~30 hours)
- End-to-end testing: 8 hrs
- Bug fixes: 10 hrs
- Deployment: 6 hrs
- Documentation: 6 hrs

---

## LEGAL FRAMEWORK

**You don't need to worry about this—it's handled.** But know:

- **DMCA Safe Harbor:** Included in Terms of Service
- **Fair Use Positioning:** Copyright risk <5% for cloud version
- **User Responsibility:** Users responsible for copyright of their uploads
- **DMCA Takedown:** 14-day process with counter-notice option
- **Deployment:** Ready to deploy with ToS modal on first login

**See MNEMO-Terms-of-Service.md for complete legal text.**

---

## DEPLOYMENT TARGET

**Single-Server or Managed Hosting:**

**Option 1 (Recommended for MVP):** AWS
- EC2 for backend (Node.js + Express)
- RDS for PostgreSQL
- S3 for text/audio storage
- CloudFront for CDN
- Route 53 for DNS
- Estimated: $50-100/month at launch

**Option 2:** Render or Vercel
- Backend on Render (Node.js)
- Frontend on Vercel (React/Vue)
- PostgreSQL (Render or AWS RDS)
- Object storage (S3 or equivalent)
- Estimated: $30-50/month at launch

**Option 3:** Self-hosted (if you have infra)
- Docker container + nginx reverse proxy
- PostgreSQL on dedicated machine
- S3 or equivalent object storage

---

## WHAT NOT TO OVER-ENGINEER

**These are Phase 2+ (not MVP):**
- Audio processing / prosody analysis
- Advanced NLP (rhyme detection, stress analysis, etc.)
- Adaptive scheduling (LSTM models)
- Mobile native apps
- Social sharing / annotation sharing
- Advanced user profiles
- Video tutorials

**Focus on Phase 1:**
- Core annotation features (meter, rhyme, sound)
- Practice with layer toggle
- SM-2 scheduling (simple)
- Personal journal
- Analytics

---

## SUCCESS CRITERIA (Phase 1 Launch)

✅ User can upload poem text
✅ User can mark meter stress (click-based)
✅ User can mark rhyme scheme (line input)
✅ User can mark sound patterns (selection + color)
✅ All three layers visible + toggleable
✅ Cloze deletion practice works
✅ Recitation practice with layer toggle works
✅ SM-2 scheduling calculates next review
✅ Personal journal entries save
✅ Analytics dashboard shows stats
✅ Book-like visual design implemented
✅ Authentication works (JWT)
✅ Deployed + accessible
✅ ToS modal on first login
✅ No major bugs

**If all ✅, Phase 1 is done. Ship it. Iterate based on user feedback.**

---

## QUESTIONS FOR YOU BEFORE STARTING

1. **Hosting:** AWS, Render, Vercel, or self-hosted?
2. **Frontend Framework:** React 18 or Vue 3? (Both work fine)
3. **Jurisdiction (ToS):** US, EU, other? (Affects GDPR, CCPA, etc.)
4. **Open-Source Timeline:** Publish to GitHub on launch, or wait?
5. **Database Host:** AWS RDS, Render, or self-managed?

---

## RESOURCES PROVIDED

You have 5 documents:

1. **MNEMO-Research-to-Design.md** — UI/UX specs with code sketches
2. **MNEMO-Development-Plan-Final.md** — Complete technical spec + database schema + API endpoints
3. **MNEMO-Terms-of-Service.md** — Legal framework (deploy as-is or customize)
4. **MNEMO-Project-Summary.md** — High-level overview for team alignment
5. **MNEMO-Verification-Checklist.md** — All decisions verified as integrated

**All you need to build Phase 1.**

---

## FINAL FRAMING

**This is not a prototype. This is a production specification.**

Every feature is:
- ✅ Grounded in learning science research
- ✅ Specified in technical detail (code sketches provided)
- ✅ Estimated for effort + timeline
- ✅ Sized to fit 2-week sprint
- ✅ Buildable by standard developers

**Your job:** Implement exactly what's specified. Don't innovate on design. Don't add features not in MVP scope. Execute the specification, ship Phase 1, then iterate based on user feedback.

**The research is done. The design is done. The decision-making is done.**

**Your job is to build.**

---

## LET'S GO 🚀

Questions? Review the documents. Everything is there.
Ready to start? Begin with backend Week 1. Follow the effort breakdown. Ship Phase 1 by end of Week 3.
