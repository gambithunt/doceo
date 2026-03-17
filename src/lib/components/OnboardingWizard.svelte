<script lang="ts">
  import { appState } from '$lib/stores/app-state';
  import { getRecommendedSubject } from '$lib/data/onboarding';
  import type { AppState, OnboardingStep, SchoolTerm, SubjectOption, SubjectVerificationState } from '$lib/types';

  const { state }: { state: AppState } = $props();

  const stepLabels: Record<OnboardingStep, string> = {
    country: 'Country',
    academic: 'Curriculum and grade',
    subjects: 'Subjects',
    review: 'Review'
  };

  const stepIndex = $derived(state.onboarding.stepOrder.indexOf(state.onboarding.currentStep));
  const currentGradeLabel = $derived(
    state.onboarding.options.grades.find((grade) => grade.id === state.onboarding.selectedGradeId)?.label ??
      state.profile.grade
  );
  const liveRecommendation = $derived(
    getRecommendedSubject(
      state.onboarding.selectedSubjectIds,
      state.onboarding.customSubjects,
      state.onboarding.options.subjects
    )
  );
  const selectedCount = $derived(
    state.onboarding.selectedSubjectIds.length + state.onboarding.customSubjects.length
  );
  const countryName = $derived(
    state.onboarding.options.countries.find((country) => country.id === state.onboarding.selectedCountryId)?.name ??
      'Not chosen'
  );
  const curriculumName = $derived(
    state.onboarding.options.curriculums.find(
      (curriculum) => curriculum.id === state.onboarding.selectedCurriculumId
    )?.name ?? 'Not chosen'
  );

  function goToStep(step: OnboardingStep): void {
    appState.setOnboardingStep(step);
  }

  function nextStep(): void {
    if (state.onboarding.currentStep === 'country') {
      goToStep('academic');
      return;
    }

    if (state.onboarding.currentStep === 'academic') {
      goToStep('subjects');
      return;
    }

    if (state.onboarding.currentStep === 'subjects') {
      goToStep('review');
    }
  }

  function previousStep(): void {
    if (state.onboarding.currentStep === 'review') {
      goToStep('subjects');
      return;
    }

    if (state.onboarding.currentStep === 'subjects') {
      goToStep('academic');
      return;
    }

    if (state.onboarding.currentStep === 'academic') {
      goToStep('country');
    }
  }

  function canContinue(): boolean {
    if (state.onboarding.currentStep === 'country') {
      return state.onboarding.selectedCountryId.length > 0;
    }

    if (state.onboarding.currentStep === 'academic') {
      return (
        state.onboarding.selectedCurriculumId.length > 0 &&
        state.onboarding.selectedGradeId.length > 0 &&
        state.onboarding.schoolYear.length === 4 &&
        state.onboarding.term.length > 0
      );
    }

    if (state.onboarding.currentStep === 'subjects') {
      return (
        state.onboarding.selectedSubjectIds.length > 0 ||
        state.onboarding.customSubjects.length > 0 ||
        state.onboarding.selectionMode === 'unsure'
      );
    }

    return true;
  }

  async function complete(): Promise<void> {
    await appState.completeOnboarding(state.profile.fullName, currentGradeLabel);
  }

  function groupedSubjects(category: SubjectOption['category']): SubjectOption[] {
    return state.onboarding.options.subjects.filter((subject) => subject.category === category);
  }

  const verification = $derived(state.onboarding.subjectVerification as SubjectVerificationState);

  async function submitVerify(): Promise<void> {
    const name = verification.input.trim();
    if (!name || verification.status === 'loading') return;
    await appState.verifyAndAddSubject(name);
  }

  function handleVerifyKey(event: KeyboardEvent): void {
    if (event.key === 'Enter') submitVerify();
  }
</script>

<section class="wizard-shell">
  <header class="hero">
    <div class="hero-copy">
      <p class="eyebrow">Student setup</p>
      <h1>Build a student profile that keeps the app relevant from the first screen.</h1>
      <p>
        This takes four short steps. We use your country, curriculum, grade, term, and subjects to tailor the dashboard and recommend where to begin.
      </p>
    </div>
  </header>

  <section class="progress-shell">
    <div class="progress-header">
      <span>Step {stepIndex + 1} of {state.onboarding.stepOrder.length}</span>
      <p>{selectedCount} subject{selectedCount === 1 ? '' : 's'} currently selected</p>
    </div>
    <div class="progress-track">
      <div class="progress-fill" style={`width:${((stepIndex + 1) / state.onboarding.stepOrder.length) * 100}%`}></div>
    </div>
    <div class="step-strip">
      {#each state.onboarding.stepOrder as step, index}
        <button
          type="button"
          class:active={state.onboarding.currentStep === step}
          class="step-card"
          onclick={() => goToStep(step)}
        >
          <span>{index + 1}</span>
          <div>
            <strong>{stepLabels[step]}</strong>
            <small>
              {step === 'country'
                ? 'Top-level school context'
                : step === 'academic'
                  ? 'Curriculum, grade, year, term'
                  : step === 'subjects'
                    ? 'Everything you actually study'
                    : 'Final check before entry'}
            </small>
          </div>
        </button>
      {/each}
    </div>
    <div class="summary-strip">
      <div class="summary-row">
        <span>Country</span>
        <strong>{countryName}</strong>
      </div>
      <div class="summary-row">
        <span>Curriculum</span>
        <strong>{curriculumName}</strong>
      </div>
      <div class="summary-row">
        <span>Grade</span>
        <strong>{currentGradeLabel}</strong>
      </div>
      <div class="summary-row">
        <span>Recommended start</span>
        <strong>{liveRecommendation.subjectName ?? 'Pending'}</strong>
      </div>
    </div>
  </section>

  <div class="content-grid">
    <article class="panel card">
      {#if state.onboarding.currentStep === 'country'}
        <div class="section-copy">
          <p class="eyebrow">Step 1</p>
          <h2>Choose your country</h2>
          <p>South Africa is supported in v1. The flow stays structured so more countries can be added later without changing the experience.</p>
        </div>

        <div class="selection-grid">
          {#each state.onboarding.options.countries as country}
            <button
              type="button"
              class:active={state.onboarding.selectedCountryId === country.id}
              class="choice-card"
              onclick={() => appState.selectOnboardingCountry(country.id)}
            >
              <strong>{country.name}</strong>
              <span>Curriculum-aware onboarding</span>
            </button>
          {/each}
        </div>
      {/if}

      {#if state.onboarding.currentStep === 'academic'}
        <div class="section-copy">
          <p class="eyebrow">Step 2</p>
          <h2>Set your academic context</h2>
          <p>These choices drive which grades and subjects are shown next.</p>
        </div>

        <div class="selection-grid">
          {#each state.onboarding.options.curriculums as curriculum}
            <button
              type="button"
              class:active={state.onboarding.selectedCurriculumId === curriculum.id}
              class="choice-card"
              onclick={() => appState.selectOnboardingCurriculum(curriculum.id)}
            >
              <strong>{curriculum.name}</strong>
              <span>{curriculum.description}</span>
            </button>
          {/each}
        </div>

        <div class="form-grid">
          <label>
            <span>Grade</span>
            <select
              value={state.onboarding.selectedGradeId}
              onchange={(event) => appState.selectOnboardingGrade((event.currentTarget as HTMLSelectElement).value)}
            >
              {#each state.onboarding.options.grades as grade}
                <option value={grade.id}>{grade.label}</option>
              {/each}
            </select>
          </label>

          <label>
            <span>School year</span>
            <input
              value={state.onboarding.schoolYear}
              maxlength="4"
              inputmode="numeric"
              placeholder="2026"
              oninput={(event) => appState.setOnboardingSchoolYear((event.currentTarget as HTMLInputElement).value)}
            />
          </label>
        </div>

        <div class="term-row">
          {#each ['Term 1', 'Term 2', 'Term 3', 'Term 4'] as term}
            <button
              type="button"
              class:active={state.onboarding.term === term}
              class="term-chip"
              onclick={() => appState.setOnboardingTerm(term as SchoolTerm)}
            >
              {term}
            </button>
          {/each}
        </div>
      {/if}

      {#if state.onboarding.currentStep === 'subjects'}
        <div class="section-copy">
          <p class="eyebrow">Step 3</p>
          <h2>Select the subjects you study</h2>
          <p>Choose everything relevant this year. If something is missing, add it manually and we’ll keep it in your profile.</p>
        </div>

        <div class="selection-meta">
          <div>
            <strong>{selectedCount}</strong>
            <span>subjects selected</span>
          </div>
          <div>
            <strong>{state.onboarding.selectionMode === 'unsure' ? 'Not sure' : 'Structured profile'}</strong>
            <span>selection state</span>
          </div>
        </div>

        <div class="category-block">
          <h3>Core</h3>
          {#if groupedSubjects('core').length > 0}
            <div class="checkbox-grid">
              {#each groupedSubjects('core') as subject}
                <button
                  type="button"
                  class:active={state.onboarding.selectedSubjectIds.includes(subject.id)}
                  class="subject-card"
                  onclick={() => appState.toggleOnboardingSubject(subject.id)}
                >
                  {subject.name}
                </button>
              {/each}
            </div>
          {:else}
            <p class="empty-state">No core subjects are available yet for this curriculum and grade.</p>
          {/if}
        </div>

        <div class="category-block">
          <h3>Languages</h3>
          {#if groupedSubjects('language').length > 0}
            <div class="checkbox-grid">
              {#each groupedSubjects('language') as subject}
                <button
                  type="button"
                  class:active={state.onboarding.selectedSubjectIds.includes(subject.id)}
                  class="subject-card"
                  onclick={() => appState.toggleOnboardingSubject(subject.id)}
                >
                  {subject.name}
                </button>
              {/each}
            </div>
          {:else}
            <p class="empty-state">No language subjects are available yet for this curriculum and grade.</p>
          {/if}
        </div>

        <div class="category-block">
          <h3>Other subjects</h3>
          {#if groupedSubjects('elective').length > 0}
            <div class="checkbox-grid">
              {#each groupedSubjects('elective') as subject}
                <button
                  type="button"
                  class:active={state.onboarding.selectedSubjectIds.includes(subject.id)}
                  class="subject-card"
                  onclick={() => appState.toggleOnboardingSubject(subject.id)}
                >
                  {subject.name}
                </button>
              {/each}
            </div>
          {:else}
            <p class="empty-state">No additional subjects are available yet for this curriculum and grade.</p>
          {/if}
        </div>

        <div class="custom-row">
          <label class="grow">
            <span>Add a missing subject</span>
            <input
              value={verification.input}
              placeholder="Type the subject name"
              disabled={verification.status === 'loading'}
              oninput={(event) => appState.setSubjectVerificationInput((event.currentTarget as HTMLInputElement).value)}
              onkeydown={handleVerifyKey}
            />
          </label>
          <button
            type="button"
            class="secondary add-subject"
            disabled={verification.status === 'loading' || !verification.input.trim()}
            onclick={submitVerify}
          >
            {verification.status === 'loading' ? 'Checking...' : 'Add subject'}
          </button>
        </div>

        {#if verification.status === 'verified'}
          <div class="verify-feedback verify-ok">
            <strong>{verification.normalizedName}</strong> was recognised and added to your subjects.
            <button type="button" class="link-btn" onclick={() => appState.resetSubjectVerification()}>Add another</button>
          </div>
        {:else if verification.status === 'provisional'}
          <div class="verify-feedback verify-warn">
            Couldn't verify <strong>{verification.normalizedName}</strong> right now — it's been saved locally and will be confirmed later.
            <button type="button" class="link-btn" onclick={() => appState.resetSubjectVerification()}>Try another</button>
          </div>
        {:else if verification.status === 'invalid'}
          <div class="verify-feedback verify-error">
            {#if verification.suggestion}
              Did you mean <strong>{verification.suggestion}</strong>? {verification.reason}
            {:else}
              {verification.reason ?? 'That doesn\'t look like a recognised school subject.'}
            {/if}
            <button type="button" class="link-btn" onclick={() => appState.resetSubjectVerification()}>Try again</button>
          </div>
        {:else if verification.status === 'error'}
          <div class="verify-feedback verify-error">
            {verification.reason ?? 'Something went wrong. Please try again.'}
            <button type="button" class="link-btn" onclick={() => appState.resetSubjectVerification()}>Try again</button>
          </div>
        {/if}

        {#if state.onboarding.customSubjects.length > 0}
          <div class="tags">
            {#each state.onboarding.customSubjects as subject}
              <button type="button" class="tag" onclick={() => appState.removeOnboardingCustomSubject(subject)}>
                {subject} ·
              </button>
            {/each}
          </div>
        {/if}

        <label class="unsure">
          <input
            type="checkbox"
            checked={state.onboarding.selectionMode === 'unsure'}
            onchange={(event) => appState.setOnboardingUnsure((event.currentTarget as HTMLInputElement).checked)}
          />
          <span>I’m not sure yet. Let me continue and refine this later.</span>
        </label>
      {/if}

      {#if state.onboarding.currentStep === 'review'}
        <div class="section-copy">
          <p class="eyebrow">Step 4</p>
          <h2>Review your learning profile</h2>
          <p>This is the information used to personalize the dashboard, subject view, and starting recommendation.</p>
        </div>

        <div class="review-grid">
          <div class="review-card">
            <span>Country</span>
            <strong>{state.onboarding.options.countries.find((country) => country.id === state.onboarding.selectedCountryId)?.name}</strong>
          </div>
          <div class="review-card">
            <span>Curriculum</span>
            <strong>{state.onboarding.options.curriculums.find((curriculum) => curriculum.id === state.onboarding.selectedCurriculumId)?.name}</strong>
          </div>
          <div class="review-card">
            <span>Grade</span>
            <strong>{currentGradeLabel}</strong>
          </div>
          <div class="review-card">
            <span>School year / term</span>
            <strong>{state.onboarding.schoolYear} · {state.onboarding.term}</strong>
          </div>
        </div>

        <div class="review-card wide">
          <span>Selected subjects</span>
          <strong>{state.onboarding.selectedSubjectNames.join(', ') || 'None selected'}</strong>
          {#if state.onboarding.customSubjects.length > 0}
            <p>Custom subjects: {state.onboarding.customSubjects.join(', ')}</p>
          {/if}
        </div>

        <div class="recommendation-card">
          <p class="eyebrow">Recommended start</p>
          <h3>{liveRecommendation.subjectName ?? 'Choose a subject first'}</h3>
          <p>{liveRecommendation.reason}</p>
        </div>
      {/if}

      <footer class="actions">
        <button
          type="button"
          class="secondary"
          onclick={previousStep}
          disabled={state.onboarding.currentStep === 'country'}
        >
          Back
        </button>

        {#if state.onboarding.currentStep === 'review'}
          <button type="button" onclick={complete} disabled={state.onboarding.isSaving}>
            {state.onboarding.isSaving ? 'Saving profile...' : 'Save profile and continue'}
          </button>
        {:else}
          <button type="button" onclick={nextStep} disabled={!canContinue()}>
            Continue
          </button>
        {/if}
      </footer>
    </article>
  </div>
</section>

<style>
  .wizard-shell,
  .content-grid,
  .panel,
  .progress-shell,
  .step-strip,
  .summary-strip,
  .selection-grid,
  .checkbox-grid,
  .review-grid,
  .hero-copy {
    display: grid;
    gap: 1rem;
  }

  .wizard-shell {
    min-height: 100vh;
    padding: 1.5rem;
    align-content: start;
  }

  .content-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .card {
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    background: linear-gradient(180deg, var(--surface-strong), var(--surface));
    padding: 1.35rem;
    box-shadow: var(--shadow-strong);
    backdrop-filter: blur(26px);
  }

  .hero {
    display: grid;
    gap: 1rem;
    padding: 1.5rem 1.75rem 1.25rem;
    border-radius: var(--radius-xl);
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 10%, var(--surface)),
      color-mix(in srgb, var(--surface-strong) 88%, white)
    );
    border: 1px solid color-mix(in srgb, var(--accent) 14%, var(--border));
  }

  .hero-copy h1 {
    font-size: clamp(2rem, 4vw, 3.25rem);
    line-height: 1.04;
    letter-spacing: -0.04em;
    max-width: none;
    margin-right: 1rem;
  }

  .hero-copy p:last-child,
  .section-copy p {
    color: var(--text-soft);
    line-height: 1.6;
  }

  .hero-copy {
    max-width: 78rem;
  }

  .progress-shell {
    display: grid;
    gap: 0.9rem;
  }

  .progress-header {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    align-items: center;
  }

  .progress-header span,
  .progress-header p {
    margin: 0;
  }

  .progress-track {
    height: 12px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-soft) 90%, transparent);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--accent), #8be5bd);
  }

  .step-strip,
  .summary-strip {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .step-card,
  .choice-card,
  .subject-card,
  .term-chip,
  .tag,
  .secondary,
  .actions button {
    border: 1px solid var(--border);
    border-radius: 1.2rem;
    background: var(--surface-soft);
    color: var(--text);
    font: inherit;
    cursor: pointer;
  }

  .step-card {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.85rem;
    padding: 0.95rem 1rem;
    text-align: left;
    min-height: 100%;
  }

  .step-card span {
    display: grid;
    place-items: center;
    width: 1.95rem;
    height: 1.95rem;
    border-radius: 999px;
    background: var(--surface);
  }

  .step-card div {
    display: grid;
    gap: 0.2rem;
  }

  .step-card small {
    color: var(--muted);
  }

  .step-card.active,
  .choice-card.active,
  .subject-card.active,
  .term-chip.active {
    border-color: color-mix(in srgb, var(--accent) 48%, transparent);
    background: color-mix(in srgb, var(--accent) 14%, var(--surface));
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 22%, transparent);
  }

  .summary-row,
  .section-copy,
  .category-block,
  .review-card,
  .recommendation-card {
    display: grid;
    gap: 0.65rem;
  }

  .summary-row {
    gap: 0.2rem;
    padding: 0.95rem 1rem;
    border-radius: var(--radius-lg);
    background: var(--surface-soft);
    border: 1px solid var(--border);
  }

  .selection-grid,
  .checkbox-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .choice-card,
  .subject-card {
    padding: 1rem;
    text-align: left;
    display: grid;
    gap: 0.45rem;
  }

  .form-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .selection-meta {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.9rem;
  }

  .selection-meta div {
    display: grid;
    gap: 0.2rem;
    padding: 0.95rem 1rem;
    border-radius: var(--radius-lg);
    background: var(--surface-soft);
    border: 1px solid var(--border);
  }

  label {
    display: grid;
    gap: 0.45rem;
  }

  input,
  select {
    width: 100%;
    border: 1px solid var(--border-strong);
    border-radius: 1rem;
    background: var(--surface-tint);
    color: var(--text);
    padding: 0.92rem 1rem;
    font: inherit;
  }

  .term-row,
  .actions,
  .custom-row,
  .tags {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .term-chip,
  .tag {
    padding: 0.8rem 1rem;
  }

  .grow {
    flex: 1;
  }

  .add-subject {
    align-self: end;
    padding: 0.72rem 1rem;
    white-space: nowrap;
  }

  .unsure {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: var(--radius-lg);
    background: var(--surface-soft);
    border: 1px solid var(--border);
  }

  .unsure input {
    width: auto;
    margin: 0;
  }

  .review-grid {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .review-card,
  .recommendation-card {
    padding: 1rem;
    border-radius: var(--radius-lg);
    background: var(--surface-soft);
    border: 1px solid var(--border);
  }

  .review-card.wide {
    grid-column: 1 / -1;
  }

  .recommendation-card {
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, var(--surface)), var(--surface-soft));
    border-color: color-mix(in srgb, var(--accent) 22%, var(--border));
  }

  .empty-state {
    padding: 0.95rem 1rem;
    border-radius: var(--radius-lg);
    border: 1px dashed var(--border);
    background: var(--surface-soft);
    color: var(--text-soft);
  }

  .verify-feedback {
    padding: 0.85rem 1rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    font-size: 0.9rem;
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: baseline;
  }

  .verify-ok {
    background: color-mix(in srgb, var(--accent) 10%, var(--surface));
    border-color: color-mix(in srgb, var(--accent) 30%, transparent);
  }

  .verify-warn {
    background: color-mix(in srgb, #f5a623 10%, var(--surface));
    border-color: color-mix(in srgb, #f5a623 30%, transparent);
  }

  .verify-error {
    background: color-mix(in srgb, #e74c3c 10%, var(--surface));
    border-color: color-mix(in srgb, #e74c3c 25%, transparent);
  }

  .link-btn {
    background: none;
    border: none;
    padding: 0;
    color: var(--accent);
    font: inherit;
    cursor: pointer;
    text-decoration: underline;
    font-size: 0.85rem;
  }

  .actions {
    justify-content: space-between;
    margin-top: 0.5rem;
  }

  .actions button {
    min-width: 150px;
    padding: 0.95rem 1.15rem;
  }

  .actions button:last-child {
    border: 0;
    background: var(--accent);
    color: var(--accent-contrast);
  }

  .secondary {
    background: var(--surface-soft);
    color: var(--text);
  }

  .eyebrow,
  h1,
  h2,
  h3,
  p,
  strong,
  span {
    margin: 0;
  }

  .eyebrow,
  label span,
  .summary-row span,
  .review-card span,
  .selection-meta span {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.72rem;
  }

  @media (max-width: 980px) {
    .progress-header,
    .step-strip,
    .summary-strip {
      grid-template-columns: 1fr;
    }

    .hero {
      padding: 1.25rem;
    }
  }
</style>
