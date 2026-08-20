<script lang="ts">
	import LessonPlanJourney from '$lib/components/LessonPlanJourney.svelte';

	let { data } = $props();
</script>

<LessonPlanJourney id={data.id} />
