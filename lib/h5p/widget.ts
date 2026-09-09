/**
 * The inline component ChatGPT renders after create_h5p_quiz runs
 * (MCP resource ui://widget/quiz.html, mimeType text/html+skybridge).
 *
 * ChatGPT's component sandbox blocks loading external scripts AND framing external
 * pages, so the real h5p-standalone player can't run here. Instead this widget has
 * a small self-contained quiz runner (vanilla JS, no network) built from the tool
 * output, plus the answer-key view and links to the real .h5p / full-page player.
 */
export const QUIZ_WIDGET_HTML = /* html */ `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  :root { color-scheme: light dark; --line: rgba(128,128,128,.28); --ok:#1a7f37; --no:#c0392b; --accent:#10a37f; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.5 -apple-system, system-ui, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; }
  @media (prefers-color-scheme: dark) { body { color: #ececec; } }
  .card { border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
  h1 { font-size: 16px; margin: 0 0 2px; }
  .sub { opacity: .65; font-size: 12px; margin-bottom: 12px; }
  .q { padding: 12px 0; border-top: 1px solid var(--line); }
  .q:first-of-type { border-top: none; }
  .q .stem { font-weight: 600; margin-bottom: 6px; }
  .opt { display: flex; gap: 8px; align-items: flex-start; padding: 6px 8px; border: 1px solid var(--line); border-radius: 8px; margin: 4px 0; cursor: pointer; }
  .opt.sel { border-color: var(--accent); background: rgba(16,163,127,.08); }
  .opt .box { flex: none; width: 16px; height: 16px; border: 1.5px solid #888; border-radius: 4px; margin-top: 2px; text-align: center; line-height: 13px; font-size: 12px; }
  .opt.radio .box { border-radius: 50%; }
  .opt.sel .box { border-color: var(--accent); background: var(--accent); color: #fff; }
  .graded .opt { cursor: default; }
  .opt.correct { border-color: var(--ok); }
  .opt.correct .box { border-color: var(--ok); background: var(--ok); color:#fff; }
  .opt.wrong { border-color: var(--no); }
  .opt.wrong .box { border-color: var(--no); background: var(--no); color:#fff; }
  ul.key { margin: 4px 0 0; padding: 0; list-style: none; }
  ul.key li { padding: 2px 0 2px 20px; position: relative; }
  ul.key li.c::before { content: "\\2713"; position: absolute; left: 0; color: var(--ok); font-weight: 700; }
  ul.key li.w::before { content: "\\2022"; position: absolute; left: 4px; opacity: .5; }
  .bar { margin: 12px 0 4px; padding: 10px 12px; border-radius: 8px; font-weight: 600; }
  .bar.pass { background: rgba(26,127,55,.14); color: var(--ok); }
  .bar.fail { background: rgba(192,57,43,.12); color: var(--no); }
  .actions { margin-top: 14px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  button.btn { font: inherit; cursor: pointer; border: 0; background: var(--accent); color: #fff; padding: 8px 14px; border-radius: 8px; font-weight: 600; }
  button.btn.ghost { background: transparent; border: 1px solid var(--accent); color: var(--accent); }
  a.link { color: var(--accent); text-decoration: none; font-weight: 600; }
  .hint { font-size: 12px; opacity: .7; }
</style>
</head>
<body>
<div class="card" id="root">Loading quiz…</div>
<script>
(function(){
  function esc(s){ return String(s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }

  var data = null;
  var mode = "key";        // "key" | "quiz"
  var graded = false;
  var picks = [];          // picks[qi] = array of selected answer indices

  function isMulti(q){ return (q.answers||[]).filter(function(a){ return a.correct; }).length > 1; }

  function resetQuiz(){
    graded = false;
    picks = (data.questions||[]).map(function(){ return []; });
  }

  function questionCorrect(qi){
    var q = data.questions[qi], sel = picks[qi];
    for (var i=0;i<q.answers.length;i++){
      var chosen = sel.indexOf(i) !== -1;
      if (chosen !== !!q.answers[i].correct) return false;
    }
    return true;
  }

  function score(){
    var pts = 0;
    for (var i=0;i<data.questions.length;i++) if (questionCorrect(i)) pts++;
    var total = data.questions.length;
    var pct = total ? Math.round(pts*100/total) : 0;
    return { pts: pts, total: total, pct: pct, pass: pct >= (data.passPercentage||60) };
  }

  function answerKey(){
    return (data.questions||[]).map(function(q,i){
      var lis = (q.answers||[]).map(function(a){
        return '<li class="'+(a.correct?'c':'w')+'">'+esc(a.text)+'</li>';
      }).join('');
      return '<div class="q"><div class="stem">'+(i+1)+'. '+esc(q.stem||q.question)+'</div><ul class="key">'+lis+'</ul></div>';
    }).join('');
  }

  function quizBody(){
    var html = (data.questions||[]).map(function(q,qi){
      var multi = isMulti(q);
      var opts = (q.answers||[]).map(function(a,ai){
        var sel = picks[qi].indexOf(ai) !== -1;
        var cls = 'opt ' + (multi ? '' : 'radio ') + (sel ? 'sel ' : '');
        var mark = sel ? (multi ? '\\u2713' : '\\u25cf') : '';
        if (graded){
          if (a.correct) cls += 'correct ';
          else if (sel) cls += 'wrong ';
          if (a.correct) mark = '\\u2713'; else if (sel) mark = '\\u2717';
        }
        return '<div class="'+cls+'" data-q="'+qi+'" data-a="'+ai+'"><span class="box">'+mark+'</span><span>'+esc(a.text)+'</span></div>';
      }).join('');
      return '<div class="q'+(graded?' graded':'')+'"><div class="stem">'+(qi+1)+'. '+esc(q.stem||q.question)+
        (multi ? ' <span class="hint">(select all that apply)</span>' : '')+'</div>'+opts+'</div>';
    }).join('');
    if (graded){
      var s = score();
      html += '<div class="bar '+(s.pass?'pass':'fail')+'">'+
        (s.pass?'Passed':'Not passed')+' \\u2014 '+s.pts+' / '+s.total+' ('+s.pct+'%, pass mark '+(data.passPercentage||60)+'%)</div>';
    }
    return html;
  }

  function render(){
    if (!data) return;
    var d = data, root = document.getElementById('root');
    var body = mode === 'quiz' ? quizBody() : answerKey();
    var toggleLabel = mode === 'quiz' ? 'Show answer key' : '\\u25b6 Take the quiz';
    var primary = '';
    if (mode === 'quiz') {
      primary = graded
        ? '<button class="btn" id="retry">Try again</button>'
        : '<button class="btn" id="check">Check answers</button>';
    }
    root.innerHTML =
      '<h1>'+esc(d.title||'Quiz')+'</h1>'+
      '<div class="sub">'+(d.questionCount||(d.questions||[]).length)+' questions \\u00b7 pass mark '+(d.passPercentage||60)+'% \\u00b7 H5P Question Set</div>'+
      body +
      '<div class="actions">'+
        primary +
        '<button class="btn ghost" id="toggle">'+toggleLabel+'</button>'+
        (d.downloadUrl ? '<button class="btn ghost" id="dl">Download .h5p</button>' : '')+
        (d.playUrl ? '<button class="btn ghost" id="full">Open in H5P player \\u2197</button>' : '')+
      '</div>';

    wire();
  }

  function openExternal(url){
    try {
      if (window.openai && typeof window.openai.openExternal === 'function') {
        window.openai.openExternal({ href: url });
        return;
      }
    } catch (e) {}
    window.open(url, '_blank', 'noopener');
  }

  function wire(){
    var dl = document.getElementById('dl');
    if (dl) dl.onclick = function(){ openExternal(data.downloadUrl); };
    var full = document.getElementById('full');
    if (full) full.onclick = function(){ openExternal(data.playUrl); };

    var t = document.getElementById('toggle');
    if (t) t.onclick = function(){
      mode = (mode === 'quiz') ? 'key' : 'quiz';
      if (mode === 'quiz') resetQuiz();
      render();
    };
    var c = document.getElementById('check');
    if (c) c.onclick = function(){ graded = true; render(); };
    var r = document.getElementById('retry');
    if (r) r.onclick = function(){ resetQuiz(); render(); };

    if (mode === 'quiz' && !graded){
      var opts = document.querySelectorAll('.opt');
      for (var i=0;i<opts.length;i++){
        opts[i].onclick = function(){
          var qi = +this.getAttribute('data-q'), ai = +this.getAttribute('data-a');
          var multi = isMulti(data.questions[qi]);
          var arr = picks[qi], pos = arr.indexOf(ai);
          if (multi){ if (pos===-1) arr.push(ai); else arr.splice(pos,1); }
          else { picks[qi] = (pos===-1) ? [ai] : []; }
          render();
        };
      }
    }
  }

  function setData(o){ data = o; if (mode==='quiz' && picks.length !== (o.questions||[]).length) resetQuiz(); render(); }

  function boot(){
    if (window.openai && window.openai.toolOutput) setData(window.openai.toolOutput);
    window.addEventListener('openai:set_globals', function(){
      if (window.openai && window.openai.toolOutput) setData(window.openai.toolOutput);
    });
  }
  boot();
})();
</script>
</body>
</html>`;
