# prefixed-globals

Load modules that require a full implementation of a loader, like RequireJS,
in an environment where there is a custom module system that doesn't support
everything RequireJS supports, by prefixing the module loader globals
including `require`, `define`, `module`, and `exports` with `__pg_`.

Originally made to support loading [CodeMirror][CM] in an
[Observable][observable] notebook.

You can provide a module system uses the prefixed globals, or simply let the
modules fall back to using a global, like `window.CodeMirror`. Most UMD
packages will use a global if they can't find a module system.

## TODO

- more packages
- a sibling repo for npm packages that only support CommonJS so packages can
  be run without [bundle.run][bundlerun] which sometimes fails to load
  (it isn't as reliable as unpkg which has more servers thrown at it)

[CM]: https://github.com/codemirror/CodeMirror
[observable]: http://observablehq.com
[bundlerun]: https://bundle.run/
