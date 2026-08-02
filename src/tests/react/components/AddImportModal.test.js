const React = require('react');
const renderer = require('react-test-renderer');
const {jest} = require('@jest/globals');

const {describe, expect, it, beforeEach} = global;

global.IS_REACT_ACT_ENVIRONMENT = true;

const importActions = {
  uploadImportFile: jest.fn(),
};

jest.mock('@store', () => ({
  useStore: jest.fn(name => {
    if (name === 'people') {
      return {
        getters: {
          currentCompany: {id: 7},
        },
        actions: {},
      };
    }

    if (name === 'imports') {
      return {
        getters: {},
        actions: importActions,
      };
    }

    return {
      getters: {},
      actions: {},
    };
  }),
}));

jest.mock('@controleonline/ui-common/src/react/components/AnimatedModal', () =>
  props => (props.visible ? React.createElement('modal', props, props.children) : null),
);

jest.mock('@controleonline/ui-common/src/react/components/MessageService', () => ({
  useMessage: () => ({
    showError: jest.fn(),
    showSuccess: jest.fn(),
  }),
}));

jest.mock('react-native-vector-icons/MaterialIcons', () => props =>
  React.createElement('icon', props, props.children),
  {virtual: true},
);

jest.mock('react-native-vector-icons/Feather', () => props =>
  React.createElement('icon', props, props.children),
  {virtual: true},
);

jest.mock('@controleonline/ui-default/src/react/components/upload/DefaultUpload', () => {
  const React = require('react');

  return props => {
    const trigger =
      typeof props.renderTrigger === 'function'
        ? props.renderTrigger({
            openManager: jest.fn(),
            uploading: false,
          })
        : null;

    return React.createElement(
      'defaultupload',
      props,
      trigger,
      React.createElement(
        'touchableopacity',
        {
          onPress: () =>
            props.onUploadFile({
              file: {
                name: 'import.csv',
                uri: 'file:///import.csv',
                mimeType: 'text/csv',
              },
            }),
        },
        React.createElement('text', null, 'Enviar via gerenciador'),
      ),
    );
  };
});

jest.mock('react-native', () => ({
  ActivityIndicator: props => React.createElement('activityindicator', props, props.children),
  Platform: {OS: 'web'},
  StyleSheet: {
    create: value => value,
  },
  ScrollView: props => React.createElement('scrollview', props, props.children),
  Text: props => React.createElement('text', props, props.children),
  TouchableOpacity: props => React.createElement('touchableopacity', props, props.children),
  View: props => React.createElement('view', props, props.children),
}));

const AddImportModal = require('@controleonline/ui-common/src/react/components/AddImportModal').default;

const collectText = node =>
  node
    .findAllByType('text')
    .map(textNode => {
      const children = textNode.props.children;
      if (Array.isArray(children)) {
        return children.flat(Infinity).join('');
      }
      return children || '';
    })
    .join('');

const findButtonByLabel = (root, label) =>
  root.findAllByType('touchableopacity').find(button => collectText(button).includes(label));

const findButtonByExactLabel = (root, label) =>
  root.findAllByType('touchableopacity').find(button => collectText(button) === label);

describe('AddImportModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.t = {
      t: (_scope, _kind, key) => key,
    };

    global.document = undefined;
  });

  it('usa a action do store imports para enviar o arquivo', async () => {
    importActions.uploadImportFile.mockResolvedValue({});
    let tree;

    await renderer.act(async () => {
      tree = renderer.create(
        React.createElement(AddImportModal, {
          visible: true,
          onClose: jest.fn(),
          onSuccess: jest.fn(),
          context: {context: 'product'},
        }),
      );
    });

    const selectButton = findButtonByLabel(tree.root, 'select_file');
    expect(selectButton).toBeTruthy();

    const importButton = findButtonByExactLabel(tree.root, 'Enviar via gerenciador');
    expect(importButton).toBeTruthy();

    await renderer.act(async () => {
      await importButton.props.onPress();
    });

    expect(importActions.uploadImportFile).toHaveBeenCalledWith({
      file: expect.objectContaining({name: 'import.csv'}),
      importType: 'product',
      peopleId: 7,
    });
  });
});
