/**
 * Runtime helper for injecting shadow styles into the nearest ShadowRoot.
 * This function is called by Vue components at mount time to inject styles
 * marked with the `shadow` attribute into the component's shadow DOM.
 */

/**
 * Injects or updates a style tag in the nearest ShadowRoot.
 * 
 * @param cssText - The CSS text to inject
 * @param requestId - A unique identifier for this style injection (typically the file path)
 * @returns A cleanup function to remove the style tag
 */
export function useShadowStyle(cssText: string, requestId: string): () => void {
  let styleElement: HTMLStyleElement | null = null;
  let currentElement: HTMLElement | null = null;

  const inject = (mountedElement: HTMLElement) => {
    currentElement = mountedElement;
    
    // Find the nearest ShadowRoot by traversing up from the mounted element
    let node: Node | null = mountedElement;
    let shadowRoot: ShadowRoot | null = null;
    
    while (node) {
      const root = node.getRootNode();
      if (root instanceof ShadowRoot) {
        shadowRoot = root;
        break;
      }
      node = (node as HTMLElement).parentElement;
    }

    if (!shadowRoot) {
      console.warn(`[vue-webpack-shadow] No ShadowRoot found for style injection (${requestId})`);
      return;
    }

    // Check if a style element with this ID already exists
    const styleId = `shadow-style-${requestId}`;
    styleElement = shadowRoot.querySelector(`style[data-shadow-style-id="${styleId}"]`) as HTMLStyleElement;

    if (!styleElement) {
      // Create a new style element
      styleElement = document.createElement('style');
      styleElement.setAttribute('data-shadow-style-id', styleId);
      styleElement.textContent = cssText;
      shadowRoot.appendChild(styleElement);
    } else {
      // Update existing style element
      styleElement.textContent = cssText;
    }
  };

  const cleanup = () => {
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
      styleElement = null;
    }
  };

  // Return object with inject and cleanup methods for use in Vue lifecycle
  return Object.assign(cleanup, { inject });
}
