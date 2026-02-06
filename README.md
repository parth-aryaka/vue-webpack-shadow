# vue-webpack-shadow

A Webpack 5 plugin for Vue 3 that enables `<style shadow>` blocks in Single File Components (SFCs). Automatically injects CSS into the nearest ShadowRoot, perfect for building web components with Vue 3.

## Features

- ✨ **Shadow DOM Support**: Automatically inject styles into ShadowRoot
- 🔥 **HMR Support**: Hot Module Replacement for shadow styles in development
- 📦 **Zero Config**: Works out of the box with Vue CLI v5
- 🎯 **Type Safe**: Full TypeScript support
- 🚀 **Lightweight**: Minimal runtime overhead

## Installation

```bash
npm install vue-webpack-shadow --save-dev
```

### Peer Dependencies

This plugin requires:
- Vue 3.2.0 or higher (`@vue/compiler-sfc`)
- Webpack 5.0.0 or higher

## Usage

### 1. Configure Vue CLI (vue.config.js)

Add the plugin and configure the webpack chain to handle shadow style imports:

```js
const { defineConfig } = require('@vue/cli-service');
const VueWebpackShadowPlugin = require('vue-webpack-shadow');

module.exports = defineConfig({
  chainWebpack: (config) => {
    // Add the VueWebpackShadowPlugin
    config.plugin('vue-webpack-shadow').use(VueWebpackShadowPlugin);

    // Configure css-loader to handle shadow-inline imports
    config.module
      .rule('vue-shadow-styles')
      .resourceQuery(/shadow-inline/)
      .use('css-loader')
      .loader('css-loader')
      .options({
        exportType: 'string',
      });
  },
});
```

### 2. Use in Vue Components

Mark your style blocks with the `shadow` attribute:

```vue
<template>
  <div class="my-component">
    <h1>Hello Shadow DOM!</h1>
  </div>
</template>

<script setup>
// Your component logic
</script>

<style shadow>
.my-component {
  color: blue;
  font-family: sans-serif;
}

h1 {
  font-size: 24px;
  margin: 0;
}
</style>
```

The plugin will:
1. Detect the `<style shadow>` block
2. Extract the CSS content
3. Inject runtime code to find the nearest ShadowRoot
4. Create a `<style>` tag in the ShadowRoot with your CSS

### 3. Component Mount Requirements

For the plugin to work correctly, your component must be mounted within a ShadowRoot. For example:

```js
import { createApp } from 'vue';
import MyComponent from './MyComponent.vue';

// Create a custom element with shadow DOM
class MyWebComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const app = createApp(MyComponent);
    app.mount(this.shadowRoot);
  }
}

customElements.define('my-web-component', MyWebComponent);
```

## Plugin Options

```js
new VueWebpackShadowPlugin({
  // Enable HMR support for shadow styles (default: true)
  hmr: true,
})
```

### Options

- **`hmr`** (boolean): Enable Hot Module Replacement for shadow styles in development mode. Default: `true`.

## How It Works

The plugin performs the following transformations at build time:

1. **Parse SFC**: Detects `<style shadow>` blocks in Vue Single File Components
2. **Generate Imports**: Creates dynamic imports for each shadow style block
3. **Inject Runtime**: Adds the `useShadowStyle` runtime helper to your component
4. **Lifecycle Hooks**: Automatically wires up `onMounted` and `onBeforeUnmount` hooks
5. **HMR Integration**: Adds Hot Module Replacement support in development mode

### Example Transformation

**Input (MyComponent.vue):**
```vue
<template>
  <div class="container">Content</div>
</template>

<style shadow>
.container { padding: 20px; }
</style>
```

**Output (Conceptual):**
```vue
<template>
  <div class="container">Content</div>
</template>

<script setup>
import { useShadowStyle } from 'vue-webpack-shadow/runtime';
import { onMounted, onBeforeUnmount, getCurrentInstance } from 'vue';
import __shadowStyle0__ from './MyComponent.vue?shadow-inline&index=0';

const __cleanup0__ = useShadowStyle(__shadowStyle0__, 'MyComponent.vue?shadow-0');
onMounted(() => { __cleanup0__.inject(getCurrentInstance()?.vnode?.el); });
onBeforeUnmount(__cleanup0__);
</script>

<style>
.container { padding: 20px; }
</style>
```

## Constraints

- **Plain CSS Only**: The plugin currently supports only plain CSS. SCSS, LESS, and other preprocessors are not supported for shadow styles.
- **No Scoped Styles**: The `shadow` and `scoped` attributes cannot be used together.
- **ShadowRoot Required**: Components using shadow styles must be mounted within a ShadowRoot.

## Runtime API

### `useShadowStyle(cssText, requestId)`

The runtime helper that injects styles into the nearest ShadowRoot.

**Parameters:**
- `cssText` (string): The CSS text to inject
- `requestId` (string): A unique identifier for this style injection

**Returns:**
A cleanup function with an `inject` method.

**Example:**
```js
import { useShadowStyle } from 'vue-webpack-shadow/runtime';
import { onMounted, onBeforeUnmount, getCurrentInstance } from 'vue';

const cleanup = useShadowStyle('.my-class { color: red; }', 'my-unique-id');

onMounted(() => {
  cleanup.inject(getCurrentInstance()?.vnode?.el);
});

onBeforeUnmount(cleanup);
```

## Troubleshooting

### "No ShadowRoot found" Warning

If you see this warning in the console, it means your component is not mounted within a ShadowRoot. Ensure your component is properly mounted inside a shadow DOM context.

### Styles Not Applying

1. Verify the component is mounted within a ShadowRoot
2. Check that the `shadow` attribute is present on your `<style>` tag
3. Ensure the webpack configuration includes the `shadow-inline` resourceQuery rule
4. Verify css-loader is configured with `exportType: 'string'`

### HMR Not Working

Make sure:
1. You're running in development mode
2. The `hmr` option is enabled (it's enabled by default)
3. Webpack HMR is properly configured in your project

## Vue CLI v5 Integration

For Vue CLI v5 projects, the complete configuration looks like:

```js
// vue.config.js
const { defineConfig } = require('@vue/cli-service');
const VueWebpackShadowPlugin = require('vue-webpack-shadow');

module.exports = defineConfig({
  transpileDependencies: true,
  
  chainWebpack: (config) => {
    // Register the plugin
    config
      .plugin('vue-webpack-shadow')
      .use(VueWebpackShadowPlugin, [{ hmr: true }]);

    // Handle shadow-inline imports
    config.module
      .rule('vue-shadow-styles')
      .resourceQuery(/shadow-inline/)
      .use('css-loader')
      .loader('css-loader')
      .options({
        exportType: 'string',
      });
  },
});
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Credits

Built for Vue 3 + Webpack 5 projects that need Shadow DOM support.
