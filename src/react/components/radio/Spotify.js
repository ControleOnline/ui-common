import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Platform } from 'react-native';
import { useStore } from '@store';
import { api } from '@controleonline/ui-common/src/api';
import styles from './Spotify.styles';

const SpotifyPlayer = () => {
    const peopleStore = useStore('people');
    const { currentCompany } = peopleStore.getters;

    const [token, setToken] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [track, setTrack] = useState(null);

    const playerRef = useRef(null);

    // 🔑 TOKEN
    const fetchToken = async () => {
        try {
            const data = await api.fetch('/spotify/token/' + currentCompany?.id);
            if (data.access_token) {
                setToken(data.access_token);
                console.log('[Spotify] Token OK');
            }
        } catch (e) {
            console.error('[Spotify] token error', e);
        }
    };

    useEffect(() => {
        if (Platform.OS !== 'web' || !currentCompany?.id) return;
        fetchToken();
    }, [currentCompany?.id]);

    // 🔓 DESBLOQUEAR ÁUDIO (ESSENCIAL)
    useEffect(() => {
        const unlockAudio = async () => {
            try {
                console.log('[Spotify] desbloqueando áudio...');
                await playerRef.current?.resume();
                await playerRef.current?.setVolume(0.8);
        } catch {
            console.log('[Spotify] ainda não liberado');
        }
        };

        document.addEventListener('click', unlockAudio, { once: true });

        return () => {
            document.removeEventListener('click', unlockAudio);
        };
    }, []);

    // 🚀 SDK
    useEffect(() => {
        if (!token || Platform.OS !== 'web') return;

        if (!document.getElementById('spotify-sdk')) {
            const script = document.createElement('script');
            script.id = 'spotify-sdk';
            script.src = 'https://sdk.scdn.co/spotify-player.js';
            script.async = true;
            document.body.appendChild(script);
        }

        window.onSpotifyWebPlaybackSDKReady = () => {
            const player = new window.Spotify.Player({
                name: 'KDS Player TV',
                getOAuthToken: cb => cb(token),
                volume: 0.5,
            });

            playerRef.current = player;

            // 🎧 Estado vindo do celular
            player.addListener('player_state_changed', state => {
                if (!state) return;

                const currentTrack = state.track_window.current_track;

                if (currentTrack) {
                    console.log('[Spotify] Tocando:', currentTrack.name);

                    setTrack({
                        name: currentTrack.name,
                        artist: currentTrack.artists.map(a => a.name).join(', ')
                    });
                }
            });

            // ✅ PLAYER PRONTO
            player.addListener('ready', async ({ device_id }) => {
                console.log('[Spotify] READY:', device_id);
                setIsReady(true);

                // 🔊 garantir volume
                setTimeout(() => {
                    player.setVolume(0.8);
                }, 1000);
            });

            player.addListener('not_ready', () => {
                setIsReady(false);
            });

            player.addListener('initialization_error', e => console.error(e));
            player.addListener('authentication_error', e => console.error(e));
            player.addListener('account_error', e => console.error('Premium necessário', e));
            player.addListener('playback_error', e => console.error(e));

            player.connect();
        };

        return () => {
            playerRef.current?.disconnect();
        };
    }, [token]);

    if (Platform.OS !== 'web') {
        return (
            <View style={styles.container}>
                <Text>Spotify apenas na Web</Text>
            </View>
        );
    }

    return (
        <View style={styles.footer}>
            <Text style={styles.status}>
                {isReady ? '🟢 Aguardando Spotify Connect...' : '🟠 Carregando...'}
            </Text>

            {track && (
                <View style={styles.trackBox}>
                    <Text style={styles.trackName}>{track.name}</Text>
                    <Text style={styles.artist}>{track.artist}</Text>
                </View>
            )}
        </View>
    );
};

export default SpotifyPlayer;
