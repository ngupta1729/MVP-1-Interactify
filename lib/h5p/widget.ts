/**
 * The inline component ChatGPT renders after create_h5p_quiz runs.
 * Served as an MCP resource (ui://widget/quiz.html, mimeType text/html+skybridge).
 *
 * Default view: a static answer-key preview (title, questions, correct answers) +
 * actions - useful for the review-and-approve flow. "Play here" swaps the list for
 * the real h5p-standalone player, loaded on demand from our origin.
 */
export const QUIZ_WIDGET_HTML = /* html */ `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.5 -apple-system, system-ui, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; }
  @media (prefers-color-scheme: dark) { body { color: #ececec; } }
  .card { border: 1px solid rgba(128,128,128,.3); border-radius: 12px; padding: 16px; }
  h1 { font-size: 16px; margin: 0 0 2px; }
  .sub { opacity: .65; font-size: 12px; margin-bottom: 14px; }
  .q { padding: 10px 0; border-top: 1px solid rgba(128,128,128,.2); }
  .q:first-of-type { border-top: none; }
  .q b { font-weight: 600; }
  ul { margin: 6px 0 0; padding: 0; list-style: none; }
  li { padding: 3px 0 3px 22px; position: relative; }
  li.correct::before { content: "\\2713"; position: absolute; left: 2px; color: #1a7f37; font-weight: 700; }
  li.wrong::before { content: "\\2022"; position: absolute; left: 6px; opacity: .5; }
  .actions { margin-top: 14px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  a.dl, button.act { font: inherit; cursor: pointer; border: 0; background: #10a37f; color: #fff; text-decoration: none; padding: 8px 14px; border-radius: 8px; font-weight: 600; }
  button.ghost { background: transparent; border: 1px solid #10a37f; color: #10a37f; }
  .hint { font-size: 12px; opacity: .7; }
  #player { margin-top: 12px; min-height: 120px; }
  #player .h5p-iframe-wrapper, #player .h5p-content { background: #fff; border-radius: 8px; }
  .err { color: #c0392b; font-size: 12px; margin-top: 8px; }
</style>
</head>
<body>
<div class="card" id="root">Loading quiz…</div>
<script>
  function esc(s){ return String(s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }

  var data = null, playing = false, playerLoaded = false;

  function assetOrigin(d){
    try { return new URL(d.playerUrl || d.playUrl).origin; } catch (e) { return ""; }
  }

  function answerKey(d){
    return (d.questions||[]).map(function(q,i){
      var ans = (q.answers||[]).map(function(a){
        return '<li class="'+(a.correct?'correct':'wrong')+'">'+esc(a.text)+'</li>';
      }).join('');
      return '<div class="q"><b>'+(i+1)+'. '+esc(q.question)+'</b><ul>'+ans+'</ul></div>';
    }).join('');
  }

  function render(){
    var d = data; if (!d) return;
    var root = document.getElementById('root');
    root.innerHTML =
      '<h1>'+esc(d.title||'Quiz')+'</h1>'+
      '<div class="sub">'+ (d.questionCount||0) +' questions \\u00b7 pass mark '+ (d.passPercentage||60) +'%  \\u00b7  H5P Question Set</div>'+
      (playing ? '<div id="player">Loading player…</div>' : answerKey(d))+
      '<div class="actions">'+
        (d.playerUrl || d.playUrl
          ? '<button class="act" id="toggle">'+(playing ? 'Show answer key' : '\\u25b6 Play here')+'</button>'
          : '')+
        (d.downloadUrl ? '<a class="dl" href="'+esc(d.downloadUrl)+'" target="_blank" rel="noopener" style="background:transparent;border:1px solid #10a37f;color:#10a37f">Download .h5p</a>' : '')+
        (d.playUrl ? '<a class="hint" href="'+esc(d.playUrl)+'" target="_blank" rel="noopener">open full page \\u2197</a>' : '')+
      '</div>'+
      '<div class="err" id="err"></div>';
    var t = document.getElementById('toggle');
    if (t) t.onclick = function(){ playing = !playing; render(); if (playing) mountPlayer(); };
  }

  function loadScript(src){
    return new Promise(function(res, rej){
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = function(){ rej(new Error('failed to load '+src)); };
      document.head.appendChild(s);
    });
  }

  function mountPlayer(){
    var d = data, origin = assetOrigin(d);
    var host = document.getElementById('player');
    if (!host || !origin) return;
    var go = function(){
      host.innerHTML = '';
      var el = document.createElement('div');
      host.appendChild(el);
      new window.H5PStandalone.H5P(el, {
        h5pJsonPath: d.playerUrl || (origin + new URL(d.playUrl).pathname.replace(/^\\/play\\//, '/api/h5p/') + '/player'),
        frameJs: origin + '/h5p-standalone/frame.bundle.js',
        frameCss: origin + '/h5p-standalone/styles/h5p.css'
      }).catch(function(e){ document.getElementById('err').textContent = 'Could not load the player: ' + e.message; });
    };
    if (window.H5PStandalone) { go(); return; }
    if (!playerLoaded) {
      playerLoaded = true;
      loadScript(origin + '/h5p-standalone/main.bundle.js').then(go).catch(function(e){
        document.getElementById('err').textContent = e.message;
      });
    }
  }

  function boot(){
    var api = window.openai;
    if (api && api.toolOutput) { data = api.toolOutput; render(); }
    window.addEventListener('openai:set_globals', function(){
      if (window.openai && window.openai.toolOutput) { data = window.openai.toolOutput; render(); }
    });
  }
  boot();
</script>
</body>
</html>`;
