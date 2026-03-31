<script lang="ts">
  export let label = 'Loading';
  export let size: 'sm' | 'md' = 'md';
</script>

<div class:size-sm={size === 'sm'} class="loading-dots" aria-label={label} role="status">
  <span></span>
  <span></span>
  <span></span>
</div>

<style>
  .loading-dots {
    display: inline-flex;
    align-items: center;
    gap: 0.38rem;
    padding: 0.25rem 0.1rem;
  }

  .loading-dots span {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--text) 34%, white);
    animation: loading-dots-bounce 1.1s ease-in-out infinite;
  }

  .loading-dots span:nth-child(2) {
    animation-delay: 0.12s;
  }

  .loading-dots span:nth-child(3) {
    animation-delay: 0.24s;
  }

  .loading-dots.size-sm {
    gap: 0.28rem;
    padding: 0;
  }

  .loading-dots.size-sm span {
    width: 0.4rem;
    height: 0.4rem;
  }

  @keyframes loading-dots-bounce {
    0%,
    60%,
    100% {
      transform: translateY(0) scale(0.96);
      opacity: 0.45;
    }

    30% {
      transform: translateY(-4px) scale(1);
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .loading-dots span {
      animation: none;
      opacity: 0.7;
    }
  }
</style>
