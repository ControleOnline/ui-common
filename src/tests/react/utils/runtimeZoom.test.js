const assert = require('node:assert/strict')
const {test} = require('node:test')

const {
  buildRuntimeZoomStyle,
  normalizeRuntimeZoomPercent,
  resolveRuntimeZoomScale,
} = require('../../../react/utils/runtimeZoom')

test('uses percentage values as the global zoom contract', () => {
  assert.equal(normalizeRuntimeZoomPercent(70), 70)
  assert.equal(resolveRuntimeZoomScale(70), 0.7)
})

test('clamps unsafe zoom percentages', () => {
  assert.equal(normalizeRuntimeZoomPercent(10), 50)
  assert.equal(normalizeRuntimeZoomPercent(200), 150)
})

test('builds compensated container dimensions for scaled content', () => {
  assert.deepEqual(
    buildRuntimeZoomStyle(70, {isWeb: true}),
    {
      height: '142.85714285714286%',
      transform: [{scale: 0.7}],
      transformOrigin: 'top left',
      width: '142.85714285714286%',
    },
  )
})
