/** Wrap the first exact-case occurrence of `word` in the serif italic span.
 *  Used with set:html, and only ever on our own copy, never user input. */
export function hl(text: string, word: string): string {
  if (!word) return text;
  const i = text.indexOf(word);
  if (i === -1) return text;
  return `${text.slice(0, i)}<span class="serif">${word}</span>${text.slice(i + word.length)}`;
}
