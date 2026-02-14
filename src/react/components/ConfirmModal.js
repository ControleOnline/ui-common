import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';

export const ConfirmModal = ({ visible, title, message, onConfirm, onCancel }) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '80%' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>{title}</Text>
          <Text style={{ fontSize: 14, marginBottom: 20 }}>{message}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
            <TouchableOpacity onPress={onCancel} style={{ padding: 10 }}>
              <Text>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} style={{ padding: 10, backgroundColor: '#007AFF', borderRadius: 5 }}>
              <Text style={{ color: '#fff' }}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};