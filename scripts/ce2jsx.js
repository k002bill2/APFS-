/**
 * ce2jsx.js — Deterministic AST codemod: React.createElement(...) -> JSX.
 *
 * Run with:  npx jscodeshift -t scripts/ce2jsx.js --parser=tsx <FILE>
 *
 * Handles:
 *  - The local `h` alias (`const h = React.createElement;`) AND `React.createElement`.
 *    Alias names are discovered from the AST (any VariableDeclarator whose init is the
 *    `<obj>.createElement` MemberExpression), so there is NO textual `h(`->... rewrite
 *    and NO false-positive risk (push(), forEach(), Swatch(), smoothPath() are safe).
 *  - Element type:
 *      * string literal  "div"          -> intrinsic JSX <div>
 *      * Uppercase Identifier  Button    -> <Button>
 *      * MemberExpression  React.Fragment / UI.Button -> <React.Fragment> / <UI.Button>
 *    A lowercase Identifier (a runtime variable, e.g. `tag`) is NOT a valid JSX element
 *    type, so those calls are LEFT AS createElement (semantically correct).
 *  - React.Fragment with no key/ref props -> JSX fragment <>...</>; otherwise <React.Fragment>.
 *  - Props object -> attributes:
 *      * string literal value         -> attr="x"
 *      * everything else              -> attr={expr}
 *      * SpreadElement {...o}         -> {...o}
 *      * `key`, hyphenated names      -> preserved verbatim (key={...}, "aria-hidden"={...})
 *      * props === null / undefined / {} -> no attributes
 *  - Children:
 *      * nested createElement/h calls -> nested JSX
 *      * string literal               -> raw JSX text (when safe) else {expr}
 *      * SpreadElement (...arr.map()) -> {arr.map(...)}  (spread children flattened)
 *      * any other expression         -> {expr}  (covers cond && h(...), arr.map(...), vars)
 *  - Self-closes elements with no children.
 *
 * Multiple bottom-up passes converge nested calls (jscodeshift visits, we re-run until stable).
 */

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // ---------------------------------------------------------------------------
  // 1) Discover createElement alias identifier names (e.g. `h`).
  //    Match: const X = <something>.createElement;
  // ---------------------------------------------------------------------------
  const aliasNames = new Set();
  root
    .find(j.VariableDeclarator)
    .filter((p) => {
      const init = p.node.init;
      return (
        init &&
        init.type === 'MemberExpression' &&
        !init.computed &&
        init.property &&
        init.property.type === 'Identifier' &&
        init.property.name === 'createElement'
      );
    })
    .forEach((p) => {
      if (p.node.id && p.node.id.type === 'Identifier') {
        aliasNames.add(p.node.id.name);
      }
    });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  // Is this call node a createElement call (via alias or React.createElement)?
  function isCreateElementCall(node) {
    if (!node || node.type !== 'CallExpression') return false;
    const callee = node.callee;
    if (callee.type === 'Identifier' && aliasNames.has(callee.name)) return true;
    if (
      callee.type === 'MemberExpression' &&
      !callee.computed &&
      callee.property &&
      callee.property.type === 'Identifier' &&
      callee.property.name === 'createElement'
    ) {
      // e.g. React.createElement (any object identifier is fine).
      return true;
    }
    return false;
  }

  // Build a JSXIdentifier / JSXMemberExpression name node from the type arg.
  // Returns null if the type arg is NOT convertible (lowercase identifier / computed / other).
  function buildJSXName(typeArg) {
    if (typeArg.type === 'StringLiteral' || (typeArg.type === 'Literal' && typeof typeArg.value === 'string')) {
      return { name: j.jsxIdentifier(typeArg.value), isFragment: false };
    }
    if (typeArg.type === 'Identifier') {
      // Only Uppercase identifiers are valid JSX components.
      const first = typeArg.name.charCodeAt(0);
      if (first >= 65 && first <= 90) {
        return { name: j.jsxIdentifier(typeArg.name), isFragment: false };
      }
      return null; // lowercase variable like `tag` -> not convertible
    }
    if (typeArg.type === 'MemberExpression' && !typeArg.computed) {
      // Build JSXMemberExpression from a (possibly nested) MemberExpression of Identifiers.
      const built = buildJSXMember(typeArg);
      if (!built) return null;
      const isFragment =
        typeArg.property.type === 'Identifier' && typeArg.property.name === 'Fragment';
      return { name: built, isFragment };
    }
    return null;
  }

  function buildJSXMember(node) {
    if (node.type === 'Identifier') return j.jsxIdentifier(node.name);
    if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
      const obj = buildJSXMember(node.object);
      if (!obj) return null;
      return j.jsxMemberExpression(obj, j.jsxIdentifier(node.property.name));
    }
    return null;
  }

  // Convert a props ObjectExpression into an array of JSX attributes.
  // Returns null if props arg is not an ObjectExpression / null / undefined (=> bail-able).
  function buildAttributes(propsArg) {
    if (
      !propsArg ||
      (propsArg.type === 'Identifier' && propsArg.name === 'undefined') ||
      propsArg.type === 'NullLiteral' ||
      (propsArg.type === 'Literal' && propsArg.value === null)
    ) {
      return [];
    }
    if (propsArg.type !== 'ObjectExpression') {
      // Props is a variable/spread-only expression we cannot statically split.
      return null;
    }
    const attrs = [];
    for (const prop of propsArg.properties) {
      if (prop.type === 'SpreadElement' || prop.type === 'SpreadProperty' || prop.type === 'ExperimentalSpreadProperty') {
        attrs.push(j.jsxSpreadAttribute(prop.argument));
        continue;
      }
      if (prop.type !== 'ObjectProperty' && prop.type !== 'Property') return null;
      if (prop.computed) return null; // {[x]: y} cannot become a static attribute

      // Attribute name: Identifier or StringLiteral key.
      let attrName;
      if (prop.key.type === 'Identifier') {
        attrName = j.jsxIdentifier(prop.key.name);
      } else if (
        prop.key.type === 'StringLiteral' ||
        (prop.key.type === 'Literal' && typeof prop.key.value === 'string')
      ) {
        attrName = j.jsxIdentifier(prop.key.value); // e.g. "aria-hidden", "data-x"
      } else {
        return null;
      }

      const v = prop.value;
      // String literal value -> attr="x"
      if (v.type === 'StringLiteral' || (v.type === 'Literal' && typeof v.value === 'string')) {
        attrs.push(j.jsxAttribute(attrName, j.stringLiteral(v.value)));
      } else if (v.type === 'BooleanLiteral' && v.value === true) {
        // attr={true} — keep explicit to avoid changing semantics of shorthand; safest is {true}
        attrs.push(j.jsxAttribute(attrName, j.jsxExpressionContainer(v)));
      } else {
        attrs.push(j.jsxAttribute(attrName, j.jsxExpressionContainer(v)));
      }
    }
    return attrs;
  }

  // Convert one child argument expression into a JSX child node (or array of nodes).
  function buildChild(arg) {
    // Nested createElement -> nested JSXElement (convert recursively).
    if (isCreateElementCall(arg)) {
      const converted = convertCall(arg);
      if (converted) return converted; // JSXElement / JSXFragment
      // Not convertible (dynamic tag) -> wrap original call expression.
      return j.jsxExpressionContainer(arg);
    }
    // String literal child -> JSX text (when it contains no JSX-hostile chars), else {expr}.
    if (arg.type === 'StringLiteral' || (arg.type === 'Literal' && typeof arg.value === 'string')) {
      const s = arg.value;
      if (/[<>{}]/.test(s) || s.trim() === '') {
        return j.jsxExpressionContainer(arg);
      }
      return j.jsxText(s);
    }
    // Spread child (...arr.map(...)) -> flatten as {arr.map(...)}.
    if (arg.type === 'SpreadElement' || arg.type === 'SpreadProperty') {
      return j.jsxExpressionContainer(arg.argument);
    }
    // Everything else (cond && h(...), arr.map(...), variables, JSX already) -> {expr}.
    if (arg.type === 'JSXElement' || arg.type === 'JSXFragment') {
      return arg;
    }
    return j.jsxExpressionContainer(arg);
  }

  // Convert a createElement CallExpression node into a JSXElement/JSXFragment.
  // Returns null if NOT convertible (e.g. dynamic lowercase tag) so caller can leave it.
  function convertCall(node) {
    const args = node.arguments;
    if (args.length === 0) return null;
    const typeArg = args[0];

    const nameInfo = buildJSXName(typeArg);
    if (!nameInfo) return null; // dynamic tag etc. -> leave as createElement

    const propsArg = args[1];
    const attrs = buildAttributes(propsArg);
    if (attrs === null) return null; // props not statically splittable -> leave as is

    // Children = args[2..].
    const childArgs = args.slice(2);
    const children = [];
    for (const c of childArgs) {
      const built = buildChild(c);
      if (Array.isArray(built)) children.push(...built);
      else children.push(built);
    }

    // Fragment handling: <>...</> only if no attributes; else fall back to named element.
    if (nameInfo.isFragment && attrs.length === 0) {
      return j.jsxFragment(
        j.jsxOpeningFragment(),
        j.jsxClosingFragment(),
        children
      );
    }

    const hasChildren = children.length > 0;
    const opening = j.jsxOpeningElement(nameInfo.name, attrs, !hasChildren);
    if (!hasChildren) {
      return j.jsxElement(opening, null, []);
    }
    const closing = j.jsxClosingElement(nameInfo.name);
    return j.jsxElement(opening, closing, children);
  }

  // ---------------------------------------------------------------------------
  // 2) Drive conversion. Repeatedly convert the *outermost* convertible calls
  //    until no more change. convertCall recurses into nested createElement
  //    children itself, so a single top-down pass over non-nested call sites
  //    handles the whole tree; we loop to catch calls revealed by replacement.
  // ---------------------------------------------------------------------------
  let changed = true;
  let guard = 0;
  while (changed && guard < 50) {
    changed = false;
    guard++;
    root
      .find(j.CallExpression)
      .filter((p) => isCreateElementCall(p.node))
      // Only handle calls NOT already inside a call we'll convert from above:
      // process those whose closest createElement-call ancestor is none (outermost).
      .filter((p) => {
        let a = p.parent;
        while (a) {
          if (a.node && a.node.type === 'CallExpression' && isCreateElementCall(a.node)) {
            return false; // a nested call; parent conversion handles it
          }
          a = a.parent;
        }
        return true;
      })
      .forEach((p) => {
        const converted = convertCall(p.node);
        if (converted) {
          j(p).replaceWith(converted);
          changed = true;
        }
      });
  }

  return root.toSource({ quote: 'double', reuseWhitespace: false });
};

module.exports.parser = 'tsx';
