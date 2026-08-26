const assert = require('node:assert/strict');
const {test, before, after} = require('node:test');
const Module = require('module');
const path = require('path');

const originalLoad = Module._load;

before(() => {
  Module._load = function mockLoad(request, parent, isMain) {
    if (request === 'react-native') {
      const React = require('react');
      function AnimatedValue(v) {
        this._value = v;
      }
      AnimatedValue.prototype.setValue = function (v) {
        this._value = v;
      };
      AnimatedValue.prototype.stopAnimation = function () {};
      const timing = () => ({
        start: cb => {
          if (typeof cb === 'function') cb({finished: true});
        },
        stop: () => {},
      });
      return {
        Animated: {
          Value: AnimatedValue,
          View: props => React.createElement('AnimatedView', props, props.children),
          Text: props => React.createElement('AnimatedText', props, props.children),
          timing,
          sequence: () => timing(),
          loop: anim => anim,
          delay: () => timing(),
        },
        Text: props => React.createElement('Text', props, props.children),
        View: props => React.createElement('View', props, props.children),
        StyleSheet: {create: styles => styles},
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
});

after(() => {
  Module._load = originalLoad;
});

test('RuntimeFooterMarqueeText exports a React component', () => {
  const componentPath = path.resolve(
    __dirname,
    '../../../react/components/RuntimeFooterMarqueeText.js',
  );
  delete require.cache[componentPath];
  const mod = require(componentPath);
  assert.equal(typeof mod, 'function');
  assert.equal(typeof mod.default, 'function');
});
