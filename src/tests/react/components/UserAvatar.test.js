const React = require('react');
const renderer = require('react-test-renderer');
const {jest} = require('@jest/globals');

jest.mock('react-native', () => ({
  Image: props => React.createElement('Image', props),
  Platform: {OS: 'ios'},
  StyleSheet: {
    create: styles => styles,
  },
  Text: props => React.createElement('Text', props, props.children),
  View: props => React.createElement('View', props, props.children),
}));

jest.mock('@env', () => ({env: {API_ENTRYPOINT: 'https://api.controleonline.com', DOMAIN: 'manager.controleonline.com'}}));

const UserAvatar = require('../../../react/components/UserAvatar').default;

const {describe, expect, it} = global;

describe('UserAvatar', () => {
  it('renders initials without requesting gravatar when disabled', () => {
    let tree;

    renderer.act(() => {
      tree = renderer.create(
        React.createElement(UserAvatar, {
          email: 'client@example.com',
          name: 'Client Test',
          useGravatar: false,
        }),
      );
    });

    expect(tree.root.findAllByType('Image')).toHaveLength(0);
    expect(tree.root.findByType('Text').props.children).toBe('CT');
  });

  it('uses gravatar as fallback when enabled (native path)', async () => {
    let tree;

    await renderer.act(async () => {
      tree = renderer.create(
        React.createElement(UserAvatar, {
          email: 'client@example.com',
          name: 'Client Test',
        }),
      );
      // flush useEffect
      await Promise.resolve();
    });

    const image = tree.root.findByType('Image');

    expect(image.props.source.uri).toContain('gravatar.com/avatar/');
    expect(image.props.source.uri).toContain('d=404');
  });
});


describe('avatar credential boundary', () => {
  it('does not authenticate an external download-shaped image on web', async () => {
    const {Platform} = require('react-native');
    const previousStorage = global.localStorage;
    const previousFetch = global.fetch;
    Platform.OS = 'web';
    global.localStorage = {getItem: () => JSON.stringify({token: 'session-secret'})};
    global.fetch = jest.fn();
    let tree;
    try {
      await renderer.act(async () => { tree = renderer.create(React.createElement(UserAvatar, {imageUrl: 'https://images.example.test/files/1/download', useGravatar: false})); });
      expect(global.fetch).not.toHaveBeenCalled();
      expect(tree.root.findByType('Image').props.source.uri).toBe('https://images.example.test/files/1/download');
    } finally {
      if (tree) await renderer.act(async () => tree.unmount());
      Platform.OS = 'ios'; global.localStorage = previousStorage; global.fetch = previousFetch;
    }
  });
  it('removes session headers from external native avatars', async () => {
    let tree;
    try {
      await renderer.act(async () => { tree = renderer.create(React.createElement(UserAvatar, {imageUrl: 'https://images.example.test/avatar.png', imageHeaders: {'API-TOKEN': 'session-secret', Accept: 'image/*'}, useGravatar: false})); });
      expect(tree.root.findByType('Image').props.source.headers).toEqual({Accept: 'image/*'});
    } finally { if (tree) await renderer.act(async () => tree.unmount()); }
  });
});
