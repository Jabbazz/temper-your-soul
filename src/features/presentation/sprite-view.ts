/** Una direzione sullo schermo (x a destra, y in basso). */
export interface ScreenHeading { readonly x: number; readonly y: number }

/** La direzione predefinita: verso destra e verso chi guarda. */
export const DEFAULT_HEADING: ScreenHeading = { x: 1, y: 1 };
