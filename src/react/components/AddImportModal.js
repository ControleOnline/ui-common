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
import DefaultUpload from '@controleonline/ui-default/src/react/components/upload/DefaultUpload';
import styles from './AddImportModal.styles';

const AddImportModal = ({ visible, onClose, onSuccess, context = {} }) => {
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

    const modalTitle = global.t?.t('imports', 'title', 'new_import');
    const csvLabel = global.t?.t('imports', 'label', 'csv_file');
    const selectFileLabel = global.t?.t('imports', 'button', 'select_file');
    const cancelLabel = global.t?.t('imports', 'button', 'cancel');
    const csvOnlyLabel = global.t?.t('imports', 'message', 'only_csv_files_are_allowed');
    const importSuccessLabel = global.t?.t('imports', 'success', 'import_sent_successfully');
    const importErrorLabel = global.t?.t('imports', 'error', 'error_sending_import');

    const handleUploadImportFile = async ({ file }) => {
        if (!file?.name?.toLowerCase().endsWith('.csv')) {
            throw new Error(csvOnlyLabel);
        }

        try {
            await importActions.uploadImportFile({
                file,
                importType: context.context,
                peopleId: currentCompany.id,
            });
            showSuccess(importSuccessLabel);
            if (onSuccess) onSuccess();
            handleClose();
            return file;
        } catch {
            throw new Error(importErrorLabel);
        }
    };

    const handleClose = () => {
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
                    <DefaultUpload
                        relationStoreName="imports"
                        relationField="import"
                        relationResource="imports"
                        entityId={context.context || 'import'}
                        companyId={currentCompany.id}
                        context={`imports-${context.context || 'default'}`}
                        libraryContexts={[`imports-${context.context || 'default'}`]}
                        acceptedTypes="text/csv,.csv"
                        fileType=""
                        title={csvLabel}
                        triggerLabel={selectFileLabel}
                        managerTitle={modalTitle}
                        searchPlaceholder={selectFileLabel}
                        uploadButtonLabel={selectFileLabel}
                        emptyAttachmentLabel=""
                        emptyLibraryLabel={selectFileLabel}
                        showInlineContent={false}
                        uploadResultAlreadyAttached
                        requireEntity={false}
                        onUploadFile={handleUploadImportFile}
                        renderTrigger={({openManager, uploading}) => (
                            <TouchableOpacity
                                onPress={openManager}
                                disabled={uploading}
                                style={[
                                    styles.filePicker,
                                    {
                                        backgroundColor: buttonPalette.buttonBackground,
                                        borderColor: buttonPalette.buttonBorder,
                                    },
                                ]}
                            >
                                <Text numberOfLines={1} style={[styles.fileName, { color: buttonPalette.buttonText }]}>
                                    {selectFileLabel}
                                </Text>
                                {uploading ? (
                                    <ActivityIndicator color={buttonPalette.buttonIcon} />
                                ) : (
                                    <Icon name="upload-file" size={22} color={buttonPalette.buttonIcon} />
                                )}
                            </TouchableOpacity>
                        )}
                    />
                    <Text style={styles.helperText}>
                        {csvOnlyLabel}
                    </Text>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity onPress={handleClose} style={styles.secondaryButton}>
                        <Text>{cancelLabel}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </AnimatedModal>
    );
};

export default AddImportModal;
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores e evitar chamadas HTTP diretas quando o store ja resolver isso.
