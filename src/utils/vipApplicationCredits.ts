/** Additional LinkCredits charged for VIP / exclusive candidatura (on top of normal apply cost). */
export const VIP_APPLICATION_SURCHARGE_LC = 4;

/** Authoritative VIP debit: normal application charge + fixed surcharge. */
export function getVipApplicationChargeLc(normalCharge: number): number {
  const base = Math.max(0, Math.round(normalCharge));
  return base + VIP_APPLICATION_SURCHARGE_LC;
}

/** 50% VIP refund rounded up to whole LinkCredits (matches backend ceil rule). */
export function getVipPartialRefundLc(vipCharge: number): number {
  const charge = Math.max(0, Math.round(vipCharge));
  return Math.ceil(charge / 2);
}

/** Displaced normal candidates receive this fixed refund when VIP locks the request. */
export const VIP_DISPLACED_NORMAL_REFUND_LC = 2;
