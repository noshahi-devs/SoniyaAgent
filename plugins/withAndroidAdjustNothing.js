const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidAdjustNothing(config) {
  return withAndroidManifest(config, (config) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    mainActivity.$['android:windowSoftInputMode'] = 'adjustNothing';
    return config;
  });
};
