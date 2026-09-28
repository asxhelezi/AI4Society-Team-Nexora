# shared

`sinjal-i18n.js` is the source copy of the SQ / EN / SR language engine used by the staff-side
interfaces (admin, Departamenti, managerial, staff, terren). Each interface is served on its own,
so each keeps a verbatim copy next to its pages, together with its own `i18n-dict.js` dictionary.

When you change the engine, edit it here and copy it over the interface copies:

```sh
for f in $(git ls-files '*sinjal-i18n.js' | grep -v '^shared/'); do cp shared/sinjal-i18n.js "$f"; done
```

The citizen site (`sinjali_citizen/i18n.js`) predates this engine and keeps its own version.
See the header comment in `sinjal-i18n.js` for the dictionary format and the toggle markup.
