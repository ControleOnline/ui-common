const React = require('react');
const renderer = require('react-test-renderer');

jest.mock('react-native', () => {
  const mockReact = require('react');

  return {
    Image: props => mockReact.createElement('Image', props),
    Platform: {OS: 'web'},
    StyleSheet: {
      create: styles => styles,
    },
    Text: props => mockReact.createElement('Text', props, props.children),
    View: props => mockReact.createElement('View', props, props.children),
  };
});

const UserAvatar = require('../../../react/components/UserAvatar').default;

const {describe, expect, it} = global;

describe('UserAvatar', () => {
  it('renders initials without requesting gravatar by default', () => {
    let tree;

    renderer.act(() => {
      tree = renderer.create(
        React.createElement(UserAvatar, {
          email: 'client@example.com',
          name: 'Client Test',
        }),
      );
    });

    expect(tree.root.findAllByType('Image')).toHaveLength(0);
    expect(tree.root.findByType('Text').props.children).toBe('CT');
  });

  it('uses gravatar as fallback only when enabled', () => {
    let tree;

    renderer.act(() => {
      tree = renderer.create(
        React.createElement(UserAvatar, {
          email: 'client@example.com',
          name: 'Client Test',
          useGravatar: true,
        }),
      );
    });

    const image = tree.root.findByType('Image');

    expect(image.props.source.uri).toContain('gravatar.com/avatar/');
  });

  it('does not render a protected download url after authenticated fetch fails', async () => {
    const originalFetch = global.fetch;
    const originalLocalStorage = global.localStorage;
    const originalLocation = global.location;

    global.fetch = jest.fn(() => Promise.resolve({ok: false}));
    global.localStorage = {
      getItem: () => JSON.stringify({api_key: 'session-token'}),
    };
    global.location = {host: 'manager.controleonline.com'};

    let tree;

    await renderer.act(async () => {
      tree = renderer.create(
        React.createElement(UserAvatar, {
          imageUrl: 'https://api.controleonline.com/files/9/download',
          email: 'client@example.com',
          name: 'Client Test',
        }),
      );
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.controleonline.com/files/9/download',
      expect.objectContaining({
        headers: expect.objectContaining({
          'API-TOKEN': 'session-token',
          'App-Domain': 'manager.controleonline.com',
        }),
      }),
    );
    expect(tree.root.findAllByType('Image')).toHaveLength(0);
    expect(tree.root.findByType('Text').props.children).toBe('CT');

    global.fetch = originalFetch;
    global.localStorage = originalLocalStorage;
    global.location = originalLocation;
  });
});
