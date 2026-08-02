import React from 'react';

export type InspectorTab = 'content' | 'layout' | 'style' | 'animation' | 'media' | 'accessibility';
export function InspectorPanel({ active, onChange, children }: { active: InspectorTab; onChange(tab: InspectorTab): void; children: React.ReactNode }) {
  const tabs: InspectorTab[] = ['content','layout','style','animation','media','accessibility'];
  return (
    <section className="deck-inspector" aria-label="Slide and object properties">
      <div role="tablist" aria-label="Property panels" className="deck-inspector-tabs">
        {tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={active === tab} onClick={() => onChange(tab)}>{tab}</button>)}
      </div>
      <div role="tabpanel" className="deck-inspector-body">{children}</div>
    </section>
  );
}
