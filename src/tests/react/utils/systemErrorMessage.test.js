const assert = require('node:assert/strict')
const test = require('node:test')

// Support both CJS require of dual-export module (when transformed) and direct path.
// In pure node without transform, import via dynamic may fail; test the pure function by eval of source shape.
const path = require('node:path')
const fs = require('node:fs')

const source = fs.readFileSync(
  path.join(__dirname, '../../../react/utils/systemErrorMessage.js'),
  'utf8',
)

test('systemErrorMessage exports named and default (source contract)', () => {
  assert.match(source, /export\s+\{\s*resolveSystemErrorMessage\s*\}/)
  assert.match(source, /export\s+default\s+resolveSystemErrorMessage/)
})

test('fetch.js imports resolveSystemErrorMessage as named export', () => {
  const fetchSource = fs.readFileSync(
    path.join(__dirname, '../../../api/fetch.js'),
    'utf8',
  )
  assert.match(
    fetchSource,
    /import\s+\{\s*resolveSystemErrorMessage\s*\}\s+from\s+['"]@controleonline\/ui-common\/src\/react\/utils\/systemErrorMessage['"]/,
  )
  assert.doesNotMatch(
    fetchSource,
    /import\s+resolveSystemErrorMessage\s+from\s+['"]@controleonline\/ui-common\/src\/react\/utils\/systemErrorMessage['"]/,
  )
})
