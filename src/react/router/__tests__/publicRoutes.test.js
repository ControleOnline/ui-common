import {isPublicRoute, PUBLIC_ROUTES} from '../publicRoutes'

describe('publicRoutes', () => {
  it('treats MCP OAuth consent as public (ManagerLayout gate)', () => {
    expect(PUBLIC_ROUTES.has('McpOAuthConsentPage')).toBe(true)
    expect(isPublicRoute('McpOAuthConsentPage')).toBe(true)
  })

  it('keeps SignIn public', () => {
    expect(isPublicRoute('SignInPage')).toBe(true)
  })
})
