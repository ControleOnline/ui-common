const assert = require('node:assert/strict');
const {test, before, after, describe} = require('node:test');
const Module = require('module');
const path = require('path');
const React = require('react');

const originalLoad = Module._load;
let lastLoopConfig = null;
let animationStarts = 0;
let mockPlatformOS = 'android';

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
        Easing: {linear: 'linear'},
        Platform: {OS: mockPlatformOS},
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

test('native text keeps intrinsic width even when style carries flex: 1 (android #77)', () => {
  const RuntimeFooterMarqueeText = loadComponent();
  const renderer = require('react-test-renderer');

  let tree;
  renderer.act(() => {
    tree = renderer.create(
      React.createElement(RuntimeFooterMarqueeText, {
        text: 'Samsung • DEVICE / v1.10.55',
        color: '#111',
        style: {flex: 1, minWidth: 0, fontSize: 11},
      }),
    );
  });

  const text = tree.root.findAllByType('Text')[0];
  const flat = Object.assign({}, ...[].concat(text.props.style));
  // Yoga gives `flex` precedence: it must not stay at the inherited 1 (width 0 on Android).
  assert.equal(flat.flex, 0);
  assert.equal(flat.flexBasis, 'auto');
  assert.equal(flat.flexGrow, 0);
  assert.equal(flat.flexShrink, 0);
});

const TICKER_TEXT =
  'www.controleonline.com \u2022 (11) 5555-5159 (Comercial)  \u2022  web \u2022 MANAGER (179.125.133.217) / v1.10.236';

const renderTicker = ({containerWidth, contentWidth, text = TICKER_TEXT}) => {
  const RuntimeFooterMarqueeText = loadComponent();
  const renderer = require('react-test-renderer');

  animationStarts = 0;
  lastLoopConfig = null;

  let tree;
  renderer.act(() => {
    tree = renderer.create(
      React.createElement(RuntimeFooterMarqueeText, {
        text,
        color: '#111',
        continuous: true,
        style: {fontSize: 10},
      }),
    );
  });

  if (containerWidth) {
    const root = tree.root.findByProps({testID: 'runtime-footer-marquee-text'});
    renderer.act(() => {
      root.props.onLayout({
        nativeEvent: {layout: {width: containerWidth, height: 12}},
      });
    });
  }
  if (contentWidth) {
    const firstText = tree.root.findAllByType('Text')[0];
    renderer.act(() => {
      firstText.props.onLayout({
        nativeEvent: {layout: {width: contentWidth, height: 12}},
      });
    });
  }
  return tree;
};

describe('continuous ticker (right to left, loop)', () => {
  test('native: scrolls even when the text fits, right to left, linear, no hold', () => {
    mockPlatformOS = 'android';
    // content (200) fits inside the container (800): a ticker must still scroll.
    const tree = renderTicker({containerWidth: 800, contentWidth: 200});

    assert.ok(lastLoopConfig, 'Animated.loop should start for a ticker');
    const [hold, move, reset] = lastLoopConfig.items;
    assert.equal(hold.ms, 0, 'ticker has no hold before moving');
    assert.equal(move.config.toValue, -(200 + 32), 'moves left by one text cycle');
    assert.equal(move.config.easing, 'linear');
    assert.ok(move.config.toValue < 0, 'right to left');
    assert.equal(reset.config.duration, 0, 'instant reset = seamless loop');

    // The row must be wider than the container, otherwise native Text is
    // measured with the container width as maximum and the text is truncated.
    const row = tree.root.findByProps({testID: 'runtime-footer-ticker-row'});
    const rowStyle = Object.assign({}, ...[].concat(row.props.style));
    assert.ok(rowStyle.width >= 10000, 'ticker row must not be as narrow as the container');
    assert.equal(rowStyle.flexWrap, 'nowrap');

    // enough copies to always fill the width: ceil(800 / 232) + 1 = 5
    const texts = tree.root.findAllByType('Text');
    assert.equal(texts.length, 5);
    texts.forEach(node => assert.equal(node.props.children, TICKER_TEXT));
  });

  test('native: speed is constant (duration proportional to the distance)', () => {
    mockPlatformOS = 'android';
    renderTicker({containerWidth: 800, contentWidth: 200});
    const shortDuration = lastLoopConfig.items[1].config.duration;
    renderTicker({containerWidth: 800, contentWidth: 1000});
    const longDuration = lastLoopConfig.items[1].config.duration;

    assert.ok(shortDuration >= 3000);
    assert.ok(longDuration > shortDuration);
    assert.equal(Math.round(longDuration / (1000 + 32)), 20);
  });

  test('native: before measuring there is a single copy and no animation', () => {
    mockPlatformOS = 'android';
    const tree = renderTicker({});
    assert.equal(tree.root.findAllByType('Text').length, 1);
    assert.equal(lastLoopConfig, null);
  });

  test('native: a long text still scrolls with at least two copies', () => {
    mockPlatformOS = 'android';
    const tree = renderTicker({containerWidth: 300, contentWidth: 1500});
    assert.equal(tree.root.findAllByType('Text').length, 2);
    assert.equal(lastLoopConfig.items[1].config.toValue, -(1500 + 32));
  });

  test('web: uses CSS keyframes (right to left, infinite, linear), not Animated', () => {
    mockPlatformOS = 'web';
    const tree = renderTicker({containerWidth: 800, contentWidth: 200});

    assert.equal(lastLoopConfig, null, 'web must not use Animated.loop');
    const row = tree.root.findByProps({testID: 'runtime-footer-ticker-row'});
    const style = Object.assign({}, ...[].concat(row.props.style));
    assert.equal(style.animationIterationCount, 'infinite');
    assert.equal(style.animationTimingFunction, 'linear');
    assert.match(style.animationDuration, /^\d+ms$/);
    const [keyframes] = style.animationKeyframes;
    assert.equal(keyframes['0%'].transform[0].translateX, 0);
    assert.equal(keyframes['100%'].transform[0].translateX, -(200 + 32));
    assert.equal(tree.root.findAllByType('Text').length, 5);
    mockPlatformOS = 'android';
  });

  test('without the continuous prop the previous behaviour is kept', () => {
    mockPlatformOS = 'android';
    const RuntimeFooterMarqueeText = loadComponent();
    const renderer = require('react-test-renderer');
    animationStarts = 0;
    lastLoopConfig = null;
    let tree;
    renderer.act(() => {
      tree = renderer.create(
        React.createElement(RuntimeFooterMarqueeText, {text: 'short', color: '#111'}),
      );
    });
    const root = tree.root.findByProps({testID: 'runtime-footer-marquee-text'});
    renderer.act(() => {
      root.props.onLayout({nativeEvent: {layout: {width: 400, height: 12}}});
    });
    renderer.act(() => {
      tree.root.findAllByType('Text')[0].props.onLayout({
        nativeEvent: {layout: {width: 40, height: 12}},
      });
    });
    assert.equal(lastLoopConfig, null);
    assert.equal(tree.root.findAllByType('Text').length, 1);
  });
});
