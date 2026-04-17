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
import { api } from '@controleonline/ui-common/src/api';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import styles from './AddImportModal.styles';

const AddImportModal = ({ visible, onClose, onSuccess, context = {} }) => {
    const { showError, showSuccess } = useMessage();
    const peopleStore = useStore('people');
    const getters = peopleStore.getters;
    const { currentCompany } = getters;

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const modalTitle = global.t?.t('imports', 'title', 'new_import');
    const csvLabel = global.t?.t('imports', 'label', 'csv_file');
    const selectFileLabel = global.t?.t('imports', 'button', 'select_file');
    const cancelLabel = global.t?.t('imports', 'button', 'cancel');
    const importLabel = global.t?.t('imports', 'button', 'import');
    const csvOnlyLabel = global.t?.t('imports', 'message', 'only_csv_files_are_allowed');
    const pickFileErrorLabel = global.t?.t('imports', 'error', 'error_selecting_file');
    const importSuccessLabel = global.t?.t('imports', 'success', 'import_sent_successfully');
    const importErrorLabel = global.t?.t('imports', 'error', 'error_sending_import');
    const missingFileLabel = global.t?.t('imports', 'error', 'select_a_csv_file');

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
                showError(csvOnlyLabel);
                return;
            }

            setFile(pickedFile);
        } catch {
            showError(pickFileErrorLabel);
        }
    };

    const handleSave = async () => {
        if (!file) {
            showError(missingFileLabel);
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
            showSuccess(importSuccessLabel);
            if (onSuccess) onSuccess();
            handleClose();
        } catch {
            showError(importErrorLabel);
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
            style={styles.modalAlignEnd}
        >
            <View style={styles.sheet}>
                <View style={styles.header}>
                    <Text style={styles.title}>{modalTitle}</Text>
                    <TouchableOpacity onPress={handleClose}>
                        <Icon name="close" size={24} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content}>
                    <Text style={styles.label}>{csvLabel}</Text>
                    <TouchableOpacity
                        onPress={handlePickFile}
                        style={styles.filePicker}
                    >
                        <Text numberOfLines={1} style={styles.fileName}>
                            {file ? file.name : selectFileLabel}
                        </Text>
                        <Icon name="upload-file" size={22} color={file ? "#007bff" : "#666"} />
                    </TouchableOpacity>
                    <Text style={styles.helperText}>
                        {csvOnlyLabel}
                    </Text>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity onPress={handleClose} style={styles.secondaryButton}>
                        <Text>{cancelLabel}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={loading}
                        style={[
                            styles.primaryButton,
                            loading && styles.primaryButtonDisabled,
                        ]}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{importLabel}</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </AnimatedModal>
    );
};

export default AddImportModal;
