import { StyleSheet } from 'react-native';

const createStyles = theme => StyleSheet.create({
  trigger: {
    minWidth: 0,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.borderColor,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.backgroundColor,
  },
  triggerActive: {
    borderColor: theme.accentColor,
    backgroundColor: theme.activeBackgroundColor,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.iconBackgroundColor,
  },
  iconWrapActive: {
    backgroundColor: theme.activeIconBackgroundColor,
  },
  triggerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.textColor,
  },
  triggerTextActive: {
    color: theme.accentColor,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    maxHeight: '82%',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalContent: {
    paddingBottom: 10,
    gap: 10,
  },
  modalOption: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: theme.optionBorderColor,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: theme.optionBackgroundColor,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  modalOptionActive: {
    borderColor: theme.accentColor,
    backgroundColor: theme.activeBackgroundColor,
  },
  modalOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalOptionTextActive: {
    color: theme.accentColor,
  },
});

export default createStyles;
