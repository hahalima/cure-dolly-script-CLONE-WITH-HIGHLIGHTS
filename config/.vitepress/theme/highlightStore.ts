import { reactive } from "vue";

export type HighlightType = "text" | "image";

export type HighlightItem = {
  id: string;
  type: HighlightType;
  pagePath: string;
  pageTitle: string;
  orderIndex: number;
  createdAt: number;
  note?: string;
  quote?: string;
  startOffset?: number;
  endOffset?: number;
  imageSrc?: string;
  imageIndex?: number;
};

type HighlightState = {
  items: HighlightItem[];
  loaded: boolean;
};

const STORAGE_KEY = "cure-dolly-highlights-v1";
const DEFAULT_HIGHLIGHTS_URL = "/highlights.json";

export function normalizePath(path: string) {
  return path.replace(/\.html$/, "") || "/";
}

export const highlightState = reactive<HighlightState>({
  items: [],
  loaded: false,
});

export const highlightStore = {
  load() {
    if (highlightState.loaded) return;
    highlightState.loaded = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.items)) {
        highlightState.items = data.items;
      }
      return;
    } catch {
      // Ignore storage errors and start fresh.
    }

    void fetch(DEFAULT_HIGHLIGHTS_URL)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data || !Array.isArray(data.items)) return;
        highlightState.items = data.items;
        highlightStore.save();
      })
      .catch(() => {
        // Ignore default seed errors.
      });
  },
  save() {
    if (!highlightState.loaded) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ items: highlightState.items })
      );
    } catch {
      // Ignore storage errors.
    }
  },
  add(item: HighlightItem) {
    highlightState.items.push(item);
    this.save();
  },
  remove(id: string) {
    const index = highlightState.items.findIndex((item) => item.id === id);
    if (index === -1) return;
    highlightState.items.splice(index, 1);
    this.save();
  },
  updateNote(id: string, note: string) {
    const item = highlightState.items.find((entry) => entry.id === id);
    if (!item) return;
    item.note = note;
    this.save();
  },
};
