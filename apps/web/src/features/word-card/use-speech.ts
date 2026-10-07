import * as React from 'react';

export function useSpeech(text: string | undefined, language = 'en-US') {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speaking, setSpeaking] = React.useState(false);
  React.useEffect(
    () => () => {
      if (supported) window.speechSynthesis.cancel();
    },
    [supported, text],
  );
  const toggle = React.useCallback(() => {
    if (!supported || !text) return;
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [supported, text, language]);
  return { supported, speaking, toggle };
}
