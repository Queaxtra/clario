// server-render the shell so crawlers get the meta tags and copy without running JS
// the engine itself still starts on the client only (worker and canvas APIs)
export const prerender = false;
