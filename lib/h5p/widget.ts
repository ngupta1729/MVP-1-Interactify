/**
 * The inline component ChatGPT renders after create_h5p_quiz runs
 * (MCP resource ui://widget/quiz-v4.html, mimeType text/html+skybridge).
 *
 * "Take the quiz" first tries to load the REAL H5P runtime (h5p-standalone,
 * embedType "div" — no iframe, so ChatGPT's component CSP doesn't block it) and
 * render the actual H5P.QuestionSet from our origin. If that fails or is too slow
 * it falls back to a self-contained JS quiz runner styled to match H5P's look.
 * Either way the full activity is also the .h5p download / full-page player.
 *
 * Always renders light, like a real embedded H5P activity.
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
  .h5pcard {
    background: #fff; color: var(--ink);
    border: 1px solid #d5d5d5; border-radius: 6px;
    box-shadow: 0 1px 3px rgba(0,0,0,.08);
    padding: 20px 20px 12px;
  }
  h1.title { font-size: 1.35em; font-weight: 700; margin: 0 0 1px; }
  .meta { color: var(--muted); font-size: .8em; margin-bottom: 4px; }

  .loading { display: flex; align-items: center; gap: 10px; color: var(--muted); padding: 22px 4px; }
  .spinner {
    width: 18px; height: 18px; border: 2px solid var(--opt); border-top-color: var(--blue);
    border-radius: 50%; animation: spin .8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .fallback-note { color: var(--muted); font-size: .78em; margin: 10px 0 0; }
  .fallback-note summary { cursor: pointer; }
  .fallback-note .why {
    margin-top: 5px; padding: 6px 8px; border-radius: 4px;
    background: #f4f4f4; color: #555; font: 11px/1.5 ui-monospace, Menlo, Consolas, monospace;
    word-break: break-all;
  }

  .survey {
    margin-top: 14px; padding: 12px 14px; border-radius: 6px;
    background: #f4f7fb; border: 1px solid #dde6f0;
  }
  .survey-q { font-size: .88em; font-weight: 600; margin: 8px 0 6px; }
  .survey-q:first-child { margin-top: 0; }
  .survey-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
  .chip {
    font: inherit; font-size: .82em; cursor: pointer; border: 1px solid #c7d2de;
    background: #fff; color: var(--ink); border-radius: 999px; padding: 5px 12px;
  }
  .chip:hover { background: #eef3f9; }
  .chip.sel { background: var(--sel-bg); border-color: var(--sel-bd); color: var(--sel-tx); }
  .survey-text {
    font: inherit; font-size: .85em; width: 100%; box-sizing: border-box;
    margin: 6px 0 10px; padding: 7px 10px; border: 1px solid #c7d2de; border-radius: 4px;
  }

  #h5proot-slot { margin-top: 6px; }
  /* keep the real H5P activity on a white ground inside the card */
  #h5proot-slot .h5p-content, #h5proot-slot .h5p-container { background: #fff; }

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
<div class="h5pcard" id="root">Loading&hellip;</div>
<script>
(function(){
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){
    return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c];
  }); }

  var data = null;
  // "key"  = answer-key review view (default)
  // "real" = real H5P runtime (h5p-standalone) mounted / mounting
  // "js"   = self-contained JS fallback runner
  var mode = "key";
  var realState = "idle";  // idle | loading | ok | failed
  var failReason = "";     // why the real runtime did not come up (shown in the card)
  var assetErrors = [];    // src/href of any <script>/<link> that failed to load
  var h5pNode = null;      // the live element h5p-standalone renders into (kept across re-renders)
  var qi = 0, picks = [], checked = [], finished = false;

  // Mandatory pre-download survey (specs/feedback_loop_spec.md, "Embedded
  // satisfaction survey"). Gates Download .h5p only - Open in H5P player and
  // any h5p.com/Lumi links are untouched. Two taps required; text optional.
  var surveyDone = false, surveyShowing = false, surveySubmitting = false;
  var surveyHappiness = null, surveyDestination = null;

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

  // ---------- real H5P runtime ----------
  function assetOrigin(){
    try { return new URL(data.playerUrl || data.playUrl).origin; } catch (e) { return ""; }
  }
  function playerBase(){
    if (data.playerUrl) return data.playerUrl;
    try {
      var u = new URL(data.playUrl);
      return u.origin + u.pathname.replace(/^\\/play\\//, "/api/h5p/") + "/player";
    } catch (e) { return ""; }
  }

  function loadScriptOnce(src){
    return new Promise(function(res, rej){
      var existing = document.querySelector('script[data-h5p="1"]');
      if (existing){
        if (window.H5PStandalone) return res();
        existing.addEventListener("load", function(){ res(); }, { once: true });
        existing.addEventListener("error", function(){ rej(new Error("load error")); }, { once: true });
        return;
      }
      var s = document.createElement("script");
      s.src = src; s.dataset.h5p = "1";
      s.onload = function(){ res(); };
      s.onerror = function(){ rej(new Error("could not load " + src)); };
      document.head.appendChild(s);
    });
  }

  var warmed = false;
  // Fetch the (~23 KB, but round-trip-heavy) h5p-standalone runtime as soon as we
  // have a player URL, well before the user clicks "Take the quiz" - so that first
  // click only has to wait on the small per-question JSON/library files, not this.
  function warmRuntime(){
    if (warmed) return;
    var origin = assetOrigin();
    if (!origin) return;
    warmed = true;
    loadScriptOnce(origin + "/h5p-standalone/main.bundle.js").catch(function(){});
  }

  // A one-line picture of what actually happened, shown under the fallback note.
  // h5p-standalone's script injector only listens for "load" (never "error"), so a
  // blocked asset makes its promise hang rather than reject - hence the watchdog
  // plus the capture-phase asset-error listener installed in boot().
  function diag(){
    var d = [];
    if (assetErrors.length){
      d.push(assetErrors.length + " asset(s) failed to load: " + assetErrors.slice(-3).join(" , "));
    }
    d.push("H5PStandalone=" + (window.H5PStandalone ? "yes" : "no"));
    d.push("H5P.QuestionSet=" + (window.H5P && window.H5P.QuestionSet ? "yes" : "no"));
    if (h5pNode){
      d.push("attached=" + (document.body && document.body.contains(h5pNode) ? "yes" : "no") +
        " .h5p-content=" + h5pNode.querySelectorAll(".h5p-content").length +
        " .h5p-question=" + h5pNode.querySelectorAll(".h5p-question").length);
    }
    return d.join(" | ");
  }

  function mountReal(){
    var origin = assetOrigin(), base = playerBase();
    if (!origin || !base){ return failReal("no player URL in the tool output"); }

    var settled = false;
    var watchdog = setTimeout(function(){
      if (!settled){ settled = true; failReal("timed out after 25s"); }
    }, 25000);

    // The mount point has to be IN the page before H5P starts: h5p-standalone
    // finishes by calling H5P.init(), which only picks up .h5p-content elements
    // attached to the document. Mounting a detached div renders nothing.
    h5pNode = document.createElement("div");
    render();
    if (!(document.body && document.body.contains(h5pNode))){
      settled = true; clearTimeout(watchdog);
      return failReal("could not attach the mount point");
    }

    loadScriptOnce(origin + "/h5p-standalone/main.bundle.js")
      .then(function(){
        if (settled) return;
        if (!(window.H5PStandalone && window.H5PStandalone.H5P)){
          throw new Error("h5p-standalone loaded but did not define H5PStandalone");
        }
        return new window.H5PStandalone.H5P(h5pNode, {
          h5pJsonPath: base,
          frameJs: origin + "/h5p-standalone/frame.bundle.js",
          frameCss: origin + "/h5p-standalone/styles/h5p.css",
          embedType: "div",
        });
      })
      .then(function(){
        if (settled) return;
        settled = true; clearTimeout(watchdog);
        // H5P.init() attaches the question set asynchronously - give it a beat,
        // then insist on a real rendered question, not just the empty wrapper.
        setTimeout(function(){
          if (h5pNode.querySelector(".h5p-question, .h5p-question-set, .h5p-joubelui-button")){
            realState = "ok"; mode = "real"; render();
          } else {
            failReal("runtime loaded but rendered no question");
          }
        }, 700);
      })
      .catch(function(err){
        if (settled) return;
        settled = true; clearTimeout(watchdog);
        failReal((err && err.message) || String(err));
      });
  }

  function failReal(reason){
    failReason = (reason || "unknown") + " - " + diag();
    realState = "failed";
    mode = "js"; resetRun();
    render();
  }

  function realView(){
    // The slot is present while loading too - h5pNode has to live in the document
    // from the moment H5P mounts into it (see mountReal).
    var busy = realState === "loading"
      ? '<div class="loading"><span class="spinner"></span>Loading the H5P activity&hellip;</div>'
      : '';
    return busy +
      '<div id="h5proot-slot"></div>' +
      '<div class="foot">' +
        '<button class="btn sec" id="key">Answer key</button>' +
        actionBtns() +
      '</div>';
  }

  // ---------- answer key (default) ----------
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

  // ---------- pre-download survey ----------
  // Not about this quiz's content quality (that's refinementNote + the diff
  // classifier's job) - happiness, intended destination, and what would make
  // the experience better. Two taps required; text stays optional.
  var HAPPINESS_OPTS = [["happy", "\\ud83d\\ude0a", "Happy"], ["okay", "\\ud83d\\ude10", "It's okay"], ["not_happy", "\\ud83d\\ude1e", "Not happy"]];
  var DEST_OPTS = [
    ["lms", "\\ud83c\\udfeb My LMS"], ["own_site", "\\ud83c\\udf10 My own site"],
    ["shared_direct", "\\ud83d\\udd17 Shared directly"], ["not_sure", "\\ud83e\\udd14 Not sure yet"], ["other", "Other"]
  ];

  function surveyPrompt(){
    var happyChips = HAPPINESS_OPTS.map(function(o){
      var sel = surveyHappiness === o[0] ? " sel" : "";
      return '<button class="chip' + sel + '" data-sv-happy="' + o[0] + '">' + o[1] + ' ' + o[2] + '</button>';
    }).join("");
    var destChips = DEST_OPTS.map(function(o){
      var sel = surveyDestination === o[0] ? " sel" : "";
      return '<button class="chip' + sel + '" data-sv-dest="' + o[0] + '">' + o[1] + '</button>';
    }).join("");
    var ready = !!(surveyHappiness && surveyDestination);

    return '<div class="survey">' +
      '<div class="survey-q">Before you download \\u2014 how happy are you with this quiz?</div>' +
      '<div class="survey-row">' + happyChips + '</div>' +
      '<div class="survey-q">Where will you use it?</div>' +
      '<div class="survey-row">' + destChips + '</div>' +
      '<input class="survey-text" id="sv-text" maxlength="1000" placeholder="Anything specific you\\u2019d change? (optional)" />' +
      '<button class="btn" id="sv-continue"' + (ready ? "" : " disabled") + '>' +
        (surveySubmitting ? "Saving\\u2026" : "Continue to download") +
      '</button>' +
    '</div>';
  }

  // ---------- JS fallback runner (H5P-styled) ----------
  function jsView(){
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

    var note = realState === "failed"
      ? '<details class="fallback-note">' +
          '<summary>Showing a lightweight version \\u2014 open the full H5P activity below.</summary>' +
          '<div class="why">' + esc(failReason) + '</div>' +
        '</details>'
      : '';

    return '<div class="dots">' + dots + '</div>' +
      '<div class="stem">' + esc(stemOf(q)) +
        (multi ? ' <span class="subtle">(select all that apply)</span>' : '') + '</div>' +
      '<ul class="answers' + (grade ? " graded" : "") + '">' + opts + '</ul>' +
      fb +
      '<div class="foot">' + foot +
        '<button class="btn sec" id="key">Answer key</button>' +
      '</div>' + note;
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
    var body;
    if (mode === "real") body = realView();
    else if (mode === "js") body = jsView();
    else body = keyView();

    var count = (data.questionCount || qlist().length);
    root.innerHTML =
      '<h1 class="title">' + esc(data.title || "Quiz") + '</h1>' +
      '<div class="meta">' + count + ' question' + (count === 1 ? "" : "s") +
        ' \\u00b7 H5P Question Set \\u00b7 pass mark ' + ((data.passPercentage) || 60) + '%</div>' +
      body +
      // Centralized here (not per-view) so it shows immediately regardless of
      // which view Download was clicked from - realView/resultsView/keyView
      // all reach the download button via actionBtns(); jsView mid-quiz never
      // renders that button at all, so this never fires there.
      (surveyShowing ? surveyPrompt() : "") +
      footerBar();

    if (mode === "real" && h5pNode){
      var slot = document.getElementById("h5proot-slot");
      if (slot && h5pNode.parentNode !== slot){ slot.innerHTML = ""; slot.appendChild(h5pNode); }
    }
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
    if (start) start.onclick = function(){
      // h5p-standalone's core library sets globals (window.H5P, window.H5PIntegration)
      // the first time it loads and never fully resets them, so mounting a *second*
      // fresh instance into a *new* h5pNode is unreliable - it can silently render
      // nothing and we'd fall back to the lookalike. Once we have one working
      // instance, reuse it instead of asking h5p-standalone to build another.
      if (realState === "ok" && h5pNode && h5pNode.querySelector(".h5p-question, .h5p-question-set, .h5p-joubelui-button")){
        mode = "real"; render();
        return;
      }
      failReason = ""; assetErrors = [];
      mode = "real"; realState = "loading";
      mountReal();
    };

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

    // Download is gated by the mandatory survey; the footer "Reuse" link is
    // the same action under a different label, so it's gated the same way -
    // otherwise it's a one-click bypass sitting right next to the real gate.
    function startDownload(){
      if (surveyDone){ openExternal(data.downloadUrl); return; }
      surveyShowing = true; render();
    }
    var dl = by("dl");
    if (dl) dl.onclick = startDownload;
    var full = by("full");
    if (full) full.onclick = function(){ openExternal(data.playUrl); };
    var reuse = by("reuse");
    if (reuse) reuse.onclick = startDownload;
    var logo = by("logo");
    if (logo) logo.onclick = function(){ openExternal("https://h5p.org"); };

    var happyBtns = document.querySelectorAll("[data-sv-happy]");
    for (var hi = 0; hi < happyBtns.length; hi++){
      happyBtns[hi].onclick = function(){
        surveyHappiness = this.getAttribute("data-sv-happy"); render();
      };
    }
    var destBtns = document.querySelectorAll("[data-sv-dest]");
    for (var di = 0; di < destBtns.length; di++){
      destBtns[di].onclick = function(){
        surveyDestination = this.getAttribute("data-sv-dest"); render();
      };
    }
    var svContinue = by("sv-continue");
    if (svContinue) svContinue.onclick = function(){
      if (!(surveyHappiness && surveyDestination) || surveySubmitting) return;
      surveySubmitting = true; render();
      var textEl = by("sv-text");
      var body = {
        anonUid: data.anonUid || null,
        happiness: surveyHappiness,
        destination: surveyDestination,
        improvementText: (textEl && textEl.value) ? textEl.value.slice(0, 1000) : undefined,
      };
      var finish = function(){
        surveyDone = true; surveyShowing = false; surveySubmitting = false;
        openExternal(data.downloadUrl);
        render();
      };
      fetch(assetOrigin() + "/api/h5p/" + data.token + "/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(finish).catch(finish); // never let a network hiccup block the download
    };

    if (mode === "js" && !finished && !checked[qi]){
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
    // playerUrl is derived from the quiz's content token, so it changes any
    // time the spec does (a refinement) and stays the same for a no-op
    // update. If it changed and we have a mounted real-H5P instance, that
    // instance is for the *old* quiz - drop it rather than let the "reuse
    // instead of remount" optimization silently keep showing stale content.
    var prevPlayerUrl = data && data.playerUrl;
    data = o || {};
    if (picks.length !== qlist().length) resetRun();
    if (h5pNode && data.playerUrl !== prevPlayerUrl){
      h5pNode = null; realState = "idle"; failReason = ""; assetErrors = [];
      if (mode === "real") mode = "key";
    }
    render();
    warmRuntime();
  }

  function boot(){
    // Capture phase: resource errors on <script>/<link> do not bubble, and
    // h5p-standalone never wires an onerror of its own.
    window.addEventListener("error", function(e){
      var t = e && e.target;
      if (t && (t.tagName === "SCRIPT" || t.tagName === "LINK")){
        assetErrors.push(String(t.src || t.href || "?"));
      }
    }, true);
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
