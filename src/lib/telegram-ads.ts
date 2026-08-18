// Ads helper: RichAds (https://richads.com/publishers/telegram) only.
// Rewarded video formats, highest-paying first, loaded and shown on demand.
// Nothing is loaded until the user taps "Watch", so no auto banners or push ads.

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

/** Collect every callable member, including prototype methods (SDK is minified). */
const listMethods = (obj: any): string[] => {
  const out = new Set<string>();
  let proto = obj;
  while (proto && proto !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (name === "constructor") continue;
      try {
        if (typeof obj[name] === "function") out.add(name);
      } catch {
        /* getters may throw */
      }
    }
    proto = Object.getPrototypeOf(proto);
  }
  return [...out];
};

/** Highest-paying formats first: rewarded video > video > rewarded > interstitial > native. */
const score = (name: string): number => {
  const n = name.toLowerCase();
  if (!n.startsWith("trigger")) return -1;
  let s = 0;
  if (n.includes("video")) s += 4;
  if (n.includes("reward")) s += 3;
  if (n.includes("interstitial")) s += 2;
  if (n.includes("native") || n.includes("notification")) s += 1;
  return s;
};

const getRichController = async () => {
  if (richController) return richController;
  const loaded = await loadScript(RICHADS_SDK);
  if (!loaded) return null;
  const Ctor = (window as any).TelegramAdsController;
  if (typeof Ctor !== "function") return null;
  try {
    const controller = new Ctor();
    // The SDK has shipped both signatures; call the object form first,
    // then the positional one if the ids did not stick.
    try {
      controller.initialize({ pubId: RICHADS_PUB_ID, appId: RICHADS_APP_ID });
    } catch {
      /* fall through */
    }
    if (!controller.pubId) {
      try {
        controller.initialize(RICHADS_PUB_ID, RICHADS_APP_ID);
      } catch {
        /* ignore */
      }
    }
    richController = controller;
  } catch {
    richController = null;
  }
  return richController;
};

/**
 * Shows exactly one RichAds rewarded ad, only when called from a user action
 * (the "Watch" button). Tries every available format, highest paying first.
 */
export const showAd = async (): Promise<boolean> => {
  const controller = await getRichController();
  if (!controller) return false;

  const methods = listMethods(controller)
    .filter((m) => score(m) > 0)
    .sort((a, b) => score(b) - score(a));

  for (const method of methods) {
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
