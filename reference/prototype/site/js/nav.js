// Demande à la coquille de redessiner l'écran courant sans perdre la position.
export const rafraichit = () => window.dispatchEvent(new Event('mb:rafraichir'));
export const va = (h) => { if (location.hash === '#' + h) rafraichit(); else location.hash = h; };
