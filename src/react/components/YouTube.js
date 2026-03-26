// components/YouTube.js
import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const YouTube = ({
  playlistId = 'PLbpi6ZahtOH7DrxWUmkwvsXnFeCfB5LUp',
  height = 400,
  volume = 100 
}) => {
  const webRef = useRef(null);

  // URL do embed com JS API habilitada, autoplay e mute inicial
  const embedUrl = `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&enablejsapi=1`;

  useEffect(() => {
    if (Platform.OS === 'web') {
      const timer = setTimeout(() => {
        const iframe = document.querySelector(`iframe[src*="${playlistId}"]`);
        if (iframe) {
          iframe.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'unMute', args: [] }),
            '*'
          );
          iframe.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'setVolume', args: [volume] }),
            '*'
          );
          console.log('[YouTube Web] Volume aumentado');
        }
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [playlistId, volume]);

  // Mobile / TV WebView
  const injectedJS = `
    setTimeout(() => {
      if (window.YT && window.YT.Player) {
        const player = new YT.Player('ytplayer');
        player.unMute();
        player.setVolume(${volume});
      }
    }, 3000);
    true;
  `;

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { height }]}>
        <iframe
          id="ytplayer"
          src={embedUrl}
          width="100%"
          height={height}
          frameBorder="0"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webRef}
        source={{ uri: embedUrl }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        injectedJavaScript={injectedJS}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
});

export default YouTube;