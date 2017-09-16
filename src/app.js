/**
 * Standard Notes React Native App
 */

import {
  AppState,
  Platform
} from 'react-native';

import {Navigation} from 'react-native-navigation';
import {registerScreens} from './screens';

import KeysManager from './lib/keysManager'
import GlobalStyles from "./Styles"
import Icons from "./Icons"

var _ = require('lodash');

const tabs = [{
  label: 'Notes',
  screen: 'sn.Notes',
  title: 'Notes',
},
{
  label: 'Account',
  screen: 'sn.Account',
  title: 'Account',
  }
];

// android will fail to load if icon is not specified here
if(Platform.OS === "android") {
  tabs.forEach(function(tab){
    tab.icon = require("./img/placeholder.png")
  })
}

registerScreens();

export default class App {

  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new App();
    }

    return this.instance;
  }

  constructor() {
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  handleAppStateChange = (nextAppState) => {
    console.log("App.js AppState: ", nextAppState);
    if (nextAppState === 'background') {
      var showPasscode = KeysManager.get().hasOfflinePasscode() && KeysManager.get().passcodeTiming == "immediately";
      var showFingerprint = KeysManager.get().hasFingerprint()  && KeysManager.get().fingerprintTiming == "immediately";
      if(showPasscode || showFingerprint) {
        this.beginAuthentication(showPasscode, showFingerprint);
      }
    }
  }

  get tabStyles() {
    return {
      tabBarBackgroundColor: GlobalStyles.constants().mainBackgroundColor,
      tabBarTranslucent: true,
      tabBarButtonColor: 'gray',
      tabBarSelectedButtonColor: GlobalStyles.constants().mainTintColor,

      // navBarBlur: true,
      navBarButtonColor: GlobalStyles.constants().mainTintColor,
      navBarTextColor: GlobalStyles.constants().mainTintColor,
      navigationBarColor: 'black', // android built in bar
      navBarBackgroundColor: GlobalStyles.constants().mainBackgroundColor, // actual top nav bar

      statusBarColor: GlobalStyles.constants().mainBackgroundColor, // Android only
      statusBarTextColorScheme: 'dark',
      statusBarTextColorSchemeSingleScreen: 'dark',

      screenBackgroundColor: GlobalStyles.constants().mainBackgroundColor
    }
  }

  start() {
    GlobalStyles.get().resolveInitialTheme().then(function(){
      Promise.all([
        Icons.get().loadIcons(),
        KeysManager.get().loadInitialData()
      ]).then(function(){
        var hasPasscode = KeysManager.get().hasOfflinePasscode();
        var hasFingerprint = KeysManager.get().hasFingerprint();
        this.beginAuthentication(hasPasscode, hasFingerprint);
      }.bind(this))
    }.bind(this))
  }

  beginAuthentication(hasPasscode, hasFingerprint) {
    if(hasPasscode) {
      this.showPasscodeLock(function(){
        if(hasFingerprint) {
          this.showFingerprintScanner(this.startActualApp.bind(this));
        } else {
          this.startActualApp();
        }
      }.bind(this));
    } else if(hasFingerprint) {
      this.showFingerprintScanner(this.startActualApp.bind(this));
    } else {
      this.startActualApp();
    }
  }

  showPasscodeLock(onAuthenticate) {
    Navigation.startSingleScreenApp({
      screen: {
        screen: 'sn.Authenticate',
        title: 'Passcode Required',
        backButtonHidden: true,
        overrideBackPress: true,
      },
      passProps: {
        mode: "authenticate",
        onAuthenticateSuccess: onAuthenticate
      },
      animationType: 'slide-down',
      tabsStyle: _.clone(this.tabStyles), // for iOS
      appStyle: _.clone(this.tabStyles) // for Android
    })
  }

  showFingerprintScanner(onAuthenticate) {
    Navigation.startSingleScreenApp({
      screen: {
        screen: 'sn.Fingerprint',
        title: 'Fingerprint Required',
        backButtonHidden: true,
        overrideBackPress: true,
      },
      passProps: {
        mode: "authenticate",
        onAuthenticateSuccess: onAuthenticate
      },
      animationType: 'slide-down',
      tabsStyle: _.clone(this.tabStyles), // for iOS
      appStyle: _.clone(this.tabStyles) // for Android
    })
  }

  startActualApp() {
    Navigation.startTabBasedApp({
      tabs: tabs,
      animationType: Platform.OS === 'ios' ? 'slide-down' : 'fade',
      tabsStyle: _.clone(this.tabStyles), // for iOS
      appStyle: _.clone(this.tabStyles) // for Android
    });
  }

  reload() {
    Icons.get().loadIcons();
    this.startActualApp();
  }
}
