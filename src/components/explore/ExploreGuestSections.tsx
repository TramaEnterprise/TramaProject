import ExploreSection from "@/components/explore/ExploreSection";
import TrendingSection from "@/components/explore/TrendingSection";
import GenreSection from "@/components/explore/GenreSection";
import ExploreConversionBanner from "@/components/explore/ExploreConversionBanner";
import type { ExploreSectionParams } from "@/types/ExploreTypes";

type Props = {
  showConversionBanner: boolean;
  shelfParams: Partial<ExploreSectionParams>;
};

export default function ExploreGuestSections({
  showConversionBanner,
  shelfParams,
}: Props) {
  return (
    <>
      <TrendingSection params={shelfParams} />
      <ExploreSection
        type="acclaimed"
        titleKey="explore.sections.acclaimed"
        featured
      />
      {showConversionBanner && <ExploreConversionBanner />}
      <GenreSection featuredGenre="Fiction" />
      <ExploreSection
        type="more-author"
        titleKey="explore.sections.moreAuthor"
      />
    </>
  );
}
