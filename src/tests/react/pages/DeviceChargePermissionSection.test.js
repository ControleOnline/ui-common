const React = require('react')
const renderer = require('react-test-renderer')
const {jest} = require('@jest/globals')
global.IS_REACT_ACT_ENVIRONMENT = true
jest.mock('react-native', () => ({Text: 'Text', View: 'View', Platform: {OS: 'web', select: x => x.web}, StyleSheet: {create: x => x}}))
jest.mock('../../../react/utils/screenMetrics', () => ({appendScreenMetrics: x => x, hasScreenMetricsChanges: () => false}))
const Section = require('../../../react/pages/Devices/detail/DeviceChargePermissionSection').default
const {isOrderChargeEnabled, isPosChargeEntryEnabled} = require('../../../react/config/deviceConfigBootstrap')
let tree, props
beforeEach(() => {
  jest.clearAllMocks()
  props = {configs: {'order-charge-enabled': false, 'pos-gateway': 'infinite-pay', 'payment-type-ids': [11]},
    actionsRef: {current: {deviceConfigActions: {addDeviceConfigs: jest.fn(async () => {})}}},
    currentCompany: {id: 3}, deviceString: 'web-10', deviceType: 'PDV', refreshCurrentConfig: jest.fn(),
    showSystemError: jest.fn(), brandColors: {textSecondary: '#555'}, renderSwitchRow: value => React.createElement('Switch', value)}
})
afterEach(async () => {if (tree) await renderer.act(async () => tree.unmount()); tree = null})
it('saves the existing protected financial permission using the current device and company', async () => {
  await renderer.act(async () => {tree = renderer.create(React.createElement(Section, props))})
  await renderer.act(async () => tree.root.findByType('Switch').props.onValueChange(true))
  expect(props.actionsRef.current.deviceConfigActions.addDeviceConfigs).toHaveBeenCalledWith({device: 'web-10', people: '/people/3', type: 'PDV', configs: '{"order-charge-enabled":true}'})
  expect(props.refreshCurrentConfig).toHaveBeenCalledTimes(1)
  expect(props.configs['pos-gateway']).toBe('infinite-pay')
  expect(props.configs['payment-type-ids']).toEqual([11])
})
it('preserves the current permission and reports a rejected administrative write', async () => {
  props.actionsRef.current.deviceConfigActions.addDeviceConfigs.mockRejectedValue(new Error('Acesso negado'))
  await renderer.act(async () => {tree = renderer.create(React.createElement(Section, props))})
  await renderer.act(async () => tree.root.findByType('Switch').props.onValueChange(true))
  expect(props.refreshCurrentConfig).not.toHaveBeenCalled()
  expect(tree.root.findByType('Switch').props.value).toBe(false)
  expect(props.showSystemError).toHaveBeenCalledWith(expect.any(Error), expect.any(String))
})
it('honors an explicit canonical denial without erasing legacy config decisions', () => {
  const configs = {'pos-operation-mode': 'waiter', 'pos-local-charge-enabled': true, 'order-charge-enabled': false}
  expect(isOrderChargeEnabled(configs)).toBe(false)
  expect(isPosChargeEntryEnabled(configs)).toBe(false)
  expect(isPosChargeEntryEnabled({...configs, 'order-charge-enabled': true})).toBe(true)
  expect(isOrderChargeEnabled('{"order-charge-enabled":"on"}')).toBe(true)
  expect(isOrderChargeEnabled({})).toBe(false)
  expect(configs['pos-local-charge-enabled']).toBe(true)
})
