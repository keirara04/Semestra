<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

/**
 * Parses a student's own public Everytime (에브리타임) timetable share
 * link into draft subjects for TimetableImportController.
 *
 * Everytime's share page (https://everytime.kr/@<identifier>) is a client
 * rendered shell — the actual data comes from an unofficial but public
 * XML endpoint the page's own JS calls client-side:
 * POST https://api.everytime.kr/find/timetable/table/friend
 * with `identifier` (the part of the URL after "@") and no auth required
 * for a public/friend-visible table. Verified against a real share link
 * during implementation (see timetable-import plan's "spike" note) — this
 * is not guessed from documentation, it's the same request
 * /js/timetable.tableload.js issues.
 *
 * Response shape (XML):
 *   <response>
 *     <table status="1" ...>
 *       <subject id="...">
 *         <name value="..."/>
 *         <professor value="..."/>
 *         <time value="...">
 *           <data day="0-6" starttime="N" endtime="N" place="..."/>
 *           ... (one <data> per weekly occurrence — a class meeting twice
 *           a week is two <data> rows under the same <subject>)
 *         </time>
 *       </subject>
 *       ...
 *     </table>
 *   </response>
 * `day` is 0=Monday..6=Sunday (Korean week order, not our 0=Sunday), and
 * `starttime`/`endtime` are 5-minute units since midnight (108 == 9:00).
 * `status` is -1 (no table for that term) or -2 (private/friends-only) on
 * failure, 1 on success.
 */
class EverytimeImportService
{
    private const FRIEND_API_URL = 'https://api.everytime.kr/find/timetable/table/friend';
    private const MINUTES_PER_UNIT = 5;

    /**
     * @return array<int, array{title: string, professor: ?string, day_of_week: int, start_time: string, end_time: string, location: ?string}>
     */
    public function fetchSubjects(string $url): array
    {
        $identifier = $this->extractIdentifier($url);

        $response = Http::asForm()->timeout(10)->withHeaders([
            'User-Agent' => 'Mozilla/5.0 (compatible; SemestraTimetableImport/1.0)',
            'Origin' => 'https://everytime.kr',
            'Referer' => 'https://everytime.kr/',
        ])->post(self::FRIEND_API_URL, [
            'identifier' => $identifier,
            'friendInfo' => 'true',
        ]);

        if (! $response->successful()) {
            throw new EverytimeParseException('Could not reach Everytime. Please try again.');
        }

        return $this->parseXml($response->body());
    }

    /**
     * Only ever call the identifier extracted from a user-supplied
     * everytime.kr link through Everytime's own public API — never an
     * arbitrary user-supplied URL (SSRF guard).
     */
    private function extractIdentifier(string $url): string
    {
        $host = parse_url($url, PHP_URL_HOST);
        $scheme = parse_url($url, PHP_URL_SCHEME);
        $validHost = $host === 'everytime.kr' || (is_string($host) && str_ends_with($host, '.everytime.kr'));

        if ($scheme !== 'https' || ! $validHost) {
            throw new EverytimeParseException('Please paste a public Everytime share link (starts with https://everytime.kr/).');
        }

        if (! preg_match('/@([A-Za-z0-9_-]+)/', (string) parse_url($url, PHP_URL_PATH), $matches)) {
            throw new EverytimeParseException("That link doesn't look like a timetable share link (should contain @…).");
        }

        return $matches[1];
    }

    private function parseXml(string $xml): array
    {
        libxml_use_internal_errors(true);
        $document = simplexml_load_string($xml);
        libxml_clear_errors();

        if ($document === false) {
            throw new EverytimeParseException("Couldn't read that timetable. The link may have expired.");
        }

        $status = (string) ($document->table['status'] ?? '');
        if ($status === '-2') {
            throw new EverytimeParseException('This timetable is only visible to friends on Everytime, not publicly shared.');
        }
        if ($status === '-1' || ! isset($document->table)) {
            throw new EverytimeParseException("Couldn't find a timetable on that link.");
        }

        $subjects = [];
        foreach ($document->table->subject as $subject) {
            if ((string) ($subject->closed['value'] ?? '0') === '1') {
                continue;
            }

            $title = trim((string) ($subject->name['value'] ?? ''));
            if ($title === '' || ! isset($subject->time->data)) {
                continue;
            }

            $professorValue = trim((string) ($subject->professor['value'] ?? ''));

            foreach ($subject->time->data as $meeting) {
                $day = $this->normalizeDay((int) ($meeting['day'] ?? -1));
                if ($day === null) {
                    continue;
                }

                $subjects[] = [
                    'title' => $title,
                    'professor' => $professorValue !== '' ? $professorValue : null,
                    'day_of_week' => $day,
                    'start_time' => $this->unitsToTime((int) ($meeting['starttime'] ?? 0)),
                    'end_time' => $this->unitsToTime((int) ($meeting['endtime'] ?? 0)),
                    'location' => $this->normalizeLocation((string) ($meeting['place'] ?? '')),
                ];
            }
        }

        return $subjects;
    }

    /** Everytime's week is Monday(0)..Sunday(6); ours is Sunday(0)..Saturday(6). */
    private function normalizeDay(int $everytimeDay): ?int
    {
        if ($everytimeDay < 0 || $everytimeDay > 6) {
            return null;
        }

        return ($everytimeDay + 1) % 7;
    }

    private function unitsToTime(int $units): string
    {
        $minutes = max(0, $units) * self::MINUTES_PER_UNIT;
        return sprintf('%02d:%02d', intdiv($minutes, 60) % 24, $minutes % 60);
    }

    private function normalizeLocation(string $place): ?string
    {
        $trimmed = trim($place);
        return $trimmed !== '' && $trimmed !== '없음' ? $trimmed : null;
    }
}
