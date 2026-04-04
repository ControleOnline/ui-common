import { Dimensions, PixelRatio } from 'react-native';

export const SCREEN_METRIC_KEYS = ['deviceResolution', 'actualSize', 'windosSize'];

export const buildScreenMetrics = () => {
  const windowSize = Dimensions.get('window');
  const screenSize = Dimensions.get('screen');
  const pixelRatio = Number(PixelRatio.get()) || 1;

  const windowWidth = Math.round(Number(windowSize?.width) || 0);
  const windowHeight = Math.round(Number(windowSize?.height) || 0);
  const screenWidth = Math.round(Number(screenSize?.width) || 0);
  const screenHeight = Math.round(Number(screenSize?.height) || 0);
  const physicalWidth = Math.round((Number(screenSize?.width) || 0) * pixelRatio);
  const physicalHeight = Math.round((Number(screenSize?.height) || 0) * pixelRatio);

  return {
    deviceResolution: `${physicalWidth}x${physicalHeight}`,
    actualSize: `${screenWidth}x${screenHeight}`,
    windosSize: `${windowWidth}x${windowHeight}`,
  };
};

export const appendScreenMetrics = (configs = {}, metrics = buildScreenMetrics()) => ({
  ...configs,
  ...metrics,
});

export const hasScreenMetricsChanges = (configs = {}, metrics = buildScreenMetrics()) =>
  SCREEN_METRIC_KEYS.some(key => configs?.[key] !== metrics?.[key]);
