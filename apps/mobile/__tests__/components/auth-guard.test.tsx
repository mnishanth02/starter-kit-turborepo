import { render, screen } from '@testing-library/react-native';
import { useAuth } from '@clerk/clerk-expo';

import ProtectedLayout from '@/app/(protected)/_layout';

describe('Protected Layout (auth guard)', () => {
  const mockUseAuth = useAuth as jest.Mock;

  afterEach(() => jest.restoreAllMocks());

  it('redirects to sign-in when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, isLoaded: true });

    render(<ProtectedLayout />);

    expect(screen.getByTestId('redirect')).toBeTruthy();
    expect(screen.getByText(/sign-in/i)).toBeTruthy();
  });

  it('renders nothing while auth is loading', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, isLoaded: false });

    const { toJSON } = render(<ProtectedLayout />);

    expect(toJSON()).toBeNull();
  });

  it('renders the stack when user is authenticated', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true, isLoaded: true });

    // Should not throw and should not show redirect
    render(<ProtectedLayout />);

    expect(screen.queryByTestId('redirect')).toBeNull();
  });
});
