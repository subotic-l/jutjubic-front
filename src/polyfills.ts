// Polyfill za sockjs-client koji zahteva Node.js globale u browseru
(window as any).global = window;
(window as any).process = {
  env: { DEBUG: undefined },
  version: ''
};
(window as any).Buffer = (window as any).Buffer || undefined;
