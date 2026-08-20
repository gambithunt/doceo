<script lang="ts">
	import AnswerJourney from '$lib/components/AnswerJourney.svelte';
	let { data } = $props();
</script>

<AnswerJourney id={data.id} />
