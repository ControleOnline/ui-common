import { Platform, StyleSheet } from 'react-native'
import { colors } from '@controleonline/../../src/styles/colors'

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  subHeader: {
    paddingHorizontal: 16,
    paddingTop: 9,
    paddingBottom: 9,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  topRow: {
    marginBottom: 8,
  },

  topRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  downloadButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  downloadText: { color: '#fff', fontWeight: '600', marginLeft: 6 },
  refreshButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  refreshButtonText: {
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  processingBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
  },
  processingBadgeText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
  },
  searchRow: { flexDirection: 'row', alignItems: 'center' },

  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    height: 40,
  },

  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 8,
    color: colors.text,
    fontSize: 14,
    outlineStyle: 'none',
    outlineWidth: 0,
  },

  clearSearchButton: { padding: 4 },
  addButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
      web: { boxShadow: '0 8px 16px rgba(15, 23, 42, 0.1)' },
    }),
  },

  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  title: {
    flex: 1,
    fontWeight: '700',
    fontSize: 16,
    color: '#1E293B',
    lineHeight: 24,
  },
  cardBody: { marginTop: 4 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
    marginLeft: 8,
    fontWeight: '500',
    flex: 1,
  },
  statusContent: {
    flex: 1,
    marginLeft: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusHelperText: {
    marginTop: 6,
    fontSize: 12,
    color: '#92400E',
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    marginLeft: 8,
    fontWeight: '500',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: { marginBottom: 14 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
})

export default styles
