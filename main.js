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
const round = (x,n=4) => x.toFixed(n).replace(/\.?0*$/,'');
const last = xs => xs[xs.length-1];

function mapobj(obj,f) {
  return Object.fromEntries((function*(){
    for (const entry of Object.entries(obj))
      yield f(...entry);
  })());
}

const margin = { top: 10, right: 35, bottom: 35, left: 45 },
      width  = 500 + margin.left + margin.right,
      height = 400 + margin.bottom + margin.top;

function ypadding([min,max],logy) {
  if (logy) {
    min = Math.log10(min);
    max = Math.log10(max);
    return [
      10**(1.05*min - 0.05*max),
      10**(1.05*max - 0.05*min)
    ];
  } else {
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

function rany(arg) {
  if (!Array.isArray(arg)) return !!arg;
  for (const x of arg)
    if (rany(x)) return true;
  return false;
}

function arreq() {
  const nargs = arguments.length;
  if (nargs < 2) return true;
  const a = arguments[0];
  const n = a.length;
  for (let j=1; j<nargs; ++j) {
    const b = arguments[j];
    if (b.length !== n) return false;
    for (let i=0; i<n; ++i)
      if (a[i] !== b[i]) return false;
  }
  return true;
}

function make_plot(data,call=0) {
  const { opts={} } = data;
  const { normalize=false, overlay=false } = opts;

  if (data.hists.length > 1 && !overlay) {
    const select = make(clear(_id('figure_select')),'select');
    const single_hists = data.hists.map((hist,i) => {
      make(select,'option').textContent = hist.name || `${i}`;
      return mapobj(data, (key,val) => [key, (key==='hists' ? [hist] : val)]);
    });
    select.onchange = function() {
      make_plot(single_hists[this.options.selectedIndex],1);
    };
    select.selectedIndex = 0;
    select.onchange();
    select.focus();
    return;
  } else if (call===0) clear(_id('figure_select'));

  const ex = [Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY],
        ey = [Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY];
  const hists = [ ];

  for (const { name, axes, bins, style={} } of data.hists) {
    if (!axes.length) throw new Error(
      '"axes" must be a non-empty array');
    let nbins_total = 1;
    for (const dim of axes) {
      const dimn = dim.length;
      if (!dimn) throw new Error(
        'elements of "axes" must be non-empty arrays');
      let nbins_dim = 0;
      for (let i=0; i<dimn; ++i) {
        const axis = dim[i];
        if (axis.constructor === Float32Array) {
          nbins_dim += axis.length+1;
          continue;
        }
        if (axis.constructor !== Array) throw new Error(
          'axis definition must be an array');
        let n = 0;
        for (const x of axis) {
          if (x.constructor === Number) ++n;
          else n += x[2]+1;
        }
        const edges = new Float32Array(n);
        let j = 0;
        for (const x of axis) {
          if (x.constructor === Number) edges[j++] = x;
          else {
            const [ a, b, n ] = x;
            const d = (b-a)/n;
            for (let i=0; i<n; ++i)
              edges[j++] = a + d*i;
            edges[j++] = b;
          }
        }
        nbins_dim += edges.length+1;
        dim[i] = edges.sort();
      }
      nbins_total = nbins_dim + (nbins_total-dimn)*(dim[dimn-1].length+1);
    }
    if (nbins_total!==bins.length) throw new Error('wrong number of bins');

    { let div = _id('figure_select');
      while (div.children.length > call) div.removeChild(div.lastChild);
      const ndim = axes.length;
      if (ndim > 1) {
        div = div.children.length < 2 ? make(div,'div') : div.children[1];
        let draw2d = div.querySelector('.draw2d');
        if (ndim == 2 && (draw2d===null || draw2d.checked)) {
          if (draw2d===null) {
            draw2d = make(div,'label','input');
            draw2d.parentNode.appendChild(
              document.createTextNode('draw 2D plot'));
            draw2d.type = 'checkbox';
            draw2d.checked = true;
            draw2d.className = 'draw2d';
            draw2d.onchange = function() {
              if (this.checked) {
                while (div.children.length > 1)
                  div.removeChild(div.lastChild);
                make_plot_2D(data);
              } else {
                make_plot(data,2);
              }
            };
          }
          draw2d.onchange();
          return;
        }

        let tab = div.querySelector('table');
        if (tab===null) tab = make(div,'table');
        else clear(tab);
        const tr1 = make(tab,'tr');
        const tr2 = make(tab,'tr');

        const dim = new Array(ndim);
        function select_bin() {
          const kk = new Int32Array(ndim);
          const ii = new Int32Array(ndim);
          for (let i=0; i<ndim; ++i)
            kk[i] = dim[i][1].selectedIndex;
          const d = kk.indexOf(-1);
          const axis = axes[d][0]; // TODO
          const nb1 = bins.length, nb2 = axis.length+1;
          const bins2 = new Array(nb2);
          for (let b1=0, b2=0; b1<nb1; ++b1) {
            let b = true;
            for (let i=ndim; --i >= 0; ) {
              if (i !== d && ii[i] !== kk[i]) {
                b = false;
                break;
              }
            }
            if (b) {
              bins2[b2] = bins[b1];
              if (++b2 === nb2) break;
            }
            for (let i=ndim; --i >= 0; ) {
              if (++ii[i] <= axes[i][0].length) break; // TODO
              ii[i] = 0;
            }
          }
          make_plot(
            mapobj(data, (k1,v1) => [k1, (k1==='hists' ? [
              mapobj(v1[0], (k2,v2) => [k2, (
                  k2==='axes'
                ? [[ axis ]]
                : k2==='bins'
                ? bins2
                : v2)])
            ] : v1)]), 2
          );
        }
        function select_dim(d) {
          for (let i=0; i<ndim; ++i) {
            const [r,s] = dim[i];
            if (i===d) {
              clear(s).disabled = true;
            } else if (s.options.length===0) {
              // TODO: only works for dimensions with same binning
              const edges = axes[i][0];
              const n = edges.length;
              for (let j=0; j<=n; ++j) {
                make(s,'option').textContent =
                  '[' + (j   ? round(edges[j-1]) : '-∞' ) +
                  ',' + (j<n ? round(edges[j  ]) :  '∞' ) + ')';
              }
              s.selectedIndex = 0;
              s.disabled = false;
            }
          }
          dim[d][1].onchange();
        }
        for (let i=0; i<ndim; ++i) {
          const r = make(tr1,'td','input');
          r.type = 'radio';
          r.name = 'dim';
          const s = make(tr2,'td','select');
          s.classList.add('dim');
          dim[i] = [r,s];
          if (ndim-i===1 || axes[i].length===1)
            r.onchange = function(e) { select_dim(i); };
          else
            r.disabled = true;
          s.onchange = select_bin;
        }
        { const r = last(dim)[0];
          r.checked = true;
          r.onchange();
        }
        return;
      }
    }
    const axis = axes[0][0];

    // if (axes.length!==1 || axes[0].length!==1)
    //   throw new Error('multiple axes not yet implemented');
    // const axis = axes[0][0];

    if (axis[0] < ex[0]) ex[0] = axis[0];
    if (last(axis) > ex[1]) ex[1] = last(axis);

    const nbins = nbins_total-2;
    const bmid = new Float32Array(nbins);
    const bmin = new Float32Array(nbins);
    const bmax = new Float32Array(nbins);

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

    if (normalize) {
      const sum = bmid.reduce((a,x) => a+x);
      if (sum!==0) {
        for (let i=0; i<nbins; ++i) {
          bmid[i] /= sum;
          bmin[i] /= sum;
          bmax[i] /= sum;
        }
        ey[0] /= sum;
        ey[1] /= sum;
      }
    }

    hists.push({nbins,bmin,bmid,bmax,axis,style});
  } // end hists loop

  const fig = make(clear(_id('figures')),'figure');
  if (data.title) {
    const cap = make(fig,'figcaption');
    data.title.split(/\^(\d+)/).forEach((x,i) => {
      if (i%2) make(cap,'sup').textContent = x;
      else cap.appendChild(document.createTextNode(x));
    });
  }

  const sx = d3.scaleLinear()
    .domain(ex)
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
    if (arreq(...hists.map(h => h.axis))) { // ticks at edges
      const axis = hists[0].axis;
      if (axis.length < 11) ax.tickValues(axis);
    }
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
          x: bb.x+bb.width, y: bb.y+3, 'font-size': 9
        }).text(lx<0 ? `${-lx}` : `−${lx}`);
      }
      if (ly) {
        const bb = g2.append('text').attrs({
          x: sx.range()[0]+4, y: sy.range()[1]+7, 'font-size': 10
        }).text('×10').node().getBBox();
        g2.append('text').attrs({
          x: bb.x+bb.width, y: bb.y+3, 'font-size': 9
        }).text(ly<0 ? `${-ly}` : `−${ly}`);
      }
    }
  }

  for (const hist of hists) { // draw histograms
    const { nbins, bmin, bmid, bmax, axis } = hist;
    const { connect=false, color='#009' } = hist.style;

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

  if (data.hists.some(h => 'name' in h)) { // draw legend
    const g = svg.append('g').attrs({
      'text-anchor': 'start', 'font-family': 'sans-serif', 'font-size': 16
    });
    let i = 0;
    for (const h of data.hists) {
      const { name=null, style={} } = h;
      if (!name) continue;
      g.append('text').attrs({
        x: 0, y: i*20, fill: style.color || '#009'
      }).text(name);
      ++i;
    }
    const bb = g.node().getBBox();
    g.attr('transform',
      `translate(${sx.range()[1]-Math.ceil(bb.width)-bb.x-5},` +
      `${sy.range()[1]-bb.y+5})`);
  }

  { // print bin info
    const info = make(fig,'div');
    info.className = 'info';
    const n = hists.length;
    const p = hists.map(() => make(info,'p'));
    svg_node.onmousemove = function(e) {
      const cmt = this.getScreenCTM();
      if (e.touches) e = e.touches[0];
      const x = sx.invert((e.clientX-cmt.e)/cmt.a);
      for (let i=0; i<n; ++i) {
        const {nbins,axis} = hists[i];
        const {bins} = data.hists[i];
        let bin = d3.bisectLeft(axis,x);
        if (bin < 1) bin = 1;
        else if (bin > nbins) bin = nbins;
        p[i].textContent =
          `bin ${bin} [${round(axis[bin-1],6)},${round(axis[bin],6)}): `
          + JSON.stringify(bins[bin]);
      }
    }
    const t = make(info,'table');
    function print_overflow(bins,label) {
      const tr = make(t,'tr');
      if (rany(bins)) {
        make(tr,'td').textContent = label;
        const td = make(tr,'td');
        for (const bin of bins)
          make(td,'p').textContent = JSON.stringify(bin);
      }
    }
    print_overflow(data.hists.map(h => h.bins[0]),'underflow:');
    print_overflow(data.hists.map(h => last(h.bins)),'overflow:');
  }
}

function make_plot_2D(data) {
  const margin = { top: 10, right: 50, bottom: 20, left: 30, z: 25, zleft: 3 },
        width  = 500 + margin.left + margin.right + margin.z,
        height = 500 + margin.bottom + margin.top;

  const fig = make(clear(_id('figures')),'figure');
  if (data.title) {
    const cap = make(fig,'figcaption');
    data.title.split(/\^(\d+)/).forEach((x,i) => {
      if (i%2) make(cap,'sup').textContent = x;
      else cap.appendChild(document.createTextNode(x));
    });
  }

  const hist = data.hists[0];
  const axes = hist.axes.map(a => a[0]);
  function* bin_indices() {
    const [n1,n2] = axes.map(a => a.length-1);
    let k = n2+2;
    for (let i=0; i<n1; ++i) {
      ++k;
      for (let j=0; j<n2; ++j, ++k)
        yield [ i, j, k ];
      ++k;
    }
  }

  const sx = d3.scaleLinear()
    .domain([axes[0][0],last(axes[0])]).nice()
    .range([margin.left, width - margin.right - margin.z]);
  const sy = d3.scaleLinear()
    .domain([axes[1][0],last(axes[1])]).nice()
    .range([height - margin.bottom, margin.top]);
  const ry = sy.range();
  { const a = Math.round((ry[0]-ry[1])/10);
    ry[0] -= a;
    ry[1] += a;
  }
  const sz = d3.scaleLinear()
    .domain(d3.extent(bin_indices(), ([i,j,k]) => hist.bins[k][0])).nice()
    .range(ry);
  // https://github.com/d3/d3-scale-chromatic
  const sc = d3.scaleSequential(d3.interpolateTurbo) // Viridis, Turbo, RdYlGn
    .domain(sz.domain());

  const ax = d3.axisBottom(sx);
  const ay = d3.axisLeft(sy);
  const az = d3.axisRight(sz);

  const svg = d3.select(fig).append('svg')
    .attrs({ viewBox: [0,0,width,height], width, height });
  // const svg_node = svg.node();

  { const g = svg.append('g')
    g.append('g').attrs({
      transform: `translate(0,${height-margin.bottom})`
    }).call(ax);
    g.append('g').attrs({
      transform: `translate(${margin.left},0)`
    }).call(ay);
    g.append('g').attrs({
      transform: `translate(${width-margin.right+margin.zleft},0)`
    }).call(az);
    g.selectAll('line,path').attr('stroke','#000');
    g.selectAll('text').attr('fill','#000');
    g.selectAll('*').attr('class',null);
  }

  { // Draw color scale =============================================
    const [b,a] = sz.range();
    const x = width-margin.right-margin.z+margin.zleft,
          l = margin.z;
    svg.append('g').attr('stroke-width',1)
      .selectAll('path').data((function*(){
          for (let i=a; i<=b; ++i) yield i;
        })()).join('path')
      .attrs(y => ({
        d: `M${x} ${y+0.5}h${l}`,
        stroke: sc(sz.invert(y))
      }));
  }

  svg.append('g').attr('stroke','none')
    .selectAll('rect').data(bin_indices()).join('rect')
    .attrs(([i,j,k]) => {
      const x = sx(axes[0][i]),
            y = sy(axes[1][j+1]),
            width  = sx(axes[0][i+1]) - x,
            height = sy(axes[1][j]) - y;
      return {
        x: Math.round(x+1),
        y: Math.round(y),
        height: Math.round(height),
        width: Math.round(width),
        fill: sc(hist.bins[k][0])
      };
    });
}

function load_plot(path) {
  _id('local_file').value = null;
  fetch(root+'data/'+path+'.json', { method: 'GET' })
  .then(r => r.json())
  .then(make_plot)
  .catch(e => { alert(e.message); throw e; });
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
      for (const [,name,x] of
        Object.entries(tree).map(x => {
          const [key,val] = x;
          const tokens = key.split(
            /([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)/);
          for (let i=0, n = tokens.length; i<n; ++i) {
            if (i%2) tokens[i] = parseFloat(tokens[i]);
            else tokens[i] = tokens[i].toLowerCase();
          }
          return [ tokens, key, val ];
        }).sort((a,b) => {
          a = a[0]; b = b[0];
          const n = Math.min(a.length,b.length);
          for (let i=0; i<n; ++i) {
            if (a[i] < b[i]) return -1;
            if (b[i] < a[i]) return  1;
          }
          return a.length - b.length;
        })
      ) {
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
            if (!e.ctrlKey) {
              e.preventDefault();
              const s = window.history.state;
              if (!(s && s.path===path))
                window.history.pushState(
                  { path }, '', '?'+encodeURIComponent(path));
              load_plot(path);
            }
          };
        }
        dirs.pop();
      }
    })(r,ul);
  }).catch(e => { alert(e.message); throw e; });

  _id('local_file').onchange = function(e) {
    const files = this.files;
    if (files && files.length==1) {
      const f = new FileReader();
      f.onload = (e => { make_plot(JSON.parse(e.target.result)); });
      f.readAsText(files[0]);
    }
    this.value = null;
  };
  _id('local_file_button').onclick = function(e) {
    e.preventDefault();
    _id('local_file').click();
  };
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
  { let name = window.location.search.match(/(?<=\?)[^&]+/)
    if (name===null) name = 'plot';
    else name = decodeURIComponent(name).replaceAll('/',' ');
    dummy_a.download = name + '.svg';
    dummy_a.click();
  }
}

window.addEventListener('keydown', e => { // Ctrl + s
  if ( e.ctrlKey && !(e.shiftKey || e.altKey || e.metaKey))
    switch (e.which || e.keyCode) {
      case 83:
        const svg = _id('figures').querySelector('figure > svg');
        if (svg) {
          e.preventDefault();
          save_svg(svg);
        }
        break;
      case 79:
        const input = _id('local_file');
        if (input) {
          e.preventDefault();
          input.click();
        }
        break;
    }
});
