import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';
import { useStore } from '@store';
import AnimatedModal from './AnimatedModal';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import { useState } from 'react';
import { resolveSystemErrorMessage } from '@controleonline/ui-common/src/react/utils/systemErrorMessage';
import styles from './AddImportModal.styles';

const FORBIDDEN_EXTENSIONS = new Set(['*', '*.*', '', '.', '.*']);

const sanitizeAllowedExtensions = (extensions, importType) => {
    const fallback =
        importType === 'invoice_tax' || importType === 'xml' ? ['xml', 'zip'] : ['csv'];
    const source = Array.isArray(extensions) && extensions.length > 0 ? extensions : fallback;
    return [...new Set(
        source
            .map(item => String(item || '').trim().replace(/^\./, '').toLowerCase())
            .filter(item => item && !FORBIDDEN_EXTENSIONS.has(item) && !item.includes('*')),
    )];
};

const AddImportModal = ({
    visible,
    onClose,
    onSuccess,
    context = {},
    allowedExtensions = [],
    helperLabel,
    modalTitle,
    fileLabel,
    selectFileLabel,
    cancelLabel,
    importSuccessLabel,
    importErrorLabel,
    importType = null,
}) => {
    const fallbackModalTitle = global.t?.t('imports', 'title', 'new_import');
    const fallbackFileLabel = global.t?.t('imports', 'label', 'file');
    const fallbackSelectFileLabel = global.t?.t('imports', 'button', 'select_file');
    const fallbackCancelLabel = global.t?.t('imports', 'button', 'cancel');
    const fallbackSuccessLabel = global.t?.t('imports', 'success', 'import_sent_successfully');
    const fallbackErrorLabel = global.t?.t('imports', 'error', 'error_sending_import');
    const fallbackInvalidFileLabel = global.t?.t('imports', 'message', 'invalid_file_extension');
    const _modalTitle = modalTitle ?? fallbackModalTitle;
    const _fileLabel = fileLabel ?? fallbackFileLabel;
    const _selectFileLabel = selectFileLabel ?? fallbackSelectFileLabel;
    const _cancelLabel = cancelLabel ?? fallbackCancelLabel;
    const _importSuccessLabel = importSuccessLabel ?? fallbackSuccessLabel;
    const _importErrorLabel = importErrorLabel ?? fallbackErrorLabel;
    const _helperLabel = helperLabel ?? fallbackInvalidFileLabel;
    const resolvedImportType =
        importType ?? context.context ?? (allowedExtensions.includes('xml') ? 'xml' : 'csv');
    const _allowedExtensions = sanitizeAllowedExtensions(
        allowedExtensions.length > 0 ? allowedExtensions : context.allowedExtensions,
        resolvedImportType,
    );
    const _acceptedTypes = _allowedExtensions.map(ext => `.${ext}`).join(',');
    const _importType = resolvedImportType;
    const { showError, showSuccess } = useMessage();
    const peopleStore = useStore('people');
    const importsStore = useStore('imports');
    const themeStore = useStore('theme');
    const getters = peopleStore.getters;
    const { currentCompany } = getters;
    const importActions = importsStore.actions || {};
    const themeColors = themeStore?.getters?.colors || {};
    const buttonPalette = {
        buttonBackground: themeColors.buttonBackground,
        buttonBorder: themeColors.buttonBorder,
        buttonText: themeColors.buttonText,
        buttonIcon: themeColors.buttonIcon || themeColors.buttonText,
    };

    const [showImportList, setShowImportList] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [uploading, setUploading] = useState(false);

    const handleUploadImportFile = async ({ file } = {}) => {
        if (!file) {
            if (typeof document === 'undefined') {
                throw new Error(_helperLabel);
            }

            file = await new Promise((resolve, reject) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = _acceptedTypes;
                input.onchange = () => resolve(input.files?.[0] || null);
                input.onerror = () => reject(new Error(_helperLabel));
                input.click();
            });
        }

        if (!file) {
            return null;
        }

        if (_allowedExtensions.length === 0) {
            throw new Error('Importar *.* nao e permitido.');
        }

        const extensionRegex = new RegExp(`\\.(${_allowedExtensions.join('|')})$`, 'i');
        if (!file?.name?.toLowerCase().match(extensionRegex)) {
            throw new Error(_helperLabel);
        }

        setUploading(true);
        try {
            await importActions.uploadImportFile({
                file,
                importType: _importType,
                peopleId: currentCompany.id,
                allowedExtensions: _allowedExtensions,
            });
            showSuccess(_importSuccessLabel);
            setImportResult(true);
            setShowImportList(true);
            if (onSuccess) onSuccess();
            return file;
        } catch (error) {
            const importFeedback =
                resolveSystemErrorMessage(error) || _importErrorLabel;
            showError(importFeedback);
            setImportResult(false);
            throw new Error(importFeedback);
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setShowImportList(false);
        setImportResult(null);
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
                    <Text style={styles.title}>{_modalTitle}</Text>
                    <TouchableOpacity onPress={handleClose}>
                        <Icon name="close" size={24} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} keyboardShouldPersistTaps="always">
                    <Text style={styles.fileName}>{_fileLabel} ({_acceptedTypes})</Text>
                    <TouchableOpacity
                        onPress={() => handleUploadImportFile()}
                        style={[styles.filePicker, { backgroundColor: buttonPalette.buttonBackground, borderColor: buttonPalette.buttonBorder }]}
                    >
                        <Text numberOfLines={1} style={[styles.fileName, { color: buttonPalette.buttonText }]}>{_selectFileLabel}</Text>
                        {uploading ? (
                            <ActivityIndicator color={buttonPalette.buttonIcon} />
                        ) : (
                            <Icon name="upload-file" size={22} color={buttonPalette.buttonIcon} />
                        )}
                    </TouchableOpacity>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity onPress={handleClose} style={styles.secondaryButton}>
                        <Text>{_cancelLabel}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </AnimatedModal>
    );
};

export default AddImportModal;
