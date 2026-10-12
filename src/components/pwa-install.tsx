"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstall() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isAppleMobile, setIsAppleMobile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setIsAppleMobile(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    );
    const standalone = window.matchMedia("(display-mode: standalone)");
    const syncDisplay = () =>
      setInstalled(
        standalone.matches ||
          Boolean(
            (navigator as Navigator & { standalone?: boolean }).standalone,
          ),
      );
    syncDisplay();
    standalone.addEventListener("change", syncDisplay);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
      setMessage("");
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((error: unknown) => {
          console.error("Offline support could not start:", error);
        });
    }
    return () => {
      standalone.removeEventListener("change", syncDisplay);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (busy) return;
    if (!prompt) {
      dialog.current?.showModal();
      return;
    }
    setBusy(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(
        choice.outcome === "accepted"
          ? "Installation requested. Follow your browser's instructions."
          : "You can install later from your browser menu.",
      );
    } catch {
      setMessage("Open your browser menu to install the app.");
      dialog.current?.showModal();
    } finally {
      setPrompt(null);
      setBusy(false);
    }
  }

  if (installed) return null;
  return (
    <div className="pwa-install">
      <button
        type="button"
        className="button secondary small pwa-install-button"
        onClick={install}
        disabled={busy}
      >
        <Download size={16} aria-hidden="true" />
        {busy ? "Opening..." : "Install app"}
      </button>
      <dialog ref={dialog} className="pwa-dialog" aria-labelledby="pwa-title">
        <div className="pwa-dialog-heading">
          <Download size={24} aria-hidden="true" />
          <h2 id="pwa-title">
            {isAppleMobile ? "Install on iPhone or iPad" : "Take GUE with you."}
          </h2>
        </div>
        <p>Add Global University Expo to your home screen for quick access.</p>
        <div className="pwa-instructions">
          <p>
            <strong>iPhone or iPad</strong>
            <br />
            Open this site in Safari. Tap Share (the square with an upward
            arrow), then Add to Home Screen. Keep Open as Web App enabled if
            shown, and tap Add.
          </p>
          {isAppleMobile && (
            <p>
              If you opened this link inside another app, open it in Safari
              first. Launch GUE using its new Home Screen icon after adding it.
            </p>
          )}
          {!isAppleMobile && (
            <>
              <p>
                <strong>Android</strong>
                <br />
                Open the browser menu and choose Install app or Add to Home
                screen, if available.
              </p>
              <p>
                <strong>Desktop</strong>
                <br />
                Look for the install icon in the address bar or the Install app
                option in your browser menu. If unavailable, try Chrome or Edge.
              </p>
            </>
          )}
        </div>
        <p className="pwa-dialog-note">
          Your account and bookings need an internet connection.
        </p>
        <form method="dialog">
          <button className="button small" autoFocus>
            Got it
          </button>
        </form>
      </dialog>
      <span className="pwa-status" role="status">
        {message}
      </span>
    </div>
  );
}
