import { applyAction, deserialize, type SubmitFunction } from '$app/forms';
import type { ActionResult } from '@sveltejs/kit';
import { invalidateAll } from '$app/navigation';
import { buildAdminAuthHeaders } from '$lib/admin-auth';
import { supabase } from '$lib/supabase';

type FormUpdate = (options?: { reset?: boolean; invalidateAll?: boolean }) => Promise<void>;

type AdminFormEnhanceOptions<
  Success extends Record<string, unknown> | undefined,
  Failure extends Record<string, unknown> | undefined
> = {
  onPending?: () => void;
  onResult?: (args: {
    action: URL;
    formData: FormData;
    formElement: HTMLFormElement;
    result: ActionResult<Success, Failure>;
    update: FormUpdate;
  }) => Promise<void> | void;
};

function shouldApplyAction(action: URL, result: ActionResult): boolean {
  return (
    location.origin + location.pathname === action.origin + action.pathname ||
    result.type === 'redirect' ||
    result.type === 'error'
  );
}

function resolveFormEnctype(
  formElement: HTMLFormElement,
  submitter: HTMLElement | null
): string {
  return submitter?.hasAttribute('formenctype')
    ? (submitter as HTMLButtonElement | HTMLInputElement).formEnctype
    : formElement.enctype;
}

export function createAdminFormEnhance<
  Success extends Record<string, unknown> | undefined = Record<string, any>,
  Failure extends Record<string, unknown> | undefined = Record<string, any>
>(options: AdminFormEnhanceOptions<Success, Failure> = {}): SubmitFunction<Success, Failure> {
  return async ({ action, cancel, controller, formData, formElement, submitter }) => {
    options.onPending?.();
    cancel();

    const enctype = resolveFormEnctype(formElement, submitter);
    let result: ActionResult<Success, Failure>;

    try {
      const sessionResult = supabase ? await supabase.auth.getSession() : null;
      const accessToken = sessionResult?.data.session?.access_token ?? null;
      const headers = new Headers(
        buildAdminAuthHeaders(accessToken, {
          accept: 'application/json',
          'x-sveltekit-action': 'true'
        })
      );

      if (enctype !== 'multipart/form-data') {
        headers.set(
          'Content-Type',
          /^(:?application\/x-www-form-urlencoded|text\/plain)$/.test(enctype)
            ? enctype
            : 'application/x-www-form-urlencoded'
        );
      }

      const body =
        enctype === 'multipart/form-data'
          ? formData
          : // @ts-expect-error URLSearchParams accepts FormData at runtime.
            new URLSearchParams(formData);

      const response = await fetch(action, {
        method: 'POST',
        headers,
        cache: 'no-store',
        body,
        signal: controller.signal
      });

      result = deserialize<Success, Failure>(await response.text());
      if (result.type === 'error') {
        result.status = response.status;
      }
    } catch (error) {
      if ((error as { name?: string } | null)?.name === 'AbortError') {
        return;
      }

      result = { type: 'error', error } as ActionResult<Success, Failure>;
    }

    const update: FormUpdate = async (updateOptions) => {
      const reset = updateOptions?.reset ?? true;
      const shouldInvalidateAll = updateOptions?.invalidateAll ?? true;

      if (result.type === 'success') {
        if (reset) {
          HTMLFormElement.prototype.reset.call(formElement);
        }

        if (shouldInvalidateAll) {
          await invalidateAll();
        }
      }

      if (shouldApplyAction(action, result)) {
        await applyAction(result);
      }
    };

    if (options.onResult) {
      await options.onResult({ action, formData, formElement, result, update });
      return;
    }

    await update();
  };
}
