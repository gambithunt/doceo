# Design Language

Use this as the local implementation guide for UI work in Doceo. It captures the visual language established across onboarding and the dashboard so new components feel like part of the same product.

## Core Principles
- Optimize for the primary task first. Remove decorative layers before adding new ones.
- Prefer calm chrome, strong hierarchy, and dense usefulness over large empty containers.
- Reuse existing component patterns before inventing new ones.
- Keep accent color selective. Use it for active, selected, or primary-action states only.
- Motion should be subtle and state-driven, not decorative.

## Layout
- Pack screens to content. Avoid grid or flex rules that stretch sections vertically without content.
- Keep headers compact. Large hero treatments should be rare.
- Use one clear primary module per screen, with quieter secondary modules beneath it.
- Empty states should shrink to compact notes unless the surface will soon hold real content.
- Sidebar content should stay subordinate to the main workspace.

## Cards And Surfaces
- Use the established card treatment:
  - soft border
  - large radius
  - dark gradient surface
  - restrained shadow
  - glass blur only where it already exists in the product
- Reduce wrapper chrome around internal sections. Not every subsection needs its own boxed panel.
- Prefer fewer, larger surface families over many nested card styles.

## Typography
- Use `IBM Plex Sans` for primary UI text and `IBM Plex Mono` for micro-labels, indices, and system accents.
- Headings should be bold, short, and visually compact.
- Mono labels should be small, muted, uppercase, and used sparingly.
- Avoid overly heavy body text in components. Default to medium or semibold only where needed.
- Supporting copy should be short and direct. If the layout already explains the action, delete the sentence.

## Buttons And Primary Actions
- There should be one obvious primary action per surface.
- Keep primary buttons close to the input or content they act on.
- Secondary actions should use quiet bordered styles.
- Hover states should feel alive but controlled:
  - slightly brighter border
  - subtle accent ring or glow
  - no dramatic lift or oversized shadows

## Inputs
- Labels must stay visible; do not rely on placeholders alone.
- Use compact vertical spacing between related fields.
- Default textarea height should be modest and grow only when needed.
- Inputs should match the shared surface language: rounded, dark-tinted, softly bordered.

## Selectable Tiles
- Follow the onboarding tile pattern for selectable or suggested items:
  - two-column layout: content left, affordance right
  - minimum height around `4rem`
  - rounded corners around `1.2rem`
  - soft border and dark surface fill
- Selected or active tiles should use:
  - subtle accent gradient fill
  - stronger accent border
  - restrained inner highlight
- Use a circular trailing affordance for checks or launch indicators so tile interactions stay visually consistent.
- Do not force aggressive text wrapping. Let labels breathe.

## Quick Starts And Suggested Actions
- Suggested actions on the dashboard should feel like cousins of onboarding subject tiles, not a separate card system.
- Use the same spacing, radius, hover treatment, and trailing circular affordance.
- Keep the section copy minimal. The tiles should carry the interaction.

## Empty States
- Keep empty states compact and matter-of-fact.
- Avoid large framed wells for missing content unless the future content genuinely requires the space.
- Use one short sentence that explains what will appear or what to do next.

## Recents And Lists
- Repeated items should use consistent row or tile structure.
- Put the most useful information first: title, subject, progress, then actions.
- Do not overload repeated items with extra decoration.

## Implementation Checklist
- Does the layout pack to content, or is it stretching empty space?
- Is there one clearly dominant action?
- Are component states using the established accent and border language?
- Does this component reuse an existing pattern from onboarding or dashboard?
- Can any support copy be removed without losing clarity?
- If this is empty, can the surface become smaller?
