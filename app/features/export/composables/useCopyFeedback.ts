import { shallowRef } from "vue";
import { useTimeoutFn } from "@vueuse/core";

export function useCopyFeedback() {
  const showCopied = shallowRef(false);

  const { start, stop } = useTimeoutFn(
    () => {
      showCopied.value = false;
    },
    2000,
    { immediate: false },
  );

  function triggerCopied(): void {
    stop();
    showCopied.value = true;
    start();
  }

  return { showCopied, triggerCopied };
}
