import { render, screen } from '@testing-library/react'
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from './authContext.js'
import ProtectedRoute from './ProtectedRoute.jsx'

vi.mock('./authContext.js', () => ({
  useAuth: vi.fn(),
}))

function LoginProbe() {
  const location = useLocation()

  return (
    <div>
      <p>Login page</p>
      <output data-testid="return-path">{location.state?.from ?? ''}</output>
    </div>
  )
}

function renderPrivateRoute() {
  return render(
    <MemoryRouter initialEntries={['/private?tab=1#item']}>
      <Routes>
        <Route
          path="/private"
          element={
            <ProtectedRoute>
              <p>Private app</p>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('ProtectedRoute', () => {
  it('waits for the initial session check before rendering or redirecting', () => {
    useAuth.mockReturnValue({
      user: null,
      isAuthLoading: true,
    })

    renderPrivateRoute()

    expect(screen.getByRole('status').textContent).toContain(
      'Checking your session',
    )
    expect(screen.queryByText('Private app')).toBeNull()
    expect(screen.queryByText('Login page')).toBeNull()
  })

  it('redirects signed-out users and preserves the complete internal path', () => {
    useAuth.mockReturnValue({
      user: null,
      isAuthLoading: false,
    })

    renderPrivateRoute()

    expect(screen.getByText('Login page')).toBeTruthy()
    expect(screen.getByTestId('return-path').textContent).toBe(
      '/private?tab=1#item',
    )
  })

  it('renders protected content for a signed-in user', () => {
    useAuth.mockReturnValue({
      user: { uid: 'user-1' },
      isAuthLoading: false,
    })

    renderPrivateRoute()

    expect(screen.getByText('Private app')).toBeTruthy()
    expect(screen.queryByText('Login page')).toBeNull()
  })
})
