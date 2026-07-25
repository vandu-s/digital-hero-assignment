/**
 * Required attribution for the Digital Heroes training assignment. Rendered
 * in the landing footer and at the bottom of the authenticated app shell so
 * it is visible on every page of the production build.
 *
 * The exact text "Built for Digital Heroes Training Task" and the link to
 * https://digitalheroesco.com are an explicit submission requirement - do
 * not reword them.
 */
import { Link } from "@mui/material";

export function DigitalHeroesCredit({ color = "text.secondary" }: { color?: string }) {
  return (
    <Link
      href="https://digitalheroesco.com"
      target="_blank"
      rel="noopener noreferrer"
      underline="hover"
      sx={{ color, fontWeight: 600, fontSize: 14, textUnderlineOffset: 3 }}
    >
      Built for Digital Heroes Training Task
    </Link>
  );
}
