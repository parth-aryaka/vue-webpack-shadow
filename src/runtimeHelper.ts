export function injectStylesIntoShadowRoot(styles: string) {
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;

    // Find the nearest ShadowRoot and append the style
    let root = document.querySelector(':host')?.getRootNode() as ShadowRoot;
    if (root instanceof ShadowRoot) {
        root.appendChild(styleElement);
    } else {
        console.warn('No shadow root found for style injection.');
    }
}