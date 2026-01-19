<template>
  <Teleport v-if="asideExists && teleportTarget && !isHighlightsPage" :to="teleportTarget">
    <div class="hl-nav">
      <button
        class="hl-nav__btn"
        :disabled="!prevId"
        @click="scrollTo(prevId)"
        title="Previous highlight"
      >
        ↑ Prev
      </button>
      <button
        class="hl-nav__btn"
        :disabled="!nextId"
        @click="scrollTo(nextId)"
        title="Next highlight"
      >
        ↓ Next
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vitepress";
import { highlightState, highlightStore, normalizePath } from "./highlightStore";

const route = useRoute();
const asideExists = ref(false);
const isHighlightsPage = ref(false);
const teleportTarget = ref<HTMLElement | null>(null);
const prevId = ref<string | null>(null);
const nextId = ref<string | null>(null);
const highlightOrder = ref<{ id: string; top: number }[]>([]);
const currentIndex = ref(0);
const activeId = ref<string | null>(null);

function collectHighlights() {
  const items = highlightState.items
    .filter((item) => normalizePath(item.pagePath) === normalizePath(route.path))
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const elements = items
    .map((item) => {
      const el = document.getElementById(`hl-${item.id}`);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      return { id: item.id, top };
    })
    .filter((entry): entry is { id: string; top: number } => !!entry);

  if (elements.length === 0) {
    highlightOrder.value = [];
    nextId.value = null;
    prevId.value = null;
    return;
  }

  highlightOrder.value = elements;
  const hashId = window.location.hash.replace("#hl-", "");
  const activeIndex = activeId.value
    ? elements.findIndex((entry) => entry.id === activeId.value)
    : -1;
  const hashIndex = hashId
    ? elements.findIndex((entry) => entry.id === hashId)
    : -1;

  if (activeIndex >= 0) {
    currentIndex.value = activeIndex;
    prevId.value = activeIndex > 0 ? elements[activeIndex - 1].id : null;
    nextId.value =
      activeIndex < elements.length - 1 ? elements[activeIndex + 1].id : null;
    setActiveHighlight(elements[activeIndex]?.id || null);
    return;
  }

  if (hashIndex >= 0) {
    currentIndex.value = hashIndex;
    prevId.value = hashIndex > 0 ? elements[hashIndex - 1].id : null;
    nextId.value =
      hashIndex < elements.length - 1 ? elements[hashIndex + 1].id : null;
    setActiveHighlight(elements[hashIndex]?.id || null);
    return;
  }

  currentIndex.value = -1;
  prevId.value = null;
  nextId.value = elements[0]?.id || null;
}

function setActiveHighlight(id: string | null) {
  if (activeId.value) {
    document
      .querySelectorAll<HTMLElement>(`[data-hl-id="${activeId.value}"]`)
      .forEach((el) => el.classList.remove("hl-active"));
  }
  activeId.value = id;
  if (!id) return;
  document
    .querySelectorAll<HTMLElement>(`[data-hl-id="${id}"]`)
    .forEach((el) => el.classList.add("hl-active"));
}

function scrollTo(id: string | null) {
  if (!id) return;
  const el = document.getElementById(`hl-${id}`);
  if (!el) return;
  const getTopOffset = () => {
    const nav =
      document.querySelector<HTMLElement>(".VPNav") ||
      document.querySelector<HTMLElement>(".VPNavBar") ||
      document.querySelector<HTMLElement>(".VPNavBarTitle");
    const navHeight = nav?.getBoundingClientRect().height ?? 0;
    return navHeight + 56;
  };
  const scrollToTopAligned = () => {
    const rect = el.getBoundingClientRect();
    const offset = getTopOffset();
    const targetTop = Math.max(0, rect.top + window.scrollY - offset);
    window.scrollTo({ top: targetTop, behavior: "auto" });
  };
  scrollToTopAligned();
  window.requestAnimationFrame(scrollToTopAligned);
  window.setTimeout(scrollToTopAligned, 50);
  window.history.replaceState(null, "", `${window.location.pathname}#hl-${id}`);
  const index = highlightOrder.value.findIndex((entry) => entry.id === id);
  if (index !== -1) {
    currentIndex.value = index;
    prevId.value = index > 0 ? highlightOrder.value[index - 1].id : null;
    nextId.value =
      index < highlightOrder.value.length - 1
        ? highlightOrder.value[index + 1].id
        : null;
  }
  setActiveHighlight(id);
  setTimeout(() => {
    collectHighlights();
  }, 50);
}

function updateAsidePresence() {
  isHighlightsPage.value = normalizePath(route.path) === "/highlights";
  const aside = document.querySelector(".aside-container");
  asideExists.value = !!aside;
  if (!aside) {
    teleportTarget.value = null;
    return;
  }
  const outline =
    aside.querySelector<HTMLElement>(".VPDocAsideOutline") ||
    aside.querySelector<HTMLElement>(".outline") ||
    aside.querySelector<HTMLElement>(".VPDocOutline");
  teleportTarget.value = outline || aside;
}

function handleScroll() {
  collectHighlights();
}

onMounted(() => {
  highlightStore.load();
  updateAsidePresence();
  nextTick(collectHighlights);
  window.addEventListener("scroll", handleScroll, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", handleScroll);
});

watch(
  () => route.path,
  () => {
    updateAsidePresence();
    nextTick(collectHighlights);
    setActiveHighlight(null);
  }
);

watch(
  () => highlightState.items.length,
  () => {
    nextTick(collectHighlights);
  }
);
</script>
