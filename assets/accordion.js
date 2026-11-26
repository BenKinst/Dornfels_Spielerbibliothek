(() => {
  const groups = [
    {items: [...document.querySelectorAll('[data-accordion-item]')], button: '.accordion-trigger', panel: '.accordion-panel'},
    {items: [...document.querySelectorAll('[data-subaccordion-item]')], button: '.subaccordion-trigger', panel: '.subaccordion-panel'}
  ];
  const setOpen = (item, open, group) => {
    const button = item.querySelector(group.button);
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    button.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
  };
  groups.forEach(group => group.items.forEach(item => item.querySelector(group.button).addEventListener('click', () => {
    const button = item.querySelector(group.button);
    setOpen(item, button.getAttribute('aria-expanded') !== 'true', group);
  })));
  document.querySelectorAll('[data-expand-all]').forEach(button => button.addEventListener('click', () => {
    groups.forEach(group => group.items.forEach(item => setOpen(item, true, group)));
  }));
  document.querySelectorAll('[data-collapse-all]').forEach(button => button.addEventListener('click', () => {
    [...groups].reverse().forEach(group => group.items.forEach(item => setOpen(item, false, group)));
  }));
})();
