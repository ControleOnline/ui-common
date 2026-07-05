import { StyleSheet } from 'react-native'

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    marginHorizontal: 8,
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  inputError: {
    borderColor: '#c10015',
  },
  errorText: {
    color: '#c10015',
    fontSize: 12,
    marginTop: 5,
  },
})

export default styles
