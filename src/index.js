/* eslint no-param-reassign: 0 */

import {lookup} from 'mime-types';

export const FAVICON_PLUGIN = 'FaviconPlugin';

function normaliseConfig(config) {
    return {
        name: config.name || '',
        short_name: config.short_name || config.shortName || '',
        description: config.description || null,
        dir: config.dir || 'auto',
        lang: config.lang || 'en-US',
        display: config.display || 'standalone',
        orientation: config.orientation || 'any',
        start_url: config.start_url || config.startUrl || '/',
        background_color: config.background_color || config.background_colour || config.backgroundColor || config.backgroundColour || '#fff',
        theme_color: config.theme_color || config.theme_colour || config.themeColor || config.themeColour || '#fff',
        icons: config.icons || [],
        prefer_related_applications: config.prefer_related_applications || config.preferRelatedApplications || false,
        related_applications: config.related_applications || config.relatedApplications || [],
        scope: config.scope || '/',
    };
}

export default class WebappManifestPlugin {
    constructor(config) {
        this.config = {...config};
    }

    addManifestToHtml(compilation, htmlData, callback) {
        let publicPath = compilation.options.output.publicPath || '';

        if (publicPath.length > 0 && publicPath[publicPath.length - 1] !== '/') {
            publicPath += '/';
        }

        htmlData.html = htmlData.html.replace('</head>', `<link rel="manifest" href="${publicPath}manifest.json"></head>`);

        // we want to inject our manifest into the head
        callback(null, htmlData);
    }

    alterAssets(compilation, htmlData, callback) {
        const assets = Object.keys(compilation.assets);
        const config = this.config;

        if (config.icons === FAVICON_PLUGIN) {
            // use the favicon
            const images = assets.filter(a => a.includes('android-chrome-'));
            config.icons = images.map(image => ({
                src: image,
                type: lookup(image),
                sizes: image.match(/(\d{2,3}x\d{2,3})/g)[0]
            }));
        }

        const source = JSON.stringify(normaliseConfig(config), null, 2);
        compilation.assets['manifest.json'] = {
            source: () => source,
            size: () => source.length,
        };

        callback(null, htmlData);
    }

    apply(compiler) {
        if (compiler.hooks) {
            let tapped = 0;
            compiler.hooks.compilation.tap('WebappManifestPlugin', (compilation) => {
                compiler.hooks.compilation.tap('HtmlWebpackPluginHooks', () => {
                    if (!tapped++) {
                        compilation.hooks.htmlWebpackPluginBeforeHtmlProcessing.tapAsync(
                            'webapp-manifest-plugin',
                            (htmlData, callback) => this.addManifestToHtml(compilation, htmlData, callback)
                        );

                        compilation.hooks.htmlWebpackPluginAlterAssetTags.tapAsync(
                            'webapp-manifest-plugin',
                            (htmlData, callback) => this.alterAssets(compilation, htmlData, callback)
                        );
                    }
                });
            });
        } else {
            compiler.plugin('compilation', (compilation) => {
                compilation.plugin(
                    'html-webpack-plugin-before-html-processing',
                    (htmlData, callback) => this.addManifestToHtml(compilation, htmlData, callback)
                );

                compilation.plugin(
                    'html-webpack-plugin-alter-asset-tags',
                    (htmlData, callback) => this.alterAssets(compilation, htmlData, callback)
                );
            });
        }
    }
}
