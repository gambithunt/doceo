import "clsx";
import { o as onDestroy } from "../../chunks/svelte-vendor.js";
import { c as createInitialState } from "../../chunks/platform.js";
import "../../chunks/supabase2.js";
import { a as appState } from "../../chunks/app-state.js";
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { children } = $$props;
    createInitialState();
    const unsubscribe = appState.subscribe((value) => {
    });
    onDestroy(() => {
      unsubscribe();
    });
    {
      $$renderer2.push("<!--[0-->");
      children($$renderer2);
      $$renderer2.push(`<!---->`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _layout as default
};
