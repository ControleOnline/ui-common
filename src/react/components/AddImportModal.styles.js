import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  modalAlignEnd: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  label: {
    marginBottom: 6,
    fontWeight: '600',
  },
  filePicker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fileName: {
    flex: 1,
    marginRight: 10,
  },
  helperText: {
    marginTop: 10,
    color: '#6c757d',
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  secondaryButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#aaa',
    alignItems: 'center',
  },
  primaryButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#007bff',
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#ccc',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default styles;
