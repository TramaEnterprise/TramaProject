import { toast as sonnerToast } from "sonner";
import "./ShelfToast.scss";
import { useState } from "react";
import ConfettiBurst from "../ConfettiBurst";

type ShelfToastProps = {
  cover: string | null;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  toastId: string | number;
  celebrate?: boolean;
};

export default function ShelfToast({
  cover,
  title,
  message,
  actionLabel,
  onAction,
  toastId,
  celebrate = false,
}: ShelfToastProps) {
  const [showConfetti, setShowConfetti] = useState(celebrate);

  return (
    <div className="shelf-toast">
      <div className="shelf-toast__cover-wrap">
        {cover ? (
          <img className="shelf-toast__cover" src={cover} alt="" />
        ) : (
          <div className="shelf-toast__cover-placeholder" />
        )}
      </div>
      <div className="shelf-toast__body">
        <p className="shelf-toast__title">{title}</p>
        <p className="shelf-toast__message">{message}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          className="shelf-toast__action"
          onClick={() => {
            onAction();
            sonnerToast.dismiss(toastId);
          }}
        >
          {actionLabel}
        </button>
      )}
      {showConfetti && (
        <ConfettiBurst
          corners={["tl"]}
          direction="outward"
          count={16}
          sizeMin={4}
          sizeMax={8}
          distMin={40}
          distMax={160}
          onComplete={() => setShowConfetti(false)}
        />
      )}
    </div>
  );
}
