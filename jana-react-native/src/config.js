import Constants from 'expo-constants';

const apiUrl = Constants.expoConfig?.extra?.apiUrl || Constants.manifest?.extra?.apiUrl || 'https://demo.janaai.janmitra.net';

const config = {
  apiUrl,
  appVariant: Constants.expoConfig?.extra?.appVariant || 'selector',
  isMember: Constants.expoConfig?.extra?.appVariant === 'member',
  isAssociate: Constants.expoConfig?.extra?.appVariant === 'associate',
};

export default config;
