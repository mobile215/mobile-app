#import "AppDelegate.h"
#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <BugsnagReactNative/BugsnagReactNative.h>
#import <WebKit/WKWebsiteDataStore.h>
#import <TrustKit/TrustKit.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [BugsnagReactNative start];
  
  [self disableUrlCache];
  
  [self configurePinning];

  [self clearWebEditorCache];

  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge moduleName:@"StandardNotes" initialProperties:nil];

  rootView.backgroundColor = [[UIColor alloc] initWithRed:1.0f green:1.0f blue:1.0f alpha:1];

  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];

  return YES;
}

- (void)disableUrlCache {
  // Disable NSURLCache for general network requests. Caches are not protected by NSFileProtectionComplete.
  // Disabling, or implementing a custom subclass are only two solutions. https://stackoverflow.com/questions/27933387/nsurlcache-and-data-protection
  NSURLCache *sharedCache = [[NSURLCache alloc] initWithMemoryCapacity:0 diskCapacity:0 diskPath:nil];
  [NSURLCache setSharedURLCache:sharedCache];
}

- (void)clearWebEditorCache {
  // Clear web editor cache after every app update
  NSString *lastVersionClearKey = @"lastVersionClearKey";
  NSString *lastVersionClear = [[NSUserDefaults standardUserDefaults] objectForKey:lastVersionClearKey];
  NSString *currentVersion = [[NSBundle mainBundle] objectForInfoDictionaryKey: @"CFBundleShortVersionString"];
  if(![currentVersion isEqualToString:lastVersionClear]) {
    // UIWebView
    [[NSURLCache sharedURLCache] removeAllCachedResponses];

    // WebKit
    NSSet *websiteDataTypes = [WKWebsiteDataStore allWebsiteDataTypes];
    NSDate *dateFrom = [NSDate dateWithTimeIntervalSince1970:0];
    [[WKWebsiteDataStore defaultDataStore] removeDataOfTypes:websiteDataTypes modifiedSince:dateFrom completionHandler:^{}];

    [[NSUserDefaults standardUserDefaults] setObject:currentVersion forKey:lastVersionClearKey];
  }
}

- (void)configurePinning {
  NSDictionary *trustKitConfig =
  @{
    kTSKSwizzleNetworkDelegates: @YES,
    
    // The list of domains we want to pin and their configuration
    kTSKPinnedDomains: @{
      @"sync.standardnotes.org" : @{
        kTSKIncludeSubdomains:@YES,
        
        // Do not block connections if pinning validation failed so the App doesn't break
        kTSKEnforcePinning:@NO,
      
        // Send reports for pin validation failures so we can track them
        kTSKReportUris: @[@"https://standard.report-uri.com/r/d/csp/reportOnly"],
        
        // The pinned public keys' Subject Public Key Info hashes
        kTSKPublicKeyHashes : @[
          @"C5+lpZ7tcVwmwQIMcRtPbsQtWLABXhQzejna0wHFr8M=",
          @"YLh1dUR9y6Kja30RrAn7JKnbQG/uEtLMkBgFF2Fuihg=",
          @"sRHdihwgkaib1P1gxX8HFszlD+7/gTfNvuAybgLPNis=",
          @"++MBgDH5WGvL9Bcn5Be30cRcL0f5O+NyoXuWtQdX1aI=",
          @"f0KW/FtqTjs108NpYj42SrGvOB2PpxIVM8nWxjPqJGE=",
          @"NqvDJlas/GRcYbcWE8S/IceH9cq77kg0jVhZeAPXq8k=",
          @"9+ze1cZgR9KO1kZrVDxA4HQ6voHRCSVNz4RdTCx4U8U="
        ],
      },
    }
  };
  [TrustKit initSharedInstanceWithConfiguration:trustKitConfig];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
