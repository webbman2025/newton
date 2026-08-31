export const APP_NAVIGATE_HOME_EVENT = "app:navigate-home";

export function dispatchNavigateHome() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(APP_NAVIGATE_HOME_EVENT));
}
