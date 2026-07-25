import { Box } from "@mui/material";
import { FeaturesSection } from "./sections/FeaturesSection";
import { FooterSection } from "./sections/FooterSection";
import { HeroSection } from "./sections/HeroSection";
import { LeadFormSection } from "./sections/LeadFormSection";
import { NavbarSection } from "./sections/NavbarSection";
import { StatsSection } from "./sections/StatsSection";
import { TestimonialsSection } from "./sections/TestimonialsSection";

export function LandingPage() {
  return (
    <Box sx={{ bgcolor: "background.default" }}>
      <NavbarSection />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <TestimonialsSection />
      <LeadFormSection />
      <FooterSection />
    </Box>
  );
}
