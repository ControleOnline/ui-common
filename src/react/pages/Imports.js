import React, { useCallback, useState, useEffect, useLayoutEffect } from 'react';
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

            actions.getItems(params);
        },
        [currentPage, itemsPerPage, searchQuery, importType],
    );

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: title,
        });
    }, [navigation, title]);

    useFocusEffect(
        useCallback(() => {
            fetchImports(searchQuery, currentPage);
        }, [currentPage, itemsPerPage, searchQuery, importType]),
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

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchImports(searchQuery, 1);
        setCurrentPage(1);
        setRefreshing(false);
    }, [fetchImports, searchQuery]);

    const renderImportCard = ({ item }) => (
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

                {item.status?.status && (
                    <View style={styles.infoRow}>
                        <Icon name="info-circle" size={16} color={colors.primary} />
                        <Text style={styles.infoText}>{item.status.status}</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

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
                    <TouchableOpacity style={styles.downloadButton} onPress={downloadTemplate}>
                        <IconAdd name="download" size={20} color="#fff" />
                        <Text style={styles.downloadText}>Baixar Modelo</Text>
                    </TouchableOpacity>
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
                    fetchImports(searchQuery, 1);
                    setCurrentPage(1);
                }}
            />
        </View>
    );
};

export default Imports;
