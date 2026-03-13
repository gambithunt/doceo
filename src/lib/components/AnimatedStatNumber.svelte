<script lang="ts">
  import { cubicOut } from 'svelte/easing';

  interface Props {
    value: number;
    duration?: number;
    suffix?: string;
  }

  const {
    value,
    duration = 700,
    suffix = ''
  }: Props = $props();

  let displayValue = $state(0);
  let pulse = $state(false);

  function animateTo(nextValue: number): void {
    const startValue = displayValue;
    const startedAt = performance.now();

    pulse = false;

    const step = (timestamp: number) => {
      const progress = Math.min((timestamp - startedAt) / duration, 1);
      const eased = cubicOut(progress);
      displayValue = Math.round(startValue + (nextValue - startValue) * eased);

      if (progress < 1) {
        requestAnimationFrame(step);
        return;
      }

      pulse = true;
      setTimeout(() => {
        pulse = false;
      }, 220);
    };

    requestAnimationFrame(step);
  }

  $effect(() => {
    animateTo(value);
  });
</script>

<span class:pop={pulse}>{displayValue}{suffix}</span>

<style>
  span {
    display: inline-block;
    transform-origin: left center;
    transition:
      transform 180ms ease,
      filter 180ms ease;
    will-change: transform;
  }

  .pop {
    transform: scale(1.06);
    filter: saturate(1.08);
  }

  @media (prefers-reduced-motion: reduce) {
    span,
    .pop {
      transition: none;
      transform: none;
      filter: none;
    }
  }
</style>
