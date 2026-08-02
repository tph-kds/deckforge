# Asset and Media Workflow

Use this workflow whenever the deck includes images, illustrations, screenshots, logos, icons, audio, video, or external embeds.

## Required asset operations

The editable-deck profile must provide UI or adapters for:

- upload/import;
- URL insertion where allowed;
- asset library browsing;
- replace and remove;
- crop, focal point, and object-fit;
- caption and source attribution;
- alt text and accessibility status;
- loading, progress, failure, and retry states;
- size/format validation;
- optimization or responsive variants when appropriate.

## Provenance

Use user-provided assets, properly licensed sources, generated assets with permission, or clearly marked placeholders. Do not fabricate customer logos, product screenshots, people, or evidence.

## Image placement

Images must occupy a meaningful visual slot. Avoid tiny decorative images surrounded by unused space. Preserve aspect ratio unless a deliberate crop is chosen. Never stretch media.

## Screenshot and demo treatment

- show enough interface context to orient the audience;
- crop around the relevant workflow;
- use numbered callouts sparingly;
- ensure annotations do not cover important UI;
- provide text alternatives for key conclusions.

## Video and audio

- provide play/pause controls;
- avoid autoplay with sound;
- include captions/transcripts where applicable;
- lazy-load non-current media;
- stop or pause media when leaving the slide unless the narrative requires continuity.

## Embeds

Use allow-listed origins, sandbox policy, loading states, consent where needed, and a fallback link or screenshot. Never render arbitrary iframe HTML from untrusted deck data.
