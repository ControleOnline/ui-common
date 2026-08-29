import {StyleSheet} from 'react-native';

export default StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: '90%',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  message: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 12,
    lineHeight: 18,
  },
  loader: {
    marginVertical: 24,
  },
  empty: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginVertical: 16,
  },
  list: {
    maxHeight: 220,
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  optionSelected: {
    borderColor: '#0EA5E9',
    backgroundColor: '#F0F9FF',
  },
  optionTextBlock: {
    flex: 1,
    marginRight: 8,
  },
  optionAlias: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  optionMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  preview: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  previewLine: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  cancelText: {
    color: '#64748B',
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: '#0EA5E9',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
  },
  confirmDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
