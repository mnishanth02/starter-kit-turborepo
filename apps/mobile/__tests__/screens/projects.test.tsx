import { render, screen, waitFor } from '@testing-library/react-native';
import { useAuth } from '@clerk/clerk-expo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import * as projectsLib from '@/lib/projects';

// We import the screen component — it uses useAuth and useQuery internally
import ProjectsTab from '@/app/(protected)/(tabs)/projects';

// Mock project data
const mockProjects: projectsLib.Project[] = [
  {
    id: 'p1',
    userId: 'user_test123',
    name: 'Alpha Project',
    description: 'First project',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'p2',
    userId: 'user_test123',
    name: 'Beta Project',
    description: null,
    status: 'archived',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
  },
];

jest.mock('@/lib/projects', () => ({
  ...jest.requireActual('@/lib/projects'),
  listProjects: jest.fn(),
  deleteProject: jest.fn(),
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => createTestQueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('ProjectsTab', () => {
  const mockUseAuth = useAuth as jest.Mock;
  const mockListProjects = projectsLib.listProjects as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      isLoaded: true,
      getToken: jest.fn().mockResolvedValue('mock-token'),
    });
  });

  it('shows loading state initially', () => {
    mockListProjects.mockReturnValue(new Promise(() => {})); // never resolves

    render(<ProjectsTab />, { wrapper: Wrapper });

    expect(screen.getByText('Loading projects…')).toBeTruthy();
  });

  it('renders project list with data', async () => {
    mockListProjects.mockResolvedValue({ data: mockProjects });

    render(<ProjectsTab />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Alpha Project')).toBeTruthy();
    });

    expect(screen.getByText('Beta Project')).toBeTruthy();
    expect(screen.getByText('First project')).toBeTruthy();
    expect(screen.getByText('No description yet.')).toBeTruthy();
  });

  it('shows empty state when no projects exist', async () => {
    mockListProjects.mockResolvedValue({ data: [] });

    render(<ProjectsTab />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('No projects yet')).toBeTruthy();
    });
  });

  it('renders hero section with create button', () => {
    mockListProjects.mockReturnValue(new Promise(() => {}));

    render(<ProjectsTab />, { wrapper: Wrapper });

    expect(screen.getByText('Projects')).toBeTruthy();
    expect(screen.getByText('Create project')).toBeTruthy();
  });
});
