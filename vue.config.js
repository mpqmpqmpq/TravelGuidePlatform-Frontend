const path = require('path');
const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: [
    '@wangeditor/editor-for-vue',
    '@element-plus/icons-vue'
  ],
  devServer: {
    port: 51700,
    proxy: {
      '/actuator': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        ws: true
      },
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        ws: true
      }
    }
  },
  configureWebpack: {
    resolve: {
      alias: {
        'cropperjs': path.resolve(__dirname, 'node_modules/cropper/node_modules/cropperjs'),
        'cropperjs/dist/cropper.css': path.resolve(__dirname, 'node_modules/cropper/node_modules/cropperjs/dist/cropper.css')
      },
      fallback: {
        "path": require.resolve("path-browserify"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "zlib": require.resolve("browserify-zlib"),
        "stream": require.resolve("stream-browserify"),
        "url": require.resolve("url/"),
        "crypto": require.resolve("crypto-browserify")
      }
    }
  },
  chainWebpack: config => {
    config.plugin('define').tap(definitions => {
      Object.assign(definitions[0], {
        __VUE_OPTIONS_API__: 'true',
        __VUE_PROD_DEVTOOLS__: 'false',
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
      })
      return definitions
    })

    config.module
        .rule('vue')
        .use('vue-loader')
        .tap(options => {
          return options
        })
  }
})

