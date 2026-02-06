/**
 * VueWebpackShadowPlugin
 * 
 * A webpack plugin that transforms Vue SFCs to inject shadow styles into the nearest ShadowRoot.
 * Detects `<style shadow>` blocks and rewrites the component to use the runtime helper.
 */

import type { Compiler } from 'webpack';
import { parse } from '@vue/compiler-sfc';
import MagicString from 'magic-string';

export interface VueWebpackShadowPluginOptions {
  /**
   * Enable HMR support for shadow styles in development
   * @default true
   */
  hmr?: boolean;
}

export class VueWebpackShadowPlugin {
  private options: Required<VueWebpackShadowPluginOptions>;

  constructor(options: VueWebpackShadowPluginOptions = {}) {
    this.options = {
      hmr: options.hmr ?? true,
    };
  }

  apply(compiler: Compiler): void {
    const pluginName = 'VueWebpackShadowPlugin';
    const isDev = compiler.options.mode === 'development';
    const enableHmr = isDev && this.options.hmr;

    // Hook into the normal module loader to transform Vue files
    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      const NormalModule = compilation.moduleGraph.constructor.name === 'ModuleGraph'
        ? require('webpack/lib/NormalModule')
        : require('webpack/lib/NormalModule');

      compilation.hooks.normalModuleLoader.tap(
        pluginName,
        (loaderContext: any, module: any) => {
          // Check if this is a .vue file
          if (!module.resource || !module.resource.endsWith('.vue')) {
            return;
          }

          // Store the original pitchLoader
          const originalPitchLoader = loaderContext.pitch;

          // Create a custom pitch function that intercepts the source
          loaderContext.pitch = function (...args: any[]) {
            const result = originalPitchLoader?.apply(this, args);
            return result;
          };
        }
      );

      // Hook into module creation to transform .vue sources
      compilation.hooks.succeedModule.tap(pluginName, (module: any) => {
        if (!module.resource || !module.resource.endsWith('.vue')) {
          return;
        }

        // Get the original source
        const originalSource = module.originalSource?.();
        if (!originalSource) return;

        const source = typeof originalSource.source === 'function'
          ? originalSource.source()
          : originalSource.toString();

        // Parse the Vue SFC
        const { descriptor } = parse(source, { filename: module.resource });

        // Find shadow style blocks
        const shadowStyles = descriptor.styles.filter(
          (style) => style.attrs.shadow !== undefined && !style.attrs.scoped && !style.lang
        );

        if (shadowStyles.length === 0) {
          return;
        }

        // Transform the source
        const transformed = transformSource(
          source,
          shadowStyles,
          module.resource,
          enableHmr
        );

        if (transformed) {
          // Update the module source
          const { RawSource } = require('webpack-sources');
          module._source = new RawSource(transformed);
        }
      });
    });
  }
}

function transformSource(
  source: string,
  shadowStyles: any[],
  resourcePath: string,
  enableHmr: boolean
): string {
  const s = new MagicString(source);

  // Extract shadow style content and generate unique request IDs
  const styleImports: string[] = [];
  const styleSetupCalls: string[] = [];
  
  shadowStyles.forEach((style, index) => {
    const requestId = `${resourcePath.replace(/\\/g, '/')}?shadow-${index}`;
    
    // Create inline import for the CSS (to be handled by css-loader with exportType: 'string')
    const importName = `__shadowStyle${index}__`;
    styleImports.push(
      `import ${importName} from '${resourcePath}?shadow-inline&index=${index}';`
    );

    // Generate the setup call
    styleSetupCalls.push(
      `const __cleanup${index}__ = useShadowStyle(${importName}, '${requestId}');`
    );
    styleSetupCalls.push(
      `onMounted(() => { __cleanup${index}__.inject(__getCurrentInstance()?.vnode?.el); });`
    );
    styleSetupCalls.push(
      `onBeforeUnmount(__cleanup${index}__);`
    );
  });

  // Find the script setup block or create one
  const { descriptor } = parse(source, { filename: resourcePath });
  const scriptSetup = descriptor.scriptSetup;

  if (!scriptSetup) {
    // No script setup - need to add one
    // Find where to insert (after template, before first style)
    const templateEnd = descriptor.template?.loc.end.offset || 0;
    const firstStyleStart = descriptor.styles[0]?.loc.start.offset || source.length;
    const insertPos = Math.max(templateEnd, firstStyleStart);

    const setupCode = [
      '\n<script setup>',
      "import { useShadowStyle } from 'vue-webpack-shadow/runtime';",
      "import { onMounted, onBeforeUnmount, getCurrentInstance as __getCurrentInstance } from 'vue';",
      ...styleImports,
      '',
      ...styleSetupCalls,
      '</script>\n',
    ].join('\n');

    s.appendLeft(insertPos, setupCode);
  } else {
    // Inject into existing script setup
    const scriptContent = scriptSetup.content;
    const scriptStart = scriptSetup.loc.start.offset;
    const contentStart = scriptStart + source.slice(scriptStart).indexOf(scriptContent);

    // Build imports
    const imports = [
      "import { useShadowStyle } from 'vue-webpack-shadow/runtime';",
      "import { onMounted, onBeforeUnmount, getCurrentInstance as __getCurrentInstance } from 'vue';",
      ...styleImports,
    ].join('\n') + '\n\n';

    // Insert imports at the beginning of script setup
    s.appendLeft(contentStart, imports);

    // Insert setup calls at the end of script setup
    const contentEnd = contentStart + scriptContent.length;
    s.appendLeft(contentEnd, '\n' + styleSetupCalls.join('\n') + '\n');
  }

  // Add HMR support if enabled
  if (enableHmr) {
    const hmrCode = [
      '\n<script>',
      'if (module.hot) {',
      '  module.hot.accept();',
      '}',
      '</script>\n',
    ].join('\n');
    s.append(hmrCode);
  }

  // Remove shadow attribute from style blocks to prevent further processing
  shadowStyles.forEach((style) => {
    const styleStart = style.loc.start.offset;
    const styleContent = source.slice(styleStart, style.loc.end.offset);
    const shadowAttrMatch = styleContent.match(/\s+shadow(\s|>)/);
    
    if (shadowAttrMatch) {
      const attrPos = styleStart + (shadowAttrMatch.index || 0);
      s.remove(attrPos, attrPos + ' shadow'.length);
    }
  });

  return s.toString();
}

// Default export
export default VueWebpackShadowPlugin;
