<script lang="ts">
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/app-state';
  import {
    getRecommendedSubject,
    getUniversitySubjects,
    hasStructuredSchoolSupport,
    isSchoolEducationType,
    isUniversityEducationType
  } from '$lib/data/onboarding';
  import CountryPicker from './CountryPicker.svelte';
  import EducationTypeSelector from './EducationTypeSelector.svelte';
  import type { AppState, EducationType, OnboardingStep, SchoolTerm, SubjectOption, SubjectVerificationState } from '$lib/types';

  const { state }: { state: AppState } = $props();

  const stepLabels: Record<OnboardingStep, string> = {
    country: 'Location',
    academic: 'Study path',
    subjects: 'Subjects',
    review: 'Review'
  };
  const stepTitles: Record<OnboardingStep, string> = {
    country: 'Where are you learning?',
    academic: 'What are you studying?',
    subjects: 'Pick your subjects',
    review: "You're all set"
  };
  const stepDescriptions: Record<OnboardingStep, string> = {
    country: 'Start here so we can show you the right curriculum and learning context.',
    academic: 'This shapes the lessons and recommendations you will see.',
    subjects: 'Choose everything relevant this year. Add anything missing and keep moving.',
    review: "Here's what we have. Change anything before you continue."
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
  const selectedCountry = $derived(
    state.onboarding.options.countries.find((country) => country.id === state.onboarding.selectedCountryId)
  );
  const curriculumName = $derived(
    state.onboarding.options.curriculums.find(
      (curriculum) => curriculum.id === state.onboarding.selectedCurriculumId
    )?.name ?? 'Not chosen'
  );
  const selectedCountLabel = $derived(
    `${selectedCount} subject${selectedCount === 1 ? '' : 's'} selected`
  );
  const currentStepTitle = $derived(stepTitles[state.onboarding.currentStep]);
  const currentStepDescription = $derived(stepDescriptions[state.onboarding.currentStep]);
  const schoolSupportAvailable = $derived(hasStructuredSchoolSupport(state.onboarding.selectedCountryId));
  const optionSubjectNames = $derived(state.onboarding.options.subjects.map((subject) => subject.name));
  const recognisedAddedSubjects = $derived(
    state.onboarding.selectedSubjectNames.filter(
      (subjectName) =>
        !optionSubjectNames.includes(subjectName) && !state.onboarding.customSubjects.includes(subjectName)
    )
  );
  const reviewRecommendation = $derived.by(() => {
    if (state.onboarding.currentStep !== 'review') {
      return null;
    }

    if (selectedCount <= 1 || !liveRecommendation.subjectName) {
      return null;
    }

    return liveRecommendation;
  });
  const educationTypeLabel = $derived(state.onboarding.educationType);
  const footerTitle = $derived.by(() => {
    if (state.onboarding.currentStep === 'country') {
      return `${countryName} · ${educationTypeLabel}`;
    }

    if (state.onboarding.currentStep === 'academic') {
      if (isUniversityEducationType(state.onboarding.educationType)) {
        return state.onboarding.provider || 'Not chosen';
      }
      return `${curriculumName} · ${currentGradeLabel}`;
    }

    if (state.onboarding.currentStep === 'subjects') {
      return selectedCountLabel;
    }

    return 'Profile ready';
  });
  const footerDetail = $derived.by(() => {
    if (state.onboarding.currentStep === 'country') {
      return 'Choose the country and learning type that match your situation.';
    }

    if (state.onboarding.currentStep === 'academic') {
      if (isUniversityEducationType(state.onboarding.educationType)) {
        return 'Add your university details to get the right recommendations.';
      }
      return 'Confirm the curriculum, grade, year, and term before moving on.';
    }

    if (state.onboarding.currentStep === 'subjects') {
      return state.onboarding.selectionMode === 'unsure'
        ? 'You can continue now and refine the subject list later.'
        : 'Keep going once you have captured everything you study.';
    }

    return 'Save this to enter your dashboard and get recommendations.';
  });

  let geoResolved = false;
  onMount(() => {
    if (!geoResolved) {
      geoResolved = true;
      appState.resolveAndApplyServerCountry();
    }
  });

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
      if (isUniversityEducationType(state.onboarding.educationType)) {
        return (
          state.onboarding.provider.length > 0 &&
          state.onboarding.programme.length > 0 &&
          state.onboarding.level.length > 0
        );
      }

      if (!schoolSupportAvailable) {
        return true;
      }

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
    if (isUniversityEducationType(state.onboarding.educationType)) {
      return getUniversitySubjects(
        state.onboarding.provider,
        state.onboarding.programme,
        state.onboarding.level
      ).filter((subject) => subject.category === category);
    }
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

  function isSubjectBlocked(subject: SubjectOption): boolean {
    if (state.onboarding.selectedSubjectIds.includes(subject.id)) {
      return false;
    }

    if (subject.name === 'Mathematics') {
      return state.onboarding.selectedSubjectNames.includes('Mathematical Literacy');
    }

    if (subject.name === 'Mathematical Literacy') {
      return state.onboarding.selectedSubjectNames.includes('Mathematics');
    }

    return false;
  }
</script>

<section class="wizard-shell">
  <header class="setup-header card">
    <div class="header-copy">
      <p class="step-kicker">Step {stepIndex + 1} of {state.onboarding.stepOrder.length}</p>
      <div class="progress-bar" role="progressbar" aria-valuenow={stepIndex + 1} aria-valuemin={1} aria-valuemax={state.onboarding.stepOrder.length}>
        <div class="progress-bar-fill" style="width: {((stepIndex + 1) / state.onboarding.stepOrder.length) * 100}%"></div>
      </div>
      <h1>{currentStepTitle}</h1>
      <p>{currentStepDescription}</p>
    </div>

    <div class="header-aside">
      {#if state.onboarding.currentStep !== 'review'}
        <div class="selection-pill">
          <strong>{selectedCount}</strong>
          <span>{selectedCount === 1 ? 'subject selected' : 'subjects selected'}</span>
        </div>
      {/if}
      <p class="header-meta">{countryName} · {curriculumName} · {currentGradeLabel}</p>
    </div>
  </header>

  <section class="progress-shell">
    <nav class="step-strip" aria-label="Onboarding steps">
      {#each state.onboarding.stepOrder as step, index}
        <button
          type="button"
          class:active={state.onboarding.currentStep === step}
          class="step-pill"
          onclick={() => goToStep(step)}
        >
          <span class="step-pill-index">{index + 1}</span>
          <strong>{stepLabels[step]}</strong>
        </button>
      {/each}
    </nav>

    <div class="context-strip">
      <div class="context-pill">
        <span>Country</span>
        <strong>{countryName}</strong>
      </div>
      {#if stepIndex >= 1 && isSchoolEducationType(state.onboarding.educationType)}
        <div class="context-pill">
          <span>Curriculum</span>
          <strong>{curriculumName}</strong>
        </div>
        <div class="context-pill">
          <span>Grade</span>
          <strong>{currentGradeLabel}</strong>
        </div>
      {/if}
      {#if stepIndex >= 1 && isUniversityEducationType(state.onboarding.educationType)}
        {#if state.onboarding.provider}
          <div class="context-pill">
            <span>Institution</span>
            <strong>{state.onboarding.provider}</strong>
          </div>
        {/if}
        {#if state.onboarding.programme}
          <div class="context-pill">
            <span>Programme</span>
            <strong>{state.onboarding.programme}</strong>
          </div>
        {/if}
        {#if state.onboarding.level}
          <div class="context-pill">
            <span>Level</span>
            <strong>{state.onboarding.level}</strong>
          </div>
        {/if}
      {/if}
    </div>
  </section>

  {#if state.onboarding.error}
    <div class="wizard-alert card" role="status" aria-live="polite">
      <strong>Backend unavailable</strong>
      <p>{state.onboarding.error}</p>
    </div>
  {/if}

  <div class="content-grid">
    <article class="panel card">
      {#if state.onboarding.currentStep === 'country'}
        <CountryPicker
          {selectedCountry}
          countries={state.onboarding.options.countries}
          selectedCountryId={state.onboarding.selectedCountryId}
        />

        <EducationTypeSelector educationType={state.onboarding.educationType} />
      {/if}

      {#if state.onboarding.currentStep === 'academic'}
        {#if isSchoolEducationType(state.onboarding.educationType)}
          {#if schoolSupportAvailable}
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
                  <option value="">Select a grade</option>
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
          {:else}
            <div class="empty-state" role="status">
              <strong>Structured school support is not available yet for this country.</strong>
              <p>Switch to University or choose South Africa to use the supported CAPS or IEB school path.</p>
            </div>
          {/if}
        {/if}

        {#if isUniversityEducationType(state.onboarding.educationType)}
          <div class="form-grid">
            <label>
              <span>Institution name</span>
              {#if state.onboarding.universityVerification.institutionStatus === 'loading'}
                <div class="verification-loading">Verifying institutions...</div>
              {:else if state.onboarding.universityVerification.institutionSuggestions.length > 0}
                <div class="suggestion-pills">
                  {#each state.onboarding.universityVerification.institutionSuggestions as suggestion}
                    <button
                      type="button"
                      class="suggestion-pill"
                      class:active={state.onboarding.provider === suggestion}
                      onclick={() => appState.selectVerifiedInstitution(suggestion)}
                    >
                      {suggestion}
                    </button>
                  {/each}
                </div>
              {:else if state.onboarding.universityVerification.institutionStatus === 'error'}
                <div class="verification-error">{state.onboarding.universityVerification.institutionError}</div>
              {/if}
              <div class="verify-input-row">
                <input
                  value={state.onboarding.provider}
                  placeholder="e.g. University of Cape Town"
                  oninput={(event) => appState.setOnboardingProvider((event.currentTarget as HTMLInputElement).value)}
                />
                <button
                  type="button"
                  class="verify-btn"
                  class:is-checking={state.onboarding.universityVerification.institutionStatus === 'loading'}
                  aria-busy={state.onboarding.universityVerification.institutionStatus === 'loading'}
                  disabled={!state.onboarding.provider.trim() || state.onboarding.universityVerification.institutionStatus === 'loading'}
                  onclick={() => appState.verifyInstitution(state.onboarding.provider)}
                >
                  {#if state.onboarding.universityVerification.institutionStatus === 'loading'}
                    <span class="busy-indicator" aria-hidden="true">
                      <span></span>
                      <span></span>
                    </span>
                    <span>Verifying</span>
                  {:else}
                    Verify
                  {/if}
                </button>
              </div>
            </label>

            <label>
              <span>Programme</span>
              {#if state.onboarding.universityVerification.programmeStatus === 'loading'}
                <div class="verification-loading">Verifying programmes...</div>
              {:else if state.onboarding.universityVerification.programmeSuggestions.length > 0}
                <div class="suggestion-pills">
                  {#each state.onboarding.universityVerification.programmeSuggestions as suggestion}
                    <button
                      type="button"
                      class="suggestion-pill"
                      class:active={state.onboarding.programme === suggestion}
                      onclick={() => appState.selectVerifiedProgramme(suggestion)}
                    >
                      {suggestion}
                    </button>
                  {/each}
                </div>
              {:else if state.onboarding.universityVerification.programmeStatus === 'error'}
                <div class="verification-error">{state.onboarding.universityVerification.programmeError}</div>
              {/if}
              <div class="verify-input-row">
                <input
                  value={state.onboarding.programme}
                  placeholder="e.g. Computer Science"
                  disabled={!state.onboarding.provider}
                  oninput={(event) => appState.setOnboardingProgramme((event.currentTarget as HTMLInputElement).value)}
                />
                <button
                  type="button"
                  class="verify-btn"
                  class:is-checking={state.onboarding.universityVerification.programmeStatus === 'loading'}
                  aria-busy={state.onboarding.universityVerification.programmeStatus === 'loading'}
                  disabled={!state.onboarding.provider || state.onboarding.universityVerification.programmeStatus === 'loading'}
                  onclick={() => appState.verifyProgramme(state.onboarding.programme)}
                >
                  {#if state.onboarding.universityVerification.programmeStatus === 'loading'}
                    <span class="busy-indicator" aria-hidden="true">
                      <span></span>
                      <span></span>
                    </span>
                    <span>Verifying</span>
                  {:else}
                    Verify
                  {/if}
                </button>
              </div>
            </label>
          </div>

          <label class="level-select">
            <span>Year of study</span>
            <select
              value={state.onboarding.level}
              onchange={(event) => appState.setOnboardingLevel((event.currentTarget as HTMLSelectElement).value)}
            >
              <option value="">Select your year</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
              <option value="Honours">Honours</option>
              <option value="Master's">Master's</option>
              <option value="PhD">PhD</option>
            </select>
          </label>
        {/if}
      {/if}

      {#if state.onboarding.currentStep === 'subjects'}
        <div class="category-block">
          <div class="category-head">
            <h3>Core</h3>
            <span class="category-count">{groupedSubjects('core').length}</span>
          </div>
          {#if groupedSubjects('core').length > 0}
            <div class="subject-grid">
              {#each groupedSubjects('core') as subject}
                <button
                  type="button"
                  class:active={state.onboarding.selectedSubjectIds.includes(subject.id)}
                  class:blocked={isSubjectBlocked(subject)}
                  class="subject-tile"
                  disabled={isSubjectBlocked(subject)}
                  onclick={() => appState.toggleOnboardingSubject(subject.id)}
                >
                  <span class="subject-name">{subject.name}</span>
                  <span class="subject-check" aria-hidden="true">{state.onboarding.selectedSubjectIds.includes(subject.id) ? '✓' : ''}</span>
                </button>
              {/each}
            </div>
          {:else}
            <p class="empty-state">No core subjects are available yet for this curriculum and grade.</p>
          {/if}
        </div>

        <div class="category-block">
          <div class="category-head">
            <h3>Languages</h3>
            <span class="category-count">{groupedSubjects('language').length}</span>
          </div>
          {#if groupedSubjects('language').length > 0}
            <div class="subject-grid">
              {#each groupedSubjects('language') as subject}
                <button
                  type="button"
                  class:active={state.onboarding.selectedSubjectIds.includes(subject.id)}
                  class="subject-tile"
                  onclick={() => appState.toggleOnboardingSubject(subject.id)}
                >
                  <span class="subject-name">{subject.name}</span>
                  <span class="subject-check" aria-hidden="true">{state.onboarding.selectedSubjectIds.includes(subject.id) ? '✓' : ''}</span>
                </button>
              {/each}
            </div>
          {:else}
            <p class="empty-state">No language subjects are available yet for this curriculum and grade.</p>
          {/if}
        </div>

        <div class="category-block">
          <div class="category-head">
            <h3>Other subjects</h3>
            <span class="category-count">{groupedSubjects('elective').length}</span>
          </div>
          {#if groupedSubjects('elective').length > 0}
            <div class="subject-grid">
              {#each groupedSubjects('elective') as subject}
                <button
                  type="button"
                  class:active={state.onboarding.selectedSubjectIds.includes(subject.id)}
                  class="subject-tile"
                  onclick={() => appState.toggleOnboardingSubject(subject.id)}
                >
                  <span class="subject-name">{subject.name}</span>
                  <span class="subject-check" aria-hidden="true">{state.onboarding.selectedSubjectIds.includes(subject.id) ? '✓' : ''}</span>
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
            class:is-checking={verification.status === 'loading'}
            aria-busy={verification.status === 'loading'}
            disabled={verification.status === 'loading' || !verification.input.trim()}
            onclick={submitVerify}
          >
            {#if verification.status === 'loading'}
              <span class="busy-indicator" aria-hidden="true">
                <span></span>
                <span></span>
              </span>
              <span>Checking</span>
            {:else}
              <span>Add subject</span>
            {/if}
          </button>
        </div>

        {#if verification.status === 'verified'}
          <div class="verify-feedback verify-ok verify-compact" transition:fly={{ y: 6, duration: 160, easing: cubicOut }}>
            Added <strong>{verification.normalizedName}</strong> to your subjects.
            <button type="button" class="link-btn" onclick={() => appState.resetSubjectVerification()}>Add another</button>
          </div>
        {:else if verification.status === 'provisional'}
          <div class="verify-feedback verify-warn" transition:fly={{ y: 6, duration: 160, easing: cubicOut }}>
            Couldn't verify <strong>{verification.normalizedName}</strong> right now — it's been saved locally and will be confirmed later.
            <button type="button" class="link-btn" onclick={() => appState.resetSubjectVerification()}>Try another</button>
          </div>
        {:else if verification.status === 'invalid'}
          <div class="verify-feedback verify-error" transition:fly={{ y: 6, duration: 160, easing: cubicOut }}>
            {#if verification.suggestion}
              Did you mean <strong>{verification.suggestion}</strong>? {verification.reason}
            {:else}
              {verification.reason ?? 'That doesn\'t look like a recognised school subject.'}
            {/if}
            <button type="button" class="link-btn" onclick={() => appState.resetSubjectVerification()}>Try again</button>
          </div>
        {:else if verification.status === 'error'}
          <div class="verify-feedback verify-error" transition:fly={{ y: 6, duration: 160, easing: cubicOut }}>
            {verification.reason ?? 'Something went wrong. Please try again.'}
            <button type="button" class="link-btn" onclick={() => appState.resetSubjectVerification()}>Try again</button>
          </div>
        {/if}

        {#if recognisedAddedSubjects.length > 0}
          <div class="category-block">
            <div class="category-head">
              <h3>Added subjects</h3>
              <span class="category-count">{recognisedAddedSubjects.length}</span>
            </div>
            <div class="subject-grid">
              {#each recognisedAddedSubjects as subject}
                <div class="subject-tile active added-subject-tile">
                  <span class="subject-name">{subject}</span>
                  <span class="subject-check added-badge" aria-hidden="true">✓</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if state.onboarding.customSubjects.length > 0}
          <div class="category-block">
            <div class="category-head">
              <h3>Custom subjects</h3>
              <span class="category-count">{state.onboarding.customSubjects.length}</span>
            </div>
            <div class="subject-grid">
              {#each state.onboarding.customSubjects as subject}
                <button type="button" class="subject-tile active removable-subject-tile" onclick={() => appState.removeOnboardingCustomSubject(subject)}>
                  <span class="subject-name">{subject}</span>
                  <span class="subject-check remove-badge" aria-hidden="true">×</span>
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <label class="unsure">
          <input
            type="checkbox"
            checked={state.onboarding.selectionMode === 'unsure'}
            onchange={(event) => appState.setOnboardingUnsure((event.currentTarget as HTMLInputElement).checked)}
          />
          <span>Not sure yet. Continue now and refine this later.</span>
        </label>
      {/if}

      {#if state.onboarding.currentStep === 'review'}
        <div class="review-stack">
          <div class="review-grid">
            <div class="review-card">
              <div class="review-card-header">
                <span>Country</span>
                <button type="button" class="change-btn" onclick={() => goToStep('country')}>Change</button>
              </div>
              <strong>{state.onboarding.options.countries.find((country) => country.id === state.onboarding.selectedCountryId)?.name}</strong>
            </div>
            {#if isSchoolEducationType(state.onboarding.educationType)}
              <div class="review-card">
                <div class="review-card-header">
                  <span>Study path</span>
                  <button type="button" class="change-btn" onclick={() => goToStep('academic')}>Change</button>
                </div>
                <strong>{state.onboarding.options.curriculums.find((curriculum) => curriculum.id === state.onboarding.selectedCurriculumId)?.name} · {currentGradeLabel}</strong>
              </div>
              <div class="review-card">
                <div class="review-card-header">
                  <span>Term</span>
                  <button type="button" class="change-btn" onclick={() => goToStep('academic')}>Change</button>
                </div>
                <strong>{state.onboarding.schoolYear} · {state.onboarding.term}</strong>
              </div>
            {/if}
            {#if isUniversityEducationType(state.onboarding.educationType)}
              <div class="review-card">
                <div class="review-card-header">
                  <span>University details</span>
                  <button type="button" class="change-btn" onclick={() => goToStep('academic')}>Change</button>
                </div>
                <strong>{state.onboarding.provider || 'Not specified'}</strong>
                <span class="review-card-detail">{state.onboarding.programme || 'Not specified'} · {state.onboarding.level || 'Not specified'}</span>
              </div>
            {/if}
          </div>

          <div class="review-card review-subjects">
            <div class="review-section-head">
              <span>Selected subjects</span>
              <button type="button" class="change-btn" onclick={() => goToStep('subjects')}>Change</button>
            </div>
            <strong>{selectedCountLabel}</strong>

            {#if selectedCount > 0}
              <div class="review-chip-list">
                {#each state.onboarding.selectedSubjectNames as subject}
                  <span class="review-chip">{subject}</span>
                {/each}
                {#each state.onboarding.customSubjects as subject}
                  <span class="review-chip review-chip-custom">{subject}</span>
                {/each}
              </div>
            {:else}
              <p class="review-note">No subjects are locked in yet. You can still save this profile and refine the list later.</p>
            {/if}
          </div>

          {#if reviewRecommendation}
            <div class="review-note-card">
              <span>Suggested starting point</span>
              <p><strong>{reviewRecommendation.subjectName}</strong> {reviewRecommendation.reason}</p>
            </div>
          {/if}
        </div>
      {/if}

      <footer class="sticky-footer">
        <button
          type="button"
          class="secondary footer-back"
          onclick={previousStep}
          disabled={state.onboarding.currentStep === 'country'}
        >
          Back
        </button>

        <div class="footer-status">
          <strong>{footerTitle}</strong>
          <span>{footerDetail}</span>
        </div>

        {#if state.onboarding.currentStep === 'review'}
          <button type="button" aria-busy={state.onboarding.isSaving} onclick={complete} disabled={state.onboarding.isSaving}>
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
  .wizard-shell {
    --sans: 'IBM Plex Sans', 'Helvetica Neue', sans-serif;
    --mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    min-height: 100vh;
    padding: 1.5rem;
    display: grid;
    gap: 1rem;
    align-content: start;
    font-family: var(--sans);
  }

  .content-grid,
  .progress-shell,
  .selection-grid,
  .form-grid,
  .review-grid,
  .review-stack {
    display: grid;
    gap: 1rem;
  }

  .card {
    border: 1px solid color-mix(in srgb, var(--border-strong) 72%, transparent);
    border-radius: var(--radius-xl);
    background: linear-gradient(180deg, color-mix(in srgb, var(--surface-strong) 92%, transparent), var(--surface));
    box-shadow: var(--shadow-strong);
    backdrop-filter: blur(26px);
  }

  .setup-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1.4rem;
    align-items: end;
    padding: 1.6rem 1.75rem;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 8%, var(--surface)),
      color-mix(in srgb, var(--surface-strong) 90%, transparent)
    );
  }

  .header-copy {
    display: grid;
    gap: 0.65rem;
    max-width: 44rem;
  }

  .header-copy h1 {
    margin: 0;
    font-size: clamp(1.85rem, 3.7vw, 3rem);
    line-height: 1;
    letter-spacing: -0.045em;
    font-weight: 700;
  }

  .progress-bar {
    height: 0.35rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--border-strong) 40%, transparent);
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 70%, var(--accent)) 100%);
    transition: width 0.3s ease;
  }

  .header-copy p:last-child,
  .header-meta,
  .choice-card span,
  .empty-state {
    color: var(--text-soft);
    line-height: 1.55;
  }

  .step-kicker,
  .context-pill span,
  .category-head span,
  .review-card span,
  .footer-status span {
    margin: 0;
    color: var(--muted);
    letter-spacing: 0.04em;
    font-size: 0.72rem;
    font-family: var(--mono);
  }

  label span {
    margin: 0;
    color: var(--text-soft);
    font-size: var(--text-base);
    font-weight: 500;
    font-family: var(--sans);
  }

  .header-aside {
    display: grid;
    gap: 0.75rem;
    justify-items: end;
    text-align: right;
  }

  .selection-pill {
    display: inline-grid;
    gap: 0.15rem;
    justify-items: end;
    padding: 0.85rem 1rem;
    border-radius: 1.2rem;
    background: color-mix(in srgb, var(--surface-soft) 76%, transparent);
    border: 1px solid color-mix(in srgb, var(--border-strong) 64%, transparent);
  }

  .selection-pill strong {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .selection-pill span {
    color: var(--text-soft);
    font-size: 0.9rem;
  }

  .step-strip {
    display: grid;
    gap: 0.65rem;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .step-pill,
  .choice-card,
  .term-chip,
  .subject-tile,
  .secondary {
    border: 1px solid color-mix(in srgb, var(--border-strong) 72%, transparent);
    background: color-mix(in srgb, var(--surface-soft) 72%, transparent);
    color: var(--text);
    font: inherit;
    cursor: pointer;
  }

  .step-pill {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    min-height: 3.15rem;
    padding: 0.75rem 0.95rem;
    border-radius: 1.2rem;
    text-align: left;
    box-shadow: none;
  }

  .step-pill strong {
    margin: 0;
    font-size: 0.96rem;
    font-weight: 600;
  }

  .step-pill-index {
    width: 1.8rem;
    height: 1.8rem;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--surface-strong) 92%, transparent);
    border: 1px solid color-mix(in srgb, var(--border-strong) 68%, transparent);
    font-family: var(--mono);
    font-size: 0.82rem;
  }

  .step-pill.active,
  .choice-card.active,
  .term-chip.active {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 12%, var(--surface)),
      color-mix(in srgb, var(--accent) 6%, var(--surface-soft))
    );
    border-color: color-mix(in srgb, var(--accent) 44%, transparent);
    box-shadow: inset 0 1px 0 color-mix(in srgb, white 18%, transparent);
  }

  .context-strip {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .context-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.68rem 0.9rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-soft) 56%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  }

  .context-pill strong {
    margin: 0;
    font-size: 0.94rem;
    font-weight: 600;
  }

  .panel {
    display: grid;
    gap: 1.3rem;
    padding: 1.45rem;
  }

  .selection-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .choice-card {
    display: grid;
    gap: 0.35rem;
    padding: 1rem 1.05rem;
    border-radius: 1.2rem;
    text-align: left;
  }

  .choice-card strong {
    margin: 0;
    font-size: 1.02rem;
    font-weight: 600;
  }

  .form-grid {
    align-items: start;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .category-block,
  .review-card {
    display: grid;
    gap: 0.8rem;
  }

  .category-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .category-head h3 {
    margin: 0;
    font-size: 1.02rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .category-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.7rem;
    height: 1.7rem;
    padding: 0 0.45rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-soft) 72%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
  }

  label {
    display: grid;
    gap: 0.45rem;
  }

  input,
  select {
    width: 100%;
    border: 1px solid color-mix(in srgb, var(--border-strong) 86%, transparent);
    border-radius: 1.1rem;
    background: color-mix(in srgb, var(--surface-tint) 92%, transparent);
    color: var(--text);
    padding: 0.96rem 1rem;
    font: inherit;
    letter-spacing: 0;
  }

  .term-row {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .term-chip {
    padding: 0.75rem 0.98rem;
    border-radius: 999px;
  }

  .subject-grid {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .subject-tile {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.9rem;
    min-height: 4rem;
    padding: 1rem 1.05rem;
    border-radius: 1.2rem;
    text-align: left;
    box-shadow: none;
  }

  .subject-name {
    font-size: 1rem;
    line-height: 1.35;
    font-weight: 500;
  }

  .subject-check {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 999px;
    display: grid;
    place-items: center;
    border: 1px solid color-mix(in srgb, var(--border-strong) 80%, transparent);
    background: transparent;
    color: transparent;
    font-family: var(--mono);
    font-size: 0.82rem;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--surface-strong) 26%, transparent);
  }

  .subject-tile:hover:not(:disabled) {
    background: color-mix(in srgb, var(--surface-strong) 84%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--accent) 18%, var(--border));
  }

  .subject-tile.active {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 18%, var(--surface)),
      color-mix(in srgb, var(--accent) 9%, var(--surface-soft))
    );
    border-color: color-mix(in srgb, var(--accent) 56%, transparent);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, white 14%, transparent),
      0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent);
  }

  .subject-tile.active .subject-check {
    background: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 50%, transparent);
    color: var(--accent-contrast);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 16%, transparent);
  }

  .subject-tile.blocked {
    opacity: 0.54;
  }

  .subject-tile.blocked .subject-name {
    color: var(--muted);
  }

  .added-subject-tile {
    cursor: default;
  }

  .added-badge {
    background: color-mix(in srgb, var(--accent) 88%, white 12%);
    color: var(--accent-contrast) !important;
    border-color: color-mix(in srgb, var(--accent) 48%, transparent);
    box-shadow: none !important;
  }

  .removable-subject-tile .remove-badge {
    background: color-mix(in srgb, var(--accent) 88%, white 12%);
    color: var(--accent-contrast) !important;
    border-color: color-mix(in srgb, var(--accent) 48%, transparent);
    box-shadow: none !important;
  }

  .custom-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.85rem;
    align-items: end;
  }

  .grow {
    min-width: 0;
  }

  .add-subject {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    min-height: 3.65rem;
    align-self: end;
    padding: 0.92rem 1.15rem;
    white-space: nowrap;
    border-radius: 1.15rem;
  }

  .add-subject.is-checking {
    background: color-mix(in srgb, var(--accent) 8%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--accent) 18%, var(--border));
    color: var(--text);
  }

  .busy-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.26rem;
  }

  .busy-indicator span {
    width: 0.38rem;
    height: 0.38rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 72%, white 28%);
    opacity: 0.34;
    animation: verify-dot-breathe 1.15s ease-in-out infinite;
  }

  .busy-indicator span:last-child {
    animation-delay: 0.18s;
  }

  .verify-feedback {
    padding: 0.9rem 1rem;
    border-radius: 1rem;
    border: 1px solid var(--border);
    font-size: 0.95rem;
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: baseline;
  }

  .verify-ok {
    background: color-mix(in srgb, var(--accent) 8%, var(--surface));
    border-color: color-mix(in srgb, var(--accent) 22%, transparent);
  }

  .verify-warn {
    background: color-mix(in srgb, #f5a623 10%, var(--surface));
    border-color: color-mix(in srgb, #f5a623 30%, transparent);
  }

  .verify-error {
    background: color-mix(in srgb, #e74c3c 10%, var(--surface));
    border-color: color-mix(in srgb, #e74c3c 25%, transparent);
  }

  .verify-compact {
    padding-block: 0.72rem;
    font-size: 0.9rem;
  }

  .unsure {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.84rem 0.95rem;
    border-radius: 1.15rem;
    background: color-mix(in srgb, var(--surface-soft) 46%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 68%, transparent);
  }

  .unsure span {
    font-size: 0.9rem;
    line-height: 1.45;
    color: var(--text-soft);
  }

  .unsure input {
    width: 1.05rem;
    height: 1.05rem;
    margin: 0;
    accent-color: var(--accent);
  }

  .review-grid {
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  }

  .review-card {
    padding: 0.95rem 1rem;
    border-radius: 1.15rem;
    background: color-mix(in srgb, var(--surface-soft) 68%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  }

  .review-card-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
  }

  .change-btn {
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-family: var(--mono);
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--border-strong) 60%, transparent);
    color: var(--accent);
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .change-btn:hover {
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  }

  .review-card-detail {
    display: block;
    margin-top: 0.2rem;
    font-size: 0.85rem;
    color: var(--text-soft);
  }

  .review-section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .review-subjects {
    gap: 0.9rem;
  }

  .review-card strong,
  .review-section-head strong {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
  }

  .review-chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
  }

  .review-chip {
    display: inline-flex;
    align-items: center;
    min-height: 2.2rem;
    padding: 0.55rem 0.8rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-tint) 90%, transparent);
    border: 1px solid color-mix(in srgb, var(--border-strong) 82%, transparent);
    font-size: 0.95rem;
    font-weight: 500;
  }

  .review-chip-custom {
    background: color-mix(in srgb, var(--accent) 10%, var(--surface-tint));
    border-color: color-mix(in srgb, var(--accent) 24%, transparent);
  }

  .review-note,
  .review-note-card p {
    margin: 0;
    color: var(--text-soft);
    line-height: 1.55;
  }

  .review-note-card {
    display: grid;
    gap: 0.4rem;
    padding: 0.9rem 1rem;
    border-radius: 1rem;
    background: color-mix(in srgb, var(--accent) 8%, var(--surface-soft));
    border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--border));
  }

  .review-note-card strong {
    color: var(--text);
  }

  .empty-state {
    padding: 0.95rem 1rem;
    border-radius: 1.15rem;
    border: 1px dashed color-mix(in srgb, var(--border-strong) 78%, transparent);
    background: color-mix(in srgb, var(--surface-soft) 62%, transparent);
  }

  .wizard-alert {
    display: grid;
    gap: 0.35rem;
    padding: 0.95rem 1rem;
    border: 1px solid color-mix(in srgb, var(--color-orange) 40%, var(--border-strong));
    background: color-mix(in srgb, var(--color-orange-dim) 36%, var(--surface-soft));
  }

  .wizard-alert p {
    margin: 0;
    color: var(--text-soft);
    line-height: 1.5;
  }

  .link-btn {
    background: none;
    border: none;
    padding: 0;
    color: var(--accent);
    font: inherit;
    cursor: pointer;
    text-decoration: underline;
    font-size: 0.88rem;
  }

  .sticky-footer {
    position: sticky;
    bottom: 0.75rem;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 1rem;
    align-items: center;
    margin-top: 0.35rem;
    padding: 0.95rem 1rem;
    border-radius: 1.35rem;
    background: color-mix(in srgb, var(--surface-strong) 90%, transparent);
    border: 1px solid color-mix(in srgb, var(--border-strong) 78%, transparent);
    box-shadow: 0 18px 40px color-mix(in srgb, var(--shadow) 42%, transparent);
    backdrop-filter: blur(22px);
  }

  .footer-status {
    display: grid;
    gap: 0.18rem;
    min-width: 0;
  }

  .footer-status strong {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .footer-back,
  .sticky-footer > button:last-child {
    min-width: 8rem;
    padding: 0.9rem 1.15rem;
    border-radius: 999px;
    font-family: var(--sans);
  }

  .sticky-footer > button:last-child {
    border: 0;
    background: var(--accent);
    color: var(--accent-contrast);
    min-width: 11rem;
  }

  .secondary {
    background: color-mix(in srgb, var(--surface-soft) 82%, transparent);
    color: var(--text);
  }

  @media (max-width: 1180px) {
    .step-strip,
    .subject-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .setup-header,
    .custom-row {
      grid-template-columns: 1fr;
    }

    .header-aside {
      justify-items: start;
      text-align: left;
    }

    .step-strip,
    .step-strip {
      grid-template-columns: 1fr;
    }

    .context-strip {
      flex-direction: column;
      align-items: stretch;
    }

    .sticky-footer {
      position: static;
      grid-template-columns: 1fr;
      align-items: stretch;
    }

    .footer-back,
    .sticky-footer > button:last-child {
      width: 100%;
    }
  }

  @media (max-width: 680px) {
    .wizard-shell,
    .panel,
    .setup-header {
      padding-inline: 1rem;
    }

    .subject-grid,
    .selection-grid,
    .form-grid,
    .review-grid {
      grid-template-columns: 1fr;
    }

    .header-copy h1 {
      font-size: clamp(1.9rem, 9vw, 2.5rem);
    }
  }

  /* ── Phone (540px) ── */
  @media (max-width: 540px) {
    .wizard-shell,
    .panel {
      padding-inline: 0.75rem;
    }

    .header-copy h1 {
      font-size: clamp(1.6rem, 8vw, 2.2rem);
    }

    /* Step strip: compact dots only on small phones */
    .step-strip {
      grid-template-columns: repeat(4, 1fr);
    }

    /* Buttons: full touch target */
    .footer-back,
    .sticky-footer > button:last-child {
      min-height: var(--touch-target);
    }

    select,
    input {
      font-size: 16px;
    }

    /* Safe area for sticky footer */
    .sticky-footer {
      padding-bottom: var(--safe-bottom);
    }
  }

  @keyframes verify-dot-breathe {
    0%,
    100% {
      opacity: 0.34;
      transform: scale(0.9);
    }

    50% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .busy-indicator span {
      animation: none;
      opacity: 0.72;
      transform: none;
    }
  }

  .verify-input-row {
    display: grid;
    gap: 0.5rem;
  }

  .verify-btn {
    justify-self: start;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-lg);
    border: 1px solid color-mix(in srgb, var(--accent) 44%, transparent);
    background: color-mix(in srgb, var(--accent) 12%, var(--surface));
    color: var(--accent);
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .verify-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent) 18%, var(--surface));
    border-color: color-mix(in srgb, var(--accent) 56%, transparent);
  }

  .verify-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .suggestion-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .suggestion-pill {
    padding: 0.4rem 0.85rem;
    border-radius: var(--radius-pill);
    border: 1px solid color-mix(in srgb, var(--border-strong) 60%, transparent);
    background: var(--surface-soft);
    color: var(--text);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .suggestion-pill:hover {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, var(--surface));
  }

  .suggestion-pill.active {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 14%, var(--surface));
    color: var(--accent);
    font-weight: 600;
  }

  .verification-loading {
    font-size: 0.875rem;
    color: var(--text-soft);
    padding: 0.5rem 0;
  }

  .verification-error {
    font-size: 0.875rem;
    color: var(--error);
    padding: 0.5rem 0;
  }
</style>
