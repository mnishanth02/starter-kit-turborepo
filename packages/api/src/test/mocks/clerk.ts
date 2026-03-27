import { vi } from 'vitest';

type MockAuthState = {
  userId: string | null;
  redirectTo: string | null;
  headers: Record<string, string>;
};

export type MockClerkUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  primaryEmailAddress: {
    emailAddress: string;
  } | null;
};

const DEFAULT_USER_ID = 'user_test_1';

function createUser(userId: string): MockClerkUser {
  return {
    id: userId,
    firstName: 'Test',
    lastName: 'User',
    imageUrl: `https://example.com/${userId}.png`,
    primaryEmailAddress: {
      emailAddress: `${userId}@example.com`,
    },
  };
}

const users = new Map<string, MockClerkUser>([
  [DEFAULT_USER_ID, createUser(DEFAULT_USER_ID)],
  ['user_test_2', createUser('user_test_2')],
]);

const authState: MockAuthState = {
  userId: null,
  redirectTo: '/sign-in',
  headers: {},
};

export const authenticateRequestMock = vi.fn(async () => ({
  headers: new Headers(authState.headers),
  toAuth: () => ({
    userId: authState.userId,
  }),
}));

export const getUserMock = vi.fn(async (userId: string) => {
  const user = users.get(userId);
  if (!user) {
    const error = new Error(`Mock Clerk user ${userId} not found`) as Error & { status: number };
    error.status = 404;
    throw error;
  }
  return user;
});

export const verifyTokenMock = vi.fn(async (token: string) => ({
  sub: token.replace('token_', ''),
}));

export function setClerkAuth(nextAuthState: Partial<MockAuthState>): void {
  if ('userId' in nextAuthState) {
    authState.userId = nextAuthState.userId ?? null;
  }

  if ('redirectTo' in nextAuthState) {
    authState.redirectTo = nextAuthState.redirectTo ?? null;
  }

  if ('headers' in nextAuthState) {
    authState.headers = nextAuthState.headers ?? {};
  }
}

export function setClerkUser(user: MockClerkUser): void {
  users.set(user.id, user);
}

export function resetClerkMock(): void {
  authState.userId = null;
  authState.redirectTo = '/sign-in';
  authState.headers = {};

  users.clear();
  users.set(DEFAULT_USER_ID, createUser(DEFAULT_USER_ID));
  users.set('user_test_2', createUser('user_test_2'));

  authenticateRequestMock.mockClear();
  getUserMock.mockClear();
  verifyTokenMock.mockClear();
}

export function createClerkBackendMock() {
  return {
    createClerkClient: vi.fn(() => ({
      authenticateRequest: authenticateRequestMock,
      users: {
        getUser: getUserMock,
      },
    })),
    verifyToken: verifyTokenMock,
  };
}
