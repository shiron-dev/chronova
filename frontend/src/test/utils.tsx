import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'

/** リトライ・キャッシュ共有を無効にしたテスト用QueryClient */
export function makeTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { retry: false },
    },
  })
}

export function Providers({
  children,
  client,
  initialEntries = ['/tasks'],
}: {
  children: ReactNode
  client?: QueryClient
  initialEntries?: string[]
}) {
  const qc = client ?? makeTestQueryClient()
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

export function renderWithProviders(
  ui: ReactElement,
  opts: { client?: QueryClient; initialEntries?: string[] } = {},
) {
  const client = opts.client ?? makeTestQueryClient()
  return {
    client,
    ...render(
      <Providers client={client} initialEntries={opts.initialEntries}>
        {ui}
      </Providers>,
    ),
  }
}
