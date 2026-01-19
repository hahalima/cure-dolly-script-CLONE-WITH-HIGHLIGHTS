<template>
  <Teleport to="body">
    <button
      v-show="showTextButton"
      class="hl-float-btn"
      :style="{ top: `${textButtonPos.y}px`, left: `${textButtonPos.x}px` }"
      @click="handleCreateTextHighlight"
    >
      Highlight
    </button>
    <button
      v-show="showImageButton"
      class="hl-image-btn"
      :style="{ top: `${imageButtonPos.y}px`, left: `${imageButtonPos.x}px` }"
      @click="handleToggleImageHighlight"
    >
      Highlight image
    </button>
    <button
      v-show="showDeleteButton"
      class="hl-delete-float-btn"
      :style="{ top: `${deleteButtonPos.y}px`, left: `${deleteButtonPos.x}px` }"
      @click="handleDeleteHighlight"
    >
      Delete highlight
    </button>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useData, useRoute } from "vitepress";
import {
  highlightState,
  highlightStore,
  normalizePath,
  type HighlightItem,
} from "./highlightStore";

type TextOffsets = {
  start: number;
  end: number;
};

const route = useRoute();
const { page } = useData();

const showTextButton = ref(false);
const showImageButton = ref(false);
const showDeleteButton = ref(false);
const activeRange = ref<Range | null>(null);
const activeImage = ref<HTMLImageElement | null>(null);
const deleteTargetId = ref<string | null>(null);

const textButtonPos = reactive({ x: 0, y: 0 });
const imageButtonPos = reactive({ x: 0, y: 0 });
const deleteButtonPos = reactive({ x: 0, y: 0 });

const pagePath = computed(() => normalizePath(route.path));
const pageTitle = computed(
  () => page.value.title || page.value.frontmatter?.title || route.path
);

const pageHighlights = computed(() =>
  highlightState.items.filter(
    (item) => normalizePath(item.pagePath) === pagePath.value
  )
);

const textHighlights = computed(() =>
  pageHighlights.value.filter((item) => item.type === "text")
);

const imageHighlights = computed(() =>
  pageHighlights.value.filter((item) => item.type === "image")
);

function getContentRoot(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(".vp-doc") ||
    document.querySelector<HTMLElement>(".content") ||
    document.querySelector<HTMLElement>("main")
  );
}

function clearExistingTextHighlights(root: HTMLElement) {
  const spans = root.querySelectorAll("span[data-hl-id]");
  spans.forEach((span) => {
    const parent = span.parentNode;
    if (!parent) return;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
    parent.normalize();
  });
}

function wrapTextRange(root: HTMLElement, item: HighlightItem) {
  if (typeof item.startOffset !== "number" || typeof item.endOffset !== "number") {
    return;
  }
  let currentOffset = 0;
  let appliedId = false;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.parentElement) return NodeFilter.FILTER_REJECT;
      if (node.parentElement.closest("[data-hl-id]")) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node: Text | null = walker.nextNode() as Text | null;
  while (node) {
    const nextNode = walker.nextNode() as Text | null;
    const text = node.textContent || "";
    const nodeStart = currentOffset;
    const nodeEnd = currentOffset + text.length;

    if (nodeEnd <= item.startOffset || nodeStart >= item.endOffset) {
      currentOffset = nodeEnd;
      node = nextNode;
      continue;
    }

    const startInNode = Math.max(0, item.startOffset - nodeStart);
    const endInNode = Math.min(text.length, item.endOffset - nodeStart);

    const before = text.slice(0, startInNode);
    const middle = text.slice(startInNode, endInNode);
    const after = text.slice(endInNode);

    const fragment = document.createDocumentFragment();
    if (before) {
      fragment.appendChild(document.createTextNode(before));
    }
    if (middle) {
      const span = document.createElement("span");
      span.dataset.hlId = item.id;
      span.className = "hl-text";
      span.textContent = middle;
      if (!appliedId) {
        span.id = `hl-${item.id}`;
        appliedId = true;
      }
      fragment.appendChild(span);
    }
    if (after) {
      fragment.appendChild(document.createTextNode(after));
    }

    node.parentNode?.replaceChild(fragment, node);
    currentOffset = nodeEnd;
    node = nextNode;
  }
}

function unwrapImageWrappers(root: HTMLElement) {
  const wraps = root.querySelectorAll<HTMLElement>(".hl-image-wrap[data-hl-ready]");
  wraps.forEach((wrap) => {
    const img = wrap.querySelector("img");
    if (!img) return;
    wrap.replaceWith(img);
  });
}

function ensureImageWrappers(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  images.forEach((img) => {
    const parent = img.parentElement;
    if (parent && parent.classList.contains("hl-image-wrap")) return;
    const wrap = document.createElement("span");
    wrap.className = "hl-image-wrap";
    wrap.dataset.hlReady = "true";
    img.replaceWith(wrap);
    wrap.appendChild(img);
  });
}

function applyImageHighlights(root: HTMLElement) {
  const wraps = Array.from(root.querySelectorAll<HTMLElement>(".hl-image-wrap"));
  wraps.forEach((wrap) => wrap.classList.remove("hl-image-active"));
  imageHighlights.value.forEach((item) => {
    if (typeof item.imageIndex !== "number") return;
    const wrap = wraps[item.imageIndex];
    if (!wrap) return;
    wrap.classList.add("hl-image-active");
    wrap.id = `hl-${item.id}`;
    wrap.dataset.hlId = item.id;
  });
}

function rebuildHighlights() {
  const root = getContentRoot();
  if (!root) return;
  clearExistingTextHighlights(root);
  unwrapImageWrappers(root);
  ensureImageWrappers(root);
  textHighlights.value.forEach((item) => wrapTextRange(root, item));
  applyImageHighlights(root);
}

function getOffsetsFromRange(root: HTMLElement, range: Range): TextOffsets {
  const startRange = range.cloneRange();
  startRange.selectNodeContents(root);
  startRange.setEnd(range.startContainer, range.startOffset);
  const start = startRange.toString().length;

  const endRange = range.cloneRange();
  endRange.selectNodeContents(root);
  endRange.setEnd(range.endContainer, range.endOffset);
  const end = endRange.toString().length;
  return { start, end };
}

function selectionOverlapsHighlight(range: Range): boolean {
  const root = getContentRoot();
  if (!root) return false;
  const spans = root.querySelectorAll("span[data-hl-id]");
  for (const span of spans) {
    if (range.intersectsNode(span)) return true;
  }
  return false;
}

function handleSelectionChange() {
  if (route.path === "/highlights") return;
  const root = getContentRoot();
  if (!root) return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    showTextButton.value = false;
    activeRange.value = null;
    return;
  }
  const range = selection.getRangeAt(0);
  if (selection.isCollapsed || !root.contains(range.commonAncestorContainer)) {
    showTextButton.value = false;
    activeRange.value = null;
    return;
  }
  if (selectionOverlapsHighlight(range)) {
    showTextButton.value = false;
    activeRange.value = null;
    return;
  }
  const rect = range.getBoundingClientRect();
  if (!rect) return;
  textButtonPos.x = window.scrollX + rect.right + 8;
  textButtonPos.y = window.scrollY + rect.top - 8;
  showTextButton.value = true;
  activeRange.value = range;
}

function findImagesInRange(root: HTMLElement, range: Range): HTMLImageElement[] {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  return images.filter((img) => range.intersectsNode(img));
}

function getImageOrderIndex(root: HTMLElement, img: HTMLImageElement): number {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEndBefore(img);
  return range.toString().length + 0.5;
}

function createImageHighlight(
  root: HTMLElement,
  img: HTMLImageElement,
  existingIds: Set<string>
) {
  const wraps = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  const imageIndex = wraps.indexOf(img);
  if (imageIndex === -1) return;
  const orderIndex = getImageOrderIndex(root, img);
  const imageSrc = img.getAttribute("src") || "";
  const duplicate = imageHighlights.value.some(
    (item) => item.imageIndex === imageIndex && item.pagePath === pagePath.value
  );
  if (duplicate) return;
  const id = generateId(existingIds);
  existingIds.add(id);
  highlightStore.add({
    id,
    type: "image",
    pagePath: pagePath.value,
    pageTitle: pageTitle.value,
    orderIndex,
    createdAt: Date.now(),
    imageIndex,
    imageSrc,
    note: "",
  });
}

function handleCreateTextHighlight() {
  if (route.path === "/highlights") return;
  const root = getContentRoot();
  const range = activeRange.value;
  if (!root || !range) return;
  const selectionText = range.toString().trim();
  if (!selectionText) return;

  const { start, end } = getOffsetsFromRange(root, range);
  if (start === end) return;
  const id = generateId();
  highlightStore.add({
    id,
    type: "text",
    pagePath: pagePath.value,
    pageTitle: pageTitle.value,
    orderIndex: start,
    createdAt: Date.now(),
    startOffset: start,
    endOffset: end,
    quote: selectionText,
    note: "",
  });

  const images = findImagesInRange(root, range);
  const existingIds = new Set([id]);
  images.forEach((img) => createImageHighlight(root, img, existingIds));

  showTextButton.value = false;
  window.getSelection()?.removeAllRanges();
  nextTick(rebuildHighlights);
}

function handleImageClick(event: MouseEvent) {
  if (route.path === "/highlights") return;
  const root = getContentRoot();
  if (!root) return;
  const target = event.target as HTMLElement | null;
  if (!target || target.tagName !== "IMG") return;
  event.stopPropagation();
  const img = target as HTMLImageElement;
  const activeWrap = img.closest<HTMLElement>(".hl-image-wrap.hl-image-active");
  if (activeWrap?.dataset.hlId) {
    const rect = img.getBoundingClientRect();
    deleteButtonPos.x = window.scrollX + rect.right + 8;
    deleteButtonPos.y = window.scrollY + rect.top - 8;
    deleteTargetId.value = activeWrap.dataset.hlId;
    showDeleteButton.value = true;
    showImageButton.value = false;
    return;
  }
  const rect = img.getBoundingClientRect();
  imageButtonPos.x = window.scrollX + rect.right - 110;
  imageButtonPos.y = window.scrollY + rect.top + 6;
  activeImage.value = img;
  showImageButton.value = true;
}

function handleToggleImageHighlight() {
  const root = getContentRoot();
  if (!root || !activeImage.value) return;
  const img = activeImage.value;
  const wraps = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  const imageIndex = wraps.indexOf(img);
  if (imageIndex === -1) return;
  const existing = imageHighlights.value.find(
    (item) => item.imageIndex === imageIndex && item.pagePath === pagePath.value
  );
  if (existing) {
    highlightStore.remove(existing.id);
  } else {
    createImageHighlight(root, img, new Set());
  }
  showImageButton.value = false;
  activeImage.value = null;
  nextTick(rebuildHighlights);
}

function handleHighlightClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return;
  const span = target.closest<HTMLElement>("span[data-hl-id]");
  if (span?.dataset.hlId) {
    event.preventDefault();
    event.stopPropagation();
    const rect = span.getBoundingClientRect();
    deleteButtonPos.x = window.scrollX + rect.right + 8;
    deleteButtonPos.y = window.scrollY + rect.top - 8;
    deleteTargetId.value = span.dataset.hlId;
    showDeleteButton.value = true;
    showTextButton.value = false;
    showImageButton.value = false;
    return;
  }
  const wrap = target.closest<HTMLElement>(".hl-image-wrap.hl-image-active");
  if (wrap?.dataset.hlId) {
    event.preventDefault();
    event.stopPropagation();
    const rect = wrap.getBoundingClientRect();
    deleteButtonPos.x = window.scrollX + rect.right + 8;
    deleteButtonPos.y = window.scrollY + rect.top - 8;
    deleteTargetId.value = wrap.dataset.hlId;
    showDeleteButton.value = true;
    showTextButton.value = false;
    showImageButton.value = false;
  }
}

function handleDeleteHighlight() {
  if (!deleteTargetId.value) return;
  highlightStore.remove(deleteTargetId.value);
  showDeleteButton.value = false;
  deleteTargetId.value = null;
  nextTick(rebuildHighlights);
}

function handleOutsideClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return;
  if (
    target.closest(".hl-float-btn") ||
    target.closest(".hl-image-btn") ||
    target.closest(".hl-delete-float-btn")
  ) {
    return;
  }
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) return;
  showTextButton.value = false;
  showImageButton.value = false;
  showDeleteButton.value = false;
}

function generateId(existingIds?: Set<string>): string {
  let id = "";
  do {
    id = Math.random().toString(36).slice(2, 10);
  } while (existingIds?.has(id) || highlightState.items.some((item) => item.id === id));
  return id;
}

function handleRouteChange() {
  highlightStore.load();
  nextTick(() => {
    rebuildHighlights();
    wireImageClicks();
    scrollToHashHighlight();
  });
}

function wireImageClicks() {
  const root = getContentRoot();
  if (!root) return;
  root.querySelectorAll("img").forEach((img) => {
    img.removeEventListener("click", handleImageClick);
    img.addEventListener("click", handleImageClick);
  });
}

function scrollToHashHighlight() {
  const hash = window.location.hash;
  if (!hash.startsWith("#hl-")) return;
  const id = hash.slice(1);
  const el = document.getElementById(id);
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
}

onMounted(() => {
  highlightStore.load();
  document.addEventListener("selectionchange", handleSelectionChange);
  document.addEventListener("click", handleHighlightClick, true);
  document.addEventListener("click", handleOutsideClick);
  handleRouteChange();
});

onBeforeUnmount(() => {
  document.removeEventListener("selectionchange", handleSelectionChange);
  document.removeEventListener("click", handleHighlightClick, true);
  document.removeEventListener("click", handleOutsideClick);
});

watch(
  () => route.path,
  () => {
    showTextButton.value = false;
    showImageButton.value = false;
    showDeleteButton.value = false;
    activeRange.value = null;
    activeImage.value = null;
    deleteTargetId.value = null;
    handleRouteChange();
  }
);

watch(
  () => highlightState.items.length,
  () => {
    nextTick(rebuildHighlights);
  }
);
</script>
