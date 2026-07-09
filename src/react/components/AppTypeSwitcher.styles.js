import {StyleSheet} from 'react-native';

export default StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    gap: 6,
  },
  label: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D8E0EA',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    minWidth: 164,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  resetButton: {
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  resetText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.46)',
    justifyContent: 'center',
    padding: 16,
  },
  modalPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  modalSearch: {
    backgroundColor: '#F8FAFC',
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  optionList: {
    paddingVertical: 8,
  },
  optionRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionRowActive: {
    backgroundColor: '#EFF6FF',
  },
  optionText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '800',
  },
  optionTextActive: {
    color: '#1D4ED8',
  },
  optionHint: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
