// Math Run Plus: one purchase, no subscription. Unlocks the progress report
// details, focus practice, more players and every premium theme and pet.
//
// The real store purchase needs a development build with an in-app purchase
// library and the product set up in App Store Connect / Google Play Console.
// Until then, buying says it isn't available yet, and development builds get
// a switch on the Plus screen to try the app with and without Plus.

import { Alert, Platform } from 'react-native';

import { setPlus } from '@/progress';

export const PLUS_PRODUCT_ID = 'mathrun.plus';
// Shown until the store provides the real, local price.
export const PLUS_PRICE_LABEL = '€5.99';

function notice(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

export async function buyPlus(): Promise<boolean> {
  notice('Not available yet', 'Math Run Plus can be bought once Math Run is in the App Store and Google Play.');
  return false;
}

export async function restorePurchases(): Promise<boolean> {
  notice('Nothing to restore yet', 'Purchases can be restored once Math Run is in the App Store and Google Play.');
  return false;
}

// Development builds only: turn Plus on or off to test both versions.
export function devSetPlus(on: boolean) {
  if (__DEV__) setPlus(on);
}
