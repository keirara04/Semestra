# Engine

Planning engine boundary: capacity, ranking, placement, grade, and forecast
calculations live here as plain PHP classes/services, **not** Eloquent models.

Rules (see `mdfile/semester-command-center.md`, "Technical direction"):

- No Eloquent, no `DB::`, no framework facades inside this directory.
- Controllers and Eloquent code call into this module; they never duplicate
  its logic.
- Every class here should be fixture-testable in isolation, see
  `tests/Unit/Engine/fixtures`.

Implemented: Capacity, Exam, Grade, Placement, Planning, Ranking, and
Revision — each fixture-tested independently under
`tests/Unit/Engine/<Package>CalculatorTest.php`.
