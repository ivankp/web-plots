const _id = id => document.getElementById(id);
function make(p,...tags) {
  for (const t of tags)
    p = p.appendChild(document.createElement(t))
  return p;
}
function clear(x) {
  for (let c; c = x.firstChild; ) x.removeChild(c);
  return x;
}
const round = x => x.toFixed(4).replace(/\.?0*$/,'');

function load_plot(path) {
  console.log(path);
}

document.addEventListener('DOMContentLoaded', () => {
  const search = window.location.search.match(/(?<=\?)[^&]+/);
  if (search) {
    const path = decodeURIComponent(search[0]);
    window.history.replaceState({ path }, '', '?'+search[0]);
    load_plot(path);
  }
  fetch('data_tree.json', { method: 'GET' })
  .then(r => r.json())
  .then(r => {
    const dirs = ['data'];
    const ul = make(_id('menu'),'ul');
    ul.className = 'file-tree';
    (function read_tree(tree,ul) {
      for (const [name,x] of Object.entries(tree)) {
        dirs.push(name);
        const li = make(ul,'li');
        if (typeof x === 'object') {
          const span = make(li,'span');
          span.className = 'dir';
          span.textContent = name;
          span.onclick = function() {
            this.parentNode.classList.toggle("exp");
          };
          read_tree(x,make(li,'ul'));
        } else {
          const path = dirs.join('/');
          const link = make(li,'a');
          link.textContent = name;
          link.href = path+'.json';
          link.target = '_blank';
          link.onclick = function(e) {
            e.preventDefault();
            const s = window.history.state;
            if (!(s && s.path===path))
              window.history.pushState(
                { path }, '', '?'+encodeURIComponent(path));
            load_plot(path);
          };
        }
        dirs.pop();
      }
    })(r,ul);
  }).catch(e => { alert(e.message); throw e; });
});
window.onpopstate = function(e) {
  if (e.state!==null) load_plot(e.state.path);
};

const dummy_a = document.createElement('a');

function save_svg(svg) {
  dummy_a.href = URL.createObjectURL(new Blob(
    [ '<?xml version="1.0" encoding="UTF-8"?>\n',
      svg.outerHTML
      // add xml namespace
      .replace(/^<svg\s*(?=[^>]*>)/,'<svg xmlns="'+svg.namespaceURI+'" ')
      // self-closing tags
      .replace(/<([^ <>\t]+)([^>]*)>\s*<\/\1>/g,'<$1$2/>')
      // terse style
      .replace(/(?<=style=")([^"]+)/g, (m,_1) => _1.replace(/\s*:\s*/g,':'))
      // hex colors
      .replace(/(?<=[:"])rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g,
        (m,_1,_2,_3) => [_1,_2,_3].reduce( (a,x) =>
          a+Math.round(parseFloat(x)).toString(16).padStart(2,'0'), '#')
      )
      // round translations
      .replace(/(?<=translate)\(([0-9.]+),([0-9.]+)\)/g,
        (m,_1,_2) => `(${round(parseFloat(_1))},${round(parseFloat(_2))})`
      )
    ],
    { type:"image/svg+xml;charset=utf-8" }
  ));
  dummy_a.download =
    decodeURIComponent(window.location.search.match(/(?<=\?)[^&]*/))
    .replaceAll('/',' ') + '.svg';
  dummy_a.click();
}

window.addEventListener('keydown', function(e) { // Ctrl + s
  if ( e.ctrlKey && !(e.shiftKey || e.altKey || e.metaKey)
    && ((e.which || e.keyCode) === 83)
  ) {
    const svg = _id('plot').querySelector('svg');
    if (svg) {
      e.preventDefault();
      save_svg(svg);
    }
  }
});
