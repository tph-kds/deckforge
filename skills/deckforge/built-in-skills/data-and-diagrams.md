# Data and Diagrams

Use data visuals and diagrams to answer a precise question. Do not add them merely to make the deck look analytical or technical.

## Chart selection

- Comparison across categories → bar or dot plot.
- Trend over time → line or area only when area meaning is valid.
- Distribution → histogram, box plot, or strip plot.
- Relationship → scatter plot with clear variables and sample size.
- Part-to-whole → stacked bar; use pie/donut only for a few clearly different parts.
- Progress toward target → bullet/progress view with baseline and target.

Every chart must define units, time range, denominator, source, and accessible summary. Use direct labels where possible, emphasize the series that supports the claim, and mute secondary context. Keep zero baselines where magnitude comparison requires them. Do not use 3D charts, dual axes without strong justification, decorative gauges, or interpolated precision unsupported by the source.

## Diagram construction

Start with the question and reading path. Define named nodes, meaningful relationships, direction, system boundaries, ownership, trust boundaries, and external actors. Use consistent shape semantics: for example, services, data stores, queues, users, and external systems must not be visually interchangeable. Label edges with actions or data rather than relying only on arrows.

Architecture diagrams should reveal responsibility and flow, not every implementation detail. Process diagrams should show state changes, decisions, exceptions, and terminal outcomes. Timelines should make sequence and dependency explicit. Matrices must name both axes and explain the desired interpretation.

## Interaction and editor behavior

Store chart data and diagram structure as serializable content rather than screenshots. Provide edit controls for labels, data, source, annotations, node/edge creation, alignment, and style tokens. Preserve deterministic layout and a stable text alternative.

## Verification

Check that the visual can be understood in grayscale, at presentation distance, and through its text summary. Confirm that data values match source material and that no animation changes the apparent magnitude or order of evidence.
