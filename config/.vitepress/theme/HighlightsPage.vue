<template>
  <section class="hl-page">
    <header class="hl-page__header">
      <h1>Highlights</h1>
      <div class="hl-page__actions">
        <input
          v-model="searchQuery"
          class="hl-search"
          type="search"
          placeholder="Search highlights"
        />
        <button class="hl-export-btn" @click="loadSeed">Load seed</button>
        <label class="hl-import-btn">
          Import JSON
          <input
            class="hl-import-input"
            type="file"
            accept="application/json"
            @change="importJson"
          />
        </label>
        <button class="hl-export-btn" @click="exportJson">Export JSON</button>
      </div>
    </header>

    <div v-if="filteredGroups.length === 0" class="hl-empty">
      No highlights yet.
    </div>

    <div v-for="group in filteredGroups" :key="group.pagePath" class="hl-group">
      <h2 class="hl-group__title" :id="group.anchorId">
        <a :href="group.pagePath">{{ group.pageTitle }}</a>
      </h2>
      <ul class="hl-list">
        <li v-for="item in group.items" :key="item.id" class="hl-item">
          <div class="hl-item__body">
            <a class="hl-item__link" :href="itemLink(item)">
              <span v-if="item.type === 'text'" class="hl-item__quote">
                {{ item.quote }}
              </span>
              <span v-else class="hl-item__quote hl-item__quote--image">
                <img
                  v-if="item.imageSrc"
                  :src="resolvedImageSrc(item)"
                  alt="Highlighted image"
                  class="hl-item__image"
                />
                <span class="hl-item__meta">
                  Image highlight
                  <span v-if="item.imageSrc">({{ shortSrc(item.imageSrc) }})</span>
                </span>
              </span>
            </a>
            <input
              class="hl-item__note"
              type="text"
              :value="item.note || ''"
              placeholder="Add a note (optional)"
              @input="updateNote(item.id, ($event.target as HTMLInputElement).value)"
            />
          </div>
          <button class="hl-delete-btn" @click="remove(item.id)">Delete</button>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { withBase } from "vitepress";
import {
  highlightState,
  highlightStore,
  normalizePath,
  type HighlightItem,
} from "./highlightStore";

type HighlightGroup = {
  pagePath: string;
  pageTitle: string;
  items: HighlightItem[];
  anchorId: string;
};

const groupedHighlights = computed<HighlightGroup[]>(() => {
  highlightStore.load();
  const byPage = new Map<string, HighlightGroup>();
  highlightState.items.forEach((item) => {
    const pagePath = normalizePath(item.pagePath);
    const entry =
      byPage.get(pagePath) || {
        pagePath,
        pageTitle: item.pageTitle,
        items: [],
        anchorId: "",
      };
    entry.items.push(item);
    byPage.set(pagePath, entry);
  });
  return Array.from(byPage.values())
    .map((group) => {
      const anchorId = `hl-group-${slugify(group.pageTitle)}`;
      return {
        ...group,
        anchorId,
        items: group.items.slice().sort((a, b) => a.orderIndex - b.orderIndex),
      };
    })
    .sort((a, b) => a.pageTitle.localeCompare(b.pageTitle));
});

const searchQuery = ref("");

const filteredGroups = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return groupedHighlights.value;
  return groupedHighlights.value
    .map((group) => {
      const items = group.items.filter((item) => {
        const haystack = [
          item.quote || "",
          item.note || "",
          item.pageTitle || "",
          item.imageSrc || "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);
});

function itemLink(item: HighlightItem) {
  return `${normalizePath(item.pagePath)}#hl-${item.id}`;
}

function remove(id: string) {
  highlightStore.remove(id);
}

function updateNote(id: string, value: string) {
  highlightStore.updateNote(id, value);
}

function shortSrc(src: string) {
  const parts = src.split("/");
  return parts[parts.length - 1] || src;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function resolvedImageSrc(item: HighlightItem) {
  if (!item.imageSrc) return "";
  try {
    const base = `${window.location.origin}${item.pagePath}`;
    return new URL(item.imageSrc, base).toString();
  } catch {
    return item.imageSrc;
  }
}

function exportJson() {
  const payload = JSON.stringify({ items: highlightState.items }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.href = url;
  link.download = `cure-dolly-highlights-${timestamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function loadSeed() {
  fetch(withBase("/cure-dolly-highlights-by-chris.json"))
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      if (!data || !Array.isArray(data.items)) return;
      highlightState.items = data.items;
      highlightStore.save();
    })
    .catch(() => {
      // Ignore seed load errors.
    });
}

function importJson(event: Event) {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || ""));
      if (!data || !Array.isArray(data.items)) return;
      highlightState.items = data.items;
      highlightStore.save();
    } catch {
      // Ignore invalid JSON.
    } finally {
      if (input) input.value = "";
    }
  };
  reader.readAsText(file);
}
</script>
