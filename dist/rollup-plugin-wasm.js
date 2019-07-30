'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fs = _interopDefault(require('fs'));
var path = _interopDefault(require('path'));

function wasm (options = {}) {
  options = Object.assign({}, options);

  const syncFiles = (options.sync || []).map(x => path.resolve(x));

  return {
    name: 'wasm',

    load(id) {
      if (/\.wasm$/.test(id)) {
        return new Promise((resolve, reject) => {
          fs.readFile(id, (error, buffer) => {
            if (error != null) {
              reject(error);
            }
            resolve(buffer.toString('binary'));
          });
        });
      }
      return null;
    },

    banner:  `
      function _loadWasmModule (sync, src, imports) {
        var buf = null
        var isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null
        if (isNode) {
          buf = Buffer.from(src, 'base64')
        } else {
          var raw = window.atob(src)
          var rawLength = raw.length
          buf = new Uint8Array(new ArrayBuffer(rawLength))
          for(i = 0; i < rawLength; i++) {
             buf[i] = raw.charCodeAt(i)
          }
        }

        if (imports && !sync) {
          return WebAssembly.instantiate(buf, imports)
        } else if (!imports && !sync) {
          return WebAssembly.compile(buf)
        } else {
          var mod = new WebAssembly.Module(buf)
          return imports ? new WebAssembly.Instance(mod, imports) : mod
        }
      }
    `.trim(),

    transform (code, id) {
      if (code && /\.wasm$/.test(id)) {
        const src = Buffer.from(code, 'binary').toString('base64');
        const sync = syncFiles.indexOf(id) !== -1;
        return `export default function(imports){return _loadWasmModule(${+sync}, '${src}', imports)}`
      }
    }
  }
}

module.exports = wasm;
