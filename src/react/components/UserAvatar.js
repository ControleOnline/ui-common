import {readStoredSessionToken} from '../../utils/storedSessionToken';
import {isTrustedApiUrl, filterApiHeaders, resolveApiFileProtocol} from '../../utils/trustedApiUrl';
import React, {useEffect, useMemo, useState} from 'react';
import {Image, Platform, StyleSheet, Text, View} from 'react-native';
import {env as APP_ENV} from '@env';
import {getGravatarUrl, getUserInitials} from '../utils/userAvatar';

const normalizeUrl = value => String(value || '').trim();

const isGravatarUrl = uri =>
  /gravatar\.com\/avatar\//i.test(String(uri || ''));

const isBackendDownloadUrl = uri =>
  /\/files\/[^/?#]+\/download/i.test(String(uri || ''));

/** Session cache: gravatar URL → true (ok) | false (missing). Avoids repeat probes. */
const gravatarProbeCache = new Map();


/**
 * Probe Gravatar (d=404) via fetch BEFORE exposing URL to <Image>.
 * Browser "Failed to load resource" for <img> 404 is avoided; XHR 404 is
 * expected once per unique hash and cached for the session.
 */
const probeGravatar = async url => {
  if (gravatarProbeCache.has(url)) {
    return gravatarProbeCache.get(url);
  }

  try {
    let response = await fetch(url, {
      method: 'HEAD',
      mode: 'cors',
      cache: 'force-cache',
    });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'force-cache',
      });
    }
    const ok = response.ok;
    gravatarProbeCache.set(url, ok);
    return ok;
  } catch {
    gravatarProbeCache.set(url, false);
    return false;
  }
};

/**
 * Resolve display URI.
 * - Backend /files/.../download on web: authenticated blob fetch.
 * - Gravatar (d=404) on web: probe first; never set <img src> on expected 404.
 * - Other URLs / native: pass through (native Image onError handles 404).
 */
const useDisplayUri = (uri, imageAuthContext) => {
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const next = Platform.OS === 'web'
      ? resolveApiFileProtocol(normalizeUrl(uri), APP_ENV?.API_ENTRYPOINT)
      : normalizeUrl(uri);
    const finish = displayUri => {
      if (!cancelled) setResult({uri, imageAuthContext, displayUri, resolved: true});
    };

    const run = async () => {
      if (!next) { finish(''); return; }

      // An explicitly unresolved store session must not reuse an older stored token.
      const token = imageAuthContext === undefined
        ? readStoredSessionToken() : normalizeUrl(imageAuthContext);
      if (isBackendDownloadUrl(next) && isTrustedApiUrl(next, APP_ENV?.API_ENTRYPOINT)
          && Platform.OS === 'web') {
        // Never expose a private download directly to an unauthenticated <Image>.
        if (!token) { finish(''); return; }
        const headers = {Accept: '*/*', 'API-TOKEN': token};
        const host = normalizeUrl(APP_ENV?.DOMAIN) ||
          (globalThis.location?.host || '');
        if (host) headers['App-Domain'] = host;

        for (let attempt = 0; attempt < 2 && !cancelled; attempt += 1) {
          let response;
          try {
            response = await fetch(next, {
              method: 'GET', headers, redirect: 'error', signal: controller?.signal,
            });
          } catch (error) {
            if (cancelled || error?.name === 'AbortError') return;
            if (attempt === 0) continue;
            finish(''); return;
          }
          if (cancelled) return;
          if (!response.ok) {
            // One recovery attempt for transient server failures, never auth failures.
            if (attempt === 0 && response.status >= 500 && response.status < 600) continue;
            finish(''); return;
          }
          try {
            const blob = await response.blob();
            if (cancelled) return;
            objectUrl = URL.createObjectURL(blob);
            finish(objectUrl);
          } catch {
            finish('');
          }
          return;
        }
        return;
      }

      if (isGravatarUrl(next) && Platform.OS === 'web') {
        const ok = await probeGravatar(next);
        finish(ok ? next : '');
        return;
      }
      finish(next);
    };
    run();

    return () => {
      cancelled = true;
      controller?.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [uri, imageAuthContext]);

  // Do not show a previous session's blob while the next effect is starting.
  return result && result.uri === uri && result.imageAuthContext === imageAuthContext
    ? result : {displayUri: '', resolved: false};
};

const UserAvatar = ({
  imageUrl,
  imageHeaders,
  imageAuthContext,
  email,
  name,
  size = 40,
  backgroundColor,
  borderColor,
  borderWidth = 1,
  textColor,
  style,
  useGravatar = true,
}) => {
  const sources = useMemo(
    () =>
      [
        normalizeUrl(imageUrl),
        useGravatar ? getGravatarUrl(email, Math.max(size * 2, 80)) : '',
      ].filter(Boolean),
    [email, imageUrl, size, useGravatar],
  );
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [sources, imageAuthContext]);

  const currentSource = sources[sourceIndex];
  const {displayUri, resolved} = useDisplayUri(currentSource, imageAuthContext);

  // After probe resolves empty for gravatar/backend → try next source or initials
  useEffect(() => {
    if (!currentSource || !resolved || displayUri) {
      return;
    }
    if (
      isGravatarUrl(currentSource) ||
      isBackendDownloadUrl(currentSource)
    ) {
      setSourceIndex(index =>
        index + 1 < sources.length ? index + 1 : index,
      );
    }
  }, [currentSource, displayUri, resolved, sources.length]);

  const containerStyle = [
    styles.container,
    style,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor,
      borderColor,
      borderWidth,
    },
  ];

  return (
    <View style={containerStyle}>
      {displayUri ? (
        <Image
          source={imageHeaders && Platform.OS !== 'web' && displayUri === imageUrl
            ? {uri: displayUri, headers: filterApiHeaders(displayUri, imageHeaders, APP_ENV?.API_ENTRYPOINT)} : {uri: displayUri}}
          style={styles.image}
          onError={() => setSourceIndex(index => index + 1)}
        />
      ) : (
        <Text
          style={[
            styles.initials,
            {color: textColor, fontSize: Math.max(Math.round(size * 0.38), 14)},
          ]}>
          {getUserInitials({name, email})}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});

export default UserAvatar;
