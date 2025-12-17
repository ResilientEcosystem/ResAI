import {
  createHighlighter,
  type BundledLanguage,
  type BundledTheme,
} from "shiki";

let highlighter: Awaited<ReturnType<typeof createHighlighter>> | null = null;
const loadedLanguages = new Set<string>();
const loadedThemes = new Set<string>();

const commonLanguages: BundledLanguage[] = [
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "python",
  "bash",
  "json",
  "yaml",
  "markdown",
  "md",
  "html",
  "css",
  "sql",
  "rust",
  "go",
  "java",
  "c",
  "cpp",
  "xml",
  "shell",
  "sh",
];

export async function getShikiHighlighter() {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ["dark-plus", "github-light"],
      langs: commonLanguages,
    });
    loadedThemes.add("dark-plus");
    loadedThemes.add("github-light");
    commonLanguages.forEach((lang) => loadedLanguages.add(lang));
  }
  return highlighter;
}

export async function codeToHast(
  code: string,
  options: {
    lang: string | BundledLanguage;
    theme: BundledTheme | string;
  },
) {
  const hl = await getShikiHighlighter();
  const lang = options.lang as BundledLanguage;

  // Only load language if it's a valid bundled language and not already loaded
  if (lang && !loadedLanguages.has(lang)) {
    try {
      await hl.loadLanguage(lang as BundledLanguage);
      loadedLanguages.add(lang);
    } catch (error) {
      // If language loading fails, skip tracking to avoid accumulating invalid entries
      // This prevents memory leaks from invalid language strings
    }
  }

  // Only load theme if it's not already loaded
  if (options.theme && !loadedThemes.has(options.theme)) {
    try {
      await hl.loadTheme(options.theme as BundledTheme);
      loadedThemes.add(options.theme);
    } catch (error) {
      // If theme loading fails, skip tracking to avoid accumulating invalid entries
      // This prevents memory leaks from invalid theme strings
    }
  }

  return hl.codeToHast(code, {
    lang,
    theme: options.theme as BundledTheme,
  });
}

export function getBundledLanguages() {
  return highlighter?.getLoadedLanguages() ?? commonLanguages;
}


