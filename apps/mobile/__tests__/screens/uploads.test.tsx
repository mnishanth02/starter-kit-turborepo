import { render, screen, waitFor } from '@testing-library/react-native';
import { useAuth } from '@clerk/clerk-expo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import * as uploadsLib from '@/lib/uploads';

import UploadsTab from '@/app/(protected)/(tabs)/uploads';

jest.mock('@/lib/uploads', () => ({
  ...jest.requireActual('@/lib/uploads'),
  listUploads: jest.fn(),
  createUploadSession: jest.fn(),
  confirmUpload: jest.fn(),
  deleteUpload: jest.fn(),
}));

const mockUploads: uploadsLib.UploadRecord[] = [
  {
    id: 'u1',
    objectKey: 'abc/file.pdf',
    filename: 'report.pdf',
    contentType: 'application/pdf',
    sizeBytes: 1_048_576,
    status: 'complete',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

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

describe('UploadsTab', () => {
  const mockUseAuth = useAuth as jest.Mock;
  const mockListUploads = uploadsLib.listUploads as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      isLoaded: true,
      getToken: jest.fn().mockResolvedValue('mock-token'),
    });
  });

  it('shows loading state initially', () => {
    mockListUploads.mockReturnValue(new Promise(() => {}));

    render(<UploadsTab />, { wrapper: Wrapper });

    expect(screen.getByText('Loading uploads…')).toBeTruthy();
  });

  it('renders upload list with data', async () => {
    mockListUploads.mockResolvedValue({ data: mockUploads });

    render(<UploadsTab />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('report.pdf')).toBeTruthy();
    });

    expect(screen.getByText(/application\/pdf/)).toBeTruthy();
  });

  it('shows empty state when no uploads exist', async () => {
    mockListUploads.mockResolvedValue({ data: [] });

    render(<UploadsTab />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('No uploads yet')).toBeTruthy();
    });
  });

  it('renders hero section with Choose file button', () => {
    mockListUploads.mockReturnValue(new Promise(() => {}));

    render(<UploadsTab />, { wrapper: Wrapper });

    expect(screen.getByText('Uploads')).toBeTruthy();
    expect(screen.getByText('Choose file')).toBeTruthy();
  });
});
