// The domain palette owns branding. Franchise selection must not change it.
export const resolveDomainThemeColors = (baseThemeColors = {}, mainCompany = {}) => ({
  ...(mainCompany?.theme?.colors || {}),
  ...(baseThemeColors || {}),
});
