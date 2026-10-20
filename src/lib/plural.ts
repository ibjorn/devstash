/** "1 item", "3 items" — for nouns that pluralise with a trailing "s". */
export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
