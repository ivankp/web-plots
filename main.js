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

document.addEventListener('DOMContentLoaded', () => {
  fetch('data_tree.json', { method: 'GET' });
  .then(r => r.json())
  .then(r => {
    console.log(r);
  }).catch(e => { alert(e.message); });
});

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
