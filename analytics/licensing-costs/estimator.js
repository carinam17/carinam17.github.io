// Licensing cost rules for the web page.
// This is a line-for-line translation of tools/licensing/estimate.py.
// If you change the rules, change estimate.py first, mirror it here, and run
// tools/licensing/check_parity.py to confirm both give the same totals.

(function (root) {
  "use strict";

  function round2(x) { return Math.round(x * 100) / 100; }

  function line(section, label, amount) {
    return { section: section, label: label, amount: round2(Number(amount)) };
  }

  function makeEstimator(D) {
    var has = function (obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); };
    var inList = function (list, key) { return list.indexOf(key) !== -1; };

    function checkState(code) {
      if (!has(D.stateNames, code)) {
        throw new Error("Unknown state code: " + code + ". Use a two-letter code like TX.");
      }
    }

    function compactTable(degree) {
      return degree === "MD" ? D.imlcLicenseFeesMD : D.imlcLicenseFeesDO;
    }

    // Same as renewal() in estimate.py
    function renewal(state) {
      checkState(state);
      var years = 2;
      if (inList(D.renewalEvery3Years, state)) years = 3;
      else if (inList(D.renewalEveryYear, state)) years = 1;
      var fee = D.renewalFees[state];
      return { fee: fee, every_years: years, per_year: round2(fee / years) };
    }

    // Same as estimate() in estimate.py
    function estimate(opts) {
      var state = opts.state;
      var degree = opts.degree || "MD";
      var usEducated = opts.usEducated !== false;
      var hasProfile = !!opts.hasFsmbProfile;
      var compactEligible = !!opts.compactEligible;
      checkState(state);

      var prior = [];
      (opts.priorLicenseStates || []).forEach(function (code) {
        checkState(code);
        if (prior.indexOf(code) === -1) prior.push(code);
      });

      var lines = [];
      var useCompact = compactEligible && has(compactTable(degree), state);
      var F = D.flat;

      // 1. Application
      var sec = "Application";
      if (useCompact) {
        lines.push(line(sec, "Compact (IMLC) application fee", F.imlcApplication));
        lines.push(line(sec, "Compact license fee", compactTable(degree)[state]));
      } else {
        lines.push(line(sec, "State application fee", D.applicationFees[state]));
        if (inList(D.uniformApplicationStates, state)) {
          lines.push(line(sec, "FSMB Uniform Application", F.uniformApplication));
        }
        if (has(D.licenseRegistrationFees, state)) {
          lines.push(line(sec, "License registration fee", D.licenseRegistrationFees[state]));
        }
        if (has(D.stateSpecificFees, state)) {
          lines.push(line(sec, D.stateSpecificFeeLabels[state], D.stateSpecificFees[state]));
        }
        lines.push(line(sec, "Document shipping (est.)", F.shippingPerDocument * F.documentsShipped));
      }
      if (has(D.backgroundCheckFees, state)) {
        lines.push(line(sec, "Criminal background check", D.backgroundCheckFees[state]));
      }

      // 2. Education credentials verification
      sec = "Credentials verification";
      if (state === "AR") {
        lines.push(line(sec, "Arkansas verification service (CCVS)", F.ccvs));
      } else {
        if (hasProfile) {
          lines.push(line(sec, "FSMB profile request", F.fsmbProfileRequest));
        } else {
          lines.push(line(sec, "New FSMB profile", F.fsmbProfile));
          if (!usEducated) lines.push(line(sec, "ECFMG education verification", F.ecfmgVerification));
        }
        lines.push(line(sec, "Transcript request", F.fsmbTranscript));
        if (inList(D.npdbStates, state)) lines.push(line(sec, "National Practitioner Data Bank", F.npdb));
      }

      // 3. Verifying every license held now or before
      sec = "License verification";
      prior.forEach(function (code) {
        lines.push(line(sec, D.stateNames[code] + " license verification", D.licenseVerificationFees[code]));
      });

      var total = round2(lines.reduce(function (s, l) { return s + l.amount; }, 0));
      return {
        state: state,
        state_name: D.stateNames[state],
        path: useCompact ? "compact" : "standard",
        lines: lines,
        total: total,
        renewal: renewal(state)
      };
    }

    return {
      estimate: estimate,
      renewal: renewal,
      compactStates: function (degree) { return Object.keys(compactTable(degree)); }
    };
  }

  if (typeof module !== "undefined") module.exports = makeEstimator;
  else root.makeEstimator = makeEstimator;
})(this);
