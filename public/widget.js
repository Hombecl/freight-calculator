/**
 * DimPack3D embeddable packing-calculator widget.
 *
 * Usage — drop one line where the calculator should appear:
 *   <script src="https://www.dimpack3d.com/widget.js" async></script>
 * Options (attributes on the script tag):
 *   data-lang="zh"        Chinese UI (default: en; users can still toggle in-widget)
 *   data-min-height="500" starting/minimum iframe height in px (default 560)
 *
 * The widget is an iframe onto /embed — isolated CSS, auto-resizes to content
 * via postMessage, and the 3D view only loads its engine when a user opens it.
 * Multiple widgets per page are fine (each gets its own wid).
 */
(function () {
  var script = document.currentScript;
  if (!script) return;

  var ORIGIN = 'https://www.dimpack3d.com';
  var lang = (script.getAttribute('data-lang') || 'en').toLowerCase();
  var minHeight = parseInt(script.getAttribute('data-min-height') || '560', 10) || 560;
  var wid = 'dp3d-' + Math.random().toString(36).slice(2, 8);

  var iframe = document.createElement('iframe');
  iframe.src = ORIGIN + (lang === 'zh' ? '/zh' : '') + '/embed?wid=' + wid;
  iframe.title = 'DimPack3D packing calculator';
  iframe.loading = 'lazy';
  iframe.style.cssText =
    'width:100%;border:0;display:block;background:#f8fafc;border-radius:8px;height:' +
    minHeight + 'px;';

  window.addEventListener('message', function (e) {
    if (e.origin !== ORIGIN) return;
    var d = e.data || {};
    if (d.type === 'dp3d:height' && d.wid === wid && d.height > 0) {
      iframe.style.height = Math.max(minHeight, Math.min(d.height, 6000)) + 'px';
    }
  });

  script.parentNode.insertBefore(iframe, script);
})();
