import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { useStore } from '@store';

const SpotifyPlayer = () => {
    const peopleStore = useStore('people');
    const { currentCompany } = peopleStore.getters;

    const [token, setToken] = useState(null);
    const [deviceId, setDeviceId] = useState(null);
    const [isReady, setIsReady] = useState(false);

    const playerRef = useRef(null);

    // 🔑 Token
    const fetchToken = async () => {
        try {
            const data = await api.fetch('/spotify/token/' + currentCompany?.id);
            if (data.access_token) {
                setToken(data.access_token);
            }
        } catch (e) {
            console.error('[Spotify] token error', e);
        }
    };

    useEffect(() => {
        if (Platform.OS !== 'web' || !currentCompany?.id) return;
        fetchToken();
    }, [currentCompany?.id]);

    // 🎧 Função principal: pegar música e tocar
    const playUserTrack = async (device_id, authToken) => {
        try {
            // 🔥 1. pegar 1 música curtida
            const res = await fetch('https://api.spotify.com/v1/me/tracks?limit=1', {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
            });

            const data = await res.json();

            if (!data.items?.length) {
                console.warn('[Spotify] usuário sem músicas curtidas');
                return;
            }

            const trackUri = data.items[0].track.uri;

            console.log('[Spotify] Tocando:', trackUri);

            // 🔥 2. transfer playback
            await fetch('https://api.spotify.com/v1/me/player', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    device_ids: [device_id],
                    play: true
                }),
            });

            // 🔥 3. tocar música
            await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${device_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    uris: [trackUri]
                }),
            });

            console.log('[Spotify] ▶️ Playback iniciado');

            // 🔊 volume
            setTimeout(() => {
                playerRef.current?.setVolume(0.8);
            }, 2000);

        } catch (err) {
            console.error('[Spotify] play error', err);
        }
    };

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
                volume: 0.3,
            });

            playerRef.current = player;

            player.addListener('ready', async ({ device_id }) => {
                console.log('[Spotify] READY', device_id);

                setDeviceId(device_id);
                setIsReady(true);

                try {
                    // 🔓 destrava autoplay
                    await player.resume().catch(() => {});

                    // ▶️ toca música do usuário
                    await playUserTrack(device_id, token);

                } catch (e) {
                    console.error('[Spotify] autoplay error', e);
                }
            });

            player.addListener('not_ready', () => {
                setIsReady(false);
            });

            player.connect();
        };

        return () => {
            playerRef.current?.disconnect();
        };
    }, [token]);

    // 🧠 fallback autoplay (caso falhe)
    useEffect(() => {
        if (!deviceId || !token) return;

        const retry = setInterval(() => {
            playUserTrack(deviceId, token);
        }, 20000);

        return () => clearInterval(retry);
    }, [deviceId, token]);

    // 🔓 desbloqueio por interação
    useEffect(() => {
        const unlock = () => {
            playerRef.current?.resume();
        };

        document.addEventListener('click', unlock, { once: true });

        return () => {
            document.removeEventListener('click', unlock);
        };
    }, []);

    if (Platform.OS !== 'web') {
        return (
            <View style={styles.container}>
                <Text>Spotify só funciona na Web</Text>
            </View>
        );
    }

    return (
        <View style={styles.footer}>
            <Text style={styles.status}>
                {isReady ? '🟢 Tocando Spotify' : '🟠 Carregando Spotify...'}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    footer: {
        height: 80,
        backgroundColor: '#121212',
        justifyContent: 'center',
        alignItems: 'center',
    },
    status: {
        color: '#fff',
        fontWeight: 'bold'
    },
    container: {
        padding: 20
    }
});

export default SpotifyPlayer;