const fs = require('fs');
const path = require('path');
const {Linter} = require('eslint');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const createContext = require('../../../react/pages/Devices/detail/createDeviceDetailContext').default;

const directory = path.resolve(__dirname, '../../../react/pages/Devices/detail');
const files = fs.readdirSync(directory).filter(file => file.endsWith('.js'));

describe('DeviceDetail composition regression (app-community#706)', () => {
  test.each(files)('%s parses and has no unbound runtime or JSX references', file => {
    const source = fs.readFileSync(path.join(directory, file), 'utf8');
    const messages = new Linter().verify(source, {
      parserOptions: {ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: {jsx: true}},
      env: {browser: true, node: true, es2022: true},
      rules: {'no-undef': 'error'},
    });
    expect(messages.map(message => `${message.line}: ${message.message}`)).toEqual([]);
    const unbound = [];
    traverse(parser.parse(source, {sourceType: 'module', plugins: ['jsx']}), {
      JSXOpeningElement(element) {
        const name = element.node.name;
        if (name.type === 'JSXIdentifier' && /^[A-Z]/.test(name.name) &&
            !element.scope.hasBinding(name.name)) unbound.push(name.name);
      },
    });
    expect(unbound).toEqual([]);
  });

  test('section context retains actual values and callbacks instead of losing hook outputs', () => {
    const setVisibility = jest.fn();
    const setDelivery = jest.fn();
    const saveDelivery = jest.fn();
    const renderSwitchRow = jest.fn();
    const state = {
      currentCompany: {id: 7}, themeColors: {buttonText: '#fff'},
      brandColors: {primary: '#000'}, runtimeDevice: {id: 403},
      deviceOrderVisibility: 'company', setDeviceOrderVisibility: setVisibility,
      deviceDeliveryEnabled: true, setDeviceDeliveryEnabled: setDelivery,
      savingDeviceDeliverySettings: true, displayAutoPrintProductEnabled: true,
      products: [{quantity: 2}], deviceRuntimeDebugInfoEnabled: true,
    };
    const context = createContext(state, {refreshCurrentConfig: jest.fn()}, {}, {
      saveDeviceDeliverySettings: saveDelivery, renderSwitchRow, inflowTotal: 90,
    });
    expect(context.currentCompany).toBe(state.currentCompany);
    expect(context.runtimeDevice).toBe(state.runtimeDevice);
    expect(context.products).toBe(state.products);
    expect(context.inflowTotal).toBe(90);
    expect(context.palette).toBe(state.brandColors);
    expect(context.orderVisibility).toBe('company');
    expect(context.deliveryEnabled).toBe(true);
    expect(context.savingDeliverySettings).toBe(true);
    expect(context.displayAutoPrintProduct).toBe(true);
    expect(context.runtimeDebugInfoEnabled).toBe(true);
    context.setOrderVisibility('device');
    context.setDeliveryEnabled(false);
    context.saveDeviceDeliverySettings({deviceDeliveryEnabled: false});
    expect(setVisibility).toHaveBeenCalledWith('device');
    expect(setDelivery).toHaveBeenCalledWith(false);
    expect(saveDelivery).toHaveBeenCalledWith({deviceDeliveryEnabled: false});
    expect(context.renderSwitchRow).toBe(renderSwitchRow);
  });
});
