import {
  normalizePrinterHost,
  normalizePrinterPort,
} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {normalizeDeviceId} from '@controleonline/ui-common/src/react/utils/paymentDevices';

export const NETWORK_CAMERA_MANAGER_DEVICE_CONFIG_KEY =
  'camera-network-manager-device';
export const NETWORK_CAMERA_PORT_CONFIG_KEY = 'camera-network-port';
export const NETWORK_CAMERA_PROTOCOL_CONFIG_KEY = 'camera-network-protocol';
export const NETWORK_CAMERA_STREAM_PATH_CONFIG_KEY =
  'camera-network-stream-path';
export const NETWORK_CAMERA_USERNAME_CONFIG_KEY = 'camera-network-username';
export const NETWORK_CAMERA_PASSWORD_CONFIG_KEY = 'camera-network-password';

export const DEFAULT_NETWORK_CAMERA_PORT = '554';
export const DEFAULT_NETWORK_CAMERA_PROTOCOL = 'rtsp';
export const DEFAULT_NETWORK_CAMERA_MANUFACTURER = 'Hikvision';
export const DEFAULT_NETWORK_CAMERA_MODEL = 'DS-2CD1123G0E-I';
export const NETWORK_CAMERA_PROTOCOL_OPTIONS = [
  {value: 'rtsp', label: 'RTSP'},
  {value: 'onvif', label: 'ONVIF'},
  {value: 'http', label: 'HTTP'},
  {value: 'https', label: 'HTTPS'},
];

const safeTrim = value => String(value || '').trim();

const parseMetadataObject = metadata => {
  if (!metadata) {
    return {};
  }

  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  return typeof metadata === 'object' ? {...metadata} : {};
};

export const normalizeCameraProtocol = value =>
  NETWORK_CAMERA_PROTOCOL_OPTIONS.find(
    option => option.value === safeTrim(value).toLowerCase(),
  )?.value || DEFAULT_NETWORK_CAMERA_PROTOCOL;

export const normalizeCameraStreamPath = value => safeTrim(value);
export const normalizeCameraCredential = value => safeTrim(value);

export const getCameraMetadata = metadata => parseMetadataObject(metadata);

export const getCameraMetadataField = (metadata, field) => {
  const parsedMetadata = getCameraMetadata(metadata);
  const cameraField = safeTrim(parsedMetadata?.camera?.[field]);
  if (cameraField) {
    return cameraField;
  }

  if (field === 'manufacturer') {
    return safeTrim(parsedMetadata?.system?.manufacturer);
  }

  if (field === 'model') {
    return safeTrim(parsedMetadata?.system?.model);
  }

  if (field === 'version') {
    return safeTrim(parsedMetadata?.system?.version);
  }

  return '';
};

export const buildNetworkCameraMetadata = ({
  existingMetadata = {},
  host,
  manufacturer,
  model,
  version,
}) => {
  const parsedMetadata = getCameraMetadata(existingMetadata);
  const normalizedManufacturer =
    safeTrim(manufacturer) ||
    getCameraMetadataField(parsedMetadata, 'manufacturer') ||
    null;
  const normalizedModel =
    safeTrim(model) || getCameraMetadataField(parsedMetadata, 'model') || null;
  const normalizedVersion =
    safeTrim(version) ||
    getCameraMetadataField(parsedMetadata, 'version') ||
    null;
  const normalizedHost =
    normalizePrinterHost(host) || safeTrim(parsedMetadata?.camera?.host) || null;

  return {
    ...parsedMetadata,
    runtime: safeTrim(parsedMetadata?.runtime) || 'network',
    camera: {
      ...(parsedMetadata?.camera || {}),
      host: normalizedHost,
      manufacturer: normalizedManufacturer,
      model: normalizedModel,
      version: normalizedVersion,
    },
    system: {
      ...(parsedMetadata?.system || {}),
      name: safeTrim(parsedMetadata?.system?.name) || 'network-camera',
      version: normalizedVersion,
      manufacturer: normalizedManufacturer,
      model: normalizedModel,
      hardwareType: 'camera',
    },
  };
};

export const getNetworkCameraConfigValues = configs => ({
  managerDeviceId: normalizeDeviceId(
    configs?.[NETWORK_CAMERA_MANAGER_DEVICE_CONFIG_KEY],
  ),
  port: normalizePrinterPort(
    configs?.[NETWORK_CAMERA_PORT_CONFIG_KEY] || DEFAULT_NETWORK_CAMERA_PORT,
  ),
  protocol: normalizeCameraProtocol(
    configs?.[NETWORK_CAMERA_PROTOCOL_CONFIG_KEY] || DEFAULT_NETWORK_CAMERA_PROTOCOL,
  ),
  streamPath: normalizeCameraStreamPath(
    configs?.[NETWORK_CAMERA_STREAM_PATH_CONFIG_KEY],
  ),
  username: normalizeCameraCredential(
    configs?.[NETWORK_CAMERA_USERNAME_CONFIG_KEY],
  ),
  password: normalizeCameraCredential(
    configs?.[NETWORK_CAMERA_PASSWORD_CONFIG_KEY],
  ),
});

export const buildNetworkCameraConfigs = ({
  managerDeviceId,
  port,
  protocol,
  streamPath,
  username,
  password,
}) => {
  const normalizedManagerDeviceId = normalizeDeviceId(managerDeviceId);
  const normalizedPort = normalizePrinterPort(port || DEFAULT_NETWORK_CAMERA_PORT);
  const normalizedProtocol = normalizeCameraProtocol(protocol);
  const normalizedStreamPath = normalizeCameraStreamPath(streamPath);
  const normalizedUsername = normalizeCameraCredential(username);
  const normalizedPassword = normalizeCameraCredential(password);

  const nextConfigs = {
    [NETWORK_CAMERA_MANAGER_DEVICE_CONFIG_KEY]: normalizedManagerDeviceId,
    [NETWORK_CAMERA_PORT_CONFIG_KEY]: normalizedPort,
    [NETWORK_CAMERA_PROTOCOL_CONFIG_KEY]: normalizedProtocol,
  };

  if (normalizedStreamPath) {
    nextConfigs[NETWORK_CAMERA_STREAM_PATH_CONFIG_KEY] = normalizedStreamPath;
  }

  if (normalizedUsername) {
    nextConfigs[NETWORK_CAMERA_USERNAME_CONFIG_KEY] = normalizedUsername;
  }

  if (normalizedPassword) {
    nextConfigs[NETWORK_CAMERA_PASSWORD_CONFIG_KEY] = normalizedPassword;
  }

  return nextConfigs;
};
