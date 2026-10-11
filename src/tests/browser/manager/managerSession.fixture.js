// Match the authenticated session contract used by the application shell.
const installManagerSession = async page => {
  await page.addInitScript(() => {
    localStorage.setItem('session', JSON.stringify({
      id: 7,
      people: '/people/7',
      api_key: 'test-api-key',
      active: 1,
      mycompany: 3,
      roles: ['ROLE_SUPER'],
      name: 'Test User',
      realname: 'Test User',
      username: 'tester',
    }));
    localStorage.setItem('app-type', 'MANAGER');
    localStorage.setItem('translates', JSON.stringify({
      'pt-br': {companies: {3: {configs: {
        device_label: {currentDevice: 'Este dispositivo'},
        device_action: {
          copyConfigHint: 'Escolha o device origem. As configurações serão aplicadas em',
          copyConfigIdentityHint: 'identidade do destino não muda',
        },
      }}}},
    }));
  });
};

module.exports = {installManagerSession};
