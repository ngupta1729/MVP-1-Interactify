/**
 * Shared inline component factory for every content type beyond the quiz:
 * mounts the REAL H5P runtime (h5p-standalone, embedType "div") the same way
 * QUIZ_WIDGET_HTML does. Unlike the quiz widget, this has no bespoke
 * JS-lookalike fallback or answer-key view — those are irreducibly
 * quiz-shaped. On failure it falls back to just the Download button - there
 * is no full-page player fallback (/play/[token] is a download/metadata
 * page only, deliberately not an H5P host - see that page's own comment).
 */
export interface PlayerWidgetOptions {
  // Not read inside this function - purely for the caller's own clarity at
  // each buildPlayerWidgetHtml() call site.
  kind: "book" | "video" | "accordion" | "dialogcards" | "blanks" | "dragtext" | "singlechoiceset" | "crossword" | "dragquestion";
  label: string; // e.g. "book" | "video" — used in button/status text
  metaLabel: string; // e.g. "H5P Interactive Book" / "H5P Interactive Video"
  successSelectors: string; // CSS selectors that indicate the real player actually rendered
  /**
   * False for Video: H5P.InteractiveVideo needs to load a real YouTube
   * player, itself a third-party script (youtube.com/iframe_api) that
   * ChatGPT's widget CSP does not and cannot be made to allow (confirmed via
   * live console: it's a fixed platform allowlist, not something our own
   * resource/frame domain declarations can extend to an arbitrary
   * third-party host). Attempting the inline mount there always fails after
   * a real delay, so skip straight to the download-first state instead.
   */
  supportsInlineMount?: boolean;
}

export function buildPlayerWidgetHtml(opts: PlayerWidgetOptions): string {
  const { label, metaLabel, successSelectors } = opts;
  const supportsInlineMount = opts.supportsInlineMount !== false;
  const Label = label.charAt(0).toUpperCase() + label.slice(1);

  return /* html */ `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  :root { --blue:#1a73d9; --blue-d:#1356a3; --blue-a:#104888; --ink:#1a1a1a; --muted:#6b6b6b; --sel-bg:#cee0f4; --sel-bd:#388EFF; --sel-tx:#1a4473; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.5 "Open Sans", "Segoe UI", Roboto, -apple-system, system-ui, sans-serif; color: var(--ink); }
  .h5pcard { background: #fff; color: var(--ink); border: 1px solid #d5d5d5; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,.08); padding: 20px 20px 12px; }
  h1.title { font-size: 1.35em; font-weight: 700; margin: 0 0 1px; }
  .meta { color: var(--muted); font-size: .8em; margin-bottom: 4px; }
  .loading { display: flex; align-items: center; gap: 10px; color: var(--muted); padding: 22px 4px; }
  .spinner { width: 18px; height: 18px; border: 2px solid #dddddd; border-top-color: var(--blue); border-radius: 50%; animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .fallback-note { color: var(--muted); font-size: .78em; margin: 10px 0 0; }
  .fallback-note summary { cursor: pointer; }
  .fallback-note .why { margin-top: 5px; padding: 6px 8px; border-radius: 4px; background: #f4f4f4; color: #555; font: 11px/1.5 ui-monospace, Menlo, Consolas, monospace; word-break: break-all; }
  .survey { margin-top: 14px; padding: 12px 14px; border-radius: 6px; background: #f4f7fb; border: 1px solid #dde6f0; }
  .survey-q { font-size: .88em; font-weight: 600; margin: 8px 0 6px; }
  .survey-q:first-child { margin-top: 0; }
  .survey-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
  .chip { font: inherit; font-size: .82em; cursor: pointer; border: 1px solid #c7d2de; background: #fff; color: var(--ink); border-radius: 999px; padding: 5px 12px; }
  .chip:hover { background: #eef3f9; }
  .chip.sel { background: var(--sel-bg); border-color: var(--sel-bd); color: var(--sel-tx); }
  .survey-text { font: inherit; font-size: .85em; width: 100%; box-sizing: border-box; margin: 6px 0 10px; padding: 7px 10px; border: 1px solid #c7d2de; border-radius: 4px; }
  #h5proot-slot { margin-top: 6px; }
  #h5proot-slot .h5p-content, #h5proot-slot .h5p-container { background: #fff; }
  .foot { margin-top: 14px; }
  button.btn { font: inherit; cursor: pointer; border: 0; border-radius: 2em; padding: 8px 20px; margin: 0 8px 6px 0; background: var(--blue); color: #fff; font-weight: 400; }
  button.btn:hover { background: var(--blue-d); }
  button.btn:active { background: var(--blue-a); }
  button.btn[disabled] { opacity: .45; cursor: default; }
  button.btn.sec { background: #fff; color: var(--blue); border: 1px solid var(--blue); }
  button.btn.sec:hover { background: #f2f7fd; }
  .h5pbar { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 16px; padding-top: 8px; border-top: 1px solid #e2e2e2; font-size: .72em; gap: 8px; }
  .h5pbar .h5pcom { color: #555; cursor: pointer; flex: 1 1 auto; min-width: 0; }
  .h5pbar .h5pcom:hover { color: #1a73d9; }
  .h5pbar .h5pcom b { color: var(--blue); font-weight: 700; }
  .h5pbar .ver { color: #bbb; flex: none; }
</style>
</head>
<body>
<div class="h5pcard" id="root">Loading&hellip;</div>
<script>
(function(){
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){
    return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c];
  }); }

  var WIDGET_VERSION = "v7";
  var SUPPORTS_INLINE_MOUNT = ${supportsInlineMount ? "true" : "false"};
  var data = null;
  var mode = "idle"; // idle | real
  var realState = "idle"; // idle | loading | ok | failed
  var failReason = "";
  var assetErrors = [];
  var h5pNode = null;

  // Mandatory pre-download survey, same flow as the quiz widget (see
  // widget.ts) - one happiness rating (optional free text) gates the first
  // Download click for a given content token. Scoped to content, not to the
  // widget's session: a refinement produces a new token, which hasn't been
  // surveyed yet even if an earlier version already was (see setData()).
  var surveyDone = false, surveyShowing = false;
  var surveyHappiness = null, surveyImprovementText = "";
  var surveyTextTimer = null;
  var HAPPINESS_OPTS = [["happy", "\\ud83d\\ude0a", "Happy"], ["okay", "\\ud83d\\ude10", "It's okay"], ["not_happy", "\\ud83d\\ude1e", "Not happy"]];

  function surveyPrompt(){
    var happyChips = HAPPINESS_OPTS.map(function(o){
      var sel = surveyHappiness === o[0] ? " sel" : "";
      return '<button class="chip' + sel + '" data-sv-happy="' + o[0] + '">' + o[1] + ' ' + o[2] + '</button>';
    }).join("");
    var ready = !!surveyHappiness;
    return '<div class="survey">' +
      '<div class="survey-q">Before you download \\u2014 how happy are you with this?</div>' +
      '<div class="survey-row">' + happyChips + '</div>' +
      '<input class="survey-text" id="sv-text" maxlength="1000" value="' + esc(surveyImprovementText) + '" placeholder="Any feedback you\\u2019d like to share? (optional)" />' +
      '<button class="btn" id="sv-continue"' + (ready ? "" : " disabled") + '>Continue to download</button>' +
    '</div>';
  }

  function submitSurvey(){
    if (!surveyHappiness) return;
    try {
      fetch(assetOrigin() + "/api/h5p/" + data.token + "/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonUid: data && data.anonUid,
          happiness: surveyHappiness,
          improvementText: surveyImprovementText ? surveyImprovementText.slice(0, 1000) : undefined,
        }),
      }).catch(function(){});
    } catch (e) {}
  }

  function assetOrigin(){ return data.appOrigin || ""; }
  function downloadUrl(){ return (data.appOrigin || "") + "/api/h5p/" + (data.token || ""); }
  function playerBase(){ return (data.appOrigin || "") + "/api/h5p/" + (data.token || "") + "/player"; }

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
  function warmRuntime(){
    if (warmed) return;
    var origin = assetOrigin();
    if (!origin) return;
    warmed = true;
    loadScriptOnce(origin + "/h5p-standalone/main.bundle.js").catch(function(){});
  }

  function diag(){
    var d = [];
    if (assetErrors.length) d.push(assetErrors.length + " asset(s) failed to load: " + assetErrors.slice(-3).join(" , "));
    d.push("H5PStandalone=" + (window.H5PStandalone ? "yes" : "no"));
    return d.join(" | ");
  }

  function mountReal(){
    var origin = assetOrigin(), base = playerBase();
    if (!origin || !base) return failReal("no player URL in the tool output");

    var settled = false;
    var watchdog = setTimeout(function(){ if (!settled){ settled = true; failReal("timed out after 25s"); } }, 25000);

    h5pNode = document.createElement("div");
    render();
    if (!(document.body && document.body.contains(h5pNode))){
      settled = true; clearTimeout(watchdog);
      return failReal("could not attach the mount point");
    }

    loadScriptOnce(origin + "/h5p-standalone/main.bundle.js")
      .then(function(){
        if (settled) return;
        if (!(window.H5PStandalone && window.H5PStandalone.H5P)) throw new Error("h5p-standalone loaded but did not define H5PStandalone");
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
        setTimeout(function(){
          if (h5pNode.querySelector(${JSON.stringify(successSelectors)})){
            realState = "ok"; mode = "real"; render();
          } else {
            failReal("runtime loaded but rendered nothing recognizable");
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
    realState = "failed"; mode = "failed";
    render();
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

  function logClick(eventType){
    try {
      fetch(assetOrigin() + "/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: data && data.token, eventType: eventType, anonUid: data && data.anonUid }),
      }).catch(function(){});
    } catch (e) {}
  }

  function body(){
    if (mode === "real"){
      var busy = realState === "loading" ? '<div class="loading"><span class="spinner"></span>Loading&hellip;</div>' : '';
      return busy + '<div id="h5proot-slot"></div>' +
        '<div class="foot">' + actionBtns() + '</div>';
    }
    if (mode === "failed"){
      return '<details class="fallback-note" open>' +
          '<summary>Could not mount the interactive ${label} inline &mdash; download it below to open it directly.</summary>' +
          '<div class="why">' + esc(failReason) + '</div>' +
        '</details>' +
        '<div class="foot">' +
          actionBtns() +
        '</div>';
    }
    if (!SUPPORTS_INLINE_MOUNT){
      return '<p class="fallback-note">This ${label} can\\u2019t play inline here. ' +
          'Download it below, or open it in h5p.com to use it directly.</p>' +
        '<div class="foot">' + actionBtns() + '</div>';
    }
    // ChatGPT can call setData() once with a still-hydrating toolOutput
    // before the real payload arrives in a follow-up openai:set_globals
    // event (confirmed live: a click in that window hit mountReal()'s own
    // "no player URL in the tool output" guard - data existed, but
    // data.token/data.appOrigin didn't yet). Guarding here, not just in
    // mountReal(), means there's simply no button to misclick during that
    // window instead of a dead click producing a visible error.
    if (!(data && data.token && data.appOrigin)){
      return '<div class="loading"><span class="spinner"></span>Loading&hellip;</div>';
    }
    return '<div class="foot">' +
      '<button class="btn" id="start">\\u25b6 Open the ${label}</button>' +
      actionBtns() +
    '</div>';
  }

  function actionBtns(){
    var h = "";
    if (data && data.token) h += '<button class="btn sec" id="dl">Download .h5p</button>';
    return h;
  }

  function footerBar(){
    if (!(data && data.token)) return "";
    return '<div class="h5pbar">' +
      '<span class="h5pcom" id="h5pcom">Want to organize this, collaborate with your team, or track ' +
        'results? Try h5p.com free for 14 days, or explore their plans on ' +
        '<b>h5p.com/pricing \\u2197</b></span>' +
      '<span class="ver">' + esc(WIDGET_VERSION) + '</span>' +
    '</div>';
  }

  function render(){
    if (!data) return;
    var root = document.getElementById("root");
    root.innerHTML =
      '<h1 class="title">' + esc(data.title || "${Label}") + '</h1>' +
      '<div class="meta">' + esc(data.meta || "${metaLabel}") + '</div>' +
      body() +
      (surveyShowing ? surveyPrompt() : "") +
      footerBar();

    if (mode === "real" && h5pNode){
      var slot = document.getElementById("h5proot-slot");
      if (slot && h5pNode.parentNode !== slot){ slot.innerHTML = ""; slot.appendChild(h5pNode); }
    }
    wire();
    notifyHeight();
  }

  function notifyHeight(){
    try {
      if (window.openai && typeof window.openai.notifyIntrinsicHeight === "function"){
        window.openai.notifyIntrinsicHeight(document.body.scrollHeight);
      }
    } catch (e) {}
  }

  function wire(){
    var by = function(id){ return document.getElementById(id); };
    var start = by("start");
    if (start) start.onclick = function(){
      logClick("click_open");
      failReason = ""; assetErrors = [];
      mode = "real"; realState = "loading";
      mountReal();
    };
    var dl = by("dl");
    if (dl) dl.onclick = function(){ startDownload("click_download"); };
    var h5pcom = by("h5pcom");
    if (h5pcom) h5pcom.onclick = function(){
      var uid = (data && data.anonUid) ? "&uid=" + encodeURIComponent(data.anonUid) : "";
      openExternal(assetOrigin() + "/api/track?token=" + encodeURIComponent(data.token) + "&target=h5pcom_pricing" + uid);
    };
    var happyBtns = document.querySelectorAll("[data-sv-happy]");
    for (var hi = 0; hi < happyBtns.length; hi++){
      happyBtns[hi].onclick = function(){
        surveyHappiness = this.getAttribute("data-sv-happy"); render(); submitSurvey();
      };
    }
    var svText = by("sv-text");
    if (svText) svText.oninput = function(){
      surveyImprovementText = this.value;
      clearTimeout(surveyTextTimer);
      surveyTextTimer = setTimeout(submitSurvey, 800);
    };
    var svContinue = by("sv-continue");
    if (svContinue) svContinue.onclick = function(){
      if (!surveyHappiness) return;
      clearTimeout(surveyTextTimer);
      submitSurvey();
      surveyDone = true; surveyShowing = false;
      openExternal(downloadUrl());
      render();
    };
  }

  // Download is gated by the mandatory survey, same as the quiz widget - the
  // click itself is logged unconditionally, regardless of whether the survey
  // ends up completed (that's answered separately by whether a
  // survey_responses row exists for this token).
  function startDownload(logType){
    logClick(logType);
    if (surveyDone){ openExternal(downloadUrl()); return; }
    surveyShowing = true; render();
  }

  function setData(o){
    var prevToken = data && data.token;
    data = o || {};
    if (data.token !== prevToken){
      clearTimeout(surveyTextTimer);
      surveyDone = false; surveyShowing = false;
      surveyHappiness = null; surveyImprovementText = "";
    }
    if (h5pNode && data.token !== prevToken){
      h5pNode = null; realState = "idle"; failReason = ""; assetErrors = [];
      if (mode === "real" || mode === "failed") mode = "idle";
    }
    render();
    warmRuntime();
  }

  function boot(){
    window.addEventListener("error", function(e){
      var t = e && e.target;
      if (t && (t.tagName === "SCRIPT" || t.tagName === "LINK")) assetErrors.push(String(t.src || t.href || "?"));
    }, true);
    if (window.openai && window.openai.toolOutput) setData(window.openai.toolOutput);
    window.addEventListener("openai:set_globals", function(){
      if (window.openai && window.openai.toolOutput) setData(window.openai.toolOutput);
    });
    try {
      if (typeof ResizeObserver !== "undefined"){
        new ResizeObserver(function(){ notifyHeight(); }).observe(document.body);
      }
    } catch (e) {}
  }
  boot();
})();
</script>
</body>
</html>`;
}
