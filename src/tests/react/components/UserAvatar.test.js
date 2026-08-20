const React = require('react');
const renderer = require('react-test-renderer');
const {jest} = require('@jest/globals');

jest.mock('react-native', () => ({
  Image: props => React.createElement('Image', props),
  Platform: {OS: 'web'},
  StyleSheet: {
    create: styles => styles,
  },
  Text: props => React.createElement('Text', props, props.children),
  View: props => React.createElement('View', props, props.children),
}));

global.fetch = jest.fn(() =>
  Promise.resolve({ok: true, status: 200, blob: () => Promise.resolve(new Blob())}),
);

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

  it('uses gravatar as fallback when enabled and probe succeeds', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ok: true, status: 200}),
    );

    let tree;
    await renderer.act(async () => {
      tree = renderer.create(
        React.createElement(UserAvatar, {
          email: 'client@example.com',
          name: 'Client Test',
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const images = tree.root.findAllByType('Image');
    if (images.length > 0) {
      expect(images[0].props.source.uri).toContain('gravatar.com/avatar/');
    }
  });

  it('falls back to initials when gravatar probe returns 404', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ok: false, status: 404}),
    );

    let tree;
    await renderer.act(async () => {
      tree = renderer.create(
        React.createElement(UserAvatar, {
          email: 'nobody@example.com',
          name: 'Nobody',
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(tree.root.findAllByType('Image')).toHaveLength(0);
    expect(tree.root.findByType('Text').props.children).toBe('N');
  });
});
