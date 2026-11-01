import test from 'node:test';
import assert from 'node:assert/strict';
import {
  planReminders,
  enableReminders,
  topUpReminders,
  WEEKS_AHEAD,
  HEADS_UP_MS,
  type NotificationPort,
  type PlannedReminder,
} from '../src/lib/reminders.ts';

const NOW = Date.parse('2026-11-01T13:00:00Z');

function fake(existing: string[] = []): NotificationPort & { scheduled: PlannedReminder[]; ids: string[] } {
  return {
    scheduled: [],
    ids: existing,
    async listIds() {
      return this.ids;
    },
    async cancelAll() {
      this.ids = [];
      this.scheduled = [];
    },
    async schedule(r) {
      this.scheduled.push(r);
      this.ids.push(r.id);
    },
  };
}

test('two reminders a week, under the 64 pending limit on iOS', () => {
  const plan = planReminders(NOW);
  assert.equal(plan.length, WEEKS_AHEAD * 2);
  assert.ok(plan.length <= 64);
  assert.equal(new Set(plan.map((p) => p.id)).size, plan.length);
});

test('first reminders are for Fractal 122 at the right instants', () => {
  const [soon, start] = planReminders(NOW);
  assert.equal(new Date(start.at).toISOString(), '2026-11-02T23:00:00.000Z');
  assert.equal(start.at - soon.at, HEADS_UP_MS);
  assert.match(start.title, /Fractal 122/);
});

test('reminders keep 18:00 New York across spring forward', () => {
  const plan = planReminders(Date.parse('2027-03-01T00:00:00Z'), 3).filter((p) => p.id.endsWith('start'));
  assert.deepEqual(
    plan.map((p) => new Date(p.at).toISOString()),
    ['2027-03-01T23:00:00.000Z', '2027-03-08T23:00:00.000Z', '2027-03-15T22:00:00.000Z'],
  );
});

test('inside the last hour, the past heads-up is dropped', () => {
  const plan = planReminders(Date.parse('2026-11-02T22:30:00Z'), 1);
  assert.deepEqual(plan.map((p) => p.id), ['fractal-122-start']);
});

test('enable replaces anything pending', async () => {
  const p = fake(['old']);
  await enableReminders(p, NOW);
  assert.ok(!p.ids.includes('old'));
  assert.equal(p.ids.length, WEEKS_AHEAD * 2);
});

test('top up does nothing when reminders are off', async () => {
  const p = fake();
  assert.equal(await topUpReminders(p, NOW), false);
  assert.equal(p.scheduled.length, 0);
});

test('top up extends the horizon when reminders are on', async () => {
  const p = fake(['fractal-122-start']);
  assert.equal(await topUpReminders(p, NOW), true);
  assert.equal(p.scheduled.length, WEEKS_AHEAD * 2);
});
