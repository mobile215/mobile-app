import { SCREEN_AUTHENTICATE } from '@Screens/screens';
import { StyleKit } from '@Style/StyleKit';
import { Platform } from 'react-native';
import {
  Challenge,
  Environment,
  platformFromString,
  SNApplication,
} from 'snjs';
import { AlertService } from './AlertService';
import { ApplicationState } from './ApplicationState';
import { BackupsService } from './BackupsService';
import { ComponentGroup } from './componentGroup';
import { EditorGroup } from './EditorGroup';
import { MobileDeviceInterface } from './interface';
import { navigate } from './NavigationService';
import { PreferencesManager } from './PreferencesManager';
import { ReviewService } from './reviewService';
import { SNReactNativeCrypto } from './SNReactNativeCrypto';

type MobileServices = {
  applicationState: ApplicationState;
  reviewService: ReviewService;
  backupsService: BackupsService;
  themeService: StyleKit;
  prefsService: PreferencesManager;
};

export class MobileApplication extends SNApplication {
  private onDeinit?: (app: MobileApplication) => void;
  private MobileServices!: MobileServices;
  public editorGroup: EditorGroup;
  public componentGroup: ComponentGroup;
  public Uuid: string; // UI remounts when Uuid changes

  constructor(onDeinit: (app: MobileApplication) => void) {
    const namespace = '';
    const deviceInterface = new MobileDeviceInterface(namespace);
    super(
      Environment.Mobile,
      platformFromString(Platform.OS),
      deviceInterface,
      new SNReactNativeCrypto(),
      new AlertService(),
      namespace
    );
    this.Uuid = Math.random().toString();
    this.onDeinit = onDeinit;
    this.editorGroup = new EditorGroup(this);
    this.componentGroup = new ComponentGroup(this);
  }

  deinit() {
    for (const key of Object.keys(this.MobileServices)) {
      const service = (this.MobileServices as any)[key];
      if (service.deinit) {
        service.deinit();
      }
      service.application = undefined;
    }
    this.MobileServices = {} as MobileServices;
    this.onDeinit!(this);
    this.onDeinit = undefined;
    this.editorGroup.deinit();
    this.componentGroup.deinit();
    super.deinit();
  }

  promptForChallenge(challenge: Challenge) {
    navigate(SCREEN_AUTHENTICATE, { challenge });
  }

  setMobileServices(services: MobileServices) {
    this.MobileServices = services;
  }

  public getAppState() {
    return this.MobileServices.applicationState;
  }

  public getBackupsService() {
    return this.MobileServices.backupsService;
  }

  public getPrefsService() {
    return this.MobileServices.prefsService;
  }
}
