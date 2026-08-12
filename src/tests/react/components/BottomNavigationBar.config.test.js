import {
  resolveBottomNavigationItems,
  BOTTOM_NAVIGATION_PRESETS,
} from '../../../react/components/BottomNavigationBar.config';

describe('BottomNavigationBar.config', () => {
  it('uses Portuguese fallbacks when translate is missing', () => {
    const items = resolveBottomNavigationItems(
      BOTTOM_NAVIGATION_PRESETS.crmToolbar.items,
      null,
    );
    const labels = items.map(i => i.label);
    expect(labels).toContain('Início');
    expect(labels).toContain('Clientes');
    expect(labels).toContain('Perfil');
    expect(labels).not.toContain('Home');
    expect(labels).not.toContain('Clients');
    expect(labels).not.toContain('Profile');
  });
});
