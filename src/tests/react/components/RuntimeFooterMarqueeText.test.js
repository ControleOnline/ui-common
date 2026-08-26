const assert = require('node:assert/strict');
const {test, before, after, describe} = require('node:test');
const Module = require('module');
const path = require('path');
const React = require('react');

const originalLoad = Module._load;
let lastLoopConfig = null;
let animationStarts = 0;

before(() => {
  Module._load = function mockLoad(request, parent, isMain) {
    if (request === 'react-native') {
      function AnimatedValue(v) {
        this._value = v;
      }
      AnimatedValue.prototype.setValue = function (v) {
        this._value = v;
      };
      AnimatedValue.prototype.stopAnimation = function () {};

      const timing = (value, config) => ({
        _type: 'timing',
        value,
        config,
        start: cb => {
          animationStarts += 1;
          if (typeof cb === 'function') cb({finished: true});
        },
        stop: () => {},
      });

      return {
        Animated: {
          Value: AnimatedValue,
          View: props =>
            React.createElement('AnimatedView', props, props.children),
          Text: props =>
            React.createElement('AnimatedText', props, props.children),
          timing,
          sequence: items => ({
            _type: 'sequence',
            items,
            start: cb => {
              animationStarts += 1;
              if (typeof cb === 'function') cb({finished: true});
            },
            stop: () => {},
          }),
          loop: anim => {
            lastLoopConfig = anim;
            return {
              _type: 'loop',
              anim,
              start: cb => {
                animationStarts += 1;
                if (typeof cb === 'function') cb({finished: true});
              },
              stop: () => {},
            };
          },
          delay: ms => ({_type: 'delay', ms, start: () => {}, stop: () => {}}),
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

const loadComponent = () => {
  const componentPath = path.resolve(
    __dirname,
    '../../../react/components/RuntimeFooterMarqueeText.js',
  );
  delete require.cache[componentPath];
  return require(componentPath);
};

test('RuntimeFooterMarqueeText exports a React component', () => {
  const mod = loadComponent();
  assert.equal(typeof mod, 'function');
  assert.equal(typeof mod.default, 'function');
});

test('short text stays single-line without duplicate marquee copy', async () => {
  const RuntimeFooterMarqueeText = loadComponent();
  const renderer = require('react-test-renderer');

  animationStarts = 0;
  lastLoopConfig = null;

  let tree;
  renderer.act(() => {
    tree = renderer.create(
      React.createElement(RuntimeFooterMarqueeText, {
        text: 'v1.2.3 • PDV',
        color: '#111',
        style: {fontSize: 10},
      }),
    );
  });

  const root = tree.root.findByProps({testID: 'runtime-footer-marquee-text'});
  renderer.act(() => {
    root.props.onLayout({nativeEvent: {layout: {width: 400, height: 12}}});
  });

  const textNodes = tree.root.findAllByType('Text');
  assert.equal(textNodes.length, 1);
  assert.equal(textNodes[0].props.numberOfLines, 1);
  assert.equal(textNodes[0].props.children, 'v1.2.3 • PDV');

  renderer.act(() => {
    textNodes[0].props.onLayout({
      nativeEvent: {layout: {width: 80, height: 12}},
    });
  });

  // Still short: content 80 < container 400 → no duplicate
  assert.equal(tree.root.findAllByType('Text').length, 1);
  assert.equal(lastLoopConfig, null);
});

test('long text enables marquee duplicate and starts loop animation', async () => {
  const RuntimeFooterMarqueeText = loadComponent();
  const renderer = require('react-test-renderer');

  animationStarts = 0;
  lastLoopConfig = null;

  const longText =
    'Mensagem muito longa do rodape runtime para validar deslizamento horizontal continuo no Manager e PDV';

  let tree;
  renderer.act(() => {
    tree = renderer.create(
      React.createElement(RuntimeFooterMarqueeText, {
        text: longText,
        color: '#222',
        style: {fontSize: 10},
      }),
    );
  });

  const root = tree.root.findByProps({testID: 'runtime-footer-marquee-text'});
  renderer.act(() => {
    root.props.onLayout({nativeEvent: {layout: {width: 120, height: 12}}});
  });

  const firstText = tree.root.findAllByType('Text')[0];
  renderer.act(() => {
    firstText.props.onLayout({
      nativeEvent: {layout: {width: 480, height: 12}},
    });
  });

  const texts = tree.root.findAllByType('Text');
  assert.equal(texts.length, 2, 'duplicate copy for seamless loop');
  assert.equal(texts[0].props.children, longText);
  assert.equal(texts[1].props.children, longText);
  assert.equal(texts[0].props.numberOfLines, 1);
  assert.ok(lastLoopConfig, 'Animated.loop should start when overflowing');
  assert.ok(animationStarts >= 1);
});
