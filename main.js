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

const margin = { top: 10, right: 35, bottom: 35, left: 45 },
      width  = 500 + margin.left + margin.right,
      height = 400 + margin.bottom + margin.top;

function ypadding([min,max],logy) {
  if (logy) return [
    Math.pow(10,1.05*Math.log10(min) - 0.05*Math.log10(max)),
    Math.pow(10,1.05*Math.log10(max) - 0.05*Math.log10(min))
  ];
  else {
    let both = false;
    if (min > 0.) {
      if (min/max < 0.25) {
        min = 0.;
        max /= 0.95;
      } else both = true;
    } else if (max < 0.) {
      if (min/max < 0.25) {
        max = 0.;
        min /= 0.95;
      } else both = true;
    } else if (min==0.) {
      max /= 0.95;
    } else if (max==0.) {
      min /= 0.95;
    } else both = true;
    if (both) {
      return [ 1.05556*min - 0.05556*max, 1.05556*max - 0.05556*min ];
    }
  }
  return [ min, max ];
}

function make_plot(data) {
  const fig = clear(_id('plot'));
  if (data.title) {
    const cap = make(fig,'figcaption');
    data.title.split(/\^(\d+)/).forEach((x,i) => {
      if (i%2) make(cap,'sup').textContent = x;
      else cap.appendChild(document.createTextNode(x));
    });
  }
  let { axes, bins } = data;
  if (!(Array.isArray(axes) && axes.length))
    throw new Error('"axes" must be a non-empty array');

  let nbins_total = 1;
  for (const dim of axes) {
    if (!(Array.isArray(dim) && dim.length))
      throw new Error('elements of "axes" must be non-empty arrays');
    let nbins_dim = 0, i = 0;
    for (; i<dim.length; ++i) {
      const axis = dim[i];
      if (!Array.isArray(axis))
        throw new Error('axis definition must be an array');
      let n = 0;
      for (const x of axis) {
        if (typeof x === 'number') ++n;
        else n += x[2]+1;
      }
      const edges = new Float32Array(n);
      let j = 0;
      for (const x of axis) {
        if (typeof x === 'number') edges[j++] = x;
        else {
          const [ a, b, n ] = x;
          const d = (b-a)/n;
          for (let i=0; i<n; ++i)
            edges[j++] = a + d*i;
          edges[j++] = b;
        }
      }
      dim[i] = edges.sort();
      nbins_dim += edges.length+1;
    }
    nbins_total = nbins_dim + (nbins_total-i)*(dim[i-1].length+1);
  }
  if (nbins_total!==bins.length) throw new Error('wrong number of bins');

  if (axes.length!==1 || axes[0].length!==1)
    throw new Error('multiple axes not yet implemented');
  const axis = axes[0][0];

  const nbins = nbins_total-2;
  const bmid = new Float32Array(nbins);
  const bmin = new Float32Array(nbins);
  const bmax = new Float32Array(nbins);

  const ey = [Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY];
  for (let i=0; i<nbins; ++i) {
    const b = bins[i+1];
    if (Array.isArray(b)) {
      switch (b.length) {
        case 0: break;
        case 1: bmid[i] = b[0]; break;
        default:
          bmid[i] = b[0];
          const u = b[1];
          if (Array.isArray(u)) {
            switch (u.length) {
              case  0: break;
              case  1: bmin[i] = -u[0]; bmax[i] = u[0]; break;
              default: bmin[i] = -u[0]; bmax[i] = u[1];
            }
          } else { bmin[i] = -u; bmax[i] = u; }
      }
    } else { bmid[i] = b; }
    bmin[i] += bmid[i];
    bmax[i] += bmid[i];
    if (bmin[i] < ey[0]) ey[0] = bmin[i];
    if (bmax[i] > ey[1]) ey[1] = bmax[i];
  }

  const sx = d3.scaleLinear()
    .domain([axis[0],axis[axis.length-1]])
    .range([margin.left, width - margin.right]);
  const sy = d3.scaleLinear()
    .domain(ypadding(ey,false))
    .range([height - margin.bottom, margin.top]);

  const svg = d3.select(fig).append('svg')
    .attrs({ viewBox: [0,0,width,height], width, height });
  const svg_node = svg.node();

  { // draw axes
    const fmt = d3.format(",.3~f");
    const lx =
      -3*(Math.log10(Math.max(...sx.domain().map(x => Math.abs(x))))/3>>0);
    const ly =
      -3*(Math.log10(Math.max(...sy.domain().map(x => Math.abs(x))))/3>>0);

    const ax = d3.axisBottom(sx);
    if (axis.length < 11) ax.tickValues(axis);
    ax.tickFormat(x => fmt(x*10**lx));
    ax.tickSizeOuter(0);
    const ay = d3.axisLeft(sy);
    ay.tickFormat(x => fmt(x*10**ly));
    ay.tickSizeOuter(0);

    const g = svg.append('g')
    g.append('g').attrs({
      transform: `translate(0,${height-margin.bottom})`
    }).call(ax);
    g.append('g').attrs({
      transform: `translate(${margin.left},0)`
    }).call(ay);
    g.selectAll('line,path').attr('stroke','#000');
    g.selectAll('text').attr('fill','#000');
    g.selectAll('*').attr('class',null);

    const { labels=[] } = data;
    const nl = labels.length;
    if (nl>0) {
      const g2 = g.append('g').attrs({
        'text-anchor': 'end', 'font-family': 'sans-serif', 'font-size': 12,
        fill: '#000'
      });
      g2.append('text').attrs({
        x: sx.range()[1], y: height-5
      }).text(labels[0]);
      if (nl>1)
        g2.append('text').attrs({
          x: -sy.range()[1], y: 12, transform: 'rotate(270)'
        }).text(labels[1]);
    }

    if (lx||ly) {
      const g2 = g.append('g').attrs({
        'text-anchor': 'start', 'font-family': 'sans-serif', fill: '#000'
      });
      if (lx) {
        const bb = g2.append('text').attrs({
          x: sx.range()[1]+4, y: sy.range()[0], 'font-size': 10
        }).text('×10').node().getBBox();
        g2.append('text').attrs({
          x: bb.x+bb.width-1, y: bb.y+3, 'font-size': 9
        }).text(lx<0 ? `${-lx}` : `−${lx}`);
      }
      if (ly) {
        const bb = g2.append('text').attrs({
          x: sx.range()[0]+4, y: sy.range()[1]+7, 'font-size': 10
        }).text('×10').node().getBBox();
        g2.append('text').attrs({
          x: bb.x+bb.width-1, y: bb.y+3, 'font-size': 9
        }).text(ly<0 ? `${-ly}` : `−${ly}`);
      }
    }
  }
  { // draw histogram
    const { style={} } = data;
    const { connect=false, color='#009' } = style;

    let d = '', d2 = '';
    for (let i=0, n=axis.length-1; i<n; ++i) {
      const a = sx(axis[i]), b = sx(axis[i+1]), m = (a+b)/2;
      d += `${(connect&&i)?'L':'M'}${round(a)} ${round(sy(bmid[i]))}H${round(b)}`;
      if (bmin[i]!==bmid[i] || bmax[i]!==bmid[i])
        d2 += `M${round(m)} ${round(sy(bmin[i]))}V${round(sy(bmax[i]))}`;
    }
    d += d2;
    svg.append('path').attrs({
      d, fill: 'none', stroke: color, 'stroke-width': 2
    });
  }

  { const info = make(fig,'div');
    info.className = 'info';
    const fmt = d3.format('.3~g');
    let bin;
    svg_node.onmousemove = function(e) {
      const cmt = this.getScreenCTM();
      if (e.touches) e = e.touches[0];
      bin = d3.bisectLeft(axis,sx.invert((e.clientX-cmt.e)/cmt.a));
      if (bin < 1) bin = 1;
      else if (bin > nbins) bin = nbins;
      info.textContent =
        `bin ${bin} [${fmt(axis[bin-1])},${fmt(axis[bin])}): `
        + JSON.stringify(bins[bin]);
    }
  }
  if (bins[0]) {
    const info = make(fig,'div');
    info.className = 'info';
    info.textContent = `underflow: ${JSON.stringify(bins[0])}`;
  }
  if (bins[bins.length-1]) {
    const info = make(fig,'div');
    info.className = 'info';
    info.textContent = `overflow: ${JSON.stringify(bins[bins.length-1])}`;
  }
}

function load_plot(path) {
  fetch(root+'data/'+path+'.json', { method: 'GET' })
  .then(r => r.json())
  .then(make_plot
  ).catch(e => { alert(e.message); throw e; });
}

let root = 'https://ivankp.github.io/web-plots/';
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.href.match(/^http/)) root = '';
  const search = window.location.search.match(/(?<=\?)[^&]+/);
  if (search) {
    const path = decodeURIComponent(search[0]);
    window.history.replaceState({ path }, '', '?'+search[0]);
    load_plot(path);
  }
  fetch(root+'data_tree.json', { method: 'GET' })
  .then(r => r.json())
  .then(r => {
    const dirs = [ ];
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
          link.href = root+'data/'+path+'.json';
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
    decodeURIComponent(window.location.search.match(/(?<=\?)[^&]+/))
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
