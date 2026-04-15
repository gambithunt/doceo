import { h as attr_class, k as bind_props, e as escape_html, i as attr, l as head, j as store_get, u as unsubscribe_stores } from "../../chunks/svelte-vendor.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "clsx";
import "@sveltejs/kit/internal/server";
import "../../chunks/root.js";
import "../../chunks/state.svelte.js";
import { a as appState } from "../../chunks/app-state.js";
function ThemeToggle($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let theme = $$props["theme"];
    $$renderer2.push(`<div class="toggle svelte-1cmi4dh"><button type="button"${attr_class("svelte-1cmi4dh", void 0, { "active": theme === "light" })}>☀️ Light</button> <button type="button"${attr_class("svelte-1cmi4dh", void 0, { "active": theme === "dark" })}>🌙 Dark</button></div>`);
    bind_props($$props, { theme });
  });
}
function LandingView($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { state: viewState } = $$props;
    let authMode = "signup";
    let firstName = "";
    let lastName = "";
    let email = "";
    let password = "";
    $$renderer2.push(`<section class="landing-shell svelte-stkfxm"><article class="intro card svelte-stkfxm"><div class="topbar svelte-stkfxm"><p class="eyebrow svelte-stkfxm">Doceo</p> `);
    ThemeToggle($$renderer2, { theme: viewState.ui.theme });
    $$renderer2.push(`<!----></div> <div class="intro-copy svelte-stkfxm"><h1 class="svelte-stkfxm">Structured learning for school students.</h1></div> <div class="intro-summary svelte-stkfxm"><strong class="svelte-stkfxm">Built for students who want a clear path.</strong> <span class="svelte-stkfxm">Learn in order, revise with intent, and ask focused questions only when you need the next step.</span></div> <div class="bullet-grid svelte-stkfxm"><div class="svelte-stkfxm"><strong class="svelte-stkfxm">Learning Hub</strong> <span class="svelte-stkfxm">Continue lessons and track weak areas.</span></div> <div class="svelte-stkfxm"><strong class="svelte-stkfxm">Lesson flow</strong> <span class="svelte-stkfxm">Overview, example, practice, mastery.</span></div> <div class="svelte-stkfxm"><strong class="svelte-stkfxm">Revision</strong> <span class="svelte-stkfxm">Condense the syllabus into focused exam preparation.</span></div> <div class="svelte-stkfxm"><strong class="svelte-stkfxm">Adaptive tutor</strong> <span class="svelte-stkfxm">Ask focused questions inside the lesson without losing your place.</span></div></div></article> <article class="auth card svelte-stkfxm"><div class="tabs svelte-stkfxm">`);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<button type="button"${attr_class("svelte-stkfxm", void 0, { "active": authMode === "signup" })}>Create account</button>`);
    }
    $$renderer2.push(`<!--]--> <button type="button"${attr_class("svelte-stkfxm", void 0, { "active": authMode === "signin" })}>Sign in</button></div> <h2 class="svelte-stkfxm">${escape_html("Create your student account")}</h2> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="name-grid svelte-stkfxm"><label class="svelte-stkfxm"><span class="svelte-stkfxm">First name</span> <input${attr("value", firstName)} class="svelte-stkfxm"/></label> <label class="svelte-stkfxm"><span class="svelte-stkfxm">Last name</span> <input${attr("value", lastName)} class="svelte-stkfxm"/></label></div>`);
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<label class="svelte-stkfxm"><span class="svelte-stkfxm">Email</span> <input${attr("value", email)} type="email" class="svelte-stkfxm"/></label> <label class="svelte-stkfxm"><span class="svelte-stkfxm">Password</span> <input${attr("value", password)} type="password" class="svelte-stkfxm"/></label> <button type="button"${attr("aria-busy", viewState.auth.status === "loading")}${attr("disabled", viewState.auth.status === "loading", true)} class="svelte-stkfxm">${escape_html(viewState.auth.status === "loading" ? "Working..." : "Create account")}</button>`);
    }
    $$renderer2.push(`<!--]--> `);
    if (viewState.auth.error) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="error svelte-stkfxm">${escape_html(viewState.auth.error)}</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></article></section>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    head("1uha8ag", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Doceo</title>`);
      });
      $$renderer3.push(`<meta name="description" content="Structured school learning with lessons, revision, progress tracking, and guided tutoring."/>`);
    });
    LandingView($$renderer2, {
      state: store_get($$store_subs ??= {}, "$appState", appState)
    });
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
