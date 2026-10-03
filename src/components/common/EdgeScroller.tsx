import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEdgeScroll } from "@/hooks/useEdgeScroll";
import "./EdgeScroller.scss";

type Props = {
  children: React.ReactNode;
  className?: string;
  ariaPrev: string;
  ariaNext: string;
  deps?: unknown;
};

export default function EdgeScroller({ children, className, ariaPrev, ariaNext, deps }: Props) {
  const { ref, canLeft, canRight, scrollByDir, update } = useEdgeScroll<HTMLDivElement>();

  useEffect(() => {
    update();
  }, [deps, update]);

  return (
    <div className="edge-scroller">
      <div
        className="edge-scroller__fade edge-scroller__fade--left"
        data-show={canLeft || undefined}
        aria-hidden="true"
      />
      <button
        type="button"
        className="edge-scroller__chevron edge-scroller__chevron--left"
        data-show={canLeft || undefined}
        tabIndex={canLeft ? 0 : -1}
        onClick={() => scrollByDir(-1)}
        aria-label={ariaPrev}
      >
        <ChevronLeft aria-hidden="true" />
      </button>

      <div className={`edge-scroller__viewport ${className ?? ""}`.trim()} ref={ref}>
        {children}
      </div>

      <button
        type="button"
        className="edge-scroller__chevron edge-scroller__chevron--right"
        data-show={canRight || undefined}
        tabIndex={canRight ? 0 : -1}
        onClick={() => scrollByDir(1)}
        aria-label={ariaNext}
      >
        <ChevronRight aria-hidden="true" />
      </button>
      <div
        className="edge-scroller__fade edge-scroller__fade--right"
        data-show={canRight || undefined}
        aria-hidden="true"
      />
    </div>
  );
}
