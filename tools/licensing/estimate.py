"""Estimate the cost for a physician to get a medical license in a US state.

A cleaned-up version of the original command-line pricingTool.py. The rules
are the same; the differences are:

- Everything is a function that takes inputs and returns a result, instead of
  asking questions with input() and storing answers in global variables.
- The total now includes every fee the old script calculated. The old total
  left out the license registration fee, the Uniform Application fee, the
  transcript, ECFMG and NPDB fees, and Arkansas's verification fee.
- Renewal frequency is checked with if/elif, so New Mexico and Washington
  report 3 years only (the old script also printed "2 years" for them).
- Unknown state codes raise a clear error instead of crashing mid-run.

The website's estimator (estimator.js) follows these same rules, and
check_parity.py confirms the two give identical totals for every state.
"""

from decimal import Decimal, ROUND_HALF_UP

import fees as F


def round2(x):
    """Round money to cents, halves up (Python's round() rounds 151.125 down to 151.12)."""
    return float(Decimal(str(x)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _line(section, label, amount):
    return {"section": section, "label": label, "amount": round2(amount)}


def _check_state(code):
    if code not in F.STATE_NAMES:
        raise ValueError(f"Unknown state code: {code!r}. Use a two-letter code like 'TX'.")


def compact_states(degree):
    """States where a physician with this degree can license through the Compact (IMLC)."""
    table = F.IMLC_LICENSE_FEES_MD if degree == "MD" else F.IMLC_LICENSE_FEES_DO
    return set(table)


def renewal(state):
    """Renewal fee, how often it is due, and what that works out to per year."""
    _check_state(state)
    if state in F.RENEWAL_YEARS_3:
        years = 3
    elif state in F.RENEWAL_YEARS_1:
        years = 1
    else:
        years = 2
    fee = F.RENEWAL_FEES[state]
    return {"fee": fee, "every_years": years, "per_year": round2(fee / years)}


def estimate(state, degree="MD", us_educated=True, has_fsmb_profile=False,
             prior_license_states=(), compact_eligible=False):
    """Itemized first-time licensing cost for one state.

    state                 two-letter code of the state being applied to
    degree                "MD" or "DO"
    us_educated           True if medical school was in the US
    has_fsmb_profile      True if the physician already has an FSMB profile
    prior_license_states  codes of every state where they hold or held a license
    compact_eligible      True if they qualify for a State of Principal Licensure
                          (a clean license in a Compact state plus one of the
                          residence / practice / employer / tax conditions)
    """
    _check_state(state)
    if degree not in ("MD", "DO"):
        raise ValueError("degree must be 'MD' or 'DO'")
    prior = []
    for code in prior_license_states:
        _check_state(code)
        if code not in prior:
            prior.append(code)

    lines = []
    use_compact = compact_eligible and state in compact_states(degree)

    # 1. Application
    sec = "Application"
    if use_compact:
        table = F.IMLC_LICENSE_FEES_MD if degree == "MD" else F.IMLC_LICENSE_FEES_DO
        lines.append(_line(sec, "Compact (IMLC) application fee", F.IMLC_APPLICATION_FEE))
        lines.append(_line(sec, "Compact license fee", table[state]))
    else:
        lines.append(_line(sec, "State application fee", F.APPLICATION_FEES[state]))
        if state in F.UNIFORM_APPLICATION_STATES:
            lines.append(_line(sec, "FSMB Uniform Application", F.UNIFORM_APPLICATION_FEE))
        if state in F.LICENSE_REGISTRATION_FEES:
            lines.append(_line(sec, "License registration fee", F.LICENSE_REGISTRATION_FEES[state]))
        if state in F.STATE_SPECIFIC_FEES:
            lines.append(_line(sec, F.STATE_SPECIFIC_FEE_LABELS[state], F.STATE_SPECIFIC_FEES[state]))
        lines.append(_line(sec, "Document shipping (est.)", F.SHIPPING_PER_DOCUMENT * F.DOCUMENTS_SHIPPED))
    if state in F.BACKGROUND_CHECK_FEES:
        lines.append(_line(sec, "Criminal background check", F.BACKGROUND_CHECK_FEES[state]))

    # 2. Education credentials verification
    sec = "Credentials verification"
    if state == "AR":
        lines.append(_line(sec, "Arkansas verification service (CCVS)", F.CCVS_FEE))
    else:
        if has_fsmb_profile:
            lines.append(_line(sec, "FSMB profile request", F.FSMB_PROFILE_REQUEST_FEE))
        else:
            lines.append(_line(sec, "New FSMB profile", F.FSMB_PROFILE_FEE))
            if not us_educated:
                lines.append(_line(sec, "ECFMG education verification", F.ECFMG_VERIFICATION_FEE))
        lines.append(_line(sec, "Transcript request", F.FSMB_TRANSCRIPT_FEE))
        if state in F.NPDB_STATES:
            lines.append(_line(sec, "National Practitioner Data Bank", F.NPDB_FEE))

    # 3. Verifying every license held now or before
    sec = "License verification"
    for code in prior:
        lines.append(_line(sec, f"{F.STATE_NAMES[code]} license verification",
                           F.LICENSE_VERIFICATION_FEES[code]))

    total = round2(sum(l["amount"] for l in lines))
    return {
        "state": state,
        "state_name": F.STATE_NAMES[state],
        "path": "compact" if use_compact else "standard",
        "lines": lines,
        "total": total,
        "renewal": renewal(state),
    }


if __name__ == "__main__":
    result = estimate("TX", degree="MD", us_educated=True, prior_license_states=["CA", "NY"])
    print(f"{result['state_name']} ({result['path']} application)")
    for line in result["lines"]:
        print(f"  {line['section']:<26}{line['label']:<40}${line['amount']:>9,.2f}")
    print(f"  {'Total':<66}${result['total']:>9,.2f}")
    r = result["renewal"]
    print(f"  Renewal: ${r['fee']:,.2f} every {r['every_years']} year(s) (${r['per_year']:,.2f}/yr)")
