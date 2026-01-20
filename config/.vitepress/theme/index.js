import DefaultTheme from "vitepress/theme";
import Layout from "./Layout.vue";
import HighlightsPage from "./HighlightsPage.vue";
import "./custom.css";
import "./style.css";

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component("HighlightsPage", HighlightsPage);
  },
};
