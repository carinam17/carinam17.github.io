// Connects the page's form and chart to the estimator. No calculations here:
// every number comes from estimator.js, which mirrors estimate.py.
(function () {
  "use strict";
  var D = window.LICENSING_DATA;
  var E = window.makeEstimator(D);
  var $ = function (id) { return document.getElementById(id); };
  var money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  var moneyRound = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  var codes = Object.keys(D.stateNames).sort(function (a, b) {
    return D.stateNames[a].localeCompare(D.stateNames[b]);
  });
  var prior = [];
  var showAll = false;
  var TOP = 15;

  if (D.asOf && D.asOf.indexOf("[") === -1) {
    $("as-of").textContent = "Fee data from " + D.asOf + ". Illustrative only; state boards change their fees.";
  }

  // ----- Fill the state menus -----
  function fillSelect(sel, withBlank) {
    sel.innerHTML = "";
    if (withBlank) {
      var o = document.createElement("option");
      o.value = ""; o.textContent = "Choose a state";
      sel.appendChild(o);
    }
    codes.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c; opt.textContent = D.stateNames[c];
      sel.appendChild(opt);
    });
  }
  fillSelect($("state"), false);
  fillSelect($("prior-add"), true);
  $("state").value = "TX";

  function profile() {
    return {
      degree: document.querySelector('input[name="degree"]:checked').value,
      usEducated: $("us-ed").checked,
      hasFsmbProfile: $("fsmb").checked,
      compactEligible: $("compact").checked
    };
  }

  // ----- Estimator panel -----
  function renderEstimate() {
    var p = profile();
    p.state = $("state").value;
    p.priorLicenseStates = prior;
    var r = E.estimate(p);

    $("r-where").textContent = r.state_name;
    $("r-total").textContent = money.format(r.total);

    var compactHere = E.compactStates(p.degree).indexOf(r.state) !== -1;
    var msg;
    if (r.path === "compact") msg = "Applying through the Compact (IMLC), which replaces the state's own application.";
    else if (compactHere) msg = "Standard application. " + r.state_name + " is in the Compact, so a physician who qualifies could apply that way instead.";
    else msg = "Standard application through the " + r.state_name + " medical board.";
    $("r-path").textContent = msg;

    var groups = {};
    var order = [];
    r.lines.forEach(function (l) {
      if (!groups[l.section]) { groups[l.section] = []; order.push(l.section); }
      groups[l.section].push(l);
    });
    var box = $("r-lines");
    box.innerHTML = "";
    order.forEach(function (sec) {
      var sub = groups[sec].reduce(function (s, l) { return s + l.amount; }, 0);
      var h = document.createElement("h3");
      var a = document.createElement("span"); a.textContent = sec.toLowerCase();
      var b = document.createElement("span"); b.textContent = money.format(sub);
      h.appendChild(a); h.appendChild(b);
      box.appendChild(h);
      var dl = document.createElement("dl");
      groups[sec].forEach(function (l) {
        var row = document.createElement("div"); row.className = "row";
        var dt = document.createElement("dt"); dt.textContent = l.label;
        var dd = document.createElement("dd"); dd.textContent = money.format(l.amount);
        row.appendChild(dt); row.appendChild(dd); dl.appendChild(row);
      });
      box.appendChild(dl);
    });

    var rn = r.renewal;
    var every = rn.every_years === 1 ? "every year" : "every " + rn.every_years + " years";
    $("r-renewal").innerHTML = "";
    var left = document.createElement("span");
    left.innerHTML = "Then renew for <strong></strong> " + every;
    left.querySelector("strong").textContent = money.format(rn.fee);
    var right = document.createElement("span");
    right.innerHTML = "<strong></strong> per year";
    right.querySelector("strong").textContent = money.format(rn.per_year);
    $("r-renewal").appendChild(left);
    $("r-renewal").appendChild(right);
  }

  // ----- Earlier licenses -----
  function renderPrior() {
    var list = $("prior-list");
    list.innerHTML = "";
    prior.forEach(function (c) {
      var li = document.createElement("li");
      li.appendChild(document.createTextNode(D.stateNames[c]));
      var x = document.createElement("button");
      x.type = "button"; x.textContent = "×";
      x.setAttribute("aria-label", "Remove " + D.stateNames[c]);
      x.addEventListener("click", function () {
        prior = prior.filter(function (p) { return p !== c; });
        renderPrior(); renderEstimate();
      });
      li.appendChild(x);
      list.appendChild(li);
    });
    $("prior-empty").hidden = prior.length > 0;
  }
  function addPrior() {
    var c = $("prior-add").value;
    if (c && prior.indexOf(c) === -1) prior.push(c);
    $("prior-add").value = "";
    renderPrior(); renderEstimate();
  }
  $("prior-btn").addEventListener("click", addPrior);
  $("prior-add").addEventListener("change", addPrior);

  // ----- 51-state comparison -----
  function renderChart() {
    var p = profile();
    var rankBy = document.querySelector('input[name="rank"]:checked').value;
    var compactSet = E.compactStates(p.degree);
    var onlyCompact = $("only-compact").checked;

    var rows = codes.map(function (c) {
      var r = E.estimate({ state: c, degree: p.degree, usEducated: p.usEducated,
        hasFsmbProfile: p.hasFsmbProfile, compactEligible: false, priorLicenseStates: [] });
      return { code: c, name: D.stateNames[c], first: r.total, renew: r.renewal.per_year,
        renewFee: r.renewal.fee, every: r.renewal.every_years, compact: compactSet.indexOf(c) !== -1 };
    }).filter(function (r) { return !onlyCompact || r.compact; });

    var key = rankBy === "first" ? "first" : "renew";
    rows.sort(function (a, b) { return a[key] - b[key] || a.name.localeCompare(b.name); });
    var max = Math.max.apply(null, rows.map(function (r) { return r[key]; })) || 1;
    $("axis-label").textContent = rankBy === "first" ? "Estimated first-license cost, lowest first" : "Renewal cost per year, lowest first";

    var visible = showAll ? rows : rows.slice(0, TOP);
    var ul = $("bars");
    ul.innerHTML = "";
    var current = $("state").value;
    visible.forEach(function (r) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bar-row" + (r.code === current ? " selected" : "");
      btn.setAttribute("aria-label", r.name + ": " + money.format(r[key]) + (r.compact ? ", Compact state" : "") + ". Load into estimator.");
      var name = document.createElement("span"); name.className = "name";
      var nm = document.createElement("span"); nm.textContent = r.name; name.appendChild(nm);
      if (r.compact) { var b = document.createElement("span"); b.className = "badge"; b.textContent = "IMLC"; name.appendChild(b); }
      var track = document.createElement("span"); track.className = "track";
      var fill = document.createElement("span"); fill.className = "fill";
      fill.style.width = Math.max(1, (r[key] / max) * 100) + "%";
      track.appendChild(fill);
      var val = document.createElement("span"); val.className = "val"; val.textContent = moneyRound.format(r[key]);
      btn.appendChild(name); btn.appendChild(track); btn.appendChild(val);
      btn.addEventListener("click", function () {
        $("state").value = r.code;
        renderEstimate(); renderChart();
        document.getElementById("est-h").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      });
      btn.addEventListener("mouseenter", function () { showTip(btn, r); });
      btn.addEventListener("mouseleave", hideTip);
      btn.addEventListener("focus", function () { showTip(btn, r); });
      btn.addEventListener("blur", hideTip);
      li.appendChild(btn);
      ul.appendChild(li);
    });

    var more = $("show-all");
    more.hidden = rows.length <= TOP;
    more.textContent = showAll ? "Show the lowest " + TOP : "Show all " + rows.length + " states";
  }

  var tip = $("tip");
  function showTip(btn, r) {
    var every = r.every === 1 ? "every year" : "every " + r.every + " years";
    tip.innerHTML = "";
    var b = document.createElement("b"); b.textContent = r.name; tip.appendChild(b);
    [["First license", moneyRound.format(r.first)],
     ["Renewal", money.format(r.renewFee) + " " + every],
     ["Per year", money.format(r.renew)],
     ["Compact (IMLC)", r.compact ? "Yes" : "No"]].forEach(function (pair) {
      var d = document.createElement("div"); d.textContent = pair[0] + ": " + pair[1]; tip.appendChild(d);
    });
    var chart = $("chart").getBoundingClientRect();
    var row = btn.getBoundingClientRect();
    tip.hidden = false;
    var left = Math.min(row.width - tip.offsetWidth, Math.max(0, row.width * 0.35));
    tip.style.left = left + "px";
    tip.style.top = (row.bottom - chart.top + 6) + "px";
  }
  function hideTip() { tip.hidden = true; }

  $("show-all").addEventListener("click", function () { showAll = !showAll; renderChart(); });

  // ----- Wire up -----
  ["state", "us-ed", "fsmb", "compact", "deg-md", "deg-do"].forEach(function (id) {
    $(id).addEventListener("change", function () { renderEstimate(); renderChart(); });
  });
  ["rank-first", "rank-renew", "only-compact"].forEach(function (id) {
    $(id).addEventListener("change", renderChart);
  });
  $("est-form").addEventListener("submit", function (e) { e.preventDefault(); });

  renderPrior();
  renderEstimate();
  renderChart();
})();
