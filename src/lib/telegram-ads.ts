// Ads helper: rewarded video only, loaded and shown on demand.
// No SDK is loaded until the user explicitly taps "Watch Ad", so no automatic
// banners, push ads or interstitials can appear anywhere in the app.

// Rewarded video formats only (no push / banner / auto formats).
const AD_METHODS = ["triggerRewardedVideo", "triggerRewardedInterstitial"] as const;

const RICHADS_SDK = "https://richinfo.co/richpartners/telegram/js/tg-ob.js";
const ADSGRAM_SDK = "https://sad.adsgram.ai/js/sad.min.js";

const ADSGRAM_BLOCK_ID =
  (import.meta.env.VITE_ADSGRAM_BLOCK_ID as string | undefined) ||
  ((window as any).ADSGRAM_BLOCK_ID as string | undefined) ||
  "";

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
    controller.initialize({
      pubId: (window as any).RICHADS_PUB_ID ?? "998796",
      appId: (window as any).RICHADS_APP_ID ?? "8586",
    });
    richController = controller;
  } catch {
    richController = null;
  }
  return richController;
};

const showRichAd = async (): Promise<boolean> => {
  const controller = await getRichController();
  if (!controller) return false;
  for (const method of AD_METHODS) {
    if (typeof controller[method] !== "function") continue;
    try {
      await controller[method]();
      return true;
    } catch {
      // try the next rewarded format
    }
  }
  return false;
};

let adsgramController: any = null;

const getAdsgram = async () => {
  if (!ADSGRAM_BLOCK_ID) return null;
  if (adsgramController) return adsgramController;
  const loaded = await loadScript(ADSGRAM_SDK);
  if (!loaded) return null;
  if (typeof (window as any).Adsgram?.init !== "function") return null;
  try {
    adsgramController = (window as any).Adsgram.init({ blockId: ADSGRAM_BLOCK_ID });
  } catch {
    adsgramController = null;
  }
  return adsgramController;
};

const showAdsgramAd = async (): Promise<boolean> => {
  const controller = await getAdsgram();
  if (!controller) return false;
  try {
    const res = await controller.show();
    // Adsgram resolves with { done: true } when the ad was fully watched.
    return res?.done !== false;
  } catch {
    return false;
  }
};

/**
 * Shows exactly one rewarded video, only when called from a user action.
 * Sources alternate so load is shared; if one has no ad the other is tried.
 */
let lastSource: "rich" | "adsgram" = "adsgram";

export const showAd = async (): Promise<boolean> => {
  const richFirst = lastSource === "adsgram";
  const order: Array<"rich" | "adsgram"> = richFirst ? ["rich", "adsgram"] : ["adsgram", "rich"];

  for (const source of order) {
    const ok = source === "rich" ? await showRichAd() : await showAdsgramAd();
    if (ok) {
      lastSource = source;
      return true;
    }
  }
  return false;
};
