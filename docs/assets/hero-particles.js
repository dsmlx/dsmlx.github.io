/* Hero canvas — Swiss grid: sparse dots at column crosshairs + large numeric watermark */
(function () {
  function boot() {
    var canvas = document.getElementById('mesh-particles');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var dpr = Math.max(1, window.devicePixelRatio || 1);

    function render() {
      var rect = canvas.getBoundingClientRect();
      var w = rect.width;
      var h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Horizontal baseline rhythm — very faint
      ctx.strokeStyle = 'rgba(20, 20, 22, 0.035)';
      ctx.lineWidth = 1;
      var step = 48;
      for (var y = step; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Crosshair markers at every 4th intersection (decorative registration marks)
      var colStep = w / 12;
      ctx.strokeStyle = 'rgba(20, 20, 22, 0.08)';
      ctx.lineWidth = 1;
      for (var cx = 0; cx <= 12; cx += 3) {
        for (var ry = step * 2; ry < h; ry += step * 3) {
          var x = cx * colStep;
          if (x < 1 || x > w - 1) continue;
          ctx.beginPath();
          ctx.moveTo(x - 4, ry);
          ctx.lineTo(x + 4, ry);
          ctx.moveTo(x, ry - 4);
          ctx.lineTo(x, ry + 4);
          ctx.stroke();
        }
      }

      // Accent registration marks — bottom-right corner, rule-of-thirds
      var accentX = w * 0.88;
      var accentY = h * 0.72;
      ctx.strokeStyle = '#0033FF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(accentX - 8, accentY);
      ctx.lineTo(accentX + 8, accentY);
      ctx.moveTo(accentX, accentY - 8);
      ctx.lineTo(accentX, accentY + 8);
      ctx.stroke();

      // Tiny orange spark — single counter-accent
      ctx.fillStyle = '#FF4E1A';
      ctx.beginPath();
      ctx.arc(w * 0.06, h * 0.88, 4, 0, Math.PI * 2);
      ctx.fill();

      // Large numeric watermark in bottom-right
      ctx.save();
      ctx.font = '900 ' + Math.round(Math.min(h * 0.55, 380)) + "px 'Bricolage Grotesque', sans-serif";
      ctx.fillStyle = 'rgba(20, 20, 22, 0.035)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('03', w - 24, h - 12);
      ctx.restore();

      // Small labels on edges
      ctx.save();
      ctx.fillStyle = 'rgba(20, 20, 22, 0.35)';
      ctx.font = "500 10px 'JetBrains Mono', monospace";
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('GRID / 12', 16, 16);
      ctx.textAlign = 'right';
      ctx.fillText('SET IN BRICOLAGE', w - 16, 16);
      ctx.restore();
    }

    render();
    if (window.ResizeObserver) {
      new ResizeObserver(render).observe(canvas);
    } else {
      window.addEventListener('resize', render);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
