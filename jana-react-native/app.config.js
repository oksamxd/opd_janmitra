module.exports = () => {
  const IS_MEMBER = process.env.APP_VARIANT === 'member';
  const IS_ASSOCIATE = process.env.APP_VARIANT === 'associate';

  return {
    expo: {
      name: IS_ASSOCIATE ? "Jana AI - Associate" : "Jana AI - Member",
      slug: "jana-react-native",
      version: "1.0.0",
      orientation: "portrait",
      icon: "./assets/icon.png",
      userInterfaceStyle: "light",
      newArchEnabled: true,
      splash: {
        image: "./assets/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff"
      },
      ios: {
        supportsTablet: true,
        bundleIdentifier: IS_ASSOCIATE ? "com.jana.associate" : "com.jana.member"
      },
      android: {
        package: IS_ASSOCIATE ? "com.jana.associate" : "com.jana.member",
        adaptiveIcon: {
          foregroundImage: "./assets/favicon.png",
          backgroundColor: "#ffffff"
        },
        permissions: [
          "RECORD_AUDIO",
          "MODIFY_AUDIO_SETTINGS",
          "INTERNET"
        ],
        usesCleartextTraffic: true
      },
      web: {
        favicon: "./assets/favicon.png"
      },
      experiments: {
        baseUrl: process.env.WEB_BASE_URL || '/app'
      },
      extra: {
        appVariant: process.env.APP_VARIANT || 'selector',
        apiUrl: process.env.API_URL || 'https://demo.janaai.janmitra.net'
      }
    }
  };
};
