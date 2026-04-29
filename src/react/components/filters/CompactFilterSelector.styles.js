import { StyleSheet } from 'react-native';

const createStyles = (theme, dense = false) => StyleSheet.create({
  trigger: {
    minWidth: 0,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: dense ? 8 : 10,
    borderWidth: 1,
    borderColor: theme.borderColor,
    borderRadius: dense ? 12 : 14,
    paddingHorizontal: dense ? 10 : 12,
    paddingVertical: dense ? 8 : 10,
    backgroundColor: theme.backgroundColor,
  },
  triggerActive: {
    borderColor: theme.accentColor,
    backgroundColor: theme.activeBackgroundColor,
  },
  iconWrap: {
    width: dense ? 24 : 28,
    height: dense ? 24 : 28,
    borderRadius: dense ? 8 : 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.iconBackgroundColor,
  },
  iconWrapActive: {
    backgroundColor: theme.activeIconBackgroundColor,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  triggerCaption: {
    fontSize: dense ? 9 : 10,
    lineHeight: dense ? 10 : 12,
    fontWeight: '800',
    letterSpacing: 0.45,
    textTransform: 'uppercase',
    color: '#94A3B8',
    marginBottom: dense ? 1 : 2,
  },
  triggerCaptionActive: {
    color: theme.accentColor,
  },
  triggerText: {
    fontSize: dense ? 12 : 13,
    lineHeight: dense ? 14 : 16,
    fontWeight: dense ? '800' : '700',
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
