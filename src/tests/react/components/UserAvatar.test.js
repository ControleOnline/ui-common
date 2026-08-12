const React = require('react');
const renderer = require('react-test-renderer');
const {jest} = require('@jest/globals');

jest.mock('react-native', () => ({
  Image: props => React.createElement('Image', props),
  StyleSheet: {
    create: styles => styles,
  },
  Text: props => React.createElement('Text', props, props.children),
  View: props => React.createElement('View', props, props.children),
}));

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

  it('uses gravatar as fallback when enabled', () => {
    let tree;

    renderer.act(() => {
      tree = renderer.create(
        React.createElement(UserAvatar, {
          email: 'client@example.com',
          name: 'Client Test',
        }),
      );
    });

    const image = tree.root.findByType('Image');

    expect(image.props.source.uri).toContain('gravatar.com/avatar/');
  });
});
