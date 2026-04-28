import React, { useCallback, useState, useEffect, useLayoutEffect, useMemo } from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    FlatList,
    TextInput,
    RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useStore } from '@store';
import { api } from '@controleonline/ui-common/src/api';
import { colors } from '@controleonline/../../src/styles/colors';
import Icon from 'react-native-vector-icons/FontAwesome';
import IconAdd from 'react-native-vector-icons/MaterialIcons';
import AddImportModal from '../components/AddImportModal';
import { Directory, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import styles from './Imports.styles';

const normalizeImportStatus = value =>
    String(value || '')
        .trim()
        .toLowerCase();

const getImportStatusMeta = item => {
    const rawStatus =
        item?.status?.realStatus ||
        item?.status?.status ||
        item?.status?.name ||
        '';
    const normalizedStatus = normalizeImportStatus(rawStatus);

    const processingStatuses = ['pending', 'processing', 'queued', 'uploading', 'uploaded'];
    const errorStatuses = ['error', 'failed', 'failure', 'invalid'];
    const successStatuses = ['done', 'success', 'completed', 'processed', 'finished'];

    if (processingStatuses.includes(normalizedStatus)) {
        return {
            isProcessing: true,
            isError: false,
            labelKey: 'processing',
            rawStatus,
            backgroundColor: '#FEF3C7',
            textColor: '#B45309',
        };
    }

    if (errorStatuses.includes(normalizedStatus)) {
        return {
            isProcessing: false,
            isError: true,
            labelKey: 'error',
            rawStatus,
            backgroundColor: '#FEE2E2',
            textColor: '#B91C1C',
        };
    }

    if (successStatuses.includes(normalizedStatus)) {
        return {
            isProcessing: false,
            isError: false,
            labelKey: 'done',
            rawStatus,
            backgroundColor: '#DCFCE7',
            textColor: '#15803D',
        };
    }

    return {
        isProcessing: false,
        isError: false,
        labelKey: 'fallback',
        rawStatus,
        backgroundColor: '#E2E8F0',
        textColor: '#475569',
    };
};

const getImportErrorDetail = item => {
    const candidates = [
        item?.error,
        item?.errorMessage,
        item?.status?.message,
        item?.status?.description,
        item?.status?.detail,
        item?.detail,
        item?.message,
    ];

    return candidates.find(candidate => String(candidate || '').trim()) || '';
};

const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleString(); // Formato local legível
};

const Imports = ({ context = {}, onClose }) => {
    const peopleStore = useStore('people');
    const { getters: peopleGetters } = peopleStore.getters;
    const { currentCompany } = peopleGetters;

    const importType = context.context;
    const title = context.title;
    const searchPlaceholder = context.searchPlaceholder;
    const refreshLabel = global.t?.t('imports', 'button', 'refresh') || 'Atualizar';
    const processingLabel = global.t?.t('imports', 'status', 'processing') || 'Processando';
    const errorLabel = global.t?.t('imports', 'status', 'error') || 'Erro';
    const doneLabel = global.t?.t('imports', 'status', 'done') || 'Concluido';
    const noStatusLabel = global.t?.t('imports', 'status', 'no_status') || 'Sem status';
    const processingHelpLabel =
        global.t?.t('imports', 'message', 'processing_after_upload') ||
        'Importacao enviada e aguardando processamento.';

    const navigation = useNavigation();

    const importsStore = useStore('imports');
    const getters = importsStore.getters;
    const actions = importsStore.actions;

    const { items, isLoading } = getters;

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const [searchText, setSearchText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [allImports, setAllImports] = useState([]);

    const [refreshing, setRefreshing] = useState(false);
    const [showAddImportModal, setShowAddImportModal] = useState(false);

    const fetchImports = useCallback(
        (query, page) => {
            const params = {
                people: currentCompany ? '/people/' + currentCompany.id : null,
                importType: importType,
                page: page ?? currentPage,
                itemsPerPage,
            };

            if (String(query ?? searchQuery).trim()) {
                params.name = String(query ?? searchQuery).trim();
            }

            return actions.getItems(params);
        },
        [actions, currentCompany, currentPage, itemsPerPage, searchQuery, importType],
    );

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: title,
        });
    }, [navigation, title]);

    useFocusEffect(
        useCallback(() => {
            fetchImports(searchQuery, currentPage);
        }, [currentPage, fetchImports, searchQuery]),
    );

    useEffect(() => {
        if (isLoading) return;
        if (items && Array.isArray(items)) {
            if (currentPage === 1) {
                setAllImports(items);
            } else {
                setAllImports((prev) => {
                    const newIds = new Set(items.map((i) => i.id));
                    const filteredPrev = prev.filter((p) => !newIds.has(p.id));
                    return [...filteredPrev, ...items];
                });
            }
        }
    }, [items, currentPage, isLoading]);

    useEffect(() => {
        const t = setTimeout(() => {
            setSearchQuery(searchText.trim());
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(t);
    }, [searchText]);

    const hasProcessingImports = useMemo(
        () => allImports.some(item => getImportStatusMeta(item).isProcessing),
        [allImports],
    );

    const resolveImportStatusLabel = useCallback(
        statusMeta => {
            if (statusMeta.labelKey === 'processing') return processingLabel;
            if (statusMeta.labelKey === 'error') return errorLabel;
            if (statusMeta.labelKey === 'done') return doneLabel;
            return statusMeta.rawStatus || noStatusLabel;
        },
        [doneLabel, errorLabel, noStatusLabel, processingLabel],
    );

    useEffect(() => {
        if (!hasProcessingImports) {
            return undefined;
        }

        const intervalId = setInterval(() => {
            setCurrentPage(1);
            fetchImports(searchQuery, 1);
        }, 15000);

        return () => clearInterval(intervalId);
    }, [fetchImports, hasProcessingImports, searchQuery]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            setCurrentPage(1);
            await fetchImports(searchQuery, 1);
        } finally {
            setRefreshing(false);
        }
    }, [fetchImports, searchQuery]);

    const renderImportCard = ({ item }) => {
        const statusMeta = getImportStatusMeta(item);
        const errorDetail = statusMeta.isError ? getImportErrorDetail(item) : '';

        return (
        <TouchableOpacity style={styles.card} activeOpacity={0.8}>
            <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {item.name?.charAt(0)?.toUpperCase() || 'I'}
                    </Text>
                </View>

                <Text style={styles.title} numberOfLines={1}>
                    {item.name} (ID: {item.id})
                </Text>

                <Icon name="chevron-right" size={14} color="#CBD5E1" />
            </View>

            <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                    <Icon name="file-text-o" size={16} color={colors.primary} />
                    <Text style={styles.infoText}>{item.fileFormat?.toUpperCase()}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Icon name="calendar" size={16} color={colors.primary} />
                    <Text style={styles.infoText}>{formatDate(item.uploadDate)}</Text>
                </View>

                {(item.status?.status || statusMeta.rawStatus || statusMeta.labelKey) && (
                    <View style={styles.infoRow}>
                        <Icon name="info-circle" size={16} color={colors.primary} />
                        <View style={styles.statusContent}>
                            <View
                                style={[
                                    styles.statusBadge,
                                    {
                                        backgroundColor: statusMeta.backgroundColor,
                                    },
                                ]}>
                                <Text
                                    style={[
                                        styles.statusBadgeText,
                                        { color: statusMeta.textColor },
                                    ]}>
                                    {resolveImportStatusLabel(statusMeta)}
                                </Text>
                            </View>

                            {statusMeta.isProcessing && (
                                <Text style={styles.statusHelperText}>
                                    {processingHelpLabel}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {errorDetail ? (
                    <View style={styles.infoRow}>
                        <Icon name="exclamation-circle" size={16} color="#DC2626" />
                        <Text style={styles.errorText}>{errorDetail}</Text>
                    </View>
                ) : null}
            </View>
        </TouchableOpacity>
        );
    };

    const downloadTemplate = async () => {
        try {
            const response = await api.fetch(`/imports/example/${importType}`, {
                method: 'GET',
                responseType: 'text',
            });

            const csvText = typeof response === 'string' ? response : await response.text?.();
            console.log('CSV recebido:', csvText.slice(0, 200));

            if (!csvText) throw new Error('CSV vazio');

            // mobile: verifica se o diretório está disponível
            const dirUri = Directory?.cacheDocumentDirectory || Directory?.documentDirectory;

            if (dirUri) {
                const fileUri = `${dirUri}modelo_${importType}.csv`;

                const file = new File(fileUri, { contents: csvText });
                await file.create();

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(fileUri);
                }

                console.log(`Arquivo CSV criado em: ${fileUri}`);
                return fileUri;
            } else if (typeof window !== 'undefined') {
                // fallback web
                const blob = new Blob([csvText], { type: 'text/csv' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `modelo_${importType}.csv`;
                link.click();
                URL.revokeObjectURL(link.href);
                console.log('Download CSV disparado no web');
                return 'web-download';
            } else {
                throw new Error('FileSystem não disponível');
            }
        } catch (err) {
            console.error('Erro detalhado ao baixar CSV:', err);
            throw new Error('Falha ao baixar o modelo CSV');
        }
    };

    return (
        <View style={styles.container}>

            <View style={styles.headerBar}>
                <Text style={styles.headerTitle}>{title}</Text>
                <TouchableOpacity onPress={onClose}>
                    <Icon name="close" size={24} color="#000" />
                </TouchableOpacity>
            </View>

            <View style={styles.subHeader}>
                <View style={styles.topRow}>
                    <View style={styles.topRowActions}>
                        <TouchableOpacity style={styles.downloadButton} onPress={downloadTemplate}>
                            <IconAdd name="download" size={20} color="#fff" />
                            <Text style={styles.downloadText}>Baixar Modelo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                            <Icon name="refresh" size={16} color={colors.primary} />
                            <Text style={styles.refreshButtonText}>{refreshLabel}</Text>
                        </TouchableOpacity>
                    </View>

                    {hasProcessingImports ? (
                        <View style={styles.processingBadge}>
                            <Icon name="clock-o" size={14} color="#B45309" />
                            <Text style={styles.processingBadgeText}>{processingLabel}</Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.searchRow}>
                    <View style={styles.searchInputContainer}>
                        <Icon name="search" size={16} color="#94A3B8" />

                        <TextInput
                            style={styles.searchInput}
                            placeholder={searchPlaceholder}
                            placeholderTextColor="#94A3B8"
                            value={searchText}
                            onChangeText={setSearchText}
                        />

                        {searchText.length > 0 && (
                            <TouchableOpacity
                                onPress={() => setSearchText('')}
                                style={styles.clearSearchButton}
                            >
                                <Icon name="times-circle" size={16} color="#94A3B8" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => setShowAddImportModal(true)}
                    >
                        <IconAdd name="upload-file" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={allImports}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderImportCard}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />

            <AddImportModal
                visible={showAddImportModal}
                onClose={() => setShowAddImportModal(false)}
                context={context}
                onSuccess={() => {
                    setCurrentPage(1);
                    fetchImports(searchQuery, 1);
                }}
            />
        </View>
    );
};

export default Imports;
