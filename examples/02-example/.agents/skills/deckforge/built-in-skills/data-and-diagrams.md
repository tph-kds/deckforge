# Data and Diagrams

Use data visuals and diagrams to answer a precise question. Do not add them merely to make the deck look analytical or technical.

## Chart selection

- Comparison across categories → bar or dot plot.
- Trend over time → line or area only when area meaning is valid.
- Distribution → histogram, box plot, or strip plot.
- Relationship → scatter plot with clear variables and sample size.
- Part-to-whole → stacked bar; use pie/donut only for a few clearly different parts.
- Progress toward target → bullet/progress view with baseline and target.

Every chart must define a question and a takeaway plus units, time range, denominator, source, and accessible summary. Use direct labels where possible, emphasize the series that supports the claim, and mute secondary context. Keep zero baselines where magnitude comparison requires them. Do not use 3D charts, dual axes without strong justification, decorative gauges, or interpolated precision unsupported by the source.

A chart or diagram must stay inside its assigned slot frame and must not overflow into neighboring content. Do not include decorative charts or invented metrics; every visual must answer its stated question with real data.

## Diagram construction

Start with the question and reading path. Define named nodes, meaningful relationships, direction, system boundaries, ownership, trust boundaries, and external actors. Use consistent shape semantics: for example, services, data stores, queues, users, and external systems must not be visually interchangeable. Label edges with actions or data rather than relying only on arrows.

Architecture diagrams should reveal responsibility and flow, not every implementation detail. Process diagrams should show state changes, decisions, exceptions, and terminal outcomes. Timelines should make sequence and dependency explicit. Matrices must name both axes and explain the desired interpretation.

## Interaction and editor behavior

Store chart data and diagram structure as serializable content rather than screenshots. Provide edit controls for labels, data, source, annotations, node/edge creation, alignment, and style tokens. Preserve deterministic layout and a stable text alternative.

## Verification

Check that the visual can be understood in grayscale, at presentation distance, and through its text summary. Confirm that data values match source material and that no animation changes the apparent magnitude or order of evidence.

## Export behavior

Charts use `ChartContent` with an `isTemplate` flag. Template ("New chart") charts must be excluded from export so placeholder charts never reach the rendered deck or PPTX. Process/diagram blocks use the semantic steps representation and render through the block exporters so the PPTX layout matches the browser layout.

## Data storytelling pipeline

Question and claim → data quality → comparison type → chart candidates → honest
encoding → annotation and narrative → accessibility → slide fit → export plan.

## Honesty and provenance

Validate data source, units, missing values, and the claim. Store provenance
(source, date, denominator, transformation) with the data. Use honest axes,
scales, ordering, and encoding. Never invent data or select a chart only because
it looks impressive.

## Chart accessibility

Apply `references/chart-accessibility-contract.md`: takeaway, data alternative,
secondary encoding, keyboard behavior when interactive, and export-loss reporting.

## Candidate blocks

Slopegraph, small multiples, waterfall, Sankey, annotated line, variance bridge,
matrix, and evidence table. Each candidate requires schema, renderer, editor,
measurement, accessibility, and exporter support before it is claimed as a
capability.
