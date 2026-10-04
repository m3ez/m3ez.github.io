const DEFAULT_SURFACES = ['primary', 'mobile', 'rail'];

function sectionLabel(section) {
  if (section.dataset.navLabel) return section.dataset.navLabel;

  const heading = section.querySelector(
    ':scope > h1, :scope > h2, :scope > header h1, :scope > header h2, :scope > .section-heading h1, :scope > .section-heading h2',
  );
  return heading?.textContent?.trim() || section.id;
}

export function getNavigationSections(surface) {
  return [...document.querySelectorAll('#content > section[id]')]
    .filter(section => section.dataset.nav !== 'off')
    .filter(section => {
      const surfaces = section.dataset.navSurfaces
        ? section.dataset.navSurfaces.split(/\s+/u).filter(Boolean)
        : DEFAULT_SURFACES;
      return surfaces.includes(surface);
    })
    .map(section => ({
      id: section.id,
      label: sectionLabel(section),
      node: section,
    }));
}
