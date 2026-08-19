<script lang="ts">
	import GenerationJourney from '$lib/components/GenerationJourney.svelte';
	let { data } = $props();
</script>

<GenerationJourney id={data.id} />
