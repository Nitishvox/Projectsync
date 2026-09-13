import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Authentication Validation Rules', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  test('valid email formats pass regex check', () => {
    assert.equal(emailRegex.test('user@example.com'), true);
    assert.equal(emailRegex.test('developer.team+testing@domain.co.in'), true);
    assert.equal(emailRegex.test('nitish@projectsync.io'), true);
  });

  test('invalid email formats fail regex check', () => {
    assert.equal(emailRegex.test('not-an-email'), false);
    assert.equal(emailRegex.test('missing@domain'), false);
    assert.equal(emailRegex.test('@missinguser.com'), false);
    assert.equal(emailRegex.test('spaces in@address.com'), false);
  });

  test('password length requirements (min 6 characters)', () => {
    const isPasswordValid = (pw: string) => typeof pw === 'string' && pw.length >= 6;
    assert.equal(isPasswordValid('12345'), false);
    assert.equal(isPasswordValid('123456'), true);
    assert.equal(isPasswordValid('SecureP@ssw0rd!'), true);
  });
});

describe('Project Validation Rules', () => {
  const allowedStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];

  test('project status accepts valid enum values', () => {
    for (const status of allowedStatuses) {
      assert.equal(allowedStatuses.includes(status), true);
    }
  });

  test('project status rejects invalid enum values', () => {
    assert.equal(allowedStatuses.includes('UNKNOWN'), false);
    assert.equal(allowedStatuses.includes('ARCHIVED'), false);
    assert.equal(allowedStatuses.includes(''), false);
  });

  test('project date range validation: end date must be on or after start date', () => {
    const validateDates = (start?: string | null, end?: string | null) => {
      if (!start || !end) return true;
      return new Date(end) >= new Date(start);
    };

    assert.equal(validateDates('2026-09-01', '2026-09-15'), true);
    assert.equal(validateDates('2026-09-15', '2026-09-15'), true);
    assert.equal(validateDates('2026-09-20', '2026-09-10'), false);
    assert.equal(validateDates(null, '2026-09-10'), true);
  });
});

describe('Task Validation Rules', () => {
  const allowedPriorities = ['LOW', 'MEDIUM', 'HIGH'];
  const allowedStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

  test('task priority accepts valid values', () => {
    for (const p of allowedPriorities) {
      assert.equal(allowedPriorities.includes(p), true);
    }
    assert.equal(allowedPriorities.includes('CRITICAL'), false);
  });

  test('task status accepts valid values', () => {
    for (const s of allowedStatuses) {
      assert.equal(allowedStatuses.includes(s), true);
    }
    assert.equal(allowedStatuses.includes('BLOCKED'), false);
  });

  test('task requires non-empty name and non-empty projectId', () => {
    const isValidTask = (task: { name?: string; projectId?: string }) => {
      return Boolean(task.name && task.name.trim().length > 0 && task.projectId && task.projectId.trim().length > 0);
    };

    assert.equal(isValidTask({ name: 'Build Dashboard', projectId: 'proj-123' }), true);
    assert.equal(isValidTask({ name: '', projectId: 'proj-123' }), false);
    assert.equal(isValidTask({ name: 'Task without project', projectId: '' }), false);
  });
});
