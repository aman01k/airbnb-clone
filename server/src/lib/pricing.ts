/** Guest service fee as a share of the nightly subtotal. */
export const SERVICE_FEE_RATE = 0.12;

export interface PriceBreakdown {
  nights: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  total: number;
}

/** All amounts are whole rupees. The client shows the same formula as a preview. */
export function quote(pricePerNight: number, cleaningFee: number, nights: number): PriceBreakdown {
  const subtotal = pricePerNight * nights;
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
  return { nights, subtotal, cleaningFee, serviceFee, total: subtotal + cleaningFee + serviceFee };
}
