import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nextMeeting,
  previousMeeting,
  meetingInSession,
  upcomingMeetings,
  countdownTo,
  weekProgress,
  nyOffsetMs,
  meetingInstant,
  IN_SESSION_MS,
} from '../src/lib/time.ts';

const iso = (ms: number) => new Date(ms).toISOString();
const at = (s: string) => Date.parse(s);

test('anchor: Fractal 122 is 2 Nov 2026 at 23:00 UTC', () => {
  const m = nextMeeting(at('2026-11-01T13:00:00Z'));
  assert.equal(m.number, 122);
  assert.equal(iso(m.startsAt), '2026-11-02T23:00:00.000Z');
});

test('summer meetings are 22:00 UTC, winter 23:00 UTC', () => {
  assert.equal(iso(meetingInstant(2026, 9, 26)), '2026-10-26T22:00:00.000Z');
  assert.equal(iso(meetingInstant(2026, 11, 7)), '2026-12-07T23:00:00.000Z');
  assert.equal(iso(meetingInstant(2027, 5, 7)), '2027-06-07T22:00:00.000Z');
});

test('fall back on 1 Nov 2026 moves the UTC start and keeps 18:00 New York', () => {
  assert.equal(nyOffsetMs(at('2026-11-01T05:59:00Z')), -4 * 3600e3);
  assert.equal(nyOffsetMs(at('2026-11-01T06:00:00Z')), -5 * 3600e3);
  const before = nextMeeting(at('2026-10-27T00:00:00Z'));
  assert.equal(before.number, 122);
  assert.equal(iso(before.startsAt), '2026-11-02T23:00:00.000Z');
});

test('the week of spring forward, 14 Mar 2027', () => {
  const pre = nextMeeting(at('2027-03-09T00:00:00Z'));
  assert.equal(iso(pre.startsAt), '2027-03-15T22:00:00.000Z');
  const prior = previousMeeting(at('2027-03-09T00:00:00Z'));
  assert.equal(iso(prior.startsAt), '2027-03-08T23:00:00.000Z');
  assert.equal(pre.number, prior.number + 1);
});

test('numbers step by one for two years, every start is Monday 18:00 New York', () => {
  const list = upcomingMeetings(at('2026-11-01T00:00:00Z'), 110);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  list.forEach((m, i) => {
    assert.equal(m.number, 122 + i);
    assert.match(fmt.format(m.startsAt), /^Mon,? 18:00$/);
  });
});

test('counts backward through clock changes', () => {
  assert.equal(previousMeeting(at('2026-10-27T00:00:00Z')).number, 121);
  assert.equal(previousMeeting(at('2025-11-05T00:00:00Z')).number, 122 - 52);
});

test('at the exact start, next rolls to the following week', () => {
  const start = at('2026-11-02T23:00:00Z');
  assert.equal(nextMeeting(start - 1).number, 122);
  assert.equal(nextMeeting(start).number, 123);
  assert.equal(previousMeeting(start).number, 122);
});

test('in session window', () => {
  const start = at('2026-11-02T23:00:00Z');
  assert.equal(meetingInSession(start - 1), null);
  assert.equal(meetingInSession(start)?.number, 122);
  assert.equal(meetingInSession(start + IN_SESSION_MS - 1)?.number, 122);
  assert.equal(meetingInSession(start + IN_SESSION_MS), null);
});

test('edges where the UTC date differs from New York', () => {
  assert.equal(iso(nextMeeting(at('2026-11-03T01:00:00Z')).startsAt), '2026-11-09T23:00:00.000Z');
  assert.equal(iso(nextMeeting(at('2026-11-02T02:00:00Z')).startsAt), '2026-11-02T23:00:00.000Z');
});

test('countdown math', () => {
  assert.deepEqual(countdownTo(90061_000, 0), { days: 1, hours: 1, minutes: 1, seconds: 1 });
  assert.deepEqual(countdownTo(0, 5000), { days: 0, hours: 0, minutes: 0, seconds: 0 });
});

test('week progress runs 0 to 1 between meetings', () => {
  const start = at('2026-11-02T23:00:00Z');
  assert.ok(weekProgress(start + 1000) < 0.001);
  assert.ok(weekProgress(start - 1000) > 0.999);
});

test('the device timezone does not change the result', () => {
  const was = process.env.TZ;
  for (const tz of ['Africa/Lusaka', 'Pacific/Auckland', 'America/Los_Angeles', 'UTC']) {
    process.env.TZ = tz;
    assert.equal(iso(nextMeeting(at('2027-03-14T12:00:00Z')).startsAt), '2027-03-15T22:00:00.000Z');
  }
  if (was === undefined) delete process.env.TZ;
  else process.env.TZ = was;
});
