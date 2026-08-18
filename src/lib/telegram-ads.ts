// Ads helper: RichAds (https://richads.com/publishers/telegram) only.
// Rewarded video formats, highest-paying first, loaded and shown on demand.
// Nothing is loaded until the user taps "Watch", so no auto banners or push ads.

// Highest-paying rewarded formats first, cheaper fallbacks after.
const AD_METHODS = [
  "triggerRewardedVideo",
  "triggerRewardedVideoAd",
  "triggerRewardedInterstitial",
  "triggerInterstitial",
] as const;

const RICHADS_SDK = "https://richinfo.co/richpartners/telegram/js/tg-ob.js";

const RICHADS_PUB_ID =
  (import.meta.env.VITE_RICHADS_PUB_ID as string | undefined) ||
  ((window as any).RICHADS_PUB_ID as string | undefined) ||
  "998796";

const RICHADS_APP_ID =
  (import.meta.env.VITE_RICHADS_APP_ID as string | undefined) ||
  ((window as any).RICHADS_APP_ID as string | undefined) ||
  "8586";

const scriptCache = new Map<string, Promise<boolean>>();

const loadScript = (src: string): Promise<boolean> => {
  const cached = scriptCache.get(src);
  if (cached) return cached;

  const promise = new Promise<boolean>((resolve) => {
    try {
      const el = document.createElement("script");
      el.src = src;
      el.async = true;
      el.onload = () => resolve(true);
      el.onerror = () => resolve(false);
      document.head.appendChild(el);
    } catch {
      resolve(false);
    }
  });

  scriptCache.set(src, promise);
  return promise;
};

export const isAdsReady = () => true;

let richController: any = null;

const getRichController = async () => {
  if (richController) return richController;
  const loaded = await loadScript(RICHADS_SDK);
  if (!loaded) return null;
  const Ctor = (window as any).TelegramAdsController;
  if (typeof Ctor !== "function") return null;
  try {
    const controller = new Ctor();
    controller.initialize({ pubId: RICHADS_PUB_ID, appId: RICHADS_APP_ID });
    richController = controller;
  } catch {
    richController = null;
  }
  return richController;
};

/**
 * Shows exactly one RichAds rewarded video, only when called from a user action
 * (the "Watch" button). Falls back through the remaining rewarded formats when
 * no video is currently available.
 */
export const showAd = async (): Promise<boolean> => {
  const controller = await getRichController();
  if (!controller) return false;

  for (const method of AD_METHODS) {
    if (typeof controller[method] !== "function") continue;
    try {
      const res = await controller[method]();
      if (res === false) continue;
      return true;
    } catch {
      // no fill for this format, try the next one
    }
  }
  return false;
};
