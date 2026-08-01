/* global jest */
jest.mock('@controleonline/ui-default/src/store/default/actions', () => ({}))
jest.mock('@controleonline/ui-default/src/store/default/getters', () => ({}))
jest.mock('@controleonline/ui-default/src/store/default/mutations', () => ({
  __esModule: true,
  default: {},
}))

const categoriesStore = require('../../../store/categories').default

const {describe, expect, it} = global

describe('categories store ordering', () => {
  it('exposes the canonical order as the editable default table sort', () => {
    const column = categoriesStore.state.columns.find(item => item.name === 'sortOrder')

    expect(column).toMatchObject({
      defaultSort: 'ASC',
      editable: true,
      inputType: 'number',
      sortable: true,
    })
    expect(column.saveFormat(0)).toBe(0)
    expect(column.saveFormat('')).toBeNull()
  })
})
