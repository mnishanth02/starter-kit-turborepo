// ---------------------------------------------------------------------------
// Clerk mocks
// ---------------------------------------------------------------------------
jest.mock('@clerk/clerk-expo', () => {
  const React = require('react');

  const mockUseAuth = jest.fn(() => ({
    isSignedIn: true,
    isLoaded: true,
    getToken: jest.fn().mockResolvedValue('mock-token'),
    signOut: jest.fn().mockResolvedValue(undefined),
  }));

  const mockUseUser = jest.fn(() => ({
    isSignedIn: true,
    isLoaded: true,
    user: {
      id: 'user_test123',
      firstName: 'Test',
      lastName: 'User',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
    },
  }));

  const mockUseSignIn = jest.fn(() => ({
    signIn: { create: jest.fn() },
    setActive: jest.fn(),
    isLoaded: true,
  }));

  const mockUseSignUp = jest.fn(() => ({
    signUp: { create: jest.fn() },
    setActive: jest.fn(),
    isLoaded: true,
  }));

  return {
    useAuth: mockUseAuth,
    useUser: mockUseUser,
    useSignIn: mockUseSignIn,
    useSignUp: mockUseSignUp,
    isClerkAPIResponseError: jest.fn(() => false),
    ClerkProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    ClerkLoaded: ({ children }) => React.createElement(React.Fragment, null, children),
  };
});

// ---------------------------------------------------------------------------
// Expo SecureStore mock
// ---------------------------------------------------------------------------
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Expo Router mock
// ---------------------------------------------------------------------------
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: jest.fn(() => false),
    })),
    useSegments: jest.fn(() => []),
    useLocalSearchParams: jest.fn(() => ({})),
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    },
    Link: ({ children, ...props }) =>
      React.createElement('Text', props, children),
    Redirect: ({ href }) =>
      React.createElement('Text', { testID: 'redirect' }, `Redirect to ${href}`),
    Slot: ({ children }) =>
      React.createElement(React.Fragment, null, children),
    Stack: Object.assign(
      ({ children }) => React.createElement(React.Fragment, null, children),
      { Screen: () => null },
    ),
    Tabs: Object.assign(
      ({ children }) => React.createElement(React.Fragment, null, children),
      { Screen: () => null },
    ),
  };
});

// ---------------------------------------------------------------------------
// Expo DocumentPicker mock
// ---------------------------------------------------------------------------
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));

// ---------------------------------------------------------------------------
// Reanimated mock
// ---------------------------------------------------------------------------
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

// ---------------------------------------------------------------------------
// Env mock — provides test values so screens can render
// ---------------------------------------------------------------------------
jest.mock('@/lib/env', () => ({
  getClerkEnv: () => ({
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_mock-key',
  }),
  getApiEnv: () => ({
    EXPO_PUBLIC_API_BASE_URL: 'http://localhost:3000',
  }),
  getEnv: () => ({
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_mock-key',
    EXPO_PUBLIC_API_BASE_URL: 'http://localhost:3000',
  }),
}));

// ---------------------------------------------------------------------------
// Expo Haptics mock
// ---------------------------------------------------------------------------
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// ---------------------------------------------------------------------------
// IconSymbol stub
// ---------------------------------------------------------------------------
jest.mock('@/components/ui/icon-symbol', () => {
  const React = require('react');
  return {
    IconSymbol: ({ name, ...props }) =>
      React.createElement('Text', { ...props, testID: `icon-${name}` }, name),
  };
});
