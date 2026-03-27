import app from '../index';
import { type MockClerkUser, setClerkAuth, setClerkUser } from './mocks/clerk';

export function authenticateAs(userId: string, overrides: Partial<MockClerkUser> = {}) {
  setClerkUser({
    id: userId,
    firstName: 'Test',
    lastName: 'User',
    imageUrl: `https://example.com/${userId}.png`,
    primaryEmailAddress: {
      emailAddress: `${userId}@example.com`,
    },
    ...overrides,
  });
  setClerkAuth({ userId });
}

export function authenticateAsGuest() {
  setClerkAuth({ userId: null, headers: {}, redirectTo: '/sign-in' });
}

export async function requestAs(userId: string, path: string, init?: RequestInit) {
  authenticateAs(userId);
  return app.request(path, init);
}

export async function requestAsGuest(path: string, init?: RequestInit) {
  authenticateAsGuest();
  return app.request(path, init);
}
