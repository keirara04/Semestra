# Notestra — Functional Specification

## Overview

**Notestra** is Semestra's in-browser PDF study and annotation workspace.

The purpose of Notestra is to let a user:

1. Pick a PDF from a course's Materials library (no separate upload step inside Notestra).
2. Open it directly in the browser.
3. View it in a focused/full-screen workspace.
4. Annotate it using drawing, highlighting, text, and notes.
5. Save those annotations back to Semestra.
6. Reopen the same PDF later with all annotations restored.
7. Export a new PDF containing the annotations.

Notestra should focus on the student study use case rather than becoming a full Adobe-style PDF editor.

---

# 0. Audit Notes (codebase check, 2026-08-14)

This spec was originally written against an assumed Nuxt/Vue + Laravel stack with a
standalone `documents` upload flow. Checked against the actual repo and corrected below.

**Confirmed correct:**
- Backend is Laravel (`backend/composer.json`, `laravel/framework ^13.17`, PHP `^8.4`).
- Object storage is DigitalOcean Spaces, S3-compatible via `league/flysystem-aws-s3-v3`.

**Corrected:**
- Frontend is **Next.js 16 (App Router) + React 19 + TypeScript**, not Nuxt/Vue.
  No PDF library is installed yet (no `pdfjs-dist`, `react-pdf`, `pdf-lib`, `fabric`, `konva`) —
  these are new dependencies to add.
- There is **no `documents` table**. Course files already live in a `materials` table
  (`backend/database/migrations/2026_08_13_000017_create_materials_table.php`), with an
  Eloquent model `Material` (`backend/app/Models/Material.php`) belonging to `Course`.
  Notestra should attach annotations/notes to an existing `Material` row
  (`type = 'pdf'`), not create a parallel document entity.
- Per the user's direction, **Notestra should not have its own upload step**. PDFs already
  enter Semestra through the course Materials library (`MaterialController`, backed by
  `Storage::disk($material->disk)`). Notestra opens an existing material rather than
  accepting a new file.
- **Gap found**: `MaterialController@index` currently returns all of the user's materials
  unfiltered (`Material::orderBy('title')->get()`), and the course page filters by
  `course_id` client-side (`frontend/src/app/(app)/courses/[id]/page.tsx`). A course-scoped
  endpoint or query param (`GET /api/courses/{course}/materials`) should be added — needed
  regardless of Notestra, but Notestra's material picker depends on it existing server-side
  rather than over-fetching every material.
- **Gap found**: `materials` storage disk defaults to local `public` disk in dev
  (`backend/config/materials.php`, `MATERIALS_DISK` env var), with Spaces intended for
  production once `DO_SPACES_*` credentials are set. Signed-URL generation (Section 4)
  needs to work against whichever disk is active, not assume Spaces is always live.
- `smalot/pdfparser` is already a backend dependency, but only for syllabus text
  extraction (`SyllabusExtractionService.php`) — unrelated to viewing/annotation, cannot
  be reused for rendering.
- No existing PDF viewer, annotation UI, or `Notestra`-named code exists anywhere in the
  repo. This is a net-new feature.

---

# 1. Core User Flow

```text
Material already exists in a course (uploaded via Materials library)
    ↓
User opens a PDF-type Material in Notestra
    ↓
Backend verifies ownership/access, returns signed URL
    ↓
Open PDF in Notestra viewer
    ↓
Read / highlight / draw / type / add notes
    ↓
Autosave annotations
    ↓
User exits Notestra
    ↓
Reopen later with annotations restored
    ↓
Optional: Export annotated PDF
```

---

# 2. PDF Source: Course Materials

Notestra does not implement its own upload flow. PDFs enter Semestra through the
existing course **Materials** library, and Notestra simply opens a material of
`type = "pdf"`.

## Required behaviour

- List a course's materials filtered to PDF type as candidates to open in Notestra.
- Reuse the existing `Material` record — do not duplicate metadata into a new table.
- Verify the material belongs to the requesting user's course before opening.
- Add annotation/note tables that reference `material_id` (see Section 9).

## Existing material metadata (`materials` table)

```text
materials

id
user_id
course_id
type            -- slide | pdf | reading | recording | link
title
disk            -- e.g. "spaces" or "public" (config/materials.php)
path
url             -- external link, if not an uploaded file
week
mime_type
size_bytes
created_at
updated_at
```

`Material::file_url` (`backend/app/Models/Material.php`) already resolves
`Storage::disk($this->disk)->url($this->path)` for uploaded files. Notestra's
"open in viewer" action should call this same resolution path, wrapped behind an
ownership check and a short-lived signed URL rather than the currently public
`file_url` accessor.

## Required backend addition

- `GET /api/courses/{course}/materials?type=pdf` — course-scoped material listing
  (does not exist yet; see Section 0 audit notes).

---

# 3. Object Storage

Use object storage for material PDFs rather than storing PDF binary data directly in
the database. This is already in place for Materials generally — Notestra does not need
its own storage integration.

## Actual storage structure (DigitalOcean Spaces, S3-compatible)

Materials are stored per-user under a disk-driven path, e.g.:

```text
materials/{user_id}/{filename}
```

configured via `backend/config/filesystems.php` (`spaces` disk) and
`backend/config/materials.php` (`MATERIALS_DISK`, defaults to local `public` disk in dev).

Annotated exports may be stored separately:

```text
exports/
└── annotated/
```

---

# 4. Private File Access

Materials should not be publicly accessible via a guessable URL when opened through
Notestra.

## Required behaviour

- The backend checks whether the authenticated user owns or is allowed to access the
  requested material (via `course_id` → `user_id`, same pattern as `MaterialController`).
- If access is allowed, generate a short-lived signed URL rather than returning the
  currently-public `file_url`.
- The browser uses the signed URL to load the PDF.

## Disk-agnostic abstraction

`config/materials.php` means the active disk can be `spaces` (prod) or local `public`
(dev, per Section 0 audit notes). Notestra's frontend should never know or care which
one is active. Expose a single model method:

```php
$material->temporaryViewUrl();
```

Internally:

```text
disk = spaces  → Storage::disk('spaces')->temporaryUrl($path, now()->addMinutes(5))
disk = local   → signed route, e.g. URL::temporarySignedRoute(
                    'materials.stream', now()->addMinutes(5), ['material' => $id]
                  )
```

`GET /api/materials/{material}/view-url` always returns one URL shape regardless of
environment — the frontend API surface stays identical across dev and prod.

## Access flow

```text
User opens PDF-type material in Notestra
        ↓
Laravel checks authentication (Sanctum)
        ↓
Laravel checks material ownership via course_id
        ↓
Temporary signed URL generated
        ↓
Browser receives URL
        ↓
PDF loads
```

This prevents users from guessing another user's material URL.

---

# 5. PDF Viewer

Notestra should provide an in-browser PDF reader.

## Core viewer functions

- Open PDF.
- Page-by-page navigation.
- Scroll through document.
- Jump to page number.
- Zoom in.
- Zoom out.
- Fit to width.
- Fit to page.
- Hand/pan tool.
- Page thumbnails.
- Current page indicator.
- Total page count.
- Search PDF text where supported.
- Full-screen/focused reading mode.

`pdfjs-dist` is not yet installed (`frontend/package.json`) and should be added as a new
dependency for the viewer layer.

---

# 6. Annotation Tools

Notestra should provide lightweight study-focused annotation.

## MVP annotation types

### Pen / Freehand Drawing

Users can sketch directly over the PDF.

Store **normalized** coordinates (0–1, relative to page width/height), not raw canvas
pixels. Zoom level and viewport size must not affect stored data, or annotations drift
when reopened at a different zoom/window size than they were drawn at.

```json
{
  "id": "b3b2b1a0-...-uuid",
  "material_id": "abc123",
  "page": 4,
  "type": "drawing",
  "points": [
    [0.234, 0.512],
    [0.238, 0.517],
    [0.246, 0.524]
  ]
}
```

Potential properties:

- Stroke width (also normalized, e.g. relative to page width, not pixels)
- Stroke colour
- Opacity
- Coordinates (normalized 0–1)
- Page number

Convert screen pixels → normalized coordinates at the point of capture
(`x / pageRenderWidth`, `y / pageRenderHeight`), and normalized → screen pixels only at
render time. The canvas resolution used for rendering must never leak into stored data.

---

### Rendering approach (decided for MVP)

**SVG overlay for annotations, positioned above the PDF.js canvas.** Not a raw canvas,
not generic HTML absolutely-positioned divs. SVG makes per-object selection, hit-testing,
deletion, and normalized-coordinate ↔ export mapping straightforward — each annotation is
an addressable DOM node (`<path>`, `<rect>`, `<text>`) that can carry its own `id`
attribute (the annotation UUID), instead of pixels baked into a single bitmap.

### Highlighter

**MVP scope decision: freehand/rectangular highlighting only** (a translucent
draw-a-rectangle-or-stroke tool, same data shape as Section 6's highlight example) —
not real text-selection highlighting. Text-selection highlighting requires mapping
PDF.js's text layer to selection ranges and is a materially different implementation;
it's a Phase 2 candidate (Section 25), not MVP.

Users can highlight important regions or text.

Example:

```json
{
  "id": "9f1e2d3c-...-uuid",
  "material_id": "abc123",
  "page": 4,
  "type": "highlight",
  "x": 0.21,
  "y": 0.43,
  "width": 0.47,
  "height": 0.03,
  "color": "#FFE66D"
}
```

Potential properties:

- Position (normalized 0–1, same convention as drawings)
- Width / Height (normalized, relative to page dimensions)
- Colour
- Opacity
- Page number

---

### Text Boxes

Users can place typed text directly on top of the PDF.

Potential properties:

- Text content
- Font size — must follow the same normalization rule as position, or text scales
  inconsistently across zoom/viewport. Store as a fraction of page height (e.g.
  `font_size: 0.018` = 1.8% of page height), not raw `px`. Convert to on-screen pixels at
  render time (`font_size * pageRenderHeight`) and to PDF points at export time
  (`font_size * pdfPageHeightPt`), same as other coordinates.
- Position (normalized 0–1)
- Page
- Colour
- Width/height (normalized 0–1)

---

### Eraser

Users should be able to remove annotation objects.

The eraser should remove annotations rather than modify the original PDF content.

---

### Undo / Redo

Maintain a temporary action history while the document is open.

Examples:

```text
Draw line
Highlight paragraph
Add text
Delete annotation
```

Users should be able to undo and redo these actions.

---

# 7. Separate Study Notes

Notestra should support notes that are associated with the material but are not
necessarily drawn onto the PDF itself.

Examples:

- Exam reminder
- Key concept
- Personal study note
- Question to revisit
- Important formula
- Topic summary

## New note model

```text
material_notes

id
material_id
user_id
page_number
title
content
note_type       -- enum: general | exam | concept | question | formula
created_at
updated_at
```

`note_type` should be a constrained enum (DB check constraint or Laravel enum cast), not
an arbitrary string — keeps future filtering/UI (e.g. "show all exam-flagged notes")
reliable.

`page_number` may be optional.

This allows a note to either refer to:

- the whole material, or
- a specific page.

---

# 8. Annotation Storage Strategy

Annotations should normally be stored separately from the original PDF.

Do not regenerate the PDF every time a user draws or highlights something.

## Recommended architecture

```text
Original material file (Spaces)
     +
Stored annotation objects (new table)
     ↓
Notestra viewer
```

The original material file remains unchanged.

When the document is reopened:

1. Load the original PDF via signed URL.
2. Fetch saved annotations for that `material_id`.
3. Render annotations on top of the corresponding pages.

This makes annotations:

- Editable
- Deletable
- Faster to save
- Easier to sync
- Easier to undo
- Easier to version

---

# 9. Annotation Database Model

A new table, referencing the existing `materials` table (not a new document entity):

```text
material_annotations

id              -- UUID, generated client-side at creation time
material_id     -- FK to materials.id, ON DELETE CASCADE (see Section 18)
user_id         -- see ownership note below
page_number
type
data            -- normalized coordinates (0-1), see Section 6
deleted_at      -- soft delete, nullable
created_at
updated_at
```

`user_id` here is technically redundant — ownership is already fully determined by
`material_id → materials.user_id`. Keeping the column is fine (it makes authorization
queries a straight `WHERE user_id = ?` instead of a join, which matters once this table
is hot), but only on the condition that it can never disagree with the material's real
owner: **set it server-side from the authenticated request + the material's owner, and
never accept `user_id` from client input.** If that guarantee feels fragile to maintain,
drop the column and always join through `material_id` instead — don't keep a value that
can silently drift from the source of truth.

Client-generated UUIDs let the frontend assign a stable ID to a new annotation the
moment it's drawn, before the backend has ever seen it. That's what makes the batched
autosave in Section 11 work — a stroke can be optimistically rendered, tracked as dirty,
and reconciled by ID whether it's an insert or an update, with no round-trip needed just
to learn the ID.

`deleted_at` (soft delete) rather than a hard `DELETE`, so an autosave batch that erases
an annotation can be synced the same way as any other dirty-object write — no separate
"immediate delete" code path racing the debounce. A periodic job can hard-purge old
soft-deleted rows later if needed.

To be explicit: in the batch payload (Section 19), `"delete": ["uuid"]` means "set
`deleted_at = now()`," never a hard row delete. Every `GET .../annotations` (and the
`upsert`/`delete` batch handler itself) must scope out `whereNull('deleted_at')` by
default — a soft-deleted annotation should behave as absent everywhere except an explicit
admin/audit query.

**Conflict handling / versioning**: two tabs open on the same material is possible even
single-user (e.g. two browser tabs, or a stale reload). Each annotation's `updated_at`
acts as an implicit version. On upsert, the backend should reject (or last-write-win with
a returned conflict flag, TBD at implementation time — but the rule must be decided, not
silently ignored) an incoming write whose client-known `updated_at` is older than the
server's current `updated_at` for that ID, rather than blindly overwriting. Minimum bar
for MVP: server always returns its canonical `updated_at` after every write (Section 19
response shape) so a stale tab can detect drift next time it saves.

The `data` field can contain JSON. All coordinates are normalized (0–1) per Section 6 —
every persisted example in this spec uses that convention, not raw pixels.

Example (highlight):

```json
{
  "x": 0.21,
  "y": 0.43,
  "width": 0.47,
  "height": 0.03,
  "color": "#FFE66D",
  "opacity": 0.5
}
```

For freehand drawing:

```json
{
  "points": [
    [0.234, 0.512],
    [0.238, 0.517],
    [0.246, 0.524]
  ],
  "stroke_width": 0.004,
  "color": "#000000"
}
```

`stroke_width` is also normalized (relative to page width), so a stroke drawn thick on a
small viewport still renders thick on a large one.

---

# 10. Save Function

Notestra should include a manual Save action.

## Save behaviour

When the user clicks Save (or autosave fires, see Section 11):

```text
Current annotation state
        ↓
Send batched upsert/delete to backend (Section 11)
        ↓
Validate user access to the material
        ↓
Write/update material_annotations records in a transaction
        ↓
Return success
```

The UI can display states such as:

```text
Saving...
Saved
Save failed
```

The Save action should save Notestra's editable annotation data.

It should not rewrite the original material file.

---

# 11. Autosave

Notestra should also autosave changes so users do not lose work if they accidentally
close the page.

## Suggested flow

```text
User annotates
        ↓
React state changes
        ↓
Dirty annotation IDs tracked (by client-generated UUID)
        ↓
1–2 sec debounce
        ↓
Batch upsert/delete (single request, Section 19)
        ↓
Laravel transaction
        ↓
Saved ✓
```

A single debounced request carrying every dirty object (potentially several strokes,
a highlight, and a delete, all made within the debounce window) fits the 1–2 second
autosave far better than firing one `POST`/`PATCH`/`DELETE` per action — see the
batched endpoint in Section 19.

Use debouncing so every pen movement does not create an API request.

Autosave can work alongside the manual Save button — both go through the same batched
endpoint.

## Explicit save state machine

```text
saved → dirty → saving → saved
                      ↘ error → dirty (retry)
```

- **saved**: no local changes outstanding, matches last server-confirmed state.
- **dirty**: local edit made (or delete queued); not yet sent. New edits while dirty just
  extend the same dirty set — no new debounce timer per edit.
- **saving**: batch in flight. New edits made *during* saving still mark the annotation
  dirty again (don't block input on a pending request) — they'll ride the next batch.
- **saved**: on success, clear only the IDs that were actually acknowledged (Section 19
  response `synced` list) — not the whole dirty set, in case new edits arrived mid-flight.
- **error**: on failure, the dirty set is **kept in memory, not cleared** — a failed
  autosave must never silently drop the user's edits. Retry the same batch (backoff,
  e.g. a few seconds, capped retries or indefinite-with-backoff), and surface "Save
  failed" in the UI per Section 10. Only a successful response clears the corresponding
  dirty IDs.

---

# 12. Save & Exit

Optional convenience action:

```text
Save & Exit
```

Behaviour:

1. Save pending annotations.
2. Confirm the save completed.
3. Return the user to the course's Materials view.

---

# 13. Export Annotated PDF

Users should be able to generate a real PDF containing their annotations.

This is different from saving annotations inside Notestra.

## Flow

```text
Original material file (Spaces)
      +
Saved annotations
      ↓
PDF generation/flattening process
      ↓
New PDF
      ↓
week-04-lecture-annotated.pdf
```

`pdf-lib` is not yet installed and should be added as a new dependency to draw the
annotations onto the PDF for export.

Annotation data is stored normalized (0–1, Section 6). The export layer must map each
annotation to its **original PDF page's native dimensions** (`pdf-lib`'s
`page.getWidth()`/`getHeight()`, in PDF points — not the viewport pixel size Notestra
happened to render at) before drawing: `x_pt = x_normalized * page.getWidth()`, and
likewise for `y`/`width`/`height`/`font_size`. The viewport size used while a student was
annotating is irrelevant to export — only the PDF's own page geometry matters. Getting
this wrong is the most likely source of exported annotations landing in the wrong place.

**Not part of MVP** (see Section 24) — the priority is a solid open → draw → save →
reopen loop first; export can follow once that's stable.

## Export options

Potential buttons:

```text
Download Annotated PDF   -- default, no server-side persistence
Save to Materials         -- explicit opt-in, creates a derived Material
```

Default behaviour should be **download-only** — generate the flattened PDF, stream it to
the browser, and discard the server-side copy. Do not persist every export to Spaces by
default: a student re-exporting repeatedly while iterating on annotations would otherwise
quietly accumulate duplicate PDFs in storage with no cleanup path.

"Save to Materials" should be a separate, explicit action — only then is the export
stored back as a new `Material` (a derived file linked to the original via
`source_material_id`, not overwriting it).

---

# 14. Preserve Original Material File

The original uploaded material should normally remain unchanged.

Example:

```text
week-04-lecture.pdf
```

After export:

```text
week-04-lecture.pdf
week-04-lecture-annotated.pdf
```

This prevents destructive edits and gives users a clean source document.

---

# 15. Document Reopening

Restoring reading position (last page, zoom) is small to build and high-value —
reopening a 90-page lecture PDF and landing back where the student left off matters at
least as much as the annotation extras.

## New table: `user_material_states`

```text
user_material_states

user_id
material_id
last_opened_at
last_page
zoom
updated_at
```

Composite primary key (`user_id`, `material_id`). Deliberately separate from
`material_annotations`/`material_notes` — this is per-viewer session state, not
document content, and updates far more frequently (every page turn/zoom change) than
annotations do. Touched via the same `GET .../view-url` call (Section 4) that opens the
viewer, plus on page/zoom change (debounced, same pattern as autosave).

## Reopen flow

```text
Open material
        ↓
GET user_material_states → restore last_page, zoom
        ↓
GET material_annotations
        ↓
GET material_notes
        ↓
Render PDF at last_page/zoom
        ↓
Render annotation overlay
        ↓
Restore notes
```

The workspace should appear exactly as it did when the user last saved — page position
and zoom included, not just annotation content.

---

# 16. Course Integration

Materials are already connected to Semestra's academic data — no new relationship needs
to be built, only surfaced inside Notestra.

Example:

```text
COSE213
Data Structures

Materials
├── Week 1 - Introduction.pdf
├── Week 2 - Linked Lists.pdf
├── Assignment 1.pdf
└── Midterm Review.pdf
```

Potential material information displayed elsewhere in Semestra:

```text
Week 2 - Linked Lists
12 annotations
4 notes
```

This allows Notestra to be part of the course workspace (`Semester → Course → Material`)
rather than an isolated PDF viewer.

---

# 17. Document Organisation

Organisation already largely exists at the Materials level
(`MaterialController`, `frontend/src/app/(app)/courses/[id]/page.tsx`). Notestra-specific
additions:

- Search within a material's annotations/notes.
- Filter materials by "has annotations" when picking what to open.
- Sort by:
  - Recently opened in Notestra — backed by `user_material_states.last_opened_at`
    (Section 15), not a column on `materials` itself. Materials are per-user already in
    this schema, but keeping open/reading state in its own table rather than bolted onto
    `materials` means it scales cleanly if materials are ever shared across users later,
    and keeps `materials` itself free of per-viewer state.
  - Recently uploaded (existing material field)
  - Name
  - Course

Existing Materials features (rename, delete, week assignment) are reused as-is —
Notestra does not need to reimplement them.

Possible future additions:

- Tags
- Collections
- Study sets

---

# 18. File Deletion

When a material is deleted (existing `MaterialController@destroy` flow), Notestra-owned
data must be cleaned up too. Do this via database foreign keys, not application code:

```text
material_annotations.material_id
    → materials.id
    ON DELETE CASCADE

material_notes.material_id
    → materials.id
    ON DELETE CASCADE
```

With `ON DELETE CASCADE` in the migrations, `MaterialController@destroy` does not need
to manually orchestrate deletion of child annotation/note records — the database does it
atomically. Remaining manual steps:

1. Verify user owns the material (existing behaviour).
2. Remove or soft-delete the `materials` record — cascades to annotations/notes.
3. Delete the file object from storage (existing behaviour).
4. Optionally remove associated annotated exports (derived `Material` rows) — these are
   separate `materials` rows, so this is the same delete path, not a special case.

A soft-delete grace period may be added later; if `materials` moves to soft-delete,
the cascade should be re-checked (Postgres `ON DELETE CASCADE` fires on hard delete only
— a soft-deleted material would need its annotations/notes soft-deleted explicitly, or
scoped out by the parent's `deleted_at` at query time).

---

# 19. API Structure

Example Laravel API endpoints, extending the existing `materials` resource rather than
introducing a `documents` resource:

```text
GET    /api/courses/{course}/materials?type=pdf   -- new: course-scoped list (Section 0/2)

GET    /api/materials/{material}/view-url         -- new: temporaryViewUrl(), Section 4

GET    /api/materials/{material}/state             -- new: user_material_states (Section 15)
PUT    /api/materials/{material}/state             -- new: upsert last_page/zoom, debounced

GET    /api/materials/{material}/annotations
PUT    /api/materials/{material}/annotations       -- batched upsert/delete, see below

GET    /api/materials/{material}/notes
POST   /api/materials/{material}/notes
PATCH  /api/notes/{note}
DELETE /api/notes/{note}

POST   /api/materials/{material}/export            -- download only, no persistence
POST   /api/materials/{material}/export/save        -- explicit "Save to Materials"
```

## Batched annotation sync

The primary autosave interface is a single batched endpoint rather than one
`POST`/`PATCH`/`DELETE` per annotation — a debounced 1–2 second save can easily contain
several strokes plus a delete, and per-object requests don't match that shape:

```text
PUT /api/materials/{material}/annotations
```

```json
{
  "upsert": [
    {
      "id": "b3b2b1a0-...-uuid",
      "page_number": 4,
      "type": "highlight",
      "data": { "x": 0.21, "y": 0.43, "width": 0.47, "height": 0.03 }
    }
  ],
  "delete": [
    "annotation-uuid"
  ]
}
```

Handled server-side in a single Laravel transaction: upserts keyed on the client-supplied
UUID (ownership-checked against `material_id`), deletes applied as soft-deletes
(`deleted_at`, see Section 9). Notes remain on individual `POST`/`PATCH`/`DELETE` since
they're user-initiated one-at-a-time actions, not high-frequency stroke data.

Response returns canonical server timestamps so the client has an explicit
acknowledgement of exactly what was persisted, and a version to compare against for the
conflict check in Section 9:

```json
{
  "synced": [
    { "id": "b3b2b1a0-...-uuid", "updated_at": "2026-08-14T07:12:33Z" }
  ]
}
```

The client clears an ID from its dirty set only once it appears in `synced` — see the
save state machine in Section 11.

Existing `Route::apiResource('materials', MaterialController::class)`
(`backend/routes/api.php`) is unchanged.

---

# 20. Frontend Architecture

Actual stack is Next.js (App Router) + React + TypeScript, not Nuxt/Vue. A possible
component structure under `frontend/src/app/(app)/notestra/[materialId]/`:

```text
NotestraPage
├── PDFViewer
├── PageRenderer
├── AnnotationLayer
│   ├── PenTool
│   ├── HighlightTool
│   ├── TextTool
│   └── EraserTool
├── PageNavigation
├── ZoomControls
├── NotesPanel
├── AutosaveManager
└── ExportManager
```

Entry point is a material row (`type: "pdf"`) inside an existing course page, e.g. an
"Open in Notestra" action added next to the current material link in
`frontend/src/app/(app)/courses/[id]/page.tsx`.

---

# 21. Suggested Technical Stack

## Frontend

```text
Next.js (App Router) / React / TypeScript
```

New PDF-related dependencies to add:

```text
pdfjs-dist   -- rendering PDFs
pdf-lib      -- generating/exporting annotated PDFs (client- or server-side)
```

SVG overlay above each rendered PDF.js canvas page for annotations — see Section 6
rendering approach.

---

## Backend

```text
Laravel (confirmed, backend/composer.json)
```

Responsibilities:

- Authentication (Sanctum, already in place)
- Authorisation (extend existing material ownership checks)
- Annotation storage (new)
- Notes storage (new)
- Signed storage URLs (new — currently `file_url` is unsigned)
- File deletion (extend existing `MaterialController@destroy`)
- Export requests (new)
- Course/material relationships (already exist)

---

## Storage

```text
DigitalOcean Spaces (S3-compatible, via league/flysystem-aws-s3-v3)
```

Dev environments fall back to the local `public` disk until `MATERIALS_DISK=spaces` and
`DO_SPACES_*` credentials are set (`backend/config/materials.php`).

Responsibilities:

- Original material files (already handled by `MaterialController`)
- Optional generated annotated PDFs (new, stored as derived materials)

---

## Database

Store, using the existing PostgreSQL/Eloquent setup:

- Materials (existing — reused, not duplicated)
- Annotation objects (new: `material_annotations`)
- Notes (new: `material_notes`)
- Per-user reading/viewer state (new: `user_material_states`, Section 15)
- Course/semester relationships (existing)

Do not store the complete PDF binary in normal database columns.

---

# 22. PDF Export Technology

```text
pdfjs-dist
```

for viewing PDFs in-browser (new dependency).

```text
pdf-lib
```

for generating/exporting annotated PDFs (new dependency).

Alternative commercial PDF SDKs can be considered later if advanced features become
necessary.

---

# 23. Features NOT Required for MVP

Notestra does not need to be a full PDF editor.

Avoid initially building features such as:

- Editing existing PDF paragraphs.
- Changing the original document fonts.
- Reflowing existing PDF text.
- Moving original images.
- Editing embedded PDF objects.
- Advanced PDF form creation.
- OCR editing.
- Adobe Acrobat-level document manipulation.
- A standalone upload flow inside Notestra (materials are uploaded via the existing
  Materials library, not through Notestra).

These features significantly increase development complexity without being necessary
for the initial student study use case.

---

# 24. Recommended MVP

**Priority order matters more than the list itself.** Get this loop rock-solid before
touching export:

```text
Open → Draw → Save → Refresh → Annotation is exactly where I left it
```

Export is explicitly **not** part of the first milestone (Section 13) — it's real
implementation work (PDF-native dimension mapping, pdf-lib integration) that shouldn't
compete for attention with getting persistence correct first.

## Milestone 1 — the loop

- [ ] Course-scoped material listing endpoint (`GET /api/courses/{course}/materials`)
- [ ] Open PDF-type material in browser (no separate upload step)
- [ ] `Material::temporaryViewUrl()` disk-agnostic signed URL abstraction
- [ ] SVG overlay + PDF.js canvas rendering approach
- [ ] Full-screen/focused PDF viewing
- [ ] Page navigation, page thumbnails, zoom
- [ ] Pen/freehand drawing (normalized coordinates, Section 6)
- [ ] Freehand/rectangular highlighter (not text-selection highlighting — Section 6)
- [ ] Text boxes (normalized position + normalized font size, Section 6)
- [ ] Eraser
- [ ] Undo / Redo
- [ ] Client-generated UUIDs for annotations
- [ ] Batched `PUT /api/materials/{material}/annotations` upsert/delete endpoint, with
      `synced` response acknowledgement (Section 19)
- [ ] Soft delete (`deleted_at`) for annotations, excluded from all `GET` reads
- [ ] `ON DELETE CASCADE` FKs from `material_annotations`/`material_notes` to `materials`
- [ ] Explicit save state machine (saved/dirty/saving/error, Section 11) — errors keep
      the dirty set and retry, never silently drop edits
- [ ] Conflict/version check via `updated_at` on write (Section 9)
- [ ] Manual Save
- [ ] Autosave (debounced, batched)
- [ ] Separate study notes (`material_notes`, constrained `note_type` enum)
- [ ] `user_material_states` — restore last page + zoom on reopen (Section 15)
- [ ] Reopen material with annotations, notes, and reading position all restored
- [ ] Secure material ownership/access checks
- [ ] Signed URLs for private materials

## Milestone 2 — export (after Milestone 1 is solid)

- [ ] Export annotated PDF, mapping normalized coordinates to native PDF page dimensions
      (Section 13)
- [ ] Download exported PDF (default, not persisted)
- [ ] "Save to Materials" as an explicit, separate opt-in action

---

# 25. Possible Phase 2 Features

After the MVP is stable:

- Annotation colours.
- Different pen thickness.
- Highlight colours.
- Shapes.
- Arrows.
- Sticky notes attached to exact PDF positions.
- Bookmarks.
- Search annotations.
- Search notes.
- Annotation sidebar.
- Copy selected text.
- Link annotation to a Semestra task.
- Link annotation to an exam.
- Link annotation to a study set.
- Annotation tags.
- Document version history.
- Recently viewed materials.
- Keyboard shortcuts.
- Touch/stylus optimisation.
- Apple Pencil support through browser pointer events where supported.
- Mobile/tablet optimisation.

---

# 26. Possible Future Semestra Integration

Notestra can eventually connect PDF content with other parts of Semestra.

Examples:

```text
Highlight paragraph
        ↓
Create study note
        ↓
Add to Study Set
```

```text
PDF note
        ↓
"Likely exam question"
        ↓
Attach to Algorithms Midterm
```

```text
Assignment PDF material
        ↓
Create Semestra task
        ↓
Deadline automatically linked
```

This would turn Notestra into part of a larger semester workflow rather than simply a
PDF annotation utility.

---

# 27. Security Requirements

At minimum:

- Require authentication for material access (Sanctum, already in place).
- Verify ownership or explicit access permission for every material request, via
  `course_id` → `user_id` (same pattern as existing `MaterialController` checks).
- Use private object storage (Spaces bucket already private by default; confirm no
  public-read ACL is set on write).
- Use temporary signed URLs instead of the current unsigned `file_url`.
- Do not trust file names supplied by users.
- Reuse the existing unique storage key generation in `MaterialController@store`.
- Validate MIME type (existing `MaterialRequest` validation).
- Validate file extension.
- Enforce maximum upload size (already enforced for material uploads).
- Prevent users from reading another user's annotation/note records.
- Prevent users from modifying another user's annotations.
- Prevent users from exporting another user's material.
- Sanitize user-generated note/text data where necessary.

---

# 28. Reliability Requirements

Notestra should minimise the risk of lost study work.

Recommended protections:

- Autosave.
- Manual Save.
- Retry failed autosaves.
- Keep unsaved annotation state locally while the page remains open.
- Warn before leaving if unsaved changes remain.
- Save changed objects only where practical.
- Avoid rewriting the entire PDF for normal annotation saves.
- Generate PDFs only when the user explicitly exports.

---

# 29. Core Product Principle

Notestra should not attempt to replace Adobe Acrobat.

Its goal is:

> Give Semestra users a fast place to read, annotate, save, organise, and revisit their
> university PDFs — sourced from their course Materials — without leaving their semester
> workspace.

The primary loop should remain simple:

```text
Pick material
→ Read
→ Annotate
→ Save
→ Study
→ Reopen
→ Export when needed
```
