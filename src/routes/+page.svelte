<script lang="ts">
	import { productName } from '$lib/app-meta';
	import CuriosityExperience from '$lib/components/CuriosityExperience.svelte';
</script>

<svelte:head>
	<title>{productName} — Follow your curiosity</title>
	<meta
		name="description"
		content="Doceo turns curiosity into focused, playable learning experiences."
	/>
</svelte:head>

<CuriosityExperience />
