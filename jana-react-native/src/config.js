import Constants from 'expo-constants';

const apiUrl = Constants.expoConfig?.extra?.apiUrl || Constants.manifest?.extra?.apiUrl || 'http://192.168.0.100:3005';

const config = {
  apiUrl,
  appVariant: Constants.expoConfig?.extra?.appVariant || 'selector',
  isMember: Constants.expoConfig?.extra?.appVariant === 'member',
  isAssociate: Constants.expoConfig?.extra?.appVariant === 'associate',
};

export default config;
