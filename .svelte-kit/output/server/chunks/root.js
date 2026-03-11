import { k as setContext, f as derived, l as asClassComponent } from "./svelte-vendor.js";
function Root($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      stores,
      page,
      constructors,
      components = [],
      form,
      data_0 = null,
      data_1 = null
    } = $$props;
    {
      setContext("__svelte__", stores);
    }
    {
      stores.page.set(page);
    }
    const Pyramid_1 = derived(() => constructors[1]);
    if (constructors[1]) {
      $$renderer2.push("<!--[0-->");
      const Pyramid_0 = constructors[0];
      if (Pyramid_0) {
        $$renderer2.push("<!--[-->");
        Pyramid_0($$renderer2, {
          data: data_0,
          form,
          params: page.params,
          children: ($$renderer3) => {
            if (Pyramid_1()) {
              $$renderer3.push("<!--[-->");
              Pyramid_1()($$renderer3, { data: data_1, form, params: page.params });
              $$renderer3.push("<!--]-->");
            } else {
              $$renderer3.push("<!--[!-->");
              $$renderer3.push("<!--]-->");
            }
          },
          $$slots: { default: true }
        });
        $$renderer2.push("<!--]-->");
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push("<!--]-->");
      }
    } else {
      $$renderer2.push("<!--[-1-->");
      const Pyramid_0 = constructors[0];
      if (Pyramid_0) {
        $$renderer2.push("<!--[-->");
        Pyramid_0($$renderer2, { data: data_0, form, params: page.params });
        $$renderer2.push("<!--]-->");
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push("<!--]-->");
      }
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
const root = asClassComponent(Root);
export {
  root as r
};
