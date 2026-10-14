/**
 * Photography — all from Pexels under the Pexels licence (free to use, no
 * attribution required; we credit photographers anyway). Selection notes:
 *
 *  - howItWorks  6770513  portrait 4000×6000. Hand holding a coin in front of a
 *                trading screen. Chosen over flat "coins on a table" shots: it
 *                shows a person acting, which matches a step-by-step section, and
 *                the portrait crop fits the narrow side column on desktop and
 *                crops cleanly to 4:3 on mobile.
 *  - cta         5831339  landscape 5313×3547. Hand pointing at a crypto chart.
 *                Busy detail works as a darkened background band; text sits
 *                on a solid overlay so contrast doesn't depend on the photo.
 *  - aboutReview 7433869  landscape 6404×4269. Colleagues reviewing documents —
 *                illustrates manual review. Credited, never captioned as "our team".
 *  - aboutWork   8062306  landscape 5942×3961. Colleagues with charts and laptops.
 *
 * Images are served through next/image (AVIF/WebP, responsive sizes) from
 * images.pexels.com. Rejected: logo-heavy exchange screenshots (imply
 * partnerships), "money rain" and gold-bar shots (imply guaranteed returns).
 */
const pexels = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg`;

export const images = {
  howItWorks: { src: pexels(6770513), width: 4000, height: 6000, credit: "Alesia Kozik", page: "https://www.pexels.com/photo/6770513/" },
  cta: { src: pexels(5831339), width: 5313, height: 3547, credit: "AlphaTradeZone", page: "https://www.pexels.com/photo/5831339/" },
  aboutReview: { src: pexels(7433869), width: 6404, height: 4269, credit: "Vlada Karpovich", page: "https://www.pexels.com/photo/7433869/" },
  aboutWork: { src: pexels(8062306), width: 5942, height: 3961, credit: "Nataliya Vaitkevich", page: "https://www.pexels.com/photo/8062306/" },
};
