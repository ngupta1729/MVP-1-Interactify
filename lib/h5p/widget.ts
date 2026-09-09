/**
 * The inline component ChatGPT renders after create_h5p_quiz runs
 * (MCP resource ui://widget/quiz-v3.html, mimeType text/html+skybridge).
 *
 * ChatGPT's component sandbox blocks loading external scripts AND framing external
 * pages, so the real h5p-standalone runtime can't run here (same limit Kahoot's
 * inline card hits). Instead this widget is a self-contained quiz runner (vanilla
 * JS, no network) styled to match H5P's real Question Set / Multiple Choice look —
 * the colours, pill options, progress dots, score bar and footer are lifted from
 * H5P's own stylesheets. The full H5P activity is the .h5p download / full-page
 * player linked from the footer.
 *
 * Always renders light (real H5P activities do), regardless of the chat theme.
 */
export const QUIZ_WIDGET_HTML = /* html */ `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  :root {
    --blue:#1a73d9; --blue-d:#1356a3; --blue-a:#104888;
    --opt:#dddddd; --opt-h:#ececec;
    --sel-bg:#cee0f4; --sel-bd:#388EFF; --sel-tx:#1a4473;
    --ok-bg:#b6e4ce; --ok-tx:#255c41; --ok-sh:#a2bdb0;
    --no-bg:#fbd7d8; --no-tx:#b71c1c; --no-sh:#deb8b8;
    --track:#dddddd; --fill1:#34A86E; --fill2:#2B8C5C;
    --ink:#1a1a1a; --muted:#6b6b6b;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font: 15px/1.5 "Open Sans", "Segoe UI", Roboto, -apple-system, system-ui, sans-serif;
    color: var(--ink);
  }
  .h5p {
    background: #fff; color: var(--ink);
    border: 1px solid #d5d5d5; border-radius: 6px;
    box-shadow: 0 1px 3px rgba(0,0,0,.08);
    padding: 20px 20px 12px;
  }
  h1.title { font-size: 1.35em; font-weight: 700; margin: 0 0 1px; }
  .meta { color: var(--muted); font-size: .8em; margin-bottom: 4px; }

  .dots { text-align: center; padding: 6px 0 2px; line-height: 2em; }
  .dot {
    display: inline-block; width: 10px; height: 10px; border-radius: 50%;
    margin: 0 4px; border: 1px solid var(--blue-d); vertical-align: middle;
  }
  .dot.answered { background: var(--blue-d); }
  .dot.current { box-shadow: 0 0 0 2px #285585; }

  .stem { font-size: 1.15em; margin: 12px 0 2px; }
  .subtle { color: var(--muted); font-size: .82em; font-weight: 400; }

  ul.answers { list-style: none; padding: 0; margin: 14px 0; }
  li.answer { margin: 8px 0; position: relative; cursor: pointer; }
  .alt {
    display: block; position: relative;
    padding: 9px 42px 9px 40px;
    border-radius: 5px; border: 2px solid transparent;
    background: var(--opt); box-shadow: 0 2px 0 rgba(0,0,0,.3);
    line-height: 1.5;
  }
  li.answer:hover .alt { background: var(--opt-h); }
  .marker {
    position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
    width: 17px; height: 17px; border: 2px solid #6b6b6b; background: #fff;
  }
  li.answer[data-type="radio"] .marker { border-radius: 50%; }
  li.answer[data-type="checkbox"] .marker { border-radius: 3px; }
  li.answer.sel .alt { color: var(--sel-tx); background: var(--sel-bg); border-color: var(--sel-bd); box-shadow: none; }
  li.answer.sel .marker { border-color: var(--sel-bd); background: var(--sel-bd); }
  .graded li.answer { cursor: default; }
  .graded li.answer:hover .alt { background: var(--opt); }
  li.answer.correct .alt { background: var(--ok-bg); border-color: var(--ok-bg); color: var(--ok-tx); box-shadow: 0 2px 0 var(--ok-sh); }
  li.answer.wrong .alt   { background: var(--no-bg); border-color: var(--no-bg); color: var(--no-tx); box-shadow: 0 2px 0 var(--no-sh); }
  .graded li.answer.correct:hover .alt { background: var(--ok-bg); }
  .graded li.answer.wrong:hover .alt { background: var(--no-bg); }
  .icon { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); font-weight: 700; font-size: 1.05em; }
  li.answer.correct .icon { color: var(--ok-tx); }
  li.answer.wrong .icon { color: var(--no-tx); }

  .fbtext { font-weight: 700; font-size: 1.15em; margin: 8px 0 2px; min-height: 1.4em; }
  .fbtext.ok { color: var(--ok-tx); }
  .fbtext.no { color: var(--no-tx); }

  .foot { margin-top: 14px; }
  button.btn {
    font: inherit; cursor: pointer; border: 0; border-radius: 2em;
    padding: 8px 20px; margin: 0 8px 6px 0;
    background: var(--blue); color: #fff; font-weight: 400;
  }
  button.btn:hover { background: var(--blue-d); }
  button.btn:active { background: var(--blue-a); }
  button.btn[disabled] { opacity: .45; cursor: default; }
  button.btn.sec { background: #fff; color: var(--blue); border: 1px solid var(--blue); }
  button.btn.sec:hover { background: #f2f7fd; }

  .results { text-align: center; padding: 4px 4px 0; }
  .results .rh { color: var(--blue); font-weight: 700; font-size: 1.5em; margin: 12px 0 10px; }
  .results .greeting { color: #777; font-size: 1.15em; margin: 6px 0 14px; }
  .results .rfb { color: var(--blue); font-weight: 700; font-size: 1.1em; margin: 12px 0; }

  .scorebar {
    display: inline-flex; align-items: center;
    width: 16em; max-width: 100%;
    background: #fff; border: 1px solid rgba(0,0,0,.08); border-radius: 1.5em;
    padding: 9px 12px;
  }
  .scorebar .track {
    position: relative; flex: 1; height: 13px;
    border-radius: 1.5em; background: var(--track); overflow: hidden;
  }
  .scorebar .fill {
    position: absolute; left: 0; top: 0; height: 100%;
    border-radius: 1.5em 0 0 1.5em;
    background: linear-gradient(to right, var(--fill1), var(--fill2));
    transition: width .4s ease-in-out;
  }
  .scorebar .star { width: 26px; height: 26px; margin-left: 8px; flex: none; }
  .scorebar .num { font-weight: 700; font-size: 1.2em; margin-left: 10px; white-space: nowrap; }
  .scorebar .num .sep { color: #757575; padding: 0 2px; }

  .h5pbar {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 16px; padding-top: 8px; border-top: 1px solid #e2e2e2;
    font-size: .72em;
  }
  .h5pbar .reuse {
    color: #555; cursor: pointer; font-weight: 700;
    text-transform: uppercase; letter-spacing: .04em;
  }
  .h5pbar .reuse:hover { color: #222; }
  .h5pbar .logo { font-weight: 800; color: #2a2a2a; letter-spacing: .02em; cursor: pointer; }
  .h5pbar .logo:hover { color: #000; }
</style>
</head>
<body>
<div class="h5p" id="root">Loading&hellip;</div>
<script>
(function(){
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){
    return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c];
  }); }

  var data = null;
  var mode = "key";        // "key" | "quiz"
  var qi = 0;              // current question in quiz mode
  var picks = [];          // picks[i] = array of selected answer indices
  var checked = [];        // checked[i] = has this question been checked
  var finished = false;

  function qlist(){ return (data && data.questions) || []; }
  function stemOf(q){ return q.stem || q.question || ""; }
  function isMulti(q){ return (q.answers || []).filter(function(a){ return a.correct; }).length > 1; }

  function resetRun(){
    qi = 0; finished = false;
    picks = qlist().map(function(){ return []; });
    checked = qlist().map(function(){ return false; });
  }

  function qCorrect(i){
    var q = qlist()[i], sel = picks[i] || [];
    for (var k = 0; k < q.answers.length; k++){
      if ((sel.indexOf(k) !== -1) !== !!q.answers[k].correct) return false;
    }
    return true;
  }

  function scored(){
    var p = 0, t = qlist().length;
    for (var i = 0; i < t; i++) if (qCorrect(i)) p++;
    var pct = t ? Math.round(p * 100 / t) : 0;
    return { p: p, t: t, pct: pct, pass: pct >= ((data && data.passPercentage) || 60) };
  }

  function starSVG(full){
    var fill = full ? "#ffc80b" : "#dddddd";
    var stroke = full ? "#915A00" : "#cfcfcf";
    return '<svg class="star" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M12 1.7l3.09 6.26 6.91 1-5 4.87 1.18 6.88L12 17.35 5.82 20.6 7 13.72l-5-4.87 6.91-1z" ' +
      'fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  }

  // ---- answer key (default / review-and-approve view) ----
  function keyView(){
    var rows = qlist().map(function(q, i){
      var opts = (q.answers || []).map(function(a){
        var cls = "answer" + (a.correct ? " correct" : "");
        var icon = a.correct ? '<span class="icon">\\u2713</span>' : "";
        var type = isMulti(q) ? "checkbox" : "radio";
        return '<li class="' + cls + '" data-type="' + type + '">' +
          '<span class="alt"><span class="marker"></span>' + esc(a.text) + icon + '</span></li>';
      }).join("");
      return '<div class="stem">' + (i + 1) + '. ' + esc(stemOf(q)) + '</div>' +
        '<ul class="answers graded">' + opts + '</ul>';
    }).join("");

    return rows +
      '<div class="foot">' +
        '<button class="btn" id="start">\\u25b6 Take the quiz</button>' +
        actionBtns() +
      '</div>';
  }

  // ---- one question at a time (H5P Question Set flow) ----
  function quizView(){
    if (finished) return resultsView();

    var q = qlist()[qi], multi = isMulti(q), grade = checked[qi];
    var sel = picks[qi] || [];

    var dots = qlist().map(function(_, i){
      var c = "dot" + (checked[i] ? " answered" : "") + (i === qi ? " current" : "");
      return '<span class="' + c + '"></span>';
    }).join("");

    var opts = (q.answers || []).map(function(a, ai){
      var on = sel.indexOf(ai) !== -1;
      var cls = "answer" + (on ? " sel" : "");
      var icon = "";
      if (grade){
        if (a.correct){ cls += " correct"; icon = '<span class="icon">\\u2713</span>'; }
        else if (on){ cls += " wrong"; icon = '<span class="icon">\\u2717</span>'; }
      }
      return '<li class="' + cls + '" data-a="' + ai + '" data-type="' + (multi ? "checkbox" : "radio") + '">' +
        '<span class="alt"><span class="marker"></span>' + esc(a.text) + icon + '</span></li>';
    }).join("");

    var fb = "";
    if (grade){
      var right = qCorrect(qi);
      fb = '<div class="fbtext ' + (right ? "ok" : "no") + '">' +
        (right ? "Correct!" : "That&rsquo;s not right.") + '</div>';
    }

    var foot;
    if (!grade){
      foot = '<button class="btn" id="check"' + (sel.length ? "" : " disabled") + '>\\u2713 Check</button>';
    } else if (qi < qlist().length - 1){
      foot = '<button class="btn" id="next">Next \\u2192</button>';
    } else {
      foot = '<button class="btn" id="finish">Finish</button>';
    }

    return '<div class="dots">' + dots + '</div>' +
      '<div class="stem">' + esc(stemOf(q)) +
        (multi ? ' <span class="subtle">(select all that apply)</span>' : '') + '</div>' +
      '<ul class="answers' + (grade ? " graded" : "") + '">' + opts + '</ul>' +
      fb +
      '<div class="foot">' + foot +
        '<button class="btn sec" id="key">Answer key</button>' +
      '</div>';
  }

  function resultsView(){
    var s = scored();
    var pctWidth = s.t ? Math.round(s.p * 100 / s.t) : 0;
    var greeting = s.pct === 100 ? "Perfect score!" :
                   s.pass ? "Well done!" : "Keep practising \\u2014 you&rsquo;ll get there.";
    return '<div class="results">' +
      '<div class="rh">Your result</div>' +
      '<div class="scorebar">' +
        '<div class="track"><div class="fill" style="width:' + pctWidth + '%"></div></div>' +
        starSVG(s.pct === 100) +
        '<span class="num"><span class="a">' + s.p + '</span>' +
          '<span class="sep">/</span><span class="b">' + s.t + '</span></span>' +
      '</div>' +
      '<div class="greeting">' + greeting + '</div>' +
      '<div class="rfb">' + (s.pass ? "Passed" : "Not passed") +
        ' \\u00b7 ' + s.pct + '% (pass mark ' + ((data && data.passPercentage) || 60) + '%)</div>' +
      '<div class="foot">' +
        '<button class="btn" id="retry">\\u21bb Retry</button>' +
        '<button class="btn sec" id="key">Answer key</button>' +
        actionBtns() +
      '</div>' +
    '</div>';
  }

  function actionBtns(){
    var h = "";
    if (data && data.downloadUrl) h += '<button class="btn sec" id="dl">Download .h5p</button>';
    if (data && data.playUrl) h += '<button class="btn sec" id="full">Open in H5P player \\u2197</button>';
    return h;
  }

  function footerBar(){
    return '<div class="h5pbar">' +
      '<span class="reuse" id="reuse">\\u21ba Reuse</span>' +
      '<span class="logo" id="logo">H5P</span>' +
    '</div>';
  }

  function render(){
    if (!data){ return; }
    var root = document.getElementById("root");
    var body = mode === "quiz" ? quizView() : keyView();
    var count = (data.questionCount || qlist().length);
    root.innerHTML =
      '<h1 class="title">' + esc(data.title || "Quiz") + '</h1>' +
      '<div class="meta">' + count + ' question' + (count === 1 ? "" : "s") +
        ' \\u00b7 Multiple Choice \\u00b7 pass mark ' + ((data.passPercentage) || 60) + '%</div>' +
      body +
      footerBar();
    wire();
  }

  function openExternal(url){
    if (!url) return;
    try {
      if (window.openai && typeof window.openai.openExternal === "function"){
        window.openai.openExternal({ href: url });
        return;
      }
    } catch (e) {}
    window.open(url, "_blank", "noopener");
  }

  function wire(){
    var by = function(id){ return document.getElementById(id); };

    var start = by("start");
    if (start) start.onclick = function(){ mode = "quiz"; resetRun(); render(); };

    var key = by("key");
    if (key) key.onclick = function(){ mode = "key"; render(); };

    var check = by("check");
    if (check) check.onclick = function(){
      if (!(picks[qi] || []).length) return;
      checked[qi] = true; render();
    };

    var next = by("next");
    if (next) next.onclick = function(){ qi++; render(); };

    var finish = by("finish");
    if (finish) finish.onclick = function(){ finished = true; render(); };

    var retry = by("retry");
    if (retry) retry.onclick = function(){ resetRun(); render(); };

    var dl = by("dl");
    if (dl) dl.onclick = function(){ openExternal(data.downloadUrl); };
    var full = by("full");
    if (full) full.onclick = function(){ openExternal(data.playUrl); };
    var reuse = by("reuse");
    if (reuse) reuse.onclick = function(){ openExternal(data.downloadUrl); };
    var logo = by("logo");
    if (logo) logo.onclick = function(){ openExternal("https://h5p.org"); };

    if (mode === "quiz" && !finished && !checked[qi]){
      var lis = document.querySelectorAll("li.answer");
      for (var i = 0; i < lis.length; i++){
        lis[i].onclick = function(){
          var ai = +this.getAttribute("data-a");
          var q = qlist()[qi], arr = picks[qi], pos = arr.indexOf(ai);
          if (isMulti(q)){ if (pos === -1) arr.push(ai); else arr.splice(pos, 1); }
          else { picks[qi] = (pos === -1) ? [ai] : []; }
          render();
        };
      }
    }
  }

  function setData(o){
    data = o || {};
    if (picks.length !== qlist().length) resetRun();
    render();
  }

  function boot(){
    if (window.openai && window.openai.toolOutput) setData(window.openai.toolOutput);
    window.addEventListener("openai:set_globals", function(){
      if (window.openai && window.openai.toolOutput) setData(window.openai.toolOutput);
    });
  }
  boot();
})();
</script>
</body>
</html>`;
