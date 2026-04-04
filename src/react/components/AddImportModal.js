import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Platform,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';
import * as DocumentPicker from 'expo-document-picker';
import { useStore } from '@store';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';

const AddImportModal = ({ visible, onClose, onSuccess, context = {} }) => {
    const { showError, showSuccess } = useMessage();
    const peopleStore = useStore('people');
    const getters = peopleStore.getters;
    const { currentCompany } = getters;

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    const handlePickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'text/csv',
                copyToCacheDirectory: true,
                multiple: false,
            });

            if (result.canceled) return;

            const pickedFile = result.assets[0];

            if (!pickedFile.name?.toLowerCase().endsWith('.csv')) {
                showError('Apenas arquivos CSV são permitidos.');
                return;
            }

            setFile(pickedFile);
        } catch (err) {
            showError('Erro ao selecionar arquivo.');
        }
    };

    const handleSave = async () => {
        if (!file) {
            showError('Selecione um arquivo CSV.');
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('importType', context.context);


            formData.append('people', String(currentCompany.id));


            if (Platform.OS === 'web') {
                const response = await fetch(file.uri);
                const blob = await response.blob();
                formData.append('file', blob, file.name || 'import.csv');
            } else {
                formData.append('file', {
                    uri: file.uri,
                    name: file.name || 'import.csv',
                    type: file.mimeType || 'text/csv',
                });
            }

            await api.upload('/imports/upload', formData);
            showSuccess('Importação enviada com sucesso.');
            if (onSuccess) onSuccess();
            handleClose();
        } catch (error) {
            showError('Erro ao enviar importação.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        onClose();
    };

    return (
        <AnimatedModal
            visible={visible}
            onRequestClose={handleClose}
            style={{ justifyContent: 'flex-end' }}
        >
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', width: '100%' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#eee' }}>
                    <Text style={{ fontSize: 20, fontWeight: '700' }}>Nova Importação</Text>
                    <TouchableOpacity onPress={handleClose}>
                        <Icon name="close" size={24} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={{ padding: 20 }}>
                    <Text style={{ marginBottom: 6, fontWeight: '600' }}>Arquivo CSV</Text>
                    <TouchableOpacity
                        onPress={handlePickFile}
                        style={{
                            borderWidth: 1,
                            borderColor: '#ddd',
                            borderRadius: 10,
                            padding: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Text numberOfLines={1} style={{ flex: 1, marginRight: 10 }}>
                            {file ? file.name : 'Selecionar arquivo'}
                        </Text>
                        <Icon name="upload-file" size={22} color={file ? "#007bff" : "#666"} />
                    </TouchableOpacity>
                    <Text style={{ marginTop: 10, color: '#6c757d', fontSize: 12 }}>
                        Apenas arquivos .csv são permitidos.
                    </Text>
                </ScrollView>

                <View style={{ flexDirection: 'row', padding: 20, gap: 10, borderTopWidth: 1, borderColor: '#eee' }}>
                    <TouchableOpacity onPress={handleClose} style={{ flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#aaa', alignItems: 'center' }}>
                        <Text>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: 14,
                            borderRadius: 10,
                            backgroundColor: loading ? '#ccc' : '#007bff',
                            alignItems: 'center',
                        }}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Importar</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </AnimatedModal>
    );
};

export default AddImportModal;