import { useEffect, useRef, useState } from "react";

export function useTypewriter(
  phrases: string[],
  typingSpeed = 70,
  deletingSpeed = 38,
  pauseMs = 2200
): string {
  const [value, setValue] = useState<string>("");
  const timeoutIdsRef = useRef<number[]>([]);

  useEffect(() => {
    if (phrases.length === 0) {
      setValue("");
      return;
    }

    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;

    const schedule = (delay: number, fn: () => void): void => {
      const id = window.setTimeout(fn, delay);
      timeoutIdsRef.current.push(id);
    };

    const step = (): void => {
      const currentPhrase = phrases[phraseIndex] ?? "";

      if (!deleting) {
        charIndex += 1;
        setValue(currentPhrase.slice(0, charIndex));

        if (charIndex >= currentPhrase.length) {
          deleting = true;
          schedule(pauseMs, step);
          return;
        }

        schedule(typingSpeed, step);
        return;
      }

      charIndex = Math.max(0, charIndex - 1);
      setValue(currentPhrase.slice(0, charIndex));

      if (charIndex === 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        schedule(typingSpeed, step);
        return;
      }

      schedule(deletingSpeed, step);
    };

    schedule(typingSpeed, step);

    return () => {
      timeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutIdsRef.current = [];
    };
  }, [phrases, typingSpeed, deletingSpeed, pauseMs]);

  return value;
}
