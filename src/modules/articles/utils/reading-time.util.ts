export function calculateReadingTimeMinutes(content: string) {
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  if (wordCount === 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(wordCount / 200));
}
