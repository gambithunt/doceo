<script lang="ts">
  import { appState } from '$lib/stores/app-state';
  import type { CountryOption } from '$lib/types';

  interface Props {
    selectedCountry: CountryOption | undefined;
    countries: CountryOption[];
    selectedCountryId: string;
  }

  const { selectedCountry, countries, selectedCountryId }: Props = $props();

  let pickerExpanded = $state(false);
  let searchQuery = $state('');

  const filteredCountries = $derived(
    searchQuery.trim() === ''
      ? countries
      : countries.filter((country) =>
          country.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
  );

  function togglePicker(): void {
    pickerExpanded = !pickerExpanded;
    if (pickerExpanded) {
      searchQuery = '';
    }
  }

  function selectCountry(countryId: string): void {
    appState.selectOnboardingCountry(countryId);
    pickerExpanded = false;
    searchQuery = '';
  }

  function handleSearchKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      pickerExpanded = false;
      searchQuery = '';
    }
  }
</script>

{#if selectedCountry}
  <div class="recommended-country-card">
    <div class="recommended-badge">
      <span>Recommended for you</span>
    </div>
    <div class="recommended-country-content">
      <strong>{selectedCountry.name}</strong>
      <span>Curriculum-aware onboarding</span>
    </div>
  </div>

  <button
    type="button"
    class="choose-different-country"
    onclick={togglePicker}
  >
    {pickerExpanded ? 'Close' : 'Choose a different country'}
  </button>
{/if}

{#if pickerExpanded}
  <div class="country-picker-panel">
    <div class="country-search-wrapper">
      <input
        type="text"
        class="country-search"
        placeholder="Search countries..."
        bind:value={searchQuery}
        onkeydown={handleSearchKey}
      />
    </div>
    <div class="country-picker-list">
      {#each filteredCountries as country}
        <div class="country-picker-item">
          <button
            type="button"
            data-country-id={country.id}
            class="country-picker-btn"
            class:active={selectedCountryId === country.id}
            onclick={() => selectCountry(country.id)}
          >
            <strong>{country.name}</strong>
            <span>Curriculum-aware onboarding</span>
          </button>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .recommended-country-card {
    display: grid;
    gap: 0.75rem;
    padding: 1.25rem 1.35rem;
    border-radius: 1.35rem;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 10%, var(--surface)),
      color-mix(in srgb, var(--accent) 4%, var(--surface-soft))
    );
    border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, white 16%, transparent),
      0 2px 12px color-mix(in srgb, var(--accent) 8%, transparent);
  }

  .recommended-badge {
    display: inline-flex;
  }

  .recommended-badge span {
    display: inline-flex;
    align-items: center;
    padding: 0.3rem 0.7rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 16%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
    font-size: 0.72rem;
    font-family: var(--mono);
    color: var(--accent);
    letter-spacing: 0.04em;
  }

  .recommended-country-content {
    display: grid;
    gap: 0.3rem;
  }

  .recommended-country-content strong {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .recommended-country-content span {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-soft);
  }

  .choose-different-country {
    align-self: flex-start;
    padding: 0.6rem 1rem;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--border-strong) 72%, transparent);
    background: transparent;
    color: var(--accent);
    font: inherit;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .choose-different-country:hover {
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  }

  .country-picker-panel {
    display: grid;
    gap: 0.85rem;
    padding: 1.1rem;
    border-radius: 1.25rem;
    background: color-mix(in srgb, var(--surface-soft) 48%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
    backdrop-filter: blur(12px);
  }

  .country-search-wrapper {
    display: flex;
  }

  .country-search {
    width: 100%;
    padding: 0.8rem 1rem;
    border: 1px solid color-mix(in srgb, var(--border-strong) 86%, transparent);
    border-radius: 1rem;
    background: color-mix(in srgb, var(--surface-tint) 92%, transparent);
    color: var(--text);
    font: inherit;
    font-size: 0.95rem;
    letter-spacing: 0;
  }

  .country-search::placeholder {
    color: var(--muted);
  }

  .country-search:focus {
    outline: none;
    border-color: color-mix(in srgb, var(--accent) 48%, transparent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent);
  }

  .country-picker-list {
    display: grid;
    gap: 0.5rem;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    max-height: 280px;
    overflow-y: auto;
    padding-right: 0.25rem;
  }

  .country-picker-item {
    display: contents;
  }

  .country-picker-btn {
    display: grid;
    gap: 0.25rem;
    padding: 0.9rem 1rem;
    border-radius: 1.1rem;
    border: 1px solid color-mix(in srgb, var(--border-strong) 72%, transparent);
    background: color-mix(in srgb, var(--surface-soft) 72%, transparent);
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .country-picker-btn:hover {
    background: color-mix(in srgb, var(--surface-strong) 84%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--accent) 18%, var(--border));
  }

  .country-picker-btn.active {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 12%, var(--surface)),
      color-mix(in srgb, var(--accent) 6%, var(--surface-soft))
    );
    border-color: color-mix(in srgb, var(--accent) 44%, transparent);
    box-shadow: inset 0 1px 0 color-mix(in srgb, white 18%, transparent);
  }

  .country-picker-btn strong {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .country-picker-btn span {
    margin: 0;
    font-size: 0.82rem;
    color: var(--text-soft);
  }
</style>
