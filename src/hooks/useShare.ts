import { useCallback, useEffect, useState } from "react";

type UseShareInput = {
  url: string;
  title: string;
  text: string;
};

export function useShare({ url, title, text }: UseShareInput) {
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (!toastVisible) return;
    const id = window.setTimeout(() => setToastVisible(false), 2000);
    return () => window.clearTimeout(id);
  }, [toastVisible]);

  const share = useCallback(async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setToastVisible(true);
    } catch {
      /* Error */
    }
  }, [url, title, text]);

  return { share, toastVisible };
}
